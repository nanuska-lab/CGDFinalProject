import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* ---------------- Scene / Camera / Renderer ---------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8f0);  // ☀️ WARM SUMMER SKY BLUE
// Fog removed for clearer visibility

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  400
);
camera.position.set(20, 55, 35);  // Higher up, more top-down angle
camera.lookAt(20, 0, 24);  // Looking at the landmark/park area

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/* ---------------- Controls ---------------- */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(20, 0, 24);  // Focus on landmark area

/* ---------------- Lights ---------------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.7));  // ☀️ BRIGHT summer ambient

const sun = new THREE.DirectionalLight(0xfff4e6, 1.6);  // ☀️ WARM golden sunlight
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
    undefined,
    undefined,
    () => console.warn("Texture failed to load:", path)
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

const grassTexture = safeLoadTexture("textures/grass.jpg", { repeatX: 6, repeatY: 6 });
const roadTexture = safeLoadTexture("textures/road.jpg", { repeatX: 1, repeatY: 4 });
const brickTexture = safeLoadTexture("textures/brick.jpg", { repeatX: 2, repeatY: 2 });

/* ---------------- World Group ---------------- */
const world = new THREE.Group();
scene.add(world);

/* ---------------- Ground + Road + Sidewalks ---------------- */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220),
  new THREE.MeshStandardMaterial({ 
    color: 0xd4e0c8,  // 🌿 Light natural greenish tone (no texture)
    roughness: 0.9
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
world.add(ground);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 12),
  new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.95 })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.02;
road.receiveShadow = true;
world.add(road);

const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x3b4452, roughness: 0.9 });
const sidewalk1 = new THREE.Mesh(new THREE.BoxGeometry(60, 0.4, 3), sidewalkMat);
sidewalk1.position.set(0, 0.2, 7.5);
sidewalk1.receiveShadow = true;

const sidewalk2 = sidewalk1.clone();
sidewalk2.position.set(0, 0.2, -7.5);
world.add(sidewalk1, sidewalk2);

// road dashed lines
const lineMat = new THREE.MeshStandardMaterial({ color: 0xe9e9e9, roughness: 0.7 });
for (let i = -26; i <= 26; i += 6) {
  const line = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.25), lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(i, 0.03, 0);
  world.add(line);
}

/* ---------------- Buildings ---------------- */
const brickMaterial = new THREE.MeshStandardMaterial({ map: brickTexture, roughness: 0.95 });

function makeBuilding(x, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), brickMaterial);
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

world.add(makeBuilding(-18, 14, 10, 8, 8));
// world.add(makeBuilding(-2, 14, 9, 10, 7));
// world.add(makeBuilding(14, 14, 12, 7, 8));

world.add(makeBuilding(-18, -14, 12, 7, 8));
world.add(makeBuilding(-2, -14, 9, 9, 7));
world.add(makeBuilding(14, -14, 10, 11, 8));

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

for (let i = -24; i <= 24; i += 8) {
  world.add(makeStreetLight(i, 5.8));
  world.add(makeStreetLight(i, -5.8));
}

/* ---------------- Trees (Park atmosphere) ---------------- */
function makeTree(x, z, height = 6) {
  const tree = new THREE.Group();
  
  // Tree trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.35, height * 0.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.95 })
  );
  trunk.position.y = height * 0.2;
  trunk.castShadow = true;
  
  // Tree foliage (multiple spheres for fuller look)
  const foliageMat = new THREE.MeshStandardMaterial({ 
    color: 0x3a7d44, 
    roughness: 0.9 
  });
  
  const foliage1 = new THREE.Mesh(
    new THREE.SphereGeometry(height * 0.35, 8, 8),
    foliageMat
  );
  foliage1.position.y = height * 0.55;
  foliage1.castShadow = true;
  foliage1.receiveShadow = true;
  
  const foliage2 = new THREE.Mesh(
    new THREE.SphereGeometry(height * 0.25, 8, 8),
    foliageMat
  );
  foliage2.position.y = height * 0.75;
  foliage2.castShadow = true;
  foliage2.receiveShadow = true;
  
  tree.add(trunk, foliage1, foliage2);
  tree.position.set(x, 0, z);
  
  return tree;
}

// Park area around the landmark (position centered at 20, 0, 24)
// Trees arranged in a park-like pattern around landmark position (20, 0, 24)
const parkTrees = [
  // Left side of park
  makeTree(10, 19, 7),
  makeTree(6, 24, 6),
  makeTree(13, 29, 7),
  makeTree(5, 32, 6.5),
  
  // Right side of park
  makeTree(30, 19, 6.5),
  makeTree(34, 24, 7),
  makeTree(32, 29, 6),
  makeTree(28, 38, 7),
  
  // Back of park
  makeTree(17, 38, 6),
  makeTree(10, 37, 6.5),
  makeTree(25, 34, 6),
  
  // Front of park (near road)
  makeTree(15, 16, 6.5),
  makeTree(25, 16, 6),
  
  // Additional scattered trees
  makeTree(13, 26, 5.5),
  makeTree(27, 26, 6),
];

parkTrees.forEach(tree => world.add(tree));

/* ---------------- Park Paths (walking paths) ---------------- */
const pathMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xa89f91,  // Light beige/tan for paths
  roughness: 0.9
});

// Main central path (horizontal through park)
const mainPath = new THREE.Mesh(
  new THREE.PlaneGeometry(25, 2.5),
  pathMaterial
);
mainPath.rotation.x = -Math.PI / 2;
mainPath.position.set(20, 0.02, 24);
mainPath.receiveShadow = true;
world.add(mainPath);

// Vertical path (crossing the main path)
const verticalPath = new THREE.Mesh(
  new THREE.PlaneGeometry(2.5, 28),
  pathMaterial
);
verticalPath.rotation.x = -Math.PI / 2;
verticalPath.position.set(20, 0.02, 30);
verticalPath.receiveShadow = true;
world.add(verticalPath);

// Side paths connecting to main paths
const sidePath1 = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 1.8),
  pathMaterial
);
sidePath1.rotation.x = -Math.PI / 2;
sidePath1.position.set(15, 0.02, 17);
sidePath1.receiveShadow = true;
world.add(sidePath1);

const sidePath2 = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 1.8),
  pathMaterial
);
sidePath2.rotation.x = -Math.PI / 2;
sidePath2.position.set(25, 0.02, 31);
sidePath2.receiveShadow = true;
world.add(sidePath2);

/* ---------------- Park Benches ---------------- */
function makeBench(x, z, rotationY = 0) {
  const bench = new THREE.Group();
  
  // Bench seat
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.08, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 })
  );
  seat.position.y = 0.45;
  seat.castShadow = true;
  
  // Bench backrest
  const backrest = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.6, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 })
  );
  backrest.position.set(0, 0.65, -0.2);
  backrest.castShadow = true;
  
  // Bench legs (4 legs)
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

// Place benches around the park (centered at 20, 24)
const benches = [
  // Benches facing the landmark (around the center)
  makeBench(18, 28, Math.PI / 2),  // Left side, facing center
  makeBench(22, 40, -Math.PI / 2), // Right side, facing center
  makeBench(15, 32, 0),             // Front, facing landmark
  makeBench(30, 38, Math.PI),       // Back, facing landmark
  
  // Corner benches
  makeBench(12, 20, Math.PI / 4),   // Front-left corner
  makeBench(28, 20, -Math.PI / 4),  // Front-right corner
  makeBench(12, 35, 3 * Math.PI / 4), // Back-left corner
  makeBench(28, 28, -3 * Math.PI / 4), // Back-right corner
];

benches.forEach(bench => world.add(bench));

/* ---------------- Park Ground (grass area around landmark) ---------------- */
const parkGround = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 30),
  new THREE.MeshStandardMaterial({ 
    color: 0x4a8f3a,  // 🌿 Darker green for park grass
    roughness: 0.95
  })
);
parkGround.rotation.x = -Math.PI / 2;
parkGround.position.set(25, 0.01, 30);
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

    console.log("=== GLB MODEL ANALYSIS ===");
    
    // --- IMPROVED DETECTION: Log all meshes first ---
    landmark.traverse((obj) => {
      if (obj.isMesh) {
        const b = new THREE.Box3().setFromObject(obj);
        const s = new THREE.Vector3();
        b.getSize(s);
        
        console.log(`📦 Mesh: "${obj.name || 'unnamed'}"`, {
          width: s.x.toFixed(3),
          height: s.y.toFixed(3),
          depth: s.z.toFixed(3),
          aspectRatio: (s.x / Math.max(s.y, 0.0001)).toFixed(1) + ':1'
        });
      }
    });

    // --- REMOVE FLAT PLANES + WHITE CUBES (improved detection) ---
    const toRemove = [];
    landmark.traverse((obj) => {
      if (!obj.isMesh) return;

      const b = new THREE.Box3().setFromObject(obj);
      const s = new THREE.Vector3();
      b.getSize(s);

      // Multiple detection strategies:
      
      // Strategy 1: Very thin + large area (your original)
      const isVeryThin = s.y < 0.5;  // increased threshold
      const isVeryLarge = s.x > 3 || s.z > 3;  // decreased threshold
      
      // Strategy 2: Extreme aspect ratio (width/height or depth/height >> 1)
      const aspectRatioXY = s.x / Math.max(s.y, 0.0001);
      const aspectRatioZY = s.z / Math.max(s.y, 0.0001);
      const hasExtremeAspectRatio = aspectRatioXY > 20 || aspectRatioZY > 20;
      
      // Strategy 3: Check if it's named something like "plane" or "ground"
      const hasPlanelikeName = obj.name && 
        (obj.name.toLowerCase().includes('plane') || 
         obj.name.toLowerCase().includes('ground') ||
         obj.name.toLowerCase().includes('base') ||
         obj.name.toLowerCase().includes('floor'));

      // Strategy 4: Check for white/light colored materials (the cube/sphere)
      let isWhiteObject = false;
      if (obj.material) {
        const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (mat.color) {
          const c = mat.color;
          // Check if color is very light (close to white/gray) - more aggressive
          const isLight = c.r > 0.6 && c.g > 0.6 && c.b > 0.6;
          // Check if it's small (less than 3 units in any dimension)
          const isSmall = s.x < 3 && s.y < 3 && s.z < 3;
          isWhiteObject = isLight && isSmall;
        }
      }
      
      // Strategy 5: Remove very small meshes (likely artifacts)
      const isTiny = s.x < 2 && s.y < 2 && s.z < 2;

      if ((isVeryThin && isVeryLarge) || hasExtremeAspectRatio || hasPlanelikeName || isWhiteObject || isTiny) {
        console.log(`🗑️ REMOVING: "${obj.name || 'unnamed'}" (size: ${s.x.toFixed(2)} x ${s.y.toFixed(2)} x ${s.z.toFixed(2)})`);
        toRemove.push(obj);
      }
    });

    toRemove.forEach((m) => {
      if (m.parent) m.parent.remove(m);
    });

    console.log(`✅ Removed ${toRemove.length} flat plane(s)`);
    console.log("=========================");

    // --- Enable shadows (after removal) ---
    landmark.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    // --- SCALE IT UP to match buildings (12-15 units height) ---
    const box = new THREE.Box3().setFromObject(landmark);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Target height larger than tallest building (11 units)
    const targetHeight = 16;  // make it prominent and larger than buildings
    const sy = Math.max(size.y, 0.0001);
    const scale = targetHeight / sy;
    landmark.scale.setScalar(scale);

    console.log(`📏 Scaled landmark to height: ${targetHeight} (scale factor: ${scale.toFixed(2)})`);

    // --- Put it on the ground properly ---
    const box2 = new THREE.Box3().setFromObject(landmark);
    const minY = box2.min.y;

    // Place it at position (70, 45) and rotate 90 degrees to the left
    landmark.position.set(10, -minY, 10);
    landmark.rotation.y = Math.PI / 1.25;  // 90 degrees rotation to the left (stairs to the side)

    world.add(landmark);
  },
  undefined,
  (err) => console.error("Error loading Sarena.glb:", err)
);


/* ---------------- Simple cars (animated loop) ---------------- */
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

/* ---------------- Landmark click (raycasting) ---------------- */
const panel = document.getElementById("panel");
const panelText = document.getElementById("panelText");
const closeBtn = document.getElementById("closeBtn");

panelText.textContent =
  "Šarena Džamija is a famous landmark in Tetovo. Click on the 3D model to open this info panel.";

closeBtn.addEventListener("click", () => (panel.style.display = "none"));

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", (event) => {
  // normalized device coords
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

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  // animate cars
  cars.forEach((c) => {
    const dir = c.reverse ? -1 : 1;
    c.mesh.position.x += dir * c.speed * dt;

    if (!c.reverse && c.mesh.position.x > 32) c.mesh.position.x = -32;
    if (c.reverse && c.mesh.position.x < -32) c.mesh.position.x = 32;
  });

  controls.update();
  renderer.render(scene, camera);
}

animate();