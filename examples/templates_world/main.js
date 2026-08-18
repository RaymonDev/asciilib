//templates_world: showcase demonstrating all asciilib templates, prefabs, and materials
import {
  Blitter,
  Camera,
  Scene,
  GridMapRaycaster,
  FirstPersonController,
  CompoundEntity,
  ASCIIMaterial,
  ASCIIBrush,
  MaterialPresets,
  createTaxi,
  createCyberCoupe,
  createCityBus,
  createVipSedan,
  createPedestrian,
  createTree,
  createStreetLamp,
  createTrafficLight,
  createSkyscraperShader,
  createRoadFloorShader,
  emitSteamPuff,
  emitSparks,
  emitRainDrop,
  updateVehicleFleet,
  updatePedestrianFleet,
  createSurveillanceDrone
} from '../../src/index.js';

// -------------------------------------------------------------------------
// 1. world layout & map generation
// -------------------------------------------------------------------------
const MAP_SIZE = 40;
const map = new Uint8Array(MAP_SIZE * MAP_SIZE);
const buildingHeights = new Float32Array(MAP_SIZE * MAP_SIZE);

//surround perimeter with city towers (values 10-18)
for (let y = 0; y < MAP_SIZE; y++) {
  for (let x = 0; x < MAP_SIZE; x++) {
    const isBorder = (x === 0 || x === MAP_SIZE - 1 || y === 0 || y === MAP_SIZE - 1);
    const isBlockA = (x >= 4 && x <= 12 && y >= 4 && y <= 12);
    const isBlockB = (x >= 28 && x <= 36 && y >= 4 && y <= 12);
    const isBlockC = (x >= 4 && x <= 12 && y >= 28 && y <= 36);
    const isBlockD = (x >= 28 && x <= 36 && y >= 28 && y <= 36);

    if (isBorder || isBlockA || isBlockB || isBlockC || isBlockD) {
      map[y * MAP_SIZE + x] = 10 + ((x * 3 + y * 7) % 8);
      buildingHeights[y * MAP_SIZE + x] = isBorder ? 18.0 : (8.0 + ((x + y) % 6) * 2.0);
    } else {
      map[y * MAP_SIZE + x] = 0; //open road / plaza
      buildingHeights[y * MAP_SIZE + x] = 0.0;
    }
  }
}

// -------------------------------------------------------------------------
// 2. scene & custom compound entities
// -------------------------------------------------------------------------
const scene = new Scene({ mapSize: MAP_SIZE, map, buildingHeights, cellSize: 6.0 });

//create a grand cyber monument at central plaza (x: 20, y: 20)
const cyberMonument = new CompoundEntity({ x: 20.0, y: 20.0, z: 0.0, angle: 0.0 });
//granite pedestal
cyberMonument.addBox({
  name: 'pedestal',
  minX: -1.2, maxX: 1.2,
  minY: -1.2, maxY: 1.2,
  minZ: 0.0, maxZ: 0.45,
  material: MaterialPresets.CONCRETE_SLAB
});
//chrome lower pillar
cyberMonument.addBox({
  name: 'chrome_base',
  minX: -0.6, maxX: 0.6,
  minY: -0.6, maxY: 0.6,
  minZ: 0.45, maxZ: 1.8,
  material: MaterialPresets.CHROME
});
//neon glowing core
cyberMonument.addCylinder({
  name: 'energy_core',
  x: 0.0, y: 0.0,
  radius: 0.42,
  minZ: 1.8, maxZ: 3.2,
  material: MaterialPresets.NEON_CYAN
});
//golden top spire
cyberMonument.addEllipsoid({
  name: 'spire_orb',
  x: 0.0, y: 0.0, z: 3.6,
  radXY: 0.5, radZ: 0.5,
  material: MaterialPresets.GOLD
});
cyberMonument.addSegment({
  name: 'lightning_rod',
  ax: 0.0, ay: 0.0, az: 4.1,
  bx: 0.0, by: 0.0, bz: 5.4,
  material: MaterialPresets.NEON_PINK
});
scene.add(cyberMonument);

//create a compact high-altitude surveillance drone with spinning propellers and hanging cctv camera
//create a surveillance drone with 45-degree overhead stalking companion mode
const cyberDrone = createSurveillanceDrone({
  x: 20.0,
  y: 24.4,
  z: 4.8,
  patrolCenter: { x: 20.0, y: 20.0, z: 4.8 },
  patrolRadius: 4.5,
  companionDist: 2.4,
  companionHeight: 2.4
});
scene.add(cyberDrone);

// -------------------------------------------------------------------------
// 3. populate prefabs (vehicles, pedestrians, street furniture)
// -------------------------------------------------------------------------
const vehicles = [];
const pedestrians = [];
const trafficLights = [];

//vehicles
const taxi1 = createTaxi({ x: 16.0, y: 15.65, angle: 0.0, speed: 5.0 });
const coupe1 = createCyberCoupe({ x: 24.0, y: 13.35, angle: Math.PI, speed: 5.2 });
const bus1 = createCityBus({ x: 14.0, y: 24.65, angle: 0.0, speed: 3.8 });
const sedan1 = createVipSedan({ x: 26.0, y: 26.35, angle: Math.PI, speed: 4.6 });

vehicles.push(taxi1, coupe1, bus1, sedan1);
vehicles.forEach(v => scene.add(v));

//pedestrians
const plazaLoop = [
  { x: 16.5, y: 16.5 },
  { x: 23.5, y: 16.5 },
  { x: 23.5, y: 23.5 },
  { x: 16.5, y: 23.5 }
];

for (let i = 0; i < 6; i++) {
  const p = createPedestrian({
    x: plazaLoop[i % plazaLoop.length].x,
    y: plazaLoop[i % plazaLoop.length].y,
    path: plazaLoop,
    isLoop: true,
    archetypeIndex: i,
    waypointIdx: (i + 1) % plazaLoop.length
  });
  pedestrians.push(p);
  scene.add(p);
}

//street furniture (trees, lamps, traffic lights)
const treePositions = [
  { x: 15.0, y: 15.0 }, { x: 25.0, y: 15.0 },
  { x: 15.0, y: 25.0 }, { x: 25.0, y: 25.0 }
];
treePositions.forEach(pos => {
  const t = createTree(pos);
  scene.add(t);
});

const lampPositions = [
  { x: 17.5, y: 17.5 }, { x: 22.5, y: 17.5 },
  { x: 17.5, y: 22.5 }, { x: 22.5, y: 22.5 }
];
lampPositions.forEach(pos => {
  const l = createStreetLamp(pos);
  scene.add(l);
});

const tl1 = createTrafficLight({ x: 14.5, y: 14.5, phaseGroup: 'EW', facingDir: 'north' });
const tl2 = createTrafficLight({ x: 25.5, y: 25.5, phaseGroup: 'NS', facingDir: 'south' });
trafficLights.push(tl1, tl2);
trafficLights.forEach(tl => scene.add(tl));

// -------------------------------------------------------------------------
// 4. rendering pipeline & shaders
// -------------------------------------------------------------------------
const canvas = document.getElementById('canvas3d');
const ctx = canvas.getContext('2d', { alpha: false });
let RENDER_COLS = 160;
let RENDER_ROWS = 90;
let CHAR_WIDTH = 7;
let CHAR_HEIGHT = 10;
let fontStyle = "bold 10px 'Courier New', monospace";
const blitter = new Blitter(RENDER_COLS, RENDER_ROWS, CHAR_WIDTH, CHAR_HEIGHT);
const raycaster = new GridMapRaycaster({ maxDepth: 60.0 });

const camera = new Camera({
  x: 20.0,
  y: 13.0,
  z: 1.0,
  angle: Math.PI / 2,
  pitch: 0.05,
  fov: 70,
  projectionScale: 0.60,
  far: 60.0
});

const customFacadeShader = createSkyscraperShader({
  litColor: '#ffeaa7',
  unlitColor: '#1e293b',
  pillarColor: '#94a3b8',
  signText: '[ ASCIILIB CORE ]',
  signColor: '#00ff88'
});

const customRoadShader = createRoadFloorShader();

// -------------------------------------------------------------------------
// 5. controls & state
// -------------------------------------------------------------------------
const keys = {};
let isPointerLocked = false;
let isTrafficActive = true;
let isSparksActive = true;
let isStarted = false;
let trafficLightTimer = 0;
let droneAngle = 0;
let propellerAngle = 0;

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyP') {
    isTrafficActive = !isTrafficActive;
    document.getElementById('hud-traffic-status').textContent = isTrafficActive ? 'ACTIVE' : 'OFF';
  }
  if (e.code === 'KeyO') {
    isSparksActive = !isSparksActive;
    document.getElementById('hud-sparks-status').textContent = isSparksActive ? 'ACTIVE' : 'OFF';
  }
  if (e.code === 'KeyC') {
    const mode = cyberDrone.toggleCompanion(camera);
    const droneHud = document.getElementById('hud-drone-mode');
    if (droneHud) droneHud.textContent = (mode === 'companion') ? 'STALKING 45°' : 'PATROL';
  }
  if (e.code === 'Escape') {
    toggleMenu();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

function tryLock() {
  if (isStarted && document.pointerLockElement !== canvas) {
    try {
      canvas.requestPointerLock();
    } catch (_) {}
  }
}

canvas.addEventListener('click', tryLock);
window.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  tryLock();
});

window.addEventListener('mouseup', () => {
  isMouseDown = false;
});

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = (document.pointerLockElement === canvas);
});

document.addEventListener('mousemove', (e) => {
  if (!isStarted) return;

  if (document.pointerLockElement === canvas) {
    const mx = e.movementX ?? e.mozMovementX ?? 0;
    const my = e.movementY ?? e.mozMovementY ?? 0;
    if (Math.abs(mx) < 300 && Math.abs(my) < 300) {
      camera.angle += mx * 0.0024;
      camera.pitch = Math.max(-3.2, Math.min(3.2, camera.pitch - my * 0.003));
    }
  } else if (isMouseDown) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    if (Math.abs(dx) < 300 && Math.abs(dy) < 300) {
      camera.angle += dx * 0.0035;
      camera.pitch = Math.max(-3.2, Math.min(3.2, camera.pitch - dy * 0.004));
    }
  }
});

function toggleMenu() {
  const overlay = document.getElementById('play-overlay');
  const hud = document.getElementById('hud');
  if (overlay.style.display === 'none') {
    overlay.style.display = 'flex';
    hud.style.display = 'none';
    if (document.exitPointerLock) document.exitPointerLock();
  } else {
    overlay.style.display = 'none';
    hud.style.display = 'flex';
    tryLock();
  }
}

window.startGame = function() {
  isStarted = true;
  const overlay = document.getElementById('play-overlay');
  const hud = document.getElementById('hud');
  if (overlay) overlay.style.display = 'none';
  if (hud) hud.style.display = 'flex';
  tryLock();
};

const startBtn = document.getElementById('start-game-btn');
if (startBtn) {
  startBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.startGame();
  });
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter' && !isStarted) {
    window.startGame();
  }
});

function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;

  const targetFontSize = Math.max(9, Math.min(18, Math.floor(h / 72)));
  fontStyle = `bold ${targetFontSize}px 'Courier New', monospace`;
  ctx.font = fontStyle;

  CHAR_WIDTH = ctx.measureText('M').width;
  CHAR_HEIGHT = Math.round(targetFontSize * 1.25);

  RENDER_COLS = Math.floor(w / CHAR_WIDTH);
  RENDER_ROWS = Math.floor(h / CHAR_HEIGHT);

  blitter.resize(RENDER_COLS, RENDER_ROWS, CHAR_WIDTH, CHAR_HEIGHT);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getSignalState(phaseGroup) {
  if (phaseGroup === 'EW') {
    if (trafficLightTimer < 12.0) return 'green';
    if (trafficLightTimer < 15.0) return 'yellow';
    return 'red';
  } else {
    if (trafficLightTimer < 15.0) return 'red';
    if (trafficLightTimer < 27.0) return 'green';
    return 'yellow';
  }
}

// -------------------------------------------------------------------------
// 6. game loop & simulation
// -------------------------------------------------------------------------
let lastTime = performance.now();
let fpsCount = 0;
let fpsTimer = 0;

function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  //keyboard camera rotation
  if (keys['ArrowLeft'] || keys['KeyQ']) {
    camera.angle -= 1.8 * dt;
  }
  if (keys['ArrowRight'] || keys['KeyE']) {
    camera.angle += 1.8 * dt;
  }
  if (keys['PageUp']) {
    camera.pitch = Math.min(3.2, camera.pitch + 2.5 * dt);
  }
  if (keys['PageDown']) {
    camera.pitch = Math.max(-3.2, camera.pitch - 2.5 * dt);
  }

  //player movement
  let moveX = 0;
  let moveY = 0;
  const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? 6.5 : 3.5;

  if (keys['KeyW']) {
    moveX += Math.cos(camera.angle) * speed * dt;
    moveY += Math.sin(camera.angle) * speed * dt;
  }
  if (keys['KeyS']) {
    moveX -= Math.cos(camera.angle) * speed * dt;
    moveY -= Math.sin(camera.angle) * speed * dt;
  }
  if (keys['KeyA']) {
    moveX += Math.cos(camera.angle - Math.PI / 2) * speed * dt;
    moveY += Math.sin(camera.angle - Math.PI / 2) * speed * dt;
  }
  if (keys['KeyD']) {
    moveX += Math.cos(camera.angle + Math.PI / 2) * speed * dt;
    moveY += Math.sin(camera.angle + Math.PI / 2) * speed * dt;
  }

  camera.x += moveX;
  camera.y += moveY;

  //update surveillance drone (patrol / 45-degree overhead stalking escort)
  cyberDrone.update(dt, now);

  //traffic light cycle
  trafficLightTimer = (trafficLightTimer + dt) % 30.0;
  trafficLights.forEach(tl => {
    tl.activeState = getSignalState(tl.phaseGroup);
  });

  //simulation updates
  if (isTrafficActive) {
    updateVehicleFleet(vehicles, dt, getSignalState);
  }
  updatePedestrianFleet(pedestrians, dt, map, camera);
  scene.update(dt);

  //emit sparks from cyber monument spire
  if (isSparksActive && Math.random() < 0.18) {
    emitSparks(scene.particleSystem, 20.0, 20.0, 5.4, 4, { color: '#00f0ff' });
  }

  //render
  blitter.clear('#000000', 60.0);
  raycaster.render(scene, camera, blitter, {
    wallShader: customFacadeShader,
    floorShader: customRoadShader
  });
  scene.renderEntities(camera, blitter);

  blitter.blit(ctx, canvas.width, canvas.height, fontStyle);

  //hud update
  fpsCount++;
  fpsTimer += dt;
  if (fpsTimer >= 0.25) {
    const fpsEl = document.getElementById('hud-fps');
    if (fpsEl) fpsEl.textContent = Math.round(fpsCount / fpsTimer);
    const posEl = document.getElementById('hud-pos');
    if (posEl) posEl.textContent = `X:${camera.x.toFixed(1)} Y:${camera.y.toFixed(1)}`;
    const deg = Math.round((camera.angle * (180 / Math.PI) + 360) % 360);
    const compEl = document.getElementById('hud-compass');
    if (compEl) compEl.textContent = `${deg.toString().padStart(3, '0')}°`;
    const entEl = document.getElementById('hud-entities');
    if (entEl) entEl.textContent = scene.entities.length;
    fpsCount = 0;
    fpsTimer = 0;
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
