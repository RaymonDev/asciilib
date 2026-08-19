import {
  parseAsciiMap,
  Blitter,
  Camera,
  GridMapRaycaster,
  PointLight,
  SpotLight,
  modulateCharLuminance,
  blendLightColor
} from '../src/index.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

console.log('[TEST] Starting light_test example integration test suite...');

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

const parsed = parseAsciiMap(LIGHT_TEST_MAP, {
  defaultBuildingHeight: 7.5,
  cellScale: 1.0,
  ambientLight: '#0f172a'
});

const scene = parsed.scene;

//add flashlight and beacon
const flashlight = new SpotLight({
  x: parsed.defaultSpawn.x,
  y: parsed.defaultSpawn.y,
  z: 1.10,
  color: '#ffffff',
  radius: 18.0,
  intensity: 1.6
});
scene.addLight(flashlight);

const beacon = new PointLight({
  x: 20.0,
  y: 12.0,
  z: 1.8,
  color: '#f59e0b',
  radius: 12.0,
  intensity: 1.5
});
scene.addLight(beacon);

//verify scene light count includes auto-registered lamp lights + drone light + manual lights
assert(scene.lights.length >= 4, `Expected >= 4 lights in scene, got ${scene.lights.length}`);

//test dynamic wall and floor shaders with lighting queries
function dynamicWallShader(ctx) {
  const lighting = scene.getLightingAt(ctx.mapX + 0.5, ctx.mapY + 0.5, 1.5);
  const ch = modulateCharLuminance('#', Math.min(2.0, 0.25 + lighting.intensity));
  const color = blendLightColor('#94a3b8', lighting.r, lighting.g, lighting.b, lighting.intensity);
  return { char: ch, ch, color, bg: '#000000' };
}

function dynamicFloorShader(ctx) {
  const lighting = scene.getLightingAt(ctx.floorX, ctx.floorY, 0.0);
  const ch = modulateCharLuminance('.', Math.min(2.0, 0.20 + lighting.intensity));
  const color = blendLightColor('#475569', lighting.r, lighting.g, lighting.b, lighting.intensity);
  return { char: ch, ch, color, bg: '#000000' };
}

const blitter = new Blitter(160, 90, 7, 10);
const camera = new Camera({
  x: parsed.defaultSpawn.x,
  y: parsed.defaultSpawn.y,
  z: 1.10,
  baseHeight: 1.10,
  angle: -Math.PI / 2,
  pitch: 0.04,
  fov: 70,
  projectionScale: 0.60
});

const raycaster = new GridMapRaycaster({ maxDepth: 65.0 });

blitter.clear('#000000', 65.0);
raycaster.render(scene, camera, blitter, {
  wallShader: dynamicWallShader,
  floorShader: dynamicFloorShader
});
scene.renderEntities(camera, blitter);

let visibleChars = 0;
for (let i = 0; i < blitter.totalPixels; i++) {
  if (blitter.frameCharCodes[i] !== 32) visibleChars++;
}

assert(visibleChars > 200, `Expected > 200 visible characters rendered, got ${visibleChars}`);

console.log(`[PASS] light_test integration verified (${scene.lights.length} active lights, ${visibleChars} visible characters)`);
console.log('[ALL LIGHT TEST INTEGRATION TESTS PASSED]');
