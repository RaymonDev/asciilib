import {
  parseAsciiMap,
  Blitter,
  Camera,
  GridMapRaycaster,
  createSkyscraperShader,
  createRoadFloorShader,
  DroneEntity
} from '../src/index.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

console.log('[TEST] Starting map_test example integration test suite...');

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

//1. Test map parsing
const parsed = parseAsciiMap(ASCII_TOWN_MAP, {
  defaultBuildingHeight: 7.0,
  cellScale: 1.0
});

assert(parsed.width === 40, `Width should be 40, got ${parsed.width}`);
assert(parsed.height === 15, `Height should be 15, got ${parsed.height}`);
assert(parsed.scene.entities.length >= 8, `Expected >= 8 entities, got ${parsed.scene.entities.length}`);

//2. Test drone entity parsed
const drone = parsed.scene.entities.find(e => e instanceof DroneEntity);
assert(drone !== undefined, 'Drone entity parsed successfully');

//3. Test rendering pipeline with blitter and shaders
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
const wallShader = createSkyscraperShader();
const floorShader = createRoadFloorShader();

blitter.clear('#000000', 65.0);
raycaster.render(parsed.scene, camera, blitter, { wallShader, floorShader });
parsed.scene.renderEntities(camera, blitter);

let visibleChars = 0;
for (let i = 0; i < blitter.totalPixels; i++) {
  if (blitter.frameCharCodes[i] !== 32) visibleChars++;
}

assert(visibleChars > 200, `Expected > 200 visible characters rendered, got ${visibleChars}`);

console.log(`[PASS] map_test integration verified (${parsed.scene.entities.length} entities, ${visibleChars} visible characters)`);
console.log('[ALL MAP TEST INTEGRATION TESTS PASSED]');
