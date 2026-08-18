//automated unit tests for ASCIIMaterial, ASCIIBrush, MaterialPresets, and Prefab Generators
import assert from 'assert';
import {
  ASCIIMaterial,
  ASCIIBrush,
  MaterialPresets,
  createTaxi,
  createCyberCoupe,
  createCityBus,
  createVipSedan,
  createPedestrian,
  createTree,
  createStreetLamp,
  createTrafficLight,
  createSkyscraperShader,
  createRoadFloorShader,
  emitSteamPuff,
  emitSparks,
  emitRainDrop,
  ParticleSystem,
  DroneEntity,
  createSurveillanceDrone
} from '../src/index.js';

console.log('[TEST] Starting asciilib Materials and Presets test suite...');

//1. test ASCIIMaterial
const matSolid = new ASCIIMaterial({ char: '#', color: '#ff0055' });
const s1 = matSolid.sample({ u: 1.0, v: 2.0, z: 0.5 });
assert.strictEqual(s1.char, '#');
assert.strictEqual(s1.color, '#ff0055');

const matGrid = new ASCIIMaterial({ char: '.', color: '#ffffff', pattern: 'grid', patternChar: '|', patternColor: '#00f0ff', patternScale: 2.0 });
const sGrid = matGrid.sample({ u: 0.0, v: 1.0 });
assert.strictEqual(sGrid.char, '|');
console.log('ASCIIMaterial sampling tests passed');

//2. test ASCIIBrush
const brick = ASCIIBrush.sampleBrick(0.5, 0.5);
assert(brick.char !== '', 'Brick pattern should return char');

const win = ASCIIBrush.sampleWindowGrid(0.25, 1.2);
assert(win.char !== '', 'Window pattern should return char');

const zebra = ASCIIBrush.sampleZebra(0.2, true);
assert.strictEqual(zebra.char, '|');

const checker = ASCIIBrush.sampleCheckerboard(0.5, 0.5);
assert(checker.char !== '', 'Checkerboard pattern should return char');

const manhole = ASCIIBrush.sampleManhole(0.05, 0.05, 0.28);
assert(manhole !== null, 'Manhole sampler should return object inside radius');
assert.strictEqual(ASCIIBrush.sampleManhole(1.0, 1.0, 0.28), null);

const sign = ASCIIBrush.sampleSign(3.5, 3.5, 3.0, 13.0, 3.2, 4.6, '[ CYBER ]');
assert(sign !== null, 'Sign sampler should return character');
console.log('ASCIIBrush procedural generators passed');

//3. test MaterialPresets
assert(MaterialPresets.GLASS_BLUE instanceof ASCIIMaterial);
assert(MaterialPresets.CHROME instanceof ASCIIMaterial);
assert(MaterialPresets.ASPHALT instanceof ASCIIMaterial);
assert(MaterialPresets.LEAVES_LUSH instanceof ASCIIMaterial);
assert(MaterialPresets.NEON_CYAN instanceof ASCIIMaterial);
assert(MaterialPresets.SIGNAL_RED_ACTIVE instanceof ASCIIMaterial);
console.log('MaterialPresets verification passed');

//4. test vehicle prefabs
const taxi = createTaxi({ x: 10, y: 10 });
assert.strictEqual(taxi.type, 'taxi');
const coupe = createCyberCoupe({ x: 20, y: 20 });
assert.strictEqual(coupe.type, 'coupe');
const bus = createCityBus({ x: 30, y: 30 });
assert.strictEqual(bus.type, 'bus');
assert.strictEqual(bus.isBus, true);
const sedan = createVipSedan({ x: 40, y: 40 });
assert.strictEqual(sedan.type, 'vip_sedan');
console.log('Vehicle prefab generators passed');

//5. test pedestrian prefab
const ped = createPedestrian({ x: 15, y: 15, archetypeIndex: 0 });
assert.strictEqual(ped.type, 'pedestrian');
assert(ped.boundingRadius > 0.3);
console.log('Pedestrian prefab generator passed');

//6. test street furniture prefabs
const tree = createTree({ x: 5, y: 5 });
assert.strictEqual(tree.type, 'tree');
const lamp = createStreetLamp({ x: 6, y: 6 });
assert.strictEqual(lamp.type, 'lamp');
const light = createTrafficLight({ x: 7, y: 7, facingDir: 'north' });
assert.strictEqual(light.type, 'trafficLight');
console.log('Street furniture prefab generators passed');

//7. test architectural and road shaders
const skyShader = createSkyscraperShader({ signText: '[ EMPIRE ]' });
assert(typeof skyShader === 'function');
const roadShader = createRoadFloorShader();
assert(typeof roadShader === 'function');
console.log('Building and road shader factories passed');

//8. test particle emitters
const ps = new ParticleSystem();
emitSteamPuff(ps, 10, 10);
assert.strictEqual(ps.particles.length, 1);
emitSparks(ps, 10, 10, 2, 5);
assert.strictEqual(ps.particles.length, 6);
emitRainDrop(ps);
assert.strictEqual(ps.particles.length, 7);
//9. test DroneEntity and companion 45-degree stalking mode
const drone = createSurveillanceDrone({ x: 20, y: 20, z: 4.8 });
assert.strictEqual(drone.type, 'drone');
assert(drone.parts.length >= 8, 'Drone should have chassis, arms, hubs, blades, and CCTV camera');
assert(drone.getPart('chassis') !== undefined);
assert(drone.getPart('cctv_lens') !== undefined);

//test mode switching and 45-degree companion follow
const mockCamera = { x: 10.0, y: 10.0, z: 1.0, angle: 0.0 }; //facing East (x+)
drone.toggleCompanion(mockCamera);
assert.strictEqual(drone.mode, 'companion');

//simulate companion follow steps
for (let step = 0; step < 60; step++) {
  drone.update(0.05, step * 50);
}
//when player faces East (+x), drone should be behind (x < 10.0) and elevated (z > 1.0)
assert(drone.x < 10.0, `Drone X should be behind player (<10.0), got ${drone.x}`);
assert(drone.z > 2.5, `Drone Z should be elevated diagonally (>2.5), got ${drone.z}`);
assert(drone.propellerAngle > 0.0, 'Drone propellers should rotate');
console.log('DroneEntity and 45-degree companion escort passed');

console.log('[ALL MATERIALS AND PRESETS TESTS PASSED SUCCESSFULLY]');
