//automated test suite for asciilib math and spatial modules
import assert from 'node:assert';
import {
  clamp,
  lerp,
  degToRad,
  radToDeg,
  normalizeAngle,
  distance2D,
  distance3D,
  Vector2,
  Vector3,
  Ray,
  intersectRayAABB,
  intersectRayCylinder,
  intersectRayEllipsoid,
  intersectRaySegmentDistance,
  SpatialHashGrid
} from '../src/index.js';

console.log('[TEST] Starting asciilib math and spatial test suite...');

// 1. MathUtils
assert.strictEqual(clamp(5, 0, 10), 5);
assert.strictEqual(clamp(-5, 0, 10), 0);
assert.strictEqual(clamp(15, 0, 10), 10);
assert.strictEqual(lerp(10, 20, 0.5), 15);
assert.strictEqual(Math.round(degToRad(180) * 1000), Math.round(Math.PI * 1000));
assert.strictEqual(radToDeg(Math.PI), 180);
assert.strictEqual(Math.round(normalizeAngle(Math.PI * 3) * 1000), Math.round(Math.PI * 1000));
assert.strictEqual(Math.round(normalizeAngle(-Math.PI * 3) * 1000), Math.round(-Math.PI * 1000));
assert.strictEqual(distance2D(0, 0, 3, 4), 5);
assert.strictEqual(distance3D(0, 0, 0, 2, 3, 6), 7);
console.log('MathUtils tests passed');

// 2. Vector2 & Vector3
const v2 = new Vector2(3, 4);
assert.strictEqual(v2.length(), 5);
v2.normalize();
assert.strictEqual(Math.round(v2.length()), 1);

const v3a = new Vector3(1, 0, 0);
const v3b = new Vector3(0, 1, 0);
const v3cross = v3a.clone().cross(v3b);
assert.strictEqual(v3cross.x, 0);
assert.strictEqual(v3cross.y, 0);
assert.strictEqual(v3cross.z, 1);
assert.strictEqual(v3a.dot(v3b), 0);
console.log('Vector2 and Vector3 tests passed');

// 3. Ray
const ray = new Ray(new Vector3(0, 0, 0), new Vector3(0, 0, 1));
const targetPt = ray.at(10);
assert.strictEqual(targetPt.z, 10);
console.log('Ray tests passed');

//4. ray-aabb intersection
const boxHit = intersectRayAABB(
  0, 0, 0, //ray origin
  1, 0, 0, //ray direction along +x
  4, 6, -1, 1, -1, 1 //box x:[4,6] y:[-1,1] z:[-1,1]
);
assert.strictEqual(boxHit.hit, true);
assert.strictEqual(Math.round(boxHit.t), 4);
assert.strictEqual(boxHit.hitFace, 'neg_x');
assert.strictEqual(Math.round(boxHit.hitX), 4);

const boxMiss = intersectRayAABB(
  0, 0, 0,
  0, 1, 0, //ray along +y
  4, 6, -1, 1, -1, 1
);
assert.strictEqual(boxMiss.hit, false);
console.log('Ray-AABB tests passed');

//5. ray-cylinder intersection
const cylHit = intersectRayCylinder(
  0, 0, 0,
  1, 0, 0,
  5, 0, 1.0, //cylinder at (5,0) radius 1.0
  -2, 2
);
assert.strictEqual(cylHit.hit, true);
assert.strictEqual(Math.round(cylHit.t), 4); //hits at 5 - 1 = 4
console.log('Ray-Cylinder tests passed');

//6. ray-ellipsoid intersection
const ellHit = intersectRayEllipsoid(
  0, 0, 0,
  1, 0, 0,
  10, 0, 0, //center (10,0,0)
  2.0, 1.0 //radxy=2.0, radz=1.0
);
assert.strictEqual(ellHit.hit, true);
assert.strictEqual(Math.round(ellHit.t), 8); //hits at 10 - 2 = 8
console.log('Ray-Ellipsoid tests passed');

//7. ray-segment distance
const segHit = intersectRaySegmentDistance(
  0, 0, 0,
  1, 0, 0,
  5, -2, 0, //a
  5, 2, 0, //b (segment crosses x=5 at y=0)
  0.01
);
assert.strictEqual(segHit.hit, true);
assert.strictEqual(Math.round(segHit.t), 5);
assert.strictEqual(Math.round(segHit.u * 10) / 10, 0.5);
console.log('Ray-Segment proximity tests passed');

// 8. SpatialHashGrid
const grid = new SpatialHashGrid(8.0, 80.0);
const ent1 = { x: 10, y: 10, id: 'A' };
const ent2 = { x: 70, y: 70, id: 'B' };
grid.insert(ent1, 1.0);
grid.insert(ent2, 1.0);

const query1 = grid.queryAABB(5, 5, 15, 15);
assert.strictEqual(query1.length, 1);
assert.strictEqual(query1[0].id, 'A');

const queryAll = grid.queryAABB(0, 0, 80, 80);
assert.strictEqual(queryAll.length, 2);
console.log('SpatialHashGrid tests passed');

console.log('[ALL TESTS PASSED SUCCESSFULLY]');
