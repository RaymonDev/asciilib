//asciilib light_test: dynamic 3d lighting showcase with real-time euclidean falloff
import {
  Blitter,
  Camera,
  GridMapRaycaster,
  parseAsciiMap,
  PointLight,
  SpotLight,
  AudioEngine,
  ProceduralSFX,
  DroneEntity,
  StreetLightEntity,
  modulateCharLuminance,
  blendLightColor
} from '../../src/index.js';

// -------------------------------------------------------------------------
// 1. map layout blueprint
// -------------------------------------------------------------------------
const LIGHT_TEST_MAP = `
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
// 2. parse ascii map & scene setup
// -------------------------------------------------------------------------
const parsed = parseAsciiMap(LIGHT_TEST_MAP, {
  defaultBuildingHeight: 7.5,
  cellScale: 1.0,
  ambientLight: '#0f172a' //night-time dark ambient baseline
});

const scene = parsed.scene;

// -------------------------------------------------------------------------
// 3. dynamic light sources
// -------------------------------------------------------------------------
//player flashlight spotlight attached to camera
const flashlight = new SpotLight({
  x: parsed.defaultSpawn.x,
  y: parsed.defaultSpawn.y,
  z: 1.10,
  color: '#ffffff',
  radius: 18.0,
  intensity: 1.6,
  angle: Math.PI / 5, //36 deg cone
  penumbra: 0.35,
  direction: { x: 0, y: 1, z: 0 }
});
scene.addLight(flashlight);

//pulsing hazard emergency beacon
const beaconLight = new PointLight({
  x: 20.0,
  y: 12.0,
  z: 1.8,
  color: '#f59e0b',
  radius: 12.0,
  intensity: 1.5,
  decay: 1.0
});
scene.addLight(beaconLight);

//find parsed companion drone
const drone = scene.entities.find(e => e instanceof DroneEntity);

//find street lamps in scene
const lamps = scene.entities.filter(e => e instanceof StreetLightEntity);

// -------------------------------------------------------------------------
// 4. dynamic lighting shaders
// -------------------------------------------------------------------------
//custom wall shader modulated by dynamic 3d lights
function dynamicWallShader(ctx) {
  const hitX = ctx.rayOriginX + ctx.dirX * ctx.distance;
  const hitY = ctx.rayOriginY + ctx.dirY * ctx.distance;
  const hitZ = ctx.hitZ !== undefined ? ctx.hitZ : 1.5;

  const lighting = scene.getLightingAt(hitX, hitY, hitZ);
  const isNight = scene.ambientLight === '#0f172a';
  const baseAmbient = isNight ? 0.20 : 0.65;
  const lightFactor = Math.min(2.5, baseAmbient + lighting.intensity);

  const baseChar = (ctx.mapY % 2 === 0) ? '#' : '%';
  const ch = modulateCharLuminance(baseChar, lightFactor);
  const color = blendLightColor('#94a3b8', lighting.r, lighting.g, lighting.b, lightFactor);

  return { char: ch, ch, color, bg: '#020617' };
}

//custom floor shader modulated by dynamic 3d lights
function dynamicFloorShader(ctx) {
  const lighting = scene.getLightingAt(ctx.floorX, ctx.floorY, 0.0);
  const isNight = scene.ambientLight === '#0f172a';
  const baseAmbient = isNight ? 0.18 : 0.60;
  const lightFactor = Math.min(2.5, baseAmbient + lighting.intensity);

  let baseChar = '.';
  let baseColor = '#475569';

  if (ctx.tile === 1) {
    baseChar = '=';
    baseColor = '#64748b';
  }

  const ch = modulateCharLuminance(baseChar, lightFactor);
  const color = blendLightColor(baseColor, lighting.r, lighting.g, lighting.b, lightFactor);

  return { char: ch, ch, color, bg: '#020617' };
}

// -------------------------------------------------------------------------
// 5. engine and camera setup
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

// -------------------------------------------------------------------------
// 6. audio engine
// -------------------------------------------------------------------------
const audio = new AudioEngine({ masterVolume: 0.8 });
const sfx = new ProceduralSFX(audio);
let cityHum = null;

// -------------------------------------------------------------------------
// 7. player controls & state
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
let footstepTimer = 0;
let isNightMode = true;

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

  //toggle player flashlight [F]
  if (e.code === 'KeyF') {
    flashlight.active = !flashlight.active;
    sfx.playUiBeep('click');
    const flEl = document.getElementById('hud-flashlight-status');
    if (flEl) flEl.textContent = flashlight.active ? '[ON]' : '[OFF]';
  }

  //toggle day / night mode [T]
  if (e.code === 'KeyT') {
    isNightMode = !isNightMode;
    scene.ambientLight = isNightMode ? '#0f172a' : '#cbd5e1';
    sfx.playUiBeep('select');
    const timeEl = document.getElementById('hud-time-status');
    if (timeEl) timeEl.textContent = isNightMode ? '[NIGHT]' : '[DAY]';
  }

  //toggle street lamps [1]
  if (e.code === 'Digit1') {
    sfx.playUiBeep('click');
    const newState = lamps.length > 0 ? !lamps[0].light.active : true;
    for (let i = 0; i < lamps.length; i++) {
      if (lamps[i].light) lamps[i].light.active = newState;
    }
    const lEl = document.getElementById('hud-lamps-status');
    if (lEl) lEl.textContent = newState ? '[ON]' : '[OFF]';
  }

  //toggle drone searchlight [2]
  if (e.code === 'Digit2' && drone && drone.light) {
    sfx.playUiBeep('click');
    drone.light.active = !drone.light.active;
    const dEl = document.getElementById('hud-drone-status');
    if (dEl) dEl.textContent = drone.light.active ? '[ON]' : '[OFF]';
  }

  //toggle beacon [3]
  if (e.code === 'Digit3') {
    sfx.playUiBeep('click');
    beaconLight.active = !beaconLight.active;
    const bEl = document.getElementById('hud-beacon-status');
    if (bEl) bEl.textContent = beaconLight.active ? '[ON]' : '[OFF]';
  }

  //toggle companion drone escort [C]
  if (e.code === 'KeyC' && drone) {
    sfx.playUiBeep('click');
    drone.toggleCompanion(camera);
  }

  //menu toggle
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

function updatePointerLockState() {
  const currentLock = document.pointerLockElement;
  isPointerLocked = (currentLock !== null && currentLock !== undefined);
  if (!isPointerLocked && hasStarted && !isPaused) {
    pauseGame();
  }
}
document.addEventListener('pointerlockchange', updatePointerLockState);

function tryRequestLock() {
  if (hasStarted && !isPaused && !isPointerLocked) {
    try {
      canvas.focus();
      canvas.requestPointerLock();
    } catch (_) { }
  }
}

window.addEventListener('click', tryRequestLock);

document.addEventListener('mousemove', (e) => {
  if (!hasStarted || isPaused) return;

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
// 8. player physics & collisions
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

  //wall collisions
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
// 9. game loop
// -------------------------------------------------------------------------
let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (!isPaused) {
    updatePlayer(dt);
    if (drone) drone.update(dt, now);
    scene.update(dt);
    audio.updateListener(camera);

    //update player flashlight position and look direction
    flashlight.setPosition(camera.x, camera.y, camera.z);
    flashlight.setDirection(
      Math.cos(camera.angle),
      Math.sin(camera.angle),
      camera.pitch * 0.45
    );

    //pulse emergency beacon light
    const beaconPulse = (Math.sin(now * 0.005) + 1.0) * 0.5;
    beaconLight.intensity = 0.5 + beaconPulse * 1.5;
  }

  //render world
  blitter.clear('#000000', 65.0);

  //1. raycast walls and floors with dynamic lighting
  raycaster.render(scene, camera, blitter, {
    wallShader: dynamicWallShader,
    floorShader: dynamicFloorShader
  });

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

    //measure light level at player position
    const playerLux = scene.getLightLevel(camera.x, camera.y, camera.z, isNightMode ? 0.20 : 0.65);
    const luxEl = document.getElementById('hud-lux');
    if (luxEl) luxEl.textContent = `${Math.round(playerLux * 100)}%`;

    const activeLights = scene.lights.filter(l => l.active).length;
    const lightsCountEl = document.getElementById('hud-lights-count');
    if (lightsCountEl) lightsCountEl.textContent = activeLights;

    frameCount = 0;
    fpsTimer = 0;
  }

  requestAnimationFrame(gameLoop);
}

resizeCanvas();
requestAnimationFrame(gameLoop);
