import {
  parseAsciiMap,
  serializeScene,
  deserializeScene,
  exportAsciiMap,
  Scene,
  BoxEntity
} from '../src/index.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

console.log('[TEST] Starting asciilib map & scene serialization test suite...');

//1. ASCII map parsing
const sampleMap = `
#########
#.......#
#.T...L.#
#...@...#
#.C...P.#
#...D...#
#########
`;

const result = parseAsciiMap(sampleMap, { defaultBuildingHeight: 7.5 });

assert(result.width === 9, `Map width should be 9, got ${result.width}`);
assert(result.height === 7, `Map height should be 7, got ${result.height}`);
assert(result.scene instanceof Scene, 'Parser returns valid Scene instance');
assert(result.entities.length >= 5, `Expected at least 5 entities from map, got ${result.entities.length}`);

//verify spawn point found from '@'
assert(result.spawnPoints.length === 1, `Expected 1 spawn point, got ${result.spawnPoints.length}`);
assert(result.defaultSpawn.x === 4.5, `Spawn X should be 4.5, got ${result.defaultSpawn.x}`);
assert(result.defaultSpawn.y === 3.5, `Spawn Y should be 3.5, got ${result.defaultSpawn.y}`);

//verify building walls and heights
const northWallIdx = 0 * result.mapSize + 0;
assert(result.map[northWallIdx] === 10, 'Top-left corner should be building tile 10');
assert(result.buildingHeights[northWallIdx] === 7.5, 'Building height should match 7.5m');

console.log('parseAsciiMap layout and spawn points tests passed');

//2. Custom legend and entity mapping
const customAscii = `
XXX
X@X
XXX
`;

const customResult = parseAsciiMap(customAscii, {
  legend: {
    'X': {
      tile: 12,
      height: 15.0,
      entity: (x, y, z) => new BoxEntity({ x, y, z, sizeX: 0.8, sizeY: 0.8, sizeZ: 2.0 })
    }
  }
});

assert(customResult.width === 3, 'Custom width is 3');
assert(customResult.height === 3, 'Custom height is 3');
assert(customResult.entities.length === 8, `Expected 8 custom box entities, got ${customResult.entities.length}`);
assert(customResult.buildingHeights[0] === 15.0, 'Custom height applied');

console.log('Custom legend parsing tests passed');

//3. Scene JSON serialization & deserialization
const serialized = serializeScene(result.scene, { stringify: true });
assert(typeof serialized === 'string', 'serializeScene returns string when stringify: true');

const restoredScene = deserializeScene(serialized);
assert(restoredScene instanceof Scene, 'deserializeScene creates Scene instance');
assert(restoredScene.mapSize === result.scene.mapSize, 'Restored scene mapSize matches');
assert(restoredScene.entities.length === result.scene.entities.length, 'Restored scene entities length matches');

console.log('serializeScene and deserializeScene roundtrip passed');

//4. ASCII export test
const exportedAscii = exportAsciiMap(result.scene);
assert(typeof exportedAscii === 'string', 'exportAsciiMap returns string');
assert(exportedAscii.includes('#'), 'Exported ASCII contains building characters');
assert(exportedAscii.includes('T'), 'Exported ASCII contains tree characters');

console.log('exportAsciiMap test passed');

console.log('[ALL MAP SERIALIZATION TESTS PASSED SUCCESSFULLY]');
