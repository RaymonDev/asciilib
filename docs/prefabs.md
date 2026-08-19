# Prefab Entities & Autonomous Simulation

Pre-assembled compound 3D entities featuring autonomous traffic steering, companion escort algorithms, interactive street furniture, and dynamic hazard lighting.

---

## 1. Surveillance Drone (`DroneEntity`)

A dual-rotor surveillance drone equipped with an animated CCTV camera, blinking red recording LED, and an autonomous companion escort system:

```javascript
import { createSurveillanceDrone } from 'asciilib-3d';

const drone = createSurveillanceDrone({
  x: 20.0,
  y: 20.0,
  z: 4.8,
  mode: 'patrol',       // 'patrol' or 'companion'
  patrolRadius: 5.0,    // Radius of circular orbit
  patrolSpeed: 0.45
});

scene.add(drone);
```

### Companion Escort Mode

When in companion mode, the drone dynamically matches the player's movement, smoothly hovering behind and above the player's head at a 45º diagonal elevation angle:

```javascript
// Toggle drone between plaza patrol and player escort
drone.toggleCompanion(camera);

// In your game loop:
function gameLoop(now) {
  const dt = (now - lastTime) / 1000;
  drone.update(dt, now);
}
```

---

## 2. Autonomous Vehicles (`VehicleEntity`)

Procedural cyberpunk vehicles with turning indicators, glowing taillights, and traffic simulation:

```javascript
import {
  createTaxi,
  createCyberCoupe,
  createCityBus,
  updateVehicleFleet
} from 'asciilib-3d';

const taxi = createTaxi({ x: 25.0, y: 14.5, laneDirection: 'east' });
const coupe = createCyberCoupe({ x: 14.5, y: 30.0, laneDirection: 'south' });
const bus = createCityBus({ x: 50.0, y: 65.5, laneDirection: 'west' });

scene.add(taxi);
scene.add(coupe);
scene.add(bus);
```

### Traffic Intersection Simulation

Vehicles autonomously yield to red traffic lights and maintain safe following distances:

```javascript
const fleet = [taxi, coupe, bus];
const intersections = [ /* List of intersection bounds and active signals */ ];

function gameLoop(now) {
  const dt = (now - lastTime) / 1000;
  updateVehicleFleet(fleet, dt, intersections);
}
```

---

## 3. Street Furniture (`streetFurniture.js`)

Add realistic urban infrastructure in a single line:

```javascript
import {
  createTree,
  createStreetLamp,
  createTrafficLight
} from 'asciilib-3d';

// Foliage tree with organic procedural branch forks and leaves
const tree = createTree({ x: 12.0, y: 15.0 });

// Street lamp with warm PointLight (z: 2.85)
const lamp = createStreetLamp({
  x: 18.0,
  y: 18.0,
  armDirX: 1, // Arm extends eastward
  armDirY: 0
});

// Interactive traffic light with 3-phase switching (Red / Amber / Green)
const trafficLight = createTrafficLight({
  x: 36.8,
  y: 36.8,
  facingDir: 'north',
  activeState: 'red'
});

scene.add(tree);
scene.add(lamp);
scene.add(trafficLight);
```

---

## 4. Pedestrians (`PedestrianEntity`)

Autonomous pedestrians patrolling sidewalks and crossing at pedestrian crosswalks:

```javascript
import { createPedestrian, updatePedestrianFleet } from 'asciilib-3d';

const pedestrian = createPedestrian({
  x: 15.0,
  y: 18.0,
  walkSpeed: 1.2
});

scene.add(pedestrian);
```
