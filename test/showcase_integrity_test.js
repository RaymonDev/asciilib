//automated integration test verifying full showcase initialization, raycasting, and rendering
import assert from 'assert';
import { Blitter, Camera, Scene, GridMapRaycaster } from '../src/index.js';
import { buildCityGrid, isMetropolisCrosswalk, getManholeDetails, getIntersections } from '../examples/asciity/cityData.js';
import { wallShader, floorShader } from '../examples/asciity/shaders.js';
import { createStreetFurniture, TrafficLightEntity } from '../examples/asciity/entities/StreetFurniture.js';
import { createVehicleFleet, VehicleEntity, updateVehicleFleet, STOP_LINES, INTERSECTION_DATA } from '../examples/asciity/entities/Vehicle.js';
import { createPedestrians, updatePedestrianFleet } from '../examples/asciity/entities/Pedestrian.js';

console.log('[TEST] Starting asciilib showcase integrity test suite...');

//1. test city data exports
assert(typeof buildCityGrid === 'function', 'buildCityGrid must be exported');
assert(typeof isMetropolisCrosswalk === 'function', 'isMetropolisCrosswalk must be exported');
assert(typeof getManholeDetails === 'function', 'getManholeDetails must be exported');
assert(typeof getIntersections === 'function', 'getIntersections must be exported');

const { map, buildingHeights } = buildCityGrid();
assert(map.length === 80 * 80, 'City map must have 6400 cells');
assert(buildingHeights.length === 80 * 80, 'Building heights must have 6400 cells');

//2. test scene population
const scene = new Scene({ mapSize: 80, map, buildingHeights, cellSize: 8.0 });
const trafficLights = createStreetFurniture(scene);
const vehicles = createVehicleFleet(scene);
const pedestrians = createPedestrians(scene);

assert(scene.entities.length >= 200, `Scene should contain >200 entities, got ${scene.entities.length}`);
assert(trafficLights.length > 0, 'Traffic lights should be populated');
assert(vehicles.length === 22, `Vehicles should be 22, got ${vehicles.length}`);
assert(pedestrians.length > 0, 'Pedestrians should be populated');

//3. test raycasting & blitter rendering
const blitter = new Blitter(160, 90, 7, 10);
const raycaster = new GridMapRaycaster({ maxDepth: 85.0 });
const camera = new Camera({
  x: 37.0, y: 43.5, z: 1.0, angle: -Math.PI / 2, pitch: 0.08, fov: 70, projectionScale: 0.60, far: 85.0
});

blitter.clear('#000000', 85.0);
raycaster.render(scene, camera, blitter, { wallShader, floorShader });
scene.renderEntities(camera, blitter);

let nonSpaceChars = 0;
let coloredPixels = 0;
for (let i = 0; i < blitter.totalPixels; i++) {
  if (blitter.frameCharCodes[i] > 32) nonSpaceChars++;
  if (blitter.frameColors[i] && blitter.frameColors[i] !== '') coloredPixels++;
}

assert(nonSpaceChars > 5000, `Rendered frame should have >5000 visible characters, got ${nonSpaceChars}`);
assert(coloredPixels > 10000, `Rendered frame should have >10000 colored pixels, got ${coloredPixels}`);

//4. test traffic light lens rendering
const camSignal = new Camera({
  x: 39.5, y: 36.0, z: 1.5, angle: Math.PI / 2, pitch: 0.1, fov: 70, projectionScale: 0.60, far: 85.0
});
blitter.clear('#000000', 85.0);
scene.renderEntities(camSignal, blitter);

let coloredLensPixels = 0;
for (let i = 0; i < blitter.totalPixels; i++) {
  const c = blitter.frameColors[i];
  if (c === '#ff0033' || c === '#7f1d1d' || c === '#ffcc00' || c === '#78350f' || c === '#00ff88' || c === '#064e3b') {
    coloredLensPixels++;
  }
}
assert(coloredLensPixels > 10, `Traffic light lenses should produce colored pixels, got ${coloredLensPixels}`);

//5. test vehicle traffic simulation & stop line compliance
assert(STOP_LINES.length === 80, `Expected 80 stop lines across 25 intersections, got ${STOP_LINES.length}`);
assert(INTERSECTION_DATA.length === 25, `Expected 25 intersections, got ${INTERSECTION_DATA.length}`);

const testLeadCar = new VehicleEntity({ x: 7.0, y: 15.65, angle: 0.0, speed: 5.2 });
const testTrailCar = new VehicleEntity({ x: 3.5, y: 15.65, angle: 0.0, speed: 5.2 });
const testVehicles = [testLeadCar, testTrailCar];

const getSignalRed = (phase) => (phase === 'EW' ? 'red' : 'green');
for (let step = 0; step < 80; step++) {
  updateVehicleFleet(testVehicles, 0.05, getSignalRed);
}
assert(testLeadCar.waitingAtRedLight, 'Lead car should be stopped at red light');
assert(testLeadCar.speed === 0, 'Lead car speed should be 0 at red light');
assert(testLeadCar.x - testTrailCar.x >= 2.0, 'Trailing car must maintain safe distance');

const getSignalGreen = (phase) => (phase === 'EW' ? 'green' : 'red');
for (let step = 0; step < 40; step++) {
  updateVehicleFleet(testVehicles, 0.05, getSignalGreen);
}
assert(testLeadCar.speed > 3.0, 'Lead car should accelerate on green light');

console.log(`[PASS] Showcase integration verified: ${scene.entities.length} entities, traffic compliance 100%.`);
console.log('[ALL SHOWCASE INTEGRITY TESTS PASSED SUCCESSFULLY]');
