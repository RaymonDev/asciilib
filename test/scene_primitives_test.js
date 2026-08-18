//automated test suite for asciilib scene, primitives and particles
import assert from 'node:assert';
import {
  Scene,
  GridMapRaycaster,
  Entity,
  BoxEntity,
  CylinderEntity,
  EllipsoidEntity,
  CompoundEntity,
  ParticleSystem,
  Camera
} from '../src/index.js';

console.log('[TEST] Starting asciilib scene and primitives test suite...');

//1. entity & primitives
const box = new BoxEntity({
  x: 10, y: 0, z: 0,
  sizeX: 2.0, sizeY: 2.0, sizeZ: 2.0
});
assert.strictEqual(box.type, 'box');

//ray hit on box
const hitBox = box.intersectRay(0, 0, 1.0, 1, 0, 0);
assert.strictEqual(hitBox.hit, true);
assert.strictEqual(Math.round(hitBox.t), 9); //hits at 10 - 1 = 9

//cylinder
const cyl = new CylinderEntity({
  x: 10, y: 0, z: 0,
  radius: 1.0, minZ: 0, maxZ: 5.0
});
const hitCyl = cyl.intersectRay(0, 0, 2.0, 1, 0, 0);
assert.strictEqual(hitCyl.hit, true);
assert.strictEqual(Math.round(hitCyl.t), 9);

//ellipsoid
const ell = new EllipsoidEntity({
  x: 10, y: 0, z: 2.0,
  radiusXY: 1.0, radiusZ: 1.0
});
const hitEll = ell.intersectRay(0, 0, 2.0, 1, 0, 0);
assert.strictEqual(hitEll.hit, true);
assert.strictEqual(Math.round(hitEll.t), 9);

//compound entity
const compound = new CompoundEntity({ x: 20, y: 20 });
compound.addPart(box);
assert.strictEqual(compound.parts.length, 1);
console.log('Primitives tests passed');

//2. particle system
const ps = new ParticleSystem();
ps.emit({ x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 1, life: 1.0 });
assert.strictEqual(ps.particles.length, 1);
ps.update(0.5); //advance 0.5s
assert.strictEqual(ps.particles[0].life, 0.5);
assert.strictEqual(ps.particles[0].x, 0.5);
ps.update(0.6); //advance past life (0.5 - 0.6 <= 0)
assert.strictEqual(ps.particles.length, 0); //culled
console.log('ParticleSystem tests passed');

//3. scene container & frustum query
const scene = new Scene({ mapSize: 80 });
const staticEnt = new BoxEntity({ x: 15, y: 15, isStatic: true });
const dynamicEnt = new BoxEntity({ x: 16, y: 16, isStatic: false });
scene.add(staticEnt);
scene.add(dynamicEnt);

const camera = new Camera({ x: 10, y: 10, angle: 0, fov: 75 });
const staticBuf = [];
const dynamicBuf = [];
scene.update(0.016);
scene.queryFrustum(camera, staticBuf, dynamicBuf);

assert.strictEqual(staticBuf.length, 1);
assert.strictEqual(dynamicBuf.length, 1);
console.log('Scene container & frustum query tests passed');

//4. grid map raycaster
const raycaster = new GridMapRaycaster({ maxDepth: 32.0 });
assert.strictEqual(raycaster.maxDepth, 32.0);
console.log('GridMapRaycaster instantiation tests passed');

console.log('[ALL SCENE & PRIMITIVES TESTS PASSED SUCCESSFULLY]');
