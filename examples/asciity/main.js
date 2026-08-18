//asciity: cyberpunk metropolis showcase powered by asciilib
import {
  Blitter,
  Camera,
  Scene,
  GridMapRaycaster
} from '../../src/index.js';

import {
  MAP_SIZE,
  buildCityGrid,
  getIntersections,
  MANHOLES
} from './cityData.js';

import { wallShader, floorShader } from './shaders.js';
import { createStreetFurniture } from './entities/StreetFurniture.js';
import { createVehicleFleet, updateVehicleFleet } from './entities/Vehicle.js';
import { createPedestrians, updatePedestrianFleet } from './entities/Pedestrian.js';

// -------------------------------------------------------------------------
// 1. configuration & persistent state
// -------------------------------------------------------------------------
const DEFAULT_CONFIG = {
  traffic: true,
  particles: true,
  showHud: false,
  showCrosshair: true,
  playerHeight: 1.00,
  cameraFov: 70,
  mouseSens: 1.0
};

const config = { ...DEFAULT_CONFIG };

function loadSavedConfig() {
  try {
    const saved = localStorage.getItem('asciilib_config');
    if (saved) Object.assign(config, JSON.parse(saved));
  } catch (e) { }
}

function saveConfig() {
  try {
    localStorage.setItem('asciilib_config', JSON.stringify(config));
  } catch (e) { }
}

loadSavedConfig();

// -------------------------------------------------------------------------
// 2. initialize canvas, blitter, camera & scene
// -------------------------------------------------------------------------
const canvas = document.getElementById('canvas3d');
if (!canvas) {
  throw new Error('[ASCIITY] Fatal: Could not find #canvas3d element in DOM.');
}
const ctx = canvas.getContext('2d', { alpha: false });
if (!ctx) {
  throw new Error('[ASCIITY] Fatal: Could not obtain 2D canvas context.');
}

let CHAR_WIDTH = 7;
let CHAR_HEIGHT = 10;
let RENDER_COLS = 160;
let RENDER_ROWS = 90;
let fontStyle = "bold 13px 'Courier New', monospace";

const blitter = new Blitter(RENDER_COLS, RENDER_ROWS, CHAR_WIDTH, CHAR_HEIGHT);
const raycaster = new GridMapRaycaster({ maxDepth: 85.0 });

const camera = new Camera({
  x: 37.0,
  y: 43.5,
  z: 1.00,
  baseHeight: 1.00,
  angle: -Math.PI / 2, //facing north
  pitch: 0.08,
  fov: 70,
  projectionScale: 0.60,
  far: 85.0
});

const { map, buildingHeights } = buildCityGrid();
const scene = new Scene({
  mapSize: MAP_SIZE,
  map,
  buildingHeights,
  cellSize: 8.0
});

// -------------------------------------------------------------------------
// 3. populate world entities
// -------------------------------------------------------------------------
const trafficLights = createStreetFurniture(scene);
const vehicles = createVehicleFleet(scene);
const pedestrians = createPedestrians(scene);

// -------------------------------------------------------------------------
// 4. player locomotion, mouse look & collisions
// -------------------------------------------------------------------------
const player = {
  speed: 0.075,
  baseTurnSpeed: 0.0022,
  vz: 0,
  isGrounded: true,
  gravity: 9.8
};

const keys = {};
let isPointerLocked = false;
let wasPointerLocked = false;
let hasStarted = false;
let isPaused = true;

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

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyP') {
    config.traffic = !config.traffic;
    applyConfig();
  }
  if (e.code === 'Escape') {
    e.preventDefault();
    if (!hasStarted) return;
    if (isPaused) {
      startGame();
    } else {
      pauseGame();
    }
  } else if (hasStarted && !isPaused && !isPointerLocked) {
    tryRequestLock();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  if (hasStarted && !isPaused) pauseGame();
});

function updatePointerLockState() {
  const currentLock = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
  isPointerLocked = (currentLock !== null && currentLock !== undefined);

  if (wasPointerLocked && !isPointerLocked && hasStarted && !isPaused) {
    pauseGame();
  }
  wasPointerLocked = isPointerLocked;
}

document.addEventListener('pointerlockchange', updatePointerLockState);
document.addEventListener('mozpointerlockchange', updatePointerLockState);
document.addEventListener('webkitpointerlockchange', updatePointerLockState);

function tryRequestLock() {
  if (hasStarted && !isPaused && !isPointerLocked) {
    try {
      canvas.focus();
      canvas.requestPointerLock();
    } catch (e) { }
  }
}

window.addEventListener('click', tryRequestLock);
window.addEventListener('pointerdown', tryRequestLock);
window.addEventListener('mousedown', tryRequestLock);

document.addEventListener('mousemove', (e) => {
  if (!hasStarted || isPaused) return;

  const mx = e.movementX ?? e.mozMovementX ?? e.webkitMovementX ?? 0;
  const my = e.movementY ?? e.mozMovementY ?? e.webkitMovementY ?? 0;

  if (Math.abs(mx) < 400 && Math.abs(my) < 400) {
    const activeSens = player.baseTurnSpeed * (config.mouseSens || 1.0);
    camera.angle = (camera.angle + mx * activeSens);
    camera.pitch -= my * activeSens * 1.1;
    camera.pitch = Math.max(-3.2, Math.min(3.2, camera.pitch));
  }
});

function updatePlayer() {
  const moveSpeed = (keys['ShiftLeft'] || keys['ShiftRight']) ? player.speed * 1.8 : player.speed;
  let moveX = 0;
  let moveY = 0;

  if (keys['KeyW']) {
    moveX += Math.cos(camera.angle) * moveSpeed;
    moveY += Math.sin(camera.angle) * moveSpeed;
  }
  if (keys['KeyS']) {
    moveX -= Math.cos(camera.angle) * moveSpeed;
    moveY -= Math.sin(camera.angle) * moveSpeed;
  }
  if (keys['KeyA']) {
    moveX += Math.cos(camera.angle - Math.PI / 2) * moveSpeed;
    moveY += Math.sin(camera.angle - Math.PI / 2) * moveSpeed;
  }
  if (keys['KeyD']) {
    moveX += Math.cos(camera.angle + Math.PI / 2) * moveSpeed;
    moveY += Math.sin(camera.angle + Math.PI / 2) * moveSpeed;
  }
  if (keys['ArrowUp']) {
    moveX += Math.cos(camera.angle) * moveSpeed;
    moveY += Math.sin(camera.angle) * moveSpeed;
  }
  if (keys['ArrowDown']) {
    moveX -= Math.cos(camera.angle) * moveSpeed;
    moveY -= Math.sin(camera.angle) * moveSpeed;
  }
  if (keys['ArrowLeft'] || keys['KeyQ']) {
    camera.angle -= 0.035;
  }
  if (keys['ArrowRight'] || keys['KeyE']) {
    camera.angle += 0.035;
  }
  if (keys['PageUp']) {
    camera.pitch = Math.min(3.2, camera.pitch + 0.05);
  }
  if (keys['PageDown']) {
    camera.pitch = Math.max(-3.2, camera.pitch - 0.05);
  }

  //building wall collision
  const newX = camera.x + moveX;
  const newY = camera.y + moveY;
  const buf = 0.28;

  const targetCellX = Math.floor(newX + (moveX > 0 ? buf : -buf));
  const currentCellY = Math.floor(camera.y);
  if (targetCellX >= 0 && targetCellX < MAP_SIZE && currentCellY >= 0 && currentCellY < MAP_SIZE) {
    if (map[currentCellY * MAP_SIZE + targetCellX] < 10) {
      camera.x = newX;
    }
  }

  const currentCellX = Math.floor(camera.x);
  const targetCellY = Math.floor(newY + (moveY > 0 ? buf : -buf));
  if (currentCellX >= 0 && currentCellX < MAP_SIZE && targetCellY >= 0 && targetCellY < MAP_SIZE) {
    if (map[targetCellY * MAP_SIZE + currentCellX] < 10) {
      camera.y = newY;
    }
  }

  //static obstacle collisions
  const nearbyStatic = [];
  scene.staticGrid.queryAABB(camera.x - 1.5, camera.y - 1.5, camera.x + 1.5, camera.y + 1.5, nearbyStatic);
  for (let i = 0; i < nearbyStatic.length; i++) {
    const obj = nearbyStatic[i];
    if (obj.type === 'tree') {
      const dist = Math.hypot(camera.x - obj.x, camera.y - obj.y);
      if (dist < 0.28) {
        const pushAngle = Math.atan2(camera.y - obj.y, camera.x - obj.x);
        camera.x = obj.x + Math.cos(pushAngle) * 0.28;
        camera.y = obj.y + Math.sin(pushAngle) * 0.28;
      }
    } else if (obj.type === 'lamp' || obj.type === 'trafficLight') {
      const dist = Math.hypot(camera.x - obj.x, camera.y - obj.y);
      if (dist < 0.22) {
        const pushAngle = Math.atan2(camera.y - obj.y, camera.x - obj.x);
        camera.x = obj.x + Math.cos(pushAngle) * 0.22;
        camera.y = obj.y + Math.sin(pushAngle) * 0.22;
      }
    }
  }

  //jumping & crouching
  const targetBaseZ = keys['KeyC'] ? (config.playerHeight * 0.45) : config.playerHeight;
  if ((keys['Space'] || keys['KeyJ']) && player.isGrounded) {
    player.vz = 0.125;
    player.isGrounded = false;
  }

  if (!player.isGrounded) {
    player.vz -= 0.0065;
    camera.z += player.vz;
    if (camera.z <= targetBaseZ) {
      camera.z = targetBaseZ;
      player.vz = 0;
      player.isGrounded = true;
    }
  } else {
    camera.z += (targetBaseZ - camera.z) * 0.2;
  }
}

// -------------------------------------------------------------------------
// 5. traffic light state machine & steam emitters
// -------------------------------------------------------------------------
let trafficLightTimer = 0;
let steamTimer = 0;

function getSignalState(phaseGroup) {
  if (phaseGroup === 'EW') {
    if (trafficLightTimer < 12.5) return 'green';
    if (trafficLightTimer < 15.0) return 'yellow';
    return 'red';
  } else {
    if (trafficLightTimer < 15.0) return 'red';
    if (trafficLightTimer < 27.5) return 'green';
    return 'yellow';
  }
}

function updateTrafficSimulation(dt) {
  trafficLightTimer = (trafficLightTimer + dt) % 30.0;
  for (let i = 0; i < trafficLights.length; i++) {
    const tl = trafficLights[i];
    tl.activeState = getSignalState(tl.phaseGroup);
  }

  //vehicles autonomous navigation, red light stops & collision avoidance
  if (config.traffic) {
    updateVehicleFleet(vehicles, dt, getSignalState);
  }

  //pedestrians sidewalk patrol & player avoidance
  updatePedestrianFleet(pedestrians, dt, map, camera);

  if (config.particles) {
    steamTimer += dt;
    if (steamTimer >= 0.12) {
      steamTimer = 0;
      for (let i = 0; i < MANHOLES.length; i++) {
        const mh = MANHOLES[i];
        scene.particleSystem.emit({
          x: mh.x + (Math.random() - 0.5) * 0.2,
          y: mh.y + (Math.random() - 0.5) * 0.2,
          z: 0.05,
          vx: (Math.random() - 0.5) * 0.06,
          vy: (Math.random() - 0.5) * 0.06,
          vz: 0.25 + Math.random() * 0.2,
          life: 2.4,
          maxLife: 2.4,
          char: '%',
          color: '#64748b'
        });
      }
    }
  }
}

// -------------------------------------------------------------------------
// 6. ui menus & hud synchronization
// -------------------------------------------------------------------------
function applyConfig() {
  for (let i = 0; i < vehicles.length; i++) {
    vehicles[i].active = config.traffic;
  }
  camera.fov = config.cameraFov;
  camera.baseHeight = config.playerHeight;
  if (player.isGrounded && !keys['KeyC']) {
    camera.z = camera.baseHeight;
  }

  const hudEl = document.getElementById('hud');
  if (hudEl) hudEl.style.display = config.showHud ? 'flex' : 'none';

  const crosshairEl = document.getElementById('crosshair');
  if (crosshairEl) crosshairEl.style.display = config.showCrosshair ? 'block' : 'none';

  syncTrafficUI();
  syncConfigUI();
  saveConfig();
}

function syncTrafficUI() {
  const statusEl = document.getElementById('hud-traffic-status');
  if (statusEl) {
    statusEl.textContent = config.traffic ? 'ACTIVE' : 'STOPPED';
    statusEl.style.color = config.traffic ? '#00f0ff' : '#ff0055';
  }
}

function syncConfigUI() {
  const trafBtn = document.getElementById('cfg-traffic-btn');
  const trafVal = document.getElementById('cfg-traffic-val');
  if (trafBtn && trafVal) {
    trafVal.textContent = config.traffic ? 'ON' : 'OFF';
    if (config.traffic) trafBtn.classList.remove('off');
    else trafBtn.classList.add('off');
  }

  const partBtn = document.getElementById('cfg-particles-btn');
  const partVal = document.getElementById('cfg-particles-val');
  if (partBtn && partVal) {
    partVal.textContent = config.particles ? 'ON' : 'OFF';
    if (config.particles) partBtn.classList.remove('off');
    else partBtn.classList.add('off');
  }

  const hudBtn = document.getElementById('cfg-hud-btn');
  const hudVal = document.getElementById('cfg-hud-val');
  if (hudBtn && hudVal) {
    hudVal.textContent = config.showHud ? 'ON' : 'OFF';
    if (config.showHud) hudBtn.classList.remove('off');
    else hudBtn.classList.add('off');
  }

  const crossBtn = document.getElementById('cfg-crosshair-btn');
  const crossVal = document.getElementById('cfg-crosshair-val');
  if (crossBtn && crossVal) {
    crossVal.textContent = config.showCrosshair ? 'ON' : 'OFF';
    if (config.showCrosshair) crossBtn.classList.remove('off');
    else crossBtn.classList.add('off');
  }

  const hSlider = document.getElementById('cfg-height-slider');
  const hVal = document.getElementById('cfg-height-val');
  if (hSlider && hVal) {
    hSlider.value = config.playerHeight;
    hVal.textContent = `${Number(config.playerHeight).toFixed(2)}m`;
  }

  const fSlider = document.getElementById('cfg-fov-slider');
  const fVal = document.getElementById('cfg-fov-val');
  if (fSlider && fVal) {
    fSlider.value = config.cameraFov;
    fVal.textContent = `${Math.round(config.cameraFov)}°`;
  }

  const sSlider = document.getElementById('cfg-sens-slider');
  const sVal = document.getElementById('cfg-sens-val');
  if (sSlider && sVal) {
    sSlider.value = config.mouseSens;
    sVal.textContent = `${Number(config.mouseSens).toFixed(1)}x`;
  }
}

function startGame() {
  hasStarted = true;
  isPaused = false;
  applyConfig();

  const overlay = document.getElementById('play-overlay');
  if (overlay) overlay.style.display = 'none';

  try {
    canvas.focus();
    const promise = canvas.requestPointerLock();
    if (promise && typeof promise.catch === 'function') promise.catch(() => { });
  } catch (e) { }
}

function pauseGame() {
  if (isPaused) return;
  isPaused = true;
  for (const k in keys) keys[k] = false;

  const overlay = document.getElementById('play-overlay');
  const startBtn = document.getElementById('start-game-btn');
  if (startBtn) startBtn.textContent = '[ CONTINUE ]';
  if (overlay) overlay.style.display = 'flex';

  const currentLock = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
  if (currentLock) {
    try { document.exitPointerLock(); } catch (e) { }
  }
}

function toggleConfigDropdown(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('ascii-config-panel');
  const symbol = document.getElementById('config-dropdown-symbol');
  if (panel && symbol) {
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
      panel.classList.remove('hidden');
      symbol.textContent = '-';
    } else {
      panel.classList.add('hidden');
      symbol.textContent = '+';
    }
  }
}

function restoreDefaultConfig(e) {
  if (e) e.stopPropagation();
  Object.assign(config, DEFAULT_CONFIG);
  applyConfig();
}

function toggleConfigTraffic(e) {
  if (e) e.stopPropagation();
  config.traffic = !config.traffic;
  applyConfig();
}

function toggleConfigParticles(e) {
  if (e) e.stopPropagation();
  config.particles = !config.particles;
  applyConfig();
}

function toggleConfigHud(e) {
  if (e) e.stopPropagation();
  config.showHud = !config.showHud;
  applyConfig();
}

function toggleConfigCrosshair(e) {
  if (e) e.stopPropagation();
  config.showCrosshair = !config.showCrosshair;
  applyConfig();
}

function updateConfigHeight(val) {
  config.playerHeight = parseFloat(val);
  applyConfig();
}

function updateConfigFov(val) {
  config.cameraFov = parseFloat(val);
  applyConfig();
}

function updateConfigSens(val) {
  config.mouseSens = parseFloat(val);
  applyConfig();
}

if (typeof window !== 'undefined') {
  window.startGame = startGame;
  window.pauseGame = pauseGame;
  window.toggleConfigDropdown = toggleConfigDropdown;
  window.toggleConfigTraffic = toggleConfigTraffic;
  window.toggleConfigParticles = toggleConfigParticles;
  window.toggleConfigHud = toggleConfigHud;
  window.toggleConfigCrosshair = toggleConfigCrosshair;
  window.updateConfigHeight = updateConfigHeight;
  window.updateConfigFov = updateConfigFov;
  window.updateConfigSens = updateConfigSens;
  window.restoreDefaultConfig = restoreDefaultConfig;
}

// -------------------------------------------------------------------------
// 7. game loop execution
// -------------------------------------------------------------------------
let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (!isPaused) {
    updateTrafficSimulation(dt);
    updatePlayer();
    scene.update(dt);
  }

  //render world
  blitter.clear('#000000', 85.0);

  //1. 2.5d raycast buildings, roads, and crosswalk floors
  raycaster.render(scene, camera, blitter, { wallShader, floorShader });

  //2. 3d entities & particles
  scene.renderEntities(camera, blitter);

  //3. blit to canvas
  blitter.blit(ctx, canvas.width, canvas.height, fontStyle);

  //hud updates
  frameCount++;
  fpsTimer += dt;
  if (fpsTimer >= 0.25) {
    const fpsEl = document.getElementById('hud-fps');
    if (fpsEl) fpsEl.textContent = Math.round(frameCount / fpsTimer);

    const posEl = document.getElementById('hud-pos');
    if (posEl) posEl.textContent = `X:${camera.x.toFixed(1)} Y:${camera.y.toFixed(1)}`;

    const headingDeg = Math.round((camera.angle * (180 / Math.PI) + 90 + 720) % 360);
    const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const cardIdx = Math.round(headingDeg / 45) % 8;
    const padDeg = String(headingDeg).padStart(3, '0');
    const compassEl = document.getElementById('hud-compass');
    if (compassEl) compassEl.textContent = `${padDeg}° [${CARDINALS[cardIdx]}]`;

    const cullEl = document.getElementById('hud-cull');
    if (cullEl) {
      const frustum = camera.getFrustumAABB();
      const staticBuf = [];
      const dynBuf = [];
      scene.staticGrid.queryAABB(frustum.minX, frustum.minY, frustum.maxX, frustum.maxY, staticBuf);
      scene.dynamicGrid.queryAABB(frustum.minX, frustum.minY, frustum.maxX, frustum.maxY, dynBuf);
      const vis = staticBuf.length + dynBuf.length;
      const tot = Math.max(1, scene.entities.length + scene.particleSystem.particles.length);
      const pct = Math.round((1 - (vis / tot)) * 100);
      cullEl.textContent = `${vis}/${tot} (-${pct}%)`;
    }

    frameCount = 0;
    fpsTimer = 0;
  }

  requestAnimationFrame(gameLoop);
}

resizeCanvas();
applyConfig();
requestAnimationFrame(gameLoop);
