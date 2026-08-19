//asciilib map_test: interactive 2d ascii layout serialization showcase
import {
  Blitter,
  Camera,
  GridMapRaycaster,
  parseAsciiMap,
  createSkyscraperShader,
  createRoadFloorShader,
  AudioEngine,
  ProceduralSFX,
  DroneEntity
} from '../../src/index.js';

// -------------------------------------------------------------------------
// 1. map layout
// -------------------------------------------------------------------------
const ASCII_TOWN_MAP = `
########################################
#BBBBBBB#..............#HHHHHHH#.......#
#B.....B#...T......L...#H.....H#...T...#
#B..D..B#..............#H.....H#.......#
#BBBBBBB#..............#HHHHHHH#.......#
#=======#..............#=======#.......#
#.......#..............#.......#.......#
#...C.......U..............V...........#
#......................................#
#=======#..............#=======#.......#
#BBBBBBB#..............#BBBBBBB#.......#
#B.....B#......@.......#B.....B#...L...#
#B..P..B#...L......T...#B..P..B#.......#
#BBBBBBB#..............#BBBBBBB#.......#
########################################
`;

// -------------------------------------------------------------------------
// 2. parse ascii map
// -------------------------------------------------------------------------
const parsed = parseAsciiMap(ASCII_TOWN_MAP, {
  defaultBuildingHeight: 7.0,
  cellScale: 1.0
});

const scene = parsed.scene;

//display blueprint text in overlay
const blueprintEl = document.getElementById('ascii-map-display');
if (blueprintEl) {
  blueprintEl.textContent = ASCII_TOWN_MAP.trim();
}

// -------------------------------------------------------------------------
// 3. engine and camera setup
// -------------------------------------------------------------------------
const canvas = document.getElementById('canvas3d');
const ctx = canvas.getContext('2d', { alpha: false });

let CHAR_WIDTH = 7;
let CHAR_HEIGHT = 10;
let RENDER_COLS = 160;
let RENDER_ROWS = 90;
let fontStyle = "bold 13px 'Courier New', monospace";

const blitter = new Blitter(RENDER_COLS, RENDER_ROWS, CHAR_WIDTH, CHAR_HEIGHT);
const raycaster = new GridMapRaycaster({ maxDepth: 65.0 });

const wallShader = createSkyscraperShader({
  litColor: '#ffeaa7',
  unlitColor: '#1e293b',
  pillarColor: '#94a3b8',
  spandrelColor: '#64748b'
});

const floorShader = createRoadFloorShader();

//set initial camera position from parsed spawn point
const camera = new Camera({
  x: parsed.defaultSpawn.x,
  y: parsed.defaultSpawn.y,
  z: 1.10,
  baseHeight: 1.10,
  angle: -Math.PI / 2,
  pitch: 0.04,
  fov: 70,
  projectionScale: 0.60,
  far: 65.0
});

//find parsed companion drone
const drone = scene.entities.find(e => e instanceof DroneEntity);

// -------------------------------------------------------------------------
// 4. audio engine
// -------------------------------------------------------------------------
const audio = new AudioEngine({ masterVolume: 0.8 });
const sfx = new ProceduralSFX(audio);
let cityHum = null;

// -------------------------------------------------------------------------
// 5. player controls & state
// -------------------------------------------------------------------------
const player = {
  speed: 0.08,
  baseTurnSpeed: 0.0022,
  vz: 0,
  isGrounded: true
};

const keys = {};
let isPointerLocked = false;
let hasStarted = false;
let isPaused = true;
let isMapOverlayOpen = false;
let footstepTimer = 0;

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

  //toggle blueprint overlay
  if (e.code === 'KeyM' || e.code === 'Tab') {
    e.preventDefault();
    toggleMapOverlay();
  }

  //toggle drone companion mode
  if (e.code === 'KeyC' && drone) {
    sfx.playUiBeep('click');
    drone.toggleCompanion(camera);
  }

  //toggle audio mute
  if (e.code === 'KeyK') {
    sfx.playUiBeep('click');
    const isMuted = audio.toggleMute();
    const audioEl = document.getElementById('hud-audio-toggle');
    if (audioEl) audioEl.textContent = isMuted ? '[MUTED]' : '[ACTIVE]';
  }

  //menu toggle
  if (e.code === 'Escape') {
    e.preventDefault();
    if (isMapOverlayOpen) {
      toggleMapOverlay();
      return;
    }
    if (!hasStarted) return;
    if (isPaused) {
      startGame();
    } else {
      pauseGame();
    }
  } else if (hasStarted && !isPaused && !isPointerLocked && !isMapOverlayOpen) {
    tryRequestLock();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function toggleMapOverlay() {
  isMapOverlayOpen = !isMapOverlayOpen;
  const overlay = document.getElementById('map-overlay');
  if (overlay) {
    overlay.classList.toggle('hidden', !isMapOverlayOpen);
  }
  sfx.playUiBeep(isMapOverlayOpen ? 'select' : 'cancel');

  if (isMapOverlayOpen) {
    try { document.exitPointerLock(); } catch (_) { }
  } else if (hasStarted && !isPaused) {
    tryRequestLock();
  }
}

function updatePointerLockState() {
  const currentLock = document.pointerLockElement;
  isPointerLocked = (currentLock !== null && currentLock !== undefined);
  if (!isPointerLocked && hasStarted && !isPaused && !isMapOverlayOpen) {
    pauseGame();
  }
}
document.addEventListener('pointerlockchange', updatePointerLockState);

function tryRequestLock() {
  if (hasStarted && !isPaused && !isPointerLocked && !isMapOverlayOpen) {
    try {
      canvas.focus();
      canvas.requestPointerLock();
    } catch (_) { }
  }
}

window.addEventListener('click', tryRequestLock);

document.addEventListener('mousemove', (e) => {
  if (!hasStarted || isPaused || isMapOverlayOpen) return;

  const mx = e.movementX || 0;
  const my = e.movementY || 0;

  if (Math.abs(mx) < 400 && Math.abs(my) < 400) {
    camera.angle += mx * player.baseTurnSpeed;
    camera.pitch -= my * player.baseTurnSpeed * 1.1;
    camera.pitch = Math.max(-3.2, Math.min(3.2, camera.pitch));
  }
});

function startGame() {
  hasStarted = true;
  isPaused = false;

  audio.unlock();
  sfx.playUiBeep('confirm');

  if (!cityHum) {
    cityHum = sfx.createAmbientCityHum({ humVolume: 0.20, windVolume: 0.12 });
  }

  const overlay = document.getElementById('play-overlay');
  if (overlay) overlay.style.display = 'none';

  tryRequestLock();
}

function pauseGame() {
  if (isPaused) return;
  isPaused = true;
  for (const k in keys) keys[k] = false;

  sfx.playUiBeep('cancel');
  if (cityHum) {
    cityHum.stop();
    cityHum = null;
  }

  const overlay = document.getElementById('play-overlay');
  const startBtn = document.getElementById('start-game-btn');
  if (startBtn) startBtn.textContent = '[ CONTINUE ]';
  if (overlay) overlay.style.display = 'flex';

  try { document.exitPointerLock(); } catch (_) { }
}

if (typeof window !== 'undefined') {
  window.startGame = startGame;
  window.pauseGame = pauseGame;
}

// -------------------------------------------------------------------------
// 6. player physics & collisions
// -------------------------------------------------------------------------
function updatePlayer(dt) {
  const isSprinting = (keys['ShiftLeft'] || keys['ShiftRight']);
  const moveSpeed = isSprinting ? player.speed * 1.8 : player.speed;
  let moveX = 0;
  let moveY = 0;

  if (keys['KeyW'] || keys['ArrowUp']) {
    moveX += Math.cos(camera.angle) * moveSpeed;
    moveY += Math.sin(camera.angle) * moveSpeed;
  }
  if (keys['KeyS'] || keys['ArrowDown']) {
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
  if (keys['KeyQ'] || keys['ArrowLeft']) camera.angle -= 0.035;
  if (keys['KeyE'] || keys['ArrowRight']) camera.angle += 0.035;
  if (keys['PageUp']) camera.pitch = Math.min(3.2, camera.pitch + 0.05);
  if (keys['PageDown']) camera.pitch = Math.max(-3.2, camera.pitch - 0.05);

  //footsteps
  const isMoving = (Math.abs(moveX) > 1e-4 || Math.abs(moveY) > 1e-4);
  if (isMoving && player.isGrounded) {
    footstepTimer += dt;
    const stepInterval = isSprinting ? 0.28 : 0.40;
    if (footstepTimer >= stepInterval) {
      sfx.playFootstep('concrete', { volume: isSprinting ? 0.30 : 0.18 });
      footstepTimer = 0;
    }
  }

  //wall collisions against parsed map
  const newX = camera.x + moveX;
  const newY = camera.y + moveY;
  const buf = 0.28;

  const targetCellX = Math.floor(newX + (moveX > 0 ? buf : -buf));
  const currentCellY = Math.floor(camera.y);
  if (targetCellX >= 0 && targetCellX < parsed.mapSize && currentCellY >= 0 && currentCellY < parsed.mapSize) {
    if (parsed.map[currentCellY * parsed.mapSize + targetCellX] < 10) {
      camera.x = newX;
    }
  }

  const currentCellX = Math.floor(camera.x);
  const targetCellY = Math.floor(newY + (moveY > 0 ? buf : -buf));
  if (currentCellX >= 0 && currentCellX < parsed.mapSize && targetCellY >= 0 && targetCellY < parsed.mapSize) {
    if (parsed.map[targetCellY * parsed.mapSize + currentCellX] < 10) {
      camera.y = newY;
    }
  }

  //jumping & crouching
  const targetBaseZ = 1.10;
  if (keys['Space'] && player.isGrounded) {
    player.vz = 0.125;
    player.isGrounded = false;
    sfx.playJump({ volume: 0.35 });
  }

  if (!player.isGrounded) {
    player.vz -= 0.0065;
    camera.z += player.vz;
    if (camera.z <= targetBaseZ) {
      camera.z = targetBaseZ;
      player.vz = 0;
      player.isGrounded = true;
      sfx.playLand({ volume: 0.40 });
    }
  } else {
    camera.z += (targetBaseZ - camera.z) * 0.2;
  }
}

// -------------------------------------------------------------------------
// 7. game loop
// -------------------------------------------------------------------------
let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (!isPaused && !isMapOverlayOpen) {
    updatePlayer(dt);
    if (drone) drone.update(dt, now);
    scene.update(dt);
    audio.updateListener(camera);
  }

  //render world
  blitter.clear('#000000', 65.0);

  //1. raycast parsed 2.5d building walls and roads
  raycaster.render(scene, camera, blitter, { wallShader, floorShader });

  //2. render 3d entities & particles
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
    const compassEl = document.getElementById('hud-compass');
    if (compassEl) compassEl.textContent = `${String(headingDeg).padStart(3, '0')}° [${CARDINALS[cardIdx]}]`;

    const entEl = document.getElementById('hud-entities');
    if (entEl) entEl.textContent = scene.entities.length;

    frameCount = 0;
    fpsTimer = 0;
  }

  requestAnimationFrame(gameLoop);
}

resizeCanvas();
requestAnimationFrame(gameLoop);
