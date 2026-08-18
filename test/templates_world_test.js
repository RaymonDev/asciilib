//automated test verifying initialization and rendering of the templates_world showcase
import assert from 'assert';
import {
  Blitter,
  Camera,
  Scene,
  GridMapRaycaster,
  CompoundEntity,
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
  emitSparks,
  updateVehicleFleet,
  updatePedestrianFleet
} from '../src/index.js';

console.log('[TEST] Starting templates_world integration test suite...');

const MAP_SIZE = 40;
const map = new Uint8Array(MAP_SIZE * MAP_SIZE);
const buildingHeights = new Float32Array(MAP_SIZE * MAP_SIZE);

for (let y = 0; y < MAP_SIZE; y++) {
  for (let x = 0; x < MAP_SIZE; x++) {
    if (x === 0 || x === MAP_SIZE - 1 || y === 0 || y === MAP_SIZE - 1) {
      map[y * MAP_SIZE + x] = 12;
      buildingHeights[y * MAP_SIZE + x] = 16.0;
    }
  }
}

const scene = new Scene({ mapSize: MAP_SIZE, map, buildingHeights });

//1. compound monument
const monument = new CompoundEntity({ x: 20.0, y: 20.0 });
monument.addBox({ minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: 0, maxZ: 0.5, material: MaterialPresets.CONCRETE_SLAB });
monument.addCylinder({ radius: 0.4, minZ: 0.5, maxZ: 2.0, material: MaterialPresets.NEON_CYAN });
monument.addEllipsoid({ z: 2.5, radXY: 0.5, radZ: 0.5, material: MaterialPresets.GOLD });
scene.add(monument);

//2. vehicles
const vehicles = [
  createTaxi({ x: 16.0, y: 15.65, angle: 0.0 }),
  createCyberCoupe({ x: 24.0, y: 13.35, angle: Math.PI }),
  createCityBus({ x: 14.0, y: 24.65, angle: 0.0 }),
  createVipSedan({ x: 26.0, y: 26.35, angle: Math.PI })
];
vehicles.forEach(v => scene.add(v));

//3. pedestrians & furniture
const ped = createPedestrian({ x: 18.0, y: 18.0, archetypeIndex: 0 });
scene.add(ped);

const tree = createTree({ x: 15.0, y: 15.0 });
const lamp = createStreetLamp({ x: 17.5, y: 17.5 });
const light = createTrafficLight({ x: 14.5, y: 14.5, phaseGroup: 'EW' });
scene.add(tree);
scene.add(lamp);
scene.add(light);

assert.strictEqual(scene.entities.length, 9, 'Scene should contain 9 entities');

//4. test simulation step
updateVehicleFleet(vehicles, 0.05, () => 'green');
updatePedestrianFleet([ped], 0.05, map, { x: 20, y: 10 });
emitSparks(scene.particleSystem, 20.0, 20.0, 5.0, 4);
scene.update(0.05);

assert(scene.particleSystem.particles.length > 0, 'Sparks should be emitted');

//5. test raycaster rendering
const blitter = new Blitter(80, 45, 7, 10);
const raycaster = new GridMapRaycaster({ maxDepth: 60.0 });
const camera = new Camera({ x: 20.0, y: 13.0, z: 1.0, angle: Math.PI / 2, pitch: 0.05, fov: 70, projectionScale: 0.6, far: 60.0 });

blitter.clear('#000000', 60.0);
raycaster.render(scene, camera, blitter, {
  wallShader: createSkyscraperShader(),
  floorShader: createRoadFloorShader()
});
scene.renderEntities(camera, blitter);

let renderedChars = 0;
for (let i = 0; i < blitter.totalPixels; i++) {
  if (blitter.frameCharCodes[i] > 32) renderedChars++;
}

assert(renderedChars > 500, `Expected >500 rendered characters, got ${renderedChars}`);
console.log(`[PASS] templates_world integration verified (${scene.entities.length} entities, ${renderedChars} visible characters)`);
console.log('[ALL TEMPLATES WORLD INTEGRATION TESTS PASSED]');
