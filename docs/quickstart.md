# Quickstart Guide

Build a complete, interactive 3D ASCII world in 5 minutes.

---

## 1. HTML Canvas Setup

Create an `index.html` with a full-screen canvas element:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>asciilib - Quickstart</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000000; overflow: hidden; }
    canvas { width: 100vw; height: 100vh; display: block; }
  </style>
</head>
<body>
  <canvas id="canvas3d"></canvas>
  <script type="module" src="./main.js"></script>
</body>
</html>
```

---

## 2. Setting Up the Engine

In `main.js`, import the core modules and initialize the **Blitter**, **Camera**, **Scene**, and **GridMapRaycaster**:

```javascript
import {
  Blitter,
  Camera,
  Scene,
  GridMapRaycaster,
  BoxEntity
} from 'asciilib-3d';

const canvas = document.getElementById('canvas3d');
const ctx = canvas.getContext('2d', { alpha: false });

// 1. Configure ASCII grid resolution
const COLS = 160;
const ROWS = 90;
const CHAR_WIDTH = 7;
const CHAR_HEIGHT = 10;
const fontStyle = "bold 13px 'Courier New', monospace";

const blitter = new Blitter(COLS, ROWS, CHAR_WIDTH, CHAR_HEIGHT);
const raycaster = new GridMapRaycaster({ maxDepth: 40.0 });

// 2. Initialize 3D Camera
const camera = new Camera({
  x: 5.0,
  y: 5.0,
  z: 1.0,
  angle: 0.0,
  pitch: 0.0,
  fov: 70
});

// 3. Initialize Scene container
const scene = new Scene({ mapSize: 32 });

// 4. Add a standalone 3D Box primitive
const box = new BoxEntity({
  x: 8.0,
  y: 5.0,
  z: 0.5,
  sizeX: 1.0,
  sizeY: 1.0,
  sizeZ: 1.0,
  char: '#',
  color: '#00f0ff',
  bg: '#082f49'
});
scene.add(box);
```

---

## 3. Handling User Input

Attach basic WASD keyboard listeners and mouse look:

```javascript
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    camera.angle += e.movementX * 0.0025;
    camera.pitch -= e.movementY * 0.0025;
    camera.pitch = Math.max(-3.0, Math.min(3.0, camera.pitch));
  }
});

canvas.addEventListener('click', () => { canvas.requestPointerLock(); });

function updatePlayer() {
  const speed = 0.08;
  if (keys['KeyW']) {
    camera.x += Math.cos(camera.angle) * speed;
    camera.y += Math.sin(camera.angle) * speed;
  }
  if (keys['KeyS']) {
    camera.x -= Math.cos(camera.angle) * speed;
    camera.y -= Math.sin(camera.angle) * speed;
  }
  if (keys['KeyA']) {
    camera.x += Math.cos(camera.angle - Math.PI / 2) * speed;
    camera.y += Math.sin(camera.angle - Math.PI / 2) * speed;
  }
  if (keys['KeyD']) {
    camera.x += Math.cos(camera.angle + Math.PI / 2) * speed;
    camera.y += Math.sin(camera.angle + Math.PI / 2) * speed;
  }
}
```

---

## 4. The 60 FPS Game Loop

Render the frame by clearing the framebuffer, raycasting the world, rasterizing 3D entities, and blitting characters to the canvas:

```javascript
let lastTime = performance.now();

function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  // 1. Update movement and scene
  updatePlayer();
  scene.update(dt);

  // 2. Clear character framebuffer and Z-depth buffer
  blitter.clear('#000000', 40.0);

  // 3. Raycast 2.5D building walls and ground tiles
  raycaster.render(scene, camera, blitter);

  // 4. Render analytical 3D entities (boxes, cylinders, vehicles, drones)
  scene.renderEntities(camera, blitter);

  // 5. Batch render all characters to Canvas 2D
  blitter.blit(ctx, canvas.width, canvas.height, fontStyle);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

---

## 5. Responsive Resize

Keep the ASCII character grid sharp across any screen size by resizing the canvas and blitter dynamically:

```javascript
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const cols = Math.floor(window.innerWidth / CHAR_WIDTH);
  const rows = Math.floor(window.innerHeight / CHAR_HEIGHT);
  blitter.resize(cols, rows, CHAR_WIDTH, CHAR_HEIGHT);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
```

---

## Next Steps

- Explore the [Rendering Pipeline & Blitter](rendering.md) to understand character depth buffers.
- Add [Dynamic 3D Lighting](lighting.md) with point lights and spotlights.
- Load whole towns with [2D ASCII Map Serialization](maps.md).
- Add footsteps and engine hums with [Procedural Web Audio](audio.md).
