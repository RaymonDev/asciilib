import {
  PointLight,
  SpotLight,
  Scene,
  createStreetLamp,
  createSurveillanceDrone,
  modulateCharLuminance,
  blendLightColor,
  parseColorRGB,
  rgbToHex
} from '../src/index.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

console.log('[TEST] Starting asciilib dynamic lighting system test suite...');

//1. point light distance attenuation
const point = new PointLight({
  x: 10.0,
  y: 10.0,
  z: 2.0,
  color: '#ffeaa7',
  radius: 8.0,
  intensity: 1.0,
  decay: 1.0
});

const centerContrib = point.getLightContribution(10.0, 10.0, 2.0);
assert(centerContrib !== null, 'Point light contributes at center');
assert(Math.abs(centerContrib.intensity - 1.0) < 1e-4, 'Point light intensity is 1.0 at center');

const halfContrib = point.getLightContribution(14.0, 10.0, 2.0); //4m away, half radius
assert(halfContrib !== null, 'Point light contributes at half radius');
assert(Math.abs(halfContrib.intensity - 0.5) < 0.05, `Expected ~0.5 intensity at half radius, got ${halfContrib.intensity}`);

const outsideContrib = point.getLightContribution(20.0, 10.0, 2.0); //10m away (> 8m radius)
assert(outsideContrib === null, 'Point light should contribute nothing outside radius');

console.log('PointLight attenuation tests passed');

//2. spot light angular cone gating
const spot = new SpotLight({
  x: 0.0,
  y: 0.0,
  z: 10.0,
  color: '#00f0ff',
  radius: 15.0,
  intensity: 1.2,
  angle: Math.PI / 4, //45 deg cone
  direction: { x: 0, y: 0, z: -1 } //pointing straight down
});

//point directly below spot
const belowContrib = spot.getLightContribution(0.0, 0.0, 0.0);
assert(belowContrib !== null, 'Spotlight contributes directly under cone');
assert(belowContrib.intensity > 0.3, 'Spotlight intensity > 0.3 on ground directly below');

//point way off to the side (outside cone)
const sideContrib = spot.getLightContribution(15.0, 0.0, 10.0);
assert(sideContrib === null, 'Spotlight should not illuminate behind or outside cone');

console.log('SpotLight angular gating tests passed');

//3. scene lighting accumulation
const scene = new Scene({ ambientLight: '#ffffff' });
scene.addLight(point);
scene.addLight(spot);

assert(scene.lights.length === 2, `Expected 2 lights in scene, got ${scene.lights.length}`);

const sceneLighting = scene.getLightingAt(10.0, 10.0, 2.0);
assert(sceneLighting.intensity > 0.9, 'Scene lighting sums point light');

const sceneLevel = scene.getLightLevel(10.0, 10.0, 2.0, 0.30);
assert(sceneLevel >= 1.0, 'Scene light level incorporates ambient floor');

scene.removeLight(point);
assert(scene.lights.length === 1, 'Scene removed light successfully');

console.log('Scene lighting aggregation tests passed');

//4. automatic light registration on prefabs
const lamp = createStreetLamp({ x: 20.0, y: 20.0 });
scene.add(lamp);
assert(scene.lights.indexOf(lamp.light) !== -1, 'Street lamp auto-registered its PointLight in scene');

const drone = createSurveillanceDrone({ x: 30.0, y: 30.0, z: 5.0 });
scene.add(drone);
assert(scene.lights.indexOf(drone.light) !== -1, 'Drone auto-registered its SpotLight in scene');

drone.update(0.1, 100);
assert(drone.light.x === drone.x, 'Drone updated its SpotLight position on tick');

scene.remove(lamp);
assert(scene.lights.indexOf(lamp.light) === -1, 'Street lamp light removed when entity removed');

console.log('Prefab light auto-registration tests passed');

//5. character luminance and color blending utilities
const dimChar = modulateCharLuminance('@', 0.2);
assert(dimChar === '.' || dimChar === ':', `Expected dim character, got "${dimChar}"`);

const brightChar = modulateCharLuminance('@', 1.0);
assert(brightChar === '@', `Expected bright character, got "${brightChar}"`);

const tinted = blendLightColor('#ffffff', 0.0, 0.94, 1.0, 1.2);
assert(typeof tinted === 'string' && tinted.startsWith('#'), 'blendLightColor returns hex string');

const rgb = parseColorRGB('#00f0ff');
assert(rgb[0] === 0.0 && rgb[1] > 0.9 && rgb[2] === 1.0, 'parseColorRGB parsed cyan');
assert(rgbToHex(0.0, 1.0, 1.0) === '#00ffff', 'rgbToHex converted back');

console.log('LightingUtils color and character modulation tests passed');

console.log('[ALL LIGHTING TESTS PASSED SUCCESSFULLY]');
