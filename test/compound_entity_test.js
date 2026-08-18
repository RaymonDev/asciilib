//automated unit tests for CompoundEntity hierarchical multi-part 3d system
import assert from 'assert';
import { CompoundEntity, Camera, Blitter, Scene, ASCIIMaterial } from '../src/index.js';

console.log('[TEST] Starting asciilib CompoundEntity test suite...');

//1. test instantiation and part addition
const model = new CompoundEntity({ x: 10, y: 20, z: 0, angle: 0 });
assert.strictEqual(model.parts.length, 0);

model.addBox({
  name: 'chassis',
  minX: -1.0, maxX: 1.0,
  minY: -0.5, maxY: 0.5,
  minZ: 0.2, maxZ: 0.8,
  color: '#ff0055'
});
assert.strictEqual(model.parts.length, 1);
assert.strictEqual(model.parts[0].type, 'box');
assert(model.boundingRadius > 1.0, `Expected bounding radius > 1.0, got ${model.boundingRadius}`);
assert.strictEqual(model.height, 0.8);

model.addCylinder({
  name: 'exhaust',
  x: -0.9, y: 0.0,
  radius: 0.1,
  minZ: 0.2, maxZ: 0.4
});
assert.strictEqual(model.parts.length, 2);

model.addEllipsoid({
  name: 'dome',
  x: 0.0, y: 0.0, z: 0.8,
  radXY: 0.4, radZ: 0.3
});
assert.strictEqual(model.parts.length, 3);
assert.strictEqual(model.height, 1.1);

model.addSegment({
  name: 'antenna',
  ax: 0.0, ay: 0.0, az: 1.1,
  bx: 0.0, by: 0.0, bz: 1.6
});
assert.strictEqual(model.parts.length, 4);
assert.strictEqual(model.height, 1.6);
console.log('CompoundEntity part hierarchy and bounds recomputation tests passed');

//2. test rendering into blitter
const blitter = new Blitter(80, 45, 7, 10);
const scene = new Scene({ mapSize: 40 });
const testEntity = new CompoundEntity({ x: 10, y: 10, z: 0, angle: 0 });
testEntity.addBox({
  minX: -0.5, maxX: 0.5,
  minY: -0.5, maxY: 0.5,
  minZ: 0.0, maxZ: 1.0,
  char: '#',
  color: '#00f0ff',
  material: new ASCIIMaterial({ char: '@', color: '#00ff88' })
});
scene.add(testEntity);

const camera = new Camera({
  x: 10, y: 7, z: 0.5, angle: Math.PI / 2, pitch: 0.0, fov: 70, projectionScale: 0.6, far: 50.0
});

blitter.clear('#000000', 50.0);
scene.renderEntities(camera, blitter);

let renderedChars = 0;
for (let i = 0; i < blitter.totalPixels; i++) {
  if (blitter.frameCharCodes[i] === '@'.charCodeAt(0)) {
    renderedChars++;
  }
}
assert(renderedChars > 0, `Expected compound entity material characters rendered, got ${renderedChars}`);
console.log(`CompoundEntity raycasting and blitter rasterization tests passed (${renderedChars} pixels)`);

console.log('[ALL COMPOUND ENTITY TESTS PASSED SUCCESSFULLY]');
