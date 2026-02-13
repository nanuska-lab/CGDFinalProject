import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* ============ Scene Setup ============ */
const scene = new THREE.Scene();

// Gradient sky
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;
const ctx = canvas.getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
gradient.addColorStop(0, '#87CEEB');
gradient.addColorStop(0.6, '#B0D8F0');
gradient.addColorStop(1, '#E8F4F8');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvas.width, canvas.height);
scene.background = new THREE.CanvasTexture(canvas);
scene.fog = new THREE.Fog(0xE8F4F8, 50, 200);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(20, 55, 35);
camera.lookAt(20, 0, 24);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(20, 0, 24);
controls.minDistance = 10;
controls.maxDistance = 150;
controls.panSpeed = 1.0;
controls.screenSpacePanning = true;
controls.rotateSpeed = 0.5;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2 + 0.3;

/* ============ Lighting ============ */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xfffaed, 1.4);
sun.position.set(20, 25, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 120;
sun.shadow.camera.updateProjectionMatrix();

sun.shadow.bias = -0.0001;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x87CEEB, 0xd4e0c8, 0.3));

/* ============ Textures ============ */
const textureLoader = new THREE.TextureLoader();
const loadTex = (path, repeat) => {
  const tex = textureLoader.load(path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  return tex;
};

const textures = {
  grass: loadTex("textures/grass.jpg", [6, 6]),
  road: loadTex("textures/road.jpg", [15, 1]),
  brick: loadTex("textures/brick.jpg", [2, 2]),
  sidewalk: loadTex("textures/sidewalk.jpg", [15, 1]),
  water: loadTex("textures/water.jpg", [1, 15])
};

const world = new THREE.Group();
scene.add(world);

/* ============ Ground Sections ============ */
const groundMat = new THREE.MeshStandardMaterial({ color: 0xd4e0c8, roughness: 0.9 });
const addGround = (w, d, x, z) => {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), groundMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0, z);
  mesh.receiveShadow = true;
  world.add(mesh);
};
addGround(100, 30, 0, 0);
addGround(50, 35, 26, 28);
addGround(40, 20, 25, -18);

/* ============ River ============ */
const river = new THREE.Mesh(
  new THREE.PlaneGeometry(9, 100),
  new THREE.MeshStandardMaterial({ color: 0x5a9fc4, map: textures.water, transparent: true, opacity: 0.8 })
);
river.rotation.x = -Math.PI / 2;
river.position.set(-4, 0.01, 7);
river.receiveShadow = true;
river.scale.x = 0.978;
world.add(river);

const bankMat = new THREE.MeshStandardMaterial({ color: 0x6b5d4f, roughness: 0.9 });
[-1, 1].forEach(dir => {
  const bank = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 100), bankMat);
  bank.position.set(-4 + dir * 5, 0.2, 7);
  bank.castShadow = true;
  bank.receiveShadow = true;
  world.add(bank);
});

/* ============ Stairs ============ */
const stairs = new THREE.Group();
const stairMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, map: textures.sidewalk, roughness: 0.9 });
for (let i = 0; i < 7; i++) {
  const step = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 1), stairMat);
  step.position.set(0, 0.1 + i * 0.2, -i);
  step.castShadow = true;
  step.receiveShadow = true;
  stairs.add(step);
}
stairs.position.set(5, 0, 20.3);
stairs.rotation.y = 0;

world.add(stairs);

/* ============ Curved Bridge Road ============ */
const roadGeo = new THREE.PlaneGeometry(100, 12, 60, 1);
const positions = roadGeo.attributes.position;
for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i);
  const z = positions.getZ(i);
  positions.setZ(i, z + 1.5 * (1 - (x / 50) ** 2));
}
positions.needsUpdate = true;
roadGeo.computeVertexNormals();

const road = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ 
  color: 0x4a4a4a, map: textures.road, roughness: 0.95, side: THREE.DoubleSide 
}));
road.rotation.x = -Math.PI / 2;
road.position.y = 0.5;
road.receiveShadow = true;
road.castShadow = true;
world.add(road);

/* ============ Sidewalks ============ */
const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, map: textures.sidewalk, roughness: 0.9 });
[10, -10].forEach(z => {
  const geo = new THREE.BoxGeometry(100, 0.4, 8, 60, 1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setY(i, pos.getY(i) + 1.5 * (1 - (x / 50) ** 2));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const sidewalk = new THREE.Mesh(geo, sidewalkMat);
  sidewalk.position.set(0, 0.5, z);
  sidewalk.receiveShadow = true;
  sidewalk.castShadow = true;
  world.add(sidewalk);
});

/* ============ Road Lines ============ */
const lineMat = new THREE.MeshStandardMaterial({ color: 0xe9e9e9, roughness: 0.7 });
for (let x = -48.5; x <= 48.5; x += 6) {
  const height = 1.5 * (1 - (x / 50) ** 2);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.25), lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(x, 0.52 + height, 0);
  world.add(line);
}

/* ============ Bridge Support Pillars ============ */
const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3b, roughness: 0.8 });
[-30, -15, 0, 15, 30].forEach(xPos => {
  const height = 1.5 * (1 - (xPos / 50) ** 2);
  const pillarHeight = height + 1;
  [10, -10].forEach(z => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, pillarHeight, 8), pillarMat);
    pillar.position.set(xPos, pillarHeight / 2 - 0.5, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    world.add(pillar);
  });
});

/* ============ Bridge Railings ============ */
const railingPostMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.4 });
const railingBarMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.5 });

function createRailing(x, z, rotY) {
  const seg = new THREE.Group();
  const height = 1.5 * (1 - (x / 50) ** 2);
  
  [0, 2].forEach(offset => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), railingPostMat);
    post.position.set(offset, 0.6, 0);
    post.castShadow = true;
    seg.add(post);
  });
  
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.15), railingPostMat);
  topRail.position.set(1, 1.15, 0);
  topRail.castShadow = true;
  seg.add(topRail);
  
  [0.75, 0.45, 0.15].forEach(y => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), railingBarMat);
    bar.position.set(1, y, 0);
    seg.add(bar);
  });
  
  seg.position.set(x, 0.5 + height, z);
  seg.rotation.y = rotY;
  return seg;
}

for (let x = -50; x <= 50; x += 2.2) {
  if (x < -43 || x > 43) continue;
  if (x >= 2 && x <= 8) {
    // Gap for stairs on left
  } else {
    world.add(createRailing(x, 14, 0));
  }
  if (x < 3 || x > 47) {
    world.add(createRailing(x, -14, Math.PI));
  }
}

/* ============ Text Textures ============ */
function createTextTexture(text, bgColor, fontSize = 90) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  return new THREE.CanvasTexture(c);
}

/* ============ Kipper Store ============ */
function makeKipperStore(x, z) {
  const store = new THREE.Group();
  
  const upper = new THREE.Mesh(
    new THREE.BoxGeometry(30, 5.5, 7),
    new THREE.MeshStandardMaterial({ color: 0x5da7d9, roughness: 0.6, metalness: 0.15 })
  );
  upper.position.set(0, 6.75, 0);
  upper.castShadow = true;
  upper.receiveShadow = true;
  store.add(upper);
  
  const lower = new THREE.Mesh(
    new THREE.BoxGeometry(30, 4, 7),
    new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.3, metalness: 0.2 })
  );
  lower.position.set(0, 2, 0);
  lower.castShadow = true;
  lower.receiveShadow = true;
  store.add(lower);
  
  // Glass front only
  const glassFront = new THREE.Mesh(
    new THREE.BoxGeometry(30, 4, 0.1),
    new THREE.MeshStandardMaterial({ 
      color: 0x88ccff, 
      transparent: true, 
      opacity: 0.25, 
      roughness: 0.05, 
      metalness: 0.9
    })
  );
  glassFront.position.set(0, 2, 3.55);
  store.add(glassFront);
  
  const glassMat = new THREE.MeshStandardMaterial({ 
    color: 0x88ccff, transparent: true, opacity: 0.15, roughness: 0.05, metalness: 0.9 
  });
  [-10, 0, 10].forEach(xPos => {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.4, 0.1), glassMat);
    glass.position.set(xPos, 2, 3.6);
    store.add(glass);
  });
  
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 });
  [-13.75, -6.25, -3.75, 3.75, 6.25, 13.75].forEach(xPos => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.7, 0.25), frameMat);
    frame.position.set(xPos, 2, 3.6);
    frame.castShadow = true;
    store.add(frame);
  });
  
  const hFrameTop = new THREE.Mesh(new THREE.BoxGeometry(30.5, 0.3, 0.25), frameMat);
hFrameTop.position.set(0, 3.7, 3.6); // top bar only
hFrameTop.castShadow = true;
store.add(hFrameTop);

  
  [-2, 2].forEach(xPos => {
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 })
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.set(xPos, 2, 3.75);
    store.add(handle);
  });
  
  const kipperSign = new THREE.Mesh(
    new THREE.BoxGeometry(13, 2.8, 0.35),
    new THREE.MeshStandardMaterial({ 
      map: createTextTexture('kipper', '#e63946'), 
      roughness: 0.4, 
      emissive: 0x330000, 
      emissiveIntensity: 0.15 
    })
  );
  kipperSign.position.set(0, 5.8, 3.75);
  kipperSign.castShadow = true;
  store.add(kipperSign);
  
  const check = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.3, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x1a5c3a, emissiveIntensity: 0.3 })
  );
  check.position.set(3.5, 5.8, 3.95);
  check.rotation.z = Math.PI / 4;
  store.add(check);
  
  const milkTex = createTextTexture('Milk', '#5da7d9', 120);
  const milkBillboard = new THREE.Mesh(
    new THREE.BoxGeometry(10, 4, 0.3),
    new THREE.MeshStandardMaterial({ map: milkTex, roughness: 0.3 })
  );
  milkBillboard.position.set(0, 11, 0);
  milkBillboard.castShadow = true;
  store.add(milkBillboard);
  
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(31, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6, metalness: 0.3 })
  );
  roof.position.set(0, 9.75, 0);
  roof.castShadow = true;
  store.add(roof);
  
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(30.5, 0.4, 7.5),
    new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 })
  );
  foundation.position.set(0, 0.2, 0);
  foundation.receiveShadow = true;
  store.add(foundation);
  
  store.position.set(x, 0, z);
  return store;
}

/* ============ Balkan Grill Building ============ */
function makeGrillShop(x, z, w, h, d) {
  const building = new THREE.Group();
  
  const main = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0x6b4c3b, map: textures.brick, roughness: 0.95 })
  );
  main.position.set(0, h / 2, 0);
  main.castShadow = true;
  main.receiveShadow = true;
  building.add(main);
  
  const opening = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.7, h * 0.5, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
  );
  opening.position.set(0, h * 0.3, d / 2 + 0.1);
  building.add(opening);
  
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 });
  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, 0.3, 0.2), frameMat);
  topFrame.position.set(0, h * 0.55, d / 2 + 0.2);
  building.add(topFrame);
  
  [-w * 0.35, w * 0.35].forEach(xPos => {
    const sideFrame = new THREE.Mesh(new THREE.BoxGeometry(0.3, h * 0.55, 0.2), frameMat);
    sideFrame.position.set(xPos, h * 0.3, d / 2 + 0.2);
    building.add(sideFrame);
  });
  
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(w + 1, 0.2, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 })
  );
  awning.position.set(0, h - 0.1, d / 2 + 1);
  awning.castShadow = true;
  building.add(awning);
  
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.8, 1, 0.2),
    new THREE.MeshStandardMaterial({ 
      map: createTextTexture('PULA 260 DEN', '#cc3333', 70), 
      roughness: 0.6 
    })
  );
  sign.position.set(0, h + 0.5, d / 2 - 0.5);
  sign.castShadow = true;
  building.add(sign);
  

  
  building.position.set(x, 0, z);
  return building;
}

/* ============ Add Buildings with Platforms ============ */
const buildingData = [
  { x: 40, z: -14, type: 'grill' },
  { x: 18, z: -16, type: 'kipper' }
];

buildingData.forEach(data => {
  const height = 1.5 * (1 - (data.x / 50) ** 2);
  
  const platformSize = data.type === 'grill' ? [14, 6] : [32, 5];
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(platformSize[0], height + 0.5, platformSize[1]),
    groundMat
  );
  platform.position.set(data.x, (height + 0.5) / 2, data.z - (data.type === 'grill' ? 1 : 1.5));
  platform.receiveShadow = true;
  platform.castShadow = true;
  world.add(platform);
  
  const building = data.type === 'grill' 
    ? makeGrillShop(data.x, data.z, 12, 7, 8)
    : makeKipperStore(data.x, data.z);
  building.position.y = 0.5 + height;
  world.add(building);
});

/* ============ Streetlights ============ */
function makeStreetLight(x, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 5, 12),
    new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.7 })
  );
  pole.position.set(x, 2.5, z);
  pole.castShadow = true;
  pole.receiveShadow = true;
  g.add(pole);
  
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.12, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.7 })
  );
  arm.position.set(x + 0.6, 4.6, z);
  arm.castShadow = true;
  g.add(arm);
  
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffd36a, emissiveIntensity: 0.8 })
  );
  bulb.position.set(x + 1.15, 4.6, z);
  g.add(bulb);
  
  const light = new THREE.PointLight(0xffe6a8, 0.65, 18, 2);
  light.position.copy(bulb.position);
  g.add(light);
  
  return g;
}

for (let x = -48; x <= 48; x += 8) {
  const height = 1.5 * (1 - (x / 50) ** 2);
  [7, -7].forEach(z => {
    const lamp = makeStreetLight(x, z);
    lamp.position.y = height;
    world.add(lamp);
  });
}

/* ============ Trees ============ */
function makeTree(x, z, h = 6) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.35, h * 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.95 })
  );
  trunk.position.y = h * 0.2;
  trunk.castShadow = true;
  tree.add(trunk);
  
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3a7d44, roughness: 0.9 });
  [0.55, 0.75].forEach((yFactor, i) => {
    const size = i === 0 ? 0.35 : 0.25;
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(h * size, 8, 8), foliageMat);
    foliage.position.y = h * yFactor;
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    tree.add(foliage);
  });
  
  tree.position.set(x, 0, z);
  return tree;
}

const treePositions = [
  [10,19,7], [6,24,6], [13,29,7], [5,32,6.5], [30,19,6.5],
  [34,24,7], [32,29,6], [28,38,7], [17,38,6], [10,37,6.5],
  [25,34,6], [15,16,6.5], [25,16,6], [13,26,5.5], [27,26,6]
];
treePositions.forEach(([x, z, h]) => world.add(makeTree(x, z, h)));

/* ============ Park Paths ============ */
const pathMat = new THREE.MeshStandardMaterial({ color: 0xa89f91, roughness: 0.9 });
const paths = [
  [25, 2.5, 20, 24],
  [2.5, 28, 20, 30],
  [10, 1.8, 15, 17],
  [10, 1.8, 25, 31]
];
paths.forEach(([w, d, x, z]) => {
  const path = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(x, 0.02, z);
  path.receiveShadow = true;
  world.add(path);
});

/* ============ Park Benches ============ */
function makeBench(x, z, rotY) {
  const bench = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
  
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.5), woodMat);
  seat.position.y = 0.45;
  seat.castShadow = true;
  bench.add(seat);
  
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.08), woodMat);
  backrest.position.set(0, 0.65, -0.2);
  backrest.castShadow = true;
  bench.add(backrest);
  
  [[-0.6, 0.15], [0.6, 0.15], [-0.6, -0.15], [0.6, -0.15]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), metalMat);
    leg.position.set(x, 0.225, z);
    leg.castShadow = true;
    bench.add(leg);
  });
  
  bench.position.set(x, 0, z);
  bench.rotation.y = rotY;
  return bench;
}

const benches = [
  [18, 28, Math.PI/2], [22, 40, -Math.PI/2], [15, 32, 0], [30, 38, Math.PI],
  [12, 20, Math.PI/4], [28, 20, -Math.PI/4], [12, 35, 3*Math.PI/4], [28, 28, -3*Math.PI/4]
];
benches.forEach(([x, z, rot]) => world.add(makeBench(x, z, rot)));

/* ============ Park Ground ============ */
const parkGround = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 30),
  new THREE.MeshStandardMaterial({ color: 0x4a8f3a, map: textures.grass, roughness: 0.95 })
);
parkGround.rotation.x = -Math.PI / 2;
parkGround.position.set(26, 0.01, 30);
parkGround.receiveShadow = true;
world.add(parkGround);

/* ============ Landmark (Mosque) ============ */
const gltfLoader = new GLTFLoader();
let landmark = null;

gltfLoader.load("assets/Sarena.glb", (gltf) => {
  landmark = gltf.scene;
  landmark.name = "LANDMARK_CLICKABLE";
  
  const toRemove = [];
  landmark.traverse((obj) => {
    if (!obj.isMesh) return;
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    const isThin = size.y < 0.5;
    const isLarge = size.x > 3 || size.z > 3;
    const hasExtremeAspect = (size.x / Math.max(size.y, 0.0001) > 20) || (size.z / Math.max(size.y, 0.0001) > 20);
    const hasPlanelikeName = obj.name && (obj.name.toLowerCase().includes("plane") || 
      obj.name.toLowerCase().includes("ground") || obj.name.toLowerCase().includes("base") || 
      obj.name.toLowerCase().includes("floor"));
    
    let isWhite = false;
    if (obj.material) {
      const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      if (mat.color) {
        const c = mat.color;
        isWhite = c.r > 0.6 && c.g > 0.6 && c.b > 0.6 && size.x < 3 && size.y < 3 && size.z < 3;
      }
    }
    
    const isTiny = size.x < 2 && size.y < 2 && size.z < 2;
    
    if ((isThin && isLarge) || hasExtremeAspect || hasPlanelikeName || isWhite || isTiny) {
      toRemove.push(obj);
    }
  });
  
  toRemove.forEach(m => m.parent && m.parent.remove(m));
  
  landmark.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  
  const box = new THREE.Box3().setFromObject(landmark);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = 26 / Math.max(size.y, 0.0001);
  landmark.scale.setScalar(scale);
  
  const box2 = new THREE.Box3().setFromObject(landmark);
  landmark.position.set(-7, -box2.min.y, 1);
  landmark.rotation.y = Math.PI / 1.25;
  
  world.add(landmark);
});

/* ============ Bus Stop ============ */
gltfLoader.load("assets/standard_bus_stop/scene.gltf", (gltf) => {
  const busStop = gltf.scene;
  busStop.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  
  const box = new THREE.Box3().setFromObject(busStop);
  const size = new THREE.Vector3();
  box.getSize(size);
  busStop.scale.setScalar(6 / Math.max(size.x, 0.0001));
  
  const box2 = new THREE.Box3().setFromObject(busStop);
  busStop.position.set(-18, -box2.min.y + 2, 12);
  busStop.rotation.y = Math.PI;
  world.add(busStop);
});

/* ============ Cars ============ */
function makeCar(color) {
  const car = new THREE.Group();
  const carMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 });
  
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.8, 1.4), carMat);
  body.position.y = 0.65;
  body.castShadow = true;
  car.add(body);
  
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.2), carMat);
  top.position.set(-0.15, 1.1, 0);
  top.castShadow = true;
  car.add(top);
  
  const wheelGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.33, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });
  
  [[0.9, 0.7], [-0.9, 0.7], [0.9, -0.7], [-0.9, -0.7]].forEach(([x, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(x, 0.35, z);
    car.add(wheel);
  });
  
  return car;
}

const cars = [
  { mesh: makeCar(0xd94b4b), z: 1.6, speed: 3.2, x: -28, reverse: false },
  { mesh: makeCar(0x4b8bd9), z: -1.6, speed: 2.6, x: 28, reverse: true }
];

cars.forEach(c => {
  c.mesh.position.set(c.x, 0, c.z);
  c.mesh.rotation.y = c.reverse ? Math.PI : 0;
  c.mesh.castShadow = true;
  world.add(c.mesh);
});

/* ============ Click Interaction ============ */
const panel = document.getElementById("panel");
const panelText = document.getElementById("panelText");
const closeBtn = document.getElementById("closeBtn");

panelText.textContent = "Šarena Džamija (The Painted Mosque) is one of the most beautiful mosques in the Balkans, built in 1438. It features over 30,000 hand-painted decorative elements covering its exterior and interior walls. The mosque's stunning floral and geometric patterns were created using natural dyes and gold leaf. Its name 'Šarena' means 'colorful' or 'painted' in Macedonian. The mosque was renovated in 1833 by Abdurrahman Pasha, who added much of the intricate decoration we see today. It's a masterpiece of Islamic art and a symbol of Tetovo's rich cultural heritage.";

closeBtn.addEventListener("click", () => panel.style.display = "none");

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const targets = landmark ? [landmark] : [];
  const intersects = raycaster.intersectObjects(targets, true);
  if (intersects.length > 0) panel.style.display = "block";
});

/* ============ Keyboard Controls ============ */
const keyboard = { w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key in keyboard) keyboard[key] = true;
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key in keyboard) keyboard[key] = false;
});

/* ============ Window Resize ============ */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ============ Animation Loop ============ */
const clock = new THREE.Clock();
let riverTime = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  
  // Keyboard movement
  if (keyboard.w || keyboard.s || keyboard.a || keyboard.d) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    const movement = new THREE.Vector3();
    if (keyboard.w) movement.add(forward.multiplyScalar(15 * dt));
    if (keyboard.s) movement.add(forward.multiplyScalar(-15 * dt));
    if (keyboard.a) movement.add(right.multiplyScalar(-15 * dt));
    if (keyboard.d) movement.add(right.multiplyScalar(15 * dt));
    
    camera.position.add(movement);
    controls.target.add(movement);
  }
  
  // Cars
  cars.forEach(c => {
    const dir = c.reverse ? -1 : 1;
    c.mesh.position.x += dir * c.speed * dt;
    if (!c.reverse && c.mesh.position.x > 32) c.mesh.position.x = -32;
    if (c.reverse && c.mesh.position.x < -32) c.mesh.position.x = 32;
    const height = 1.5 * (1 - (c.mesh.position.x / 50) ** 2);
    c.mesh.position.y = 0.5 + height;
  });
  
  // River animation
  riverTime += dt;
  if (textures.water) {
    textures.water.offset.y += 0.08 * dt;
    textures.water.offset.x = Math.sin(riverTime * 0.5) * 0.015;
  }
  
  controls.update();
  renderer.render(scene, camera);
}

animate();