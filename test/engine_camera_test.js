//automated test suite for asciilib engine, blitter, camera and controller
import assert from 'node:assert';
import {
  Engine,
  Blitter,
  Camera,
  FirstPersonController
} from '../src/index.js';

console.log('[TEST] Starting asciilib engine and camera test suite...');

//1. engine instantiation & timing
const engine = new Engine({ cols: 80, rows: 40 });
assert.strictEqual(engine.cols, 80);
assert.strictEqual(engine.rows, 40);
assert.strictEqual(engine.isRunning, false);
console.log('Engine instantiation tests passed');

//2. blitter framebuffers & depth buffer
const blitter = new Blitter(80, 40);
assert.strictEqual(blitter.totalPixels, 3200);

//depth writing & reading
blitter.setDepth(10, 10, 5.5);
assert.strictEqual(blitter.getDepth(10, 10), 5.5);
assert.strictEqual(blitter.getDepth(999, 999), Infinity);

//character & background writing
blitter.drawOpaqueChar(10, 10, '#', '#00ff88', 1.0, '#0f172a');
const idx = 10 * 40 + 10;
assert.strictEqual(blitter.frameCharCodes[idx], '#'.charCodeAt(0));
assert.strictEqual(blitter.frameColors[idx], '#00ff88');
assert.strictEqual(blitter.frameBgs[idx], '#0f172a');

//clear resets buffers
blitter.clear('#000000', 32.0);
assert.strictEqual(blitter.frameCharCodes[idx], 32);
assert.strictEqual(blitter.getDepth(10, 10), 32.0);
console.log('Blitter tests passed');

//3. camera projection & ray generation
const camera = new Camera({ x: 10, y: 10, z: 1.0, angle: 0, fov: 60 });
const planar = camera.getPlanarVectors();
assert.strictEqual(Math.round(planar.cosAngle), 1);
assert.strictEqual(Math.round(planar.sinAngle), 0);

//center ray (col = 39.5 on 80 cols -> cameraX = 0)
const centerRay = camera.getRay(40, 80, planar);
assert.strictEqual(Math.round(centerRay.rayDirX), 1);

//frustum aabb
const frustum = camera.getFrustumAABB(32.0, 2.5);
assert.strictEqual(frustum.minX < 10, true);
assert.strictEqual(frustum.maxX > 40, true);
console.log('Camera tests passed');

//4. first person controller kinematics
const ctrl = new FirstPersonController(camera, null, { walkSpeed: 10.0 });
ctrl.keys['KeyW'] = true;
ctrl.update(0.1); //advance 100ms
assert.strictEqual(camera.x > 10, true); //moved forward along +x (angle = 0)

//mouse look rotation
ctrl.rotate(100, -50);
assert.strictEqual(camera.angle > 0, true);
assert.strictEqual(camera.pitch > 0, true);
console.log('FirstPersonController tests passed');

console.log('[ALL ENGINE & CAMERA TESTS PASSED SUCCESSFULLY]');
