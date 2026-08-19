# Camera & Control Systems

Full first-person and orbital 3D spatial navigation with continuous 180º vertical pitch, smooth look clamping, and automated frustum culling against spatial bounding boxes.

---

## 1. The `Camera` Class

```javascript
import { Camera } from 'asciilib';

const camera = new Camera({
  x: 10.0,
  y: 10.0,
  z: 1.10,
  baseHeight: 1.10,
  angle: 0.0,       // Horizontal rotation in radians (Yaw)
  pitch: 0.0,       // Vertical rotation (Pitch)
  fov: 70,          // Field of view in degrees
  projectionScale: 0.60,
  far: 65.0         // Render distance cutoff
});
```

### Camera Properties

| Property | Default | Description |
| :--- | :--- | :--- |
| `x, y, z` | `0.0, 0.0, 1.0` | 3D world position in meters |
| `angle` | `0.0` | Horizontal yaw angle (radians) |
| `pitch` | `0.0` | Vertical tilt angle (-3.2 to +3.2) |
| `fov` | `70` | Horizontal Field of View (degrees) |
| `far` | `65.0` | Maximum visible draw distance in meters |
| `projectionScale` | `0.60` | Aspect-ratio compensation scale for character cells |

---

## 2. Projection & Planar Vectors

To maximize rendering performance, `camera.getPlanarVectors()` precalculates trigonometric parameters once per frame:

```javascript
const planar = camera.getPlanarVectors();
// planar.cosAngle, planar.sinAngle, planar.halfFovTan
```

### Screen Column Ray Generation

For any screen column index `col` (from `0` to `blitter.cols - 1`):

```javascript
const ray = camera.getRay(col, blitter.cols, planar);
// ray.cosAngle, ray.sinAngle, ray.cosOffset
```

---

## 3. Frustum AABB Calculation

`camera.getFrustumAABB()` computes the exact 2D bounding rectangle encompassing the camera's view triangle for ultra-fast spatial hash grid querying:

```javascript
const { minX, minY, maxX, maxY } = camera.getFrustumAABB();

const visibleEntities = [];
scene.staticGrid.queryAABB(minX, minY, maxX, maxY, visibleEntities);
```

---

## 4. `FirstPersonController`

A built-in first-person controller handling keyboard input, sprint modifiers, jump physics, and pointer lock:

```javascript
import { FirstPersonController } from 'asciilib';

const controller = new FirstPersonController(camera, canvas, {
  walkSpeed: 4.5,
  sprintMultiplier: 1.8,
  mouseSensitivity: 0.0022,
  jumpSpeed: 5.5,
  gravity: 18.0
});

// Inside your game loop:
function gameLoop(now) {
  const dt = (now - lastTime) / 1000;
  controller.update(dt, scene);
}
```
