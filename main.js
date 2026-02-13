import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* ---------------- Scene / Camera / Renderer ---------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8f0);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  400
);
camera.position.set(20, 55, 35);
camera.lookAt(20, 0, 24);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/* ---------------- Controls ---------------- */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(20, 0, 24);

/* ---------------- Lights ---------------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.7));

const sun = new THREE.DirectionalLight(0xfff4e6, 1.6);
sun.position.set(20, 25, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 120;
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
scene.add(sun);

/* ---------------- Texture Loader ---------------- */
const textureLoader = new THREE.TextureLoader();

function safeLoadTexture(path, { repeatX = 1, repeatY = 1 } = {}) {
  const tex = textureLoader.load(
    path,
    (texture) => {
      console.log("✓ Texture loaded successfully:", path);
      texture.needsUpdate = true;
    },
    undefined,
    (error) => {
      console.error("✗ Texture failed to load:", path, error);
    }
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

const grassTexture = safeLoadTexture("textures/grass.jpg", { repeatX: 6, repeatY: 6 });
const roadTexture = safeLoadTexture("textures/road.jpg", { repeatX: 15, repeatY: 1 });
const brickTexture = safeLoadTexture("textures/brick.jpg", { repeatX: 2, repeatY: 2 });
const sidewalkTexture = safeLoadTexture("textures/sidewalk.jpg", { repeatX: 15, repeatY: 1 });
const facadeTexture = safeLoadTexture("textures/metal.jpg", { repeatX: 2, repeatY: 1 });

/* ---------------- World Group ---------------- */
const world = new THREE.Group();
scene.add(world);

/* ---------------- Ground ---------------- */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(110, 115),
  new THREE.MeshStandardMaterial({
    color: 0xd4e0c8,
    roughness: 0.9,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
world.add(ground);

/* ---------------- River (single, fixed) ---------------- */
const waterTexture = safeLoadTexture("textures/water.jpg", { repeatX:1, repeatY: 15 });

const riverMaterial = new THREE.MeshStandardMaterial({
  color: 0x5a9fc4,
  map: waterTexture,
  transparent: true,
  opacity: 5,
});

const RIVER_LENGTH = 100;
const RIVER_WIDTH = 9;

const river = new THREE.Mesh(
  new THREE.PlaneGeometry(RIVER_WIDTH, RIVER_LENGTH),
  riverMaterial
);
river.rotation.x = -Math.PI / 2;
river.position.set(-4, 0.01, 7); 
river.receiveShadow = true;
river.scale.x = (RIVER_WIDTH - 0.2) / RIVER_WIDTH;
world.add(river);

/* ---------------- River Banks (FIXED) ---------------- */
const bankMaterial = new THREE.MeshStandardMaterial({
  color: 0x6b5d4f,
  roughness: 0.9,
});

const BANK_THICKNESS = 1.0; 
const BANK_HEIGHT = 0.6;
const bankOffsetX = (RIVER_WIDTH / 2) + (BANK_THICKNESS / 2);

// Left bank (-X)
const riverBankLeft = new THREE.Mesh(
  new THREE.BoxGeometry(BANK_THICKNESS, BANK_HEIGHT, RIVER_LENGTH),
  bankMaterial
);
riverBankLeft.position.set(
  river.position.x - bankOffsetX,
  BANK_HEIGHT / 2 - 0.1,
  river.position.z
);
riverBankLeft.castShadow = true;
riverBankLeft.receiveShadow = true;
world.add(riverBankLeft);

// Right bank (+X)
const riverBankRight = riverBankLeft.clone();
riverBankRight.position.x = river.position.x + bankOffsetX;
world.add(riverBankRight);

/* ---------------- Stairs (River -> Park) ---------------- */
function makeStairs({
  x = 3.5,
  z = 24,
  steps = 7,          
  stepW = 6,
  stepH = 0.2,
  stepD = 1.0,
  dirZ = 1,
} = {}) {
  const g = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8a8a8a,
    map: sidewalkTexture,
    roughness: 0.9,
  });

  for (let i = 0; i < steps; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat);
    s.castShadow = true;
    s.receiveShadow = true;

    s.position.set(
      0,
      stepH / 2 + i * stepH,
      dirZ * (i * stepD)
    );

    g.add(s);
  }
  g.position.set(5, 0, z);
  g.rotation.y = Math.PI; 
  return g;
}

world.add(
  makeStairs({
    x: river.position.x + (RIVER_WIDTH / 2) + 1.0,
    z: 20.3,
    steps: 7,
    dirZ: 1,
  })
);

const riverData = { mesh: river, time: 0 };
/* ---------------- Curved Bridge Road ---------------- */
const roadSegments = 60;
const roadCurveGeometry = new THREE.PlaneGeometry(100, 12, roadSegments, 1);
const positions = roadCurveGeometry.attributes.position;

for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i);
  const z = positions.getZ(i);
  const normalizedX = x / 50;
  const height = 1.5 * (1 - normalizedX * normalizedX);
  positions.setZ(i, z + height);
}
positions.needsUpdate = true;
roadCurveGeometry.computeVertexNormals();

const road = new THREE.Mesh(
  roadCurveGeometry,
  new THREE.MeshStandardMaterial({
    color: 0x4a4a4a,
    map: roadTexture,
    roughness: 0.95,
    side: THREE.DoubleSide,
  })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.5;
road.receiveShadow = true;
road.castShadow = true;
world.add(road);

/* ---------------- Curved Sidewalks ---------------- */
const sidewalkMat = new THREE.MeshStandardMaterial({
  color: 0x8a8a8a,
  map: sidewalkTexture,
  roughness: 0.9,
});

const leftSidewalkGeometry = new THREE.BoxGeometry(100, 0.4, 8, roadSegments, 1, 1);
const leftSidewalkPositions = leftSidewalkGeometry.attributes.position;

for (let i = 0; i < leftSidewalkPositions.count; i++) {
  const x = leftSidewalkPositions.getX(i);
  const normalizedX = x / 50;
  const height = 1.5 * (1 - normalizedX * normalizedX);
  leftSidewalkPositions.setY(i, leftSidewalkPositions.getY(i) + height);
}
leftSidewalkPositions.needsUpdate = true;
leftSidewalkGeometry.computeVertexNormals();

const sidewalk1 = new THREE.Mesh(leftSidewalkGeometry, sidewalkMat);
sidewalk1.position.set(0, 0.5, 10);
sidewalk1.receiveShadow = true;
sidewalk1.castShadow = true;
world.add(sidewalk1);

const rightSidewalkGeometry = new THREE.BoxGeometry(100, 0.4, 8, roadSegments, 1, 1);
const rightSidewalkPositions = rightSidewalkGeometry.attributes.position;

for (let i = 0; i < rightSidewalkPositions.count; i++) {
  const x = rightSidewalkPositions.getX(i);
  const normalizedX = x / 50;
  const height = 1.5 * (1 - normalizedX * normalizedX);
  rightSidewalkPositions.setY(i, rightSidewalkPositions.getY(i) + height);
}
rightSidewalkPositions.needsUpdate = true;
rightSidewalkGeometry.computeVertexNormals();

const sidewalk2 = new THREE.Mesh(rightSidewalkGeometry, sidewalkMat);
sidewalk2.position.set(0, 0.5, -10);
sidewalk2.receiveShadow = true;
sidewalk2.castShadow = true;
world.add(sidewalk2);

/* ---------------- Road Lines ---------------- */
const ROAD_LENGTH = 100;
const DASH_LENGTH = 3;
const DASH_GAP = 3;
const DASH_STEP = DASH_LENGTH + DASH_GAP;
const lineMat = new THREE.MeshStandardMaterial({ color: 0xe9e9e9, roughness: 0.7 });

for (
  let x = -ROAD_LENGTH / 2 + DASH_LENGTH / 2;
  x <= ROAD_LENGTH / 2 - DASH_LENGTH / 2;
  x += DASH_STEP
) {
  const normalizedX = x / 50;
  const height = 1.5 * (1 - normalizedX * normalizedX);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(DASH_LENGTH, 0.25), lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(x, 0.52 + height, 0);
  world.add(line);
}

/* ---------------- Bridge Support Pillars ---------------- */
const bridgeSupportMaterial = new THREE.MeshStandardMaterial({
  color: 0x3b3b3b,
  roughness: 0.8,
});

const pillarPositions = [-30, -15, 0, 15, 30];

pillarPositions.forEach((xPos) => {
  const normalizedX = xPos / 50;
  const bridgeHeight = 1.5 * (1 - normalizedX * normalizedX);
  const pillarHeight = bridgeHeight + 1;

  const leftPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, pillarHeight, 8),
    bridgeSupportMaterial
  );
  leftPillar.position.set(xPos, pillarHeight / 2 - 0.5, 10);
  leftPillar.castShadow = true;
  leftPillar.receiveShadow = true;
  world.add(leftPillar);

  const rightPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, pillarHeight, 8),
    bridgeSupportMaterial
  );
  rightPillar.position.set(xPos, pillarHeight / 2 - 0.5, -10);
  rightPillar.castShadow = true;
  rightPillar.receiveShadow = true;
  world.add(rightPillar);
});

/* ---------------- Buildings ---------------- */
const brickMaterial = new THREE.MeshStandardMaterial({ map: brickTexture, roughness: 0.95 });
const facadeMaterial = new THREE.MeshStandardMaterial({ map: facadeTexture, roughness: 0.9,});

function makeBuilding(x, z, w, h, d, material = brickMaterial) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

world.add(makeBuilding(40, -18, 12, 7, 8));
world.add(makeBuilding(18, -20, 30, 9, 7, facadeMaterial));

/* ---------------- Streetlights ---------------- */
function makeStreetLight(x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 5, 12),
    new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.7 })
  );
  pole.position.set(x, 2.5, z);
  pole.castShadow = true;
  pole.receiveShadow = true;

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.12, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.7 })
  );
  arm.position.set(x + 0.6, 4.6, z);
  arm.castShadow = true;

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfff2cc,
      emissive: 0xffd36a,
      emissiveIntensity: 0.8,
    })
  );
  bulb.position.set(x + 1.15, 4.6, z);

  const light = new THREE.PointLight(0xffe6a8, 0.65, 18, 2);
  light.position.copy(bulb.position);

  const g = new THREE.Group();
  g.add(pole, arm, bulb, light);
  return g;
}

const LAMP_SPACING = 8;
const SIDEWALK_LENGTH = 100;
const SIDEWALK_Z = 6;
const EDGE_OFFSET = 9;

for (let x = -SIDEWALK_LENGTH / 2 + 2; x <= SIDEWALK_LENGTH / 2 - 2; x += LAMP_SPACING) {
  const normalizedX = x / 50;
  const bridgeHeight = 1.5 * (1 - normalizedX * normalizedX);


  const leftLight = makeStreetLight(x, SIDEWALK_Z + EDGE_OFFSET - 8);
  leftLight.position.y = bridgeHeight;
  world.add(leftLight);

  const rightLight = makeStreetLight(x, -SIDEWALK_Z - EDGE_OFFSET + 8);
  rightLight.position.y = bridgeHeight;
  world.add(rightLight);
}

/* ---------------- Trees ---------------- */
function makeTree(x, z, height = 6) {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.35, height * 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.95 })
  );
  trunk.position.y = height * 0.2;
  trunk.castShadow = true;

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x3a7d44,
    roughness: 0.9,
  });

  const foliage1 = new THREE.Mesh(new THREE.SphereGeometry(height * 0.35, 8, 8), foliageMat);
  foliage1.position.y = height * 0.55;
  foliage1.castShadow = true;
  foliage1.receiveShadow = true;

  const foliage2 = new THREE.Mesh(new THREE.SphereGeometry(height * 0.25, 8, 8), foliageMat);
  foliage2.position.y = height * 0.75;
  foliage2.castShadow = true;
  foliage2.receiveShadow = true;

  tree.add(trunk, foliage1, foliage2);
  tree.position.set(x, 0, z);

  return tree;
}

const parkTrees = [
  makeTree(10, 19, 7),
  makeTree(6, 24, 6),
  makeTree(13, 29, 7),
  makeTree(5, 32, 6.5),
  makeTree(30, 19, 6.5),
  makeTree(34, 24, 7),
  makeTree(32, 29, 6),
  makeTree(28, 38, 7),
  makeTree(17, 38, 6),
  makeTree(10, 37, 6.5),
  makeTree(25, 34, 6),
  makeTree(15, 16, 6.5),
  makeTree(25, 16, 6),
  makeTree(13, 26, 5.5),
  makeTree(27, 26, 6),
];

parkTrees.forEach((tree) => world.add(tree));

/* ---------------- Park Paths ---------------- */
const pathMaterial = new THREE.MeshStandardMaterial({
  color: 0xa89f91,
  roughness: 0.9,
});

const mainPath = new THREE.Mesh(new THREE.PlaneGeometry(25, 2.5), pathMaterial);
mainPath.rotation.x = -Math.PI / 2;
mainPath.position.set(20, 0.02, 24);
mainPath.receiveShadow = true;
world.add(mainPath);

const verticalPath = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 28), pathMaterial);
verticalPath.rotation.x = -Math.PI / 2;
verticalPath.position.set(20, 0.02, 30);
verticalPath.receiveShadow = true;
world.add(verticalPath);

const sidePath1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.8), pathMaterial);
sidePath1.rotation.x = -Math.PI / 2;
sidePath1.position.set(15, 0.02, 17);
sidePath1.receiveShadow = true;
world.add(sidePath1);

const sidePath2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.8), pathMaterial);
sidePath2.rotation.x = -Math.PI / 2;
sidePath2.position.set(25, 0.02, 31);
sidePath2.receiveShadow = true;
world.add(sidePath2);

/* ---------------- Park Benches ---------------- */
function makeBench(x, z, rotationY = 0) {
  const bench = new THREE.Group();

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.08, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 })
  );
  seat.position.y = 0.45;
  seat.castShadow = true;

  const backrest = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.6, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 })
  );
  backrest.position.set(0, 0.65, -0.2);
  backrest.castShadow = true;

  const legGeo = new THREE.BoxGeometry(0.08, 0.45, 0.08);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });

  const leg1 = new THREE.Mesh(legGeo, legMat);
  leg1.position.set(-0.6, 0.225, 0.15);
  leg1.castShadow = true;

  const leg2 = leg1.clone();
  leg2.position.set(0.6, 0.225, 0.15);

  const leg3 = leg1.clone();
  leg3.position.set(-0.6, 0.225, -0.15);

  const leg4 = leg1.clone();
  leg4.position.set(0.6, 0.225, -0.15);

  bench.add(seat, backrest, leg1, leg2, leg3, leg4);
  bench.position.set(x, 0, z);
  bench.rotation.y = rotationY;

  return bench;
}

const benches = [
  makeBench(18, 28, Math.PI / 2),
  makeBench(22, 40, -Math.PI / 2),
  makeBench(15, 32, 0),
  makeBench(30, 38, Math.PI),
  makeBench(12, 20, Math.PI / 4),
  makeBench(28, 20, -Math.PI / 4),
  makeBench(12, 35, (3 * Math.PI) / 4),
  makeBench(28, 28, (-3 * Math.PI) / 4),
];

benches.forEach((bench) => world.add(bench));

/* ---------------- Park Ground ---------------- */
const parkGround = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 30),
  new THREE.MeshStandardMaterial({
    color: 0x4a8f3a,
    map: grassTexture,
    roughness: 0.95,
  })
);
parkGround.rotation.x = -Math.PI / 2;
parkGround.position.set(26, 0.01, 30);
parkGround.receiveShadow = true;
world.add(parkGround);

/* ---------------- Landmark (Sarena.glb) ---------------- */
const gltfLoader = new GLTFLoader();
let landmark = null;

gltfLoader.load(
  "assets/Sarena.glb",
  (gltf) => {
    landmark = gltf.scene;
    landmark.name = "LANDMARK_CLICKABLE";

    const toRemove = [];
    landmark.traverse((obj) => {
      if (!obj.isMesh) return;

      const b = new THREE.Box3().setFromObject(obj);
      const s = new THREE.Vector3();
      b.getSize(s);

      const isVeryThin = s.y < 0.5;
      const isVeryLarge = s.x > 3 || s.z > 3;
      const aspectRatioXY = s.x / Math.max(s.y, 0.0001);
      const aspectRatioZY = s.z / Math.max(s.y, 0.0001);
      const hasExtremeAspectRatio = aspectRatioXY > 20 || aspectRatioZY > 20;

      const hasPlanelikeName =
        obj.name &&
        (obj.name.toLowerCase().includes("plane") ||
          obj.name.toLowerCase().includes("ground") ||
          obj.name.toLowerCase().includes("base") ||
          obj.name.toLowerCase().includes("floor"));

      let isWhiteObject = false;
      if (obj.material) {
        const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (mat.color) {
          const c = mat.color;
          const isLight = c.r > 0.6 && c.g > 0.6 && c.b > 0.6;
          const isSmall = s.x < 3 && s.y < 3 && s.z < 3;
          isWhiteObject = isLight && isSmall;
        }
      }

      const isTiny = s.x < 2 && s.y < 2 && s.z < 2;

      if (
        (isVeryThin && isVeryLarge) ||
        hasExtremeAspectRatio ||
        hasPlanelikeName ||
        isWhiteObject ||
        isTiny
      ) {
        toRemove.push(obj);
      }
    });

    toRemove.forEach((m) => {
      if (m.parent) m.parent.remove(m);
    });

    landmark.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(landmark);
    const size = new THREE.Vector3();
    box.getSize(size);

    const targetHeight = 26;
    const sy = Math.max(size.y, 0.0001);
    const scale = targetHeight / sy;
    landmark.scale.setScalar(scale);

    const box2 = new THREE.Box3().setFromObject(landmark);
    const minY = box2.min.y;

    landmark.position.set(-7, -minY, 1);
    landmark.rotation.y = Math.PI / 1.25;

    world.add(landmark);
  },
  undefined,
  (err) => console.error("Error loading Sarena.glb:", err)
);

/* ---------------- Bus Stop GLTF ---------------- */
function loadGLTF(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, (g) => resolve(g.scene), undefined, reject);
  });
}

(async () => {
  try {
    const busStop = await loadGLTF("assets/standard_bus_stop/scene.gltf");

    busStop.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(busStop);
    const size = new THREE.Vector3();
    box.getSize(size);

    const targetWidth = 6;
    const sx = Math.max(size.x, 0.0001);
    busStop.scale.setScalar(targetWidth / sx);

    const box2 = new THREE.Box3().setFromObject(busStop);
    const minY = box2.min.y;

    busStop.position.set(-6, -minY + 2.0, 9);
    busStop.rotation.y = Math.PI; 

    world.add(busStop);
  } catch (e) {
    console.error("Error loading bus stop:", e);
  }
})();

/* ---------------- Cars ---------------- */
function makeCar(color = 0xd94b4b) {
  const car = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.55, 0.9),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 })
  );
  body.position.y = 0.45;
  body.castShadow = true;

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.35, 0.8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 })
  );
  top.position.set(-0.1, 0.75, 0);
  top.castShadow = true;

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });
  const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.22, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const w1 = new THREE.Mesh(wheelGeo, wheelMat);
  const w2 = w1.clone();
  const w3 = w1.clone();
  const w4 = w1.clone();
  w1.position.set(0.6, 0.25, 0.45);
  w2.position.set(-0.6, 0.25, 0.45);
  w3.position.set(0.6, 0.25, -0.45);
  w4.position.set(-0.6, 0.25, -0.45);

  car.add(body, top, w1, w2, w3, w4);
  return car;
}

const cars = [
  { mesh: makeCar(0xd94b4b), laneZ: 1.6, speed: 3.2, x: -28 },
  { mesh: makeCar(0x4b8bd9), laneZ: -1.6, speed: 2.6, x: 28, reverse: true },
];

cars.forEach((c) => {
  c.mesh.position.set(c.x, 0, c.laneZ);
  c.mesh.rotation.y = c.reverse ? Math.PI : 0;
  c.mesh.castShadow = true;
  world.add(c.mesh);
});

/* ---------------- Click Interaction ---------------- */
const panel = document.getElementById("panel");
const panelText = document.getElementById("panelText");
const closeBtn = document.getElementById("closeBtn");

panelText.textContent =
  "Šarena Džamija is a famous landmark in Tetovo. Click on the 3D model to open this info panel.";

closeBtn.addEventListener("click", () => (panel.style.display = "none"));

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const targets = landmark ? [landmark] : [];
  const intersects = raycaster.intersectObjects(targets, true);

  if (intersects.length > 0) {
    panel.style.display = "block";
  }
});

/* ---------------- Resize ---------------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------- Animate ---------------- */
const clock = new THREE.Clock();
let riverTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  cars.forEach((c) => {
    const dir = c.reverse ? -1 : 1;
    c.mesh.position.x += dir * c.speed * dt;

    if (!c.reverse && c.mesh.position.x > 32) c.mesh.position.x = -32;
    if (c.reverse && c.mesh.position.x < -32) c.mesh.position.x = 32;

    // Calculate bridge height based on car's current X position
    const normalizedX = c.mesh.position.x / 50;
    const bridgeHeight = 1.5 * (1 - normalizedX * normalizedX);
    c.mesh.position.y = 0.5 + bridgeHeight; // 0.5 is the base road height
  });

  // River water flowing animation with wave effect
  riverTime += dt;
  if (waterTexture) {
    // Main flow direction
    waterTexture.offset.y += 0.08 * dt; // Faster flow speed
    
    // Add wave-like motion by slightly varying the X offset
    waterTexture.offset.x = Math.sin(riverTime * 0.5) * 0.015;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();