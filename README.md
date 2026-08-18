<div align="center">

<pre align="center">
                             ███   ███  ████   ███  █████       
                            ▒▒▒   ▒▒▒  ▒▒███  ▒▒▒  ▒▒███        
  ██████    █████   ██████  ████  ████  ▒███  ████  ▒███████    
 ▒▒▒▒▒███  ███▒▒   ███▒▒███▒▒███ ▒▒███  ▒███ ▒▒███  ▒███▒▒███   
  ███████ ▒▒█████ ▒███ ▒▒▒  ▒███  ▒███  ▒███  ▒███  ▒███ ▒███   
 ███▒▒███  ▒▒▒▒███▒███  ███ ▒███  ▒███  ▒███  ▒███  ▒███ ▒███   
▒▒████████ ██████ ▒▒██████  █████ █████ █████ █████ ████████    
 ▒▒▒▒▒▒▒▒ ▒▒▒▒▒▒   ▒▒▒▒▒▒  ▒▒▒▒▒ ▒▒▒▒▒ ▒▒▒▒▒ ▒▒▒▒▒ ▒▒▒▒▒▒▒▒     
                                                                 
</pre>

**A zero-dependency, pure vanilla JavaScript 3D software rendering engine and spatial game framework.**

[![Pure Vanilla JS](https://img.shields.io/badge/language-Vanilla%20ES6+-F7DF1E.svg?style=flat-square&logo=javascript&logoColor=black)](#)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](#)

[Installation](#installation) • [Quickstart](#quickstart) • [Features](#features) • [Running the Examples](#running-the-examples) • [Controls](#controls) • [License](#license)

---

</div>

## Overview

**`asciilib`** is a modular, high-performance software 3D rendering engine built with pure mathematics and standard ASCII characters (ASCII 32–126). 

It turns a standard HTML5 Canvas 2D context into a full 3D software rasterization pipeline capable of rendering cities, 3D geometry, vehicles, characters, and particle effects without external 3D asset files or textures.

---

## Installation

You can use `asciilib` directly in your project using standard ES Modules:

### Option 1: Direct Local Import (Recommended)

Copy the `src/` directory into your project and import the modules:

```javascript
import { Engine, Scene, Camera, FirstPersonController, BoxEntity } from './src/index.js';
```

### Option 2: Clone the Repository

```bash
git clone https://github.com/RaymonDev/asciilib.git
cd asciilib
```

### Option 3: Package Manager (npm) [PENDING]

```bash
npm install asciilib
```

```javascript
import { Engine, Scene, Camera, FirstPersonController, BoxEntity } from 'asciilib';
```

---

## Quickstart

Here is a complete working example in under 20 lines of code:

```javascript
import {
  Engine,
  Scene,
  Camera,
  FirstPersonController,
  BoxEntity,
  GridMapRaycaster
} from './src/index.js';

// 1. Initialize canvas, engine & scene
const canvas = document.getElementById('canvas3d');
const engine = new Engine({ canvas, cols: 160, rows: 90 });
const scene = new Scene({ mapSize: 80 });

// 2. Setup camera & first-person controller
const camera = new Camera({ x: 10, y: 10, z: 1.0, fov: 75 });
const controller = new FirstPersonController(camera, canvas);

// 3. Add 3D entities to the world
const cyberBox = new BoxEntity({
  x: 15, y: 10, z: 0,
  sizeX: 2.0, sizeY: 2.0, sizeZ: 2.0,
  char: '#', color: '#00f0ff', bg: '#042730'
});
scene.add(cyberBox);

// 4. Start the game loop
const raycaster = new GridMapRaycaster();
engine.start(
  (dt) => {
    controller.update(dt);
    scene.update(dt);
  },
  (ctx) => {
    // Render pipeline
  }
);
```

---

## Features

- **Zero Dependencies**: Pure vanilla JavaScript running directly on HTML5 Canvas 2D.
- **Planar Camera & Raycasting**: Fisheye-free perspective projection with full pitch, yaw, and FOV control.
- **Z-Buffer & Occlusion**: Floating-point depth buffer for accurate front-to-back rendering.
- **Spatial Hash Grid**: Built-in 2D spatial partitioning and frustum culling.
- **3D Primitives & Compound Models**: Support for boxes, cylinders, ellipsoids, line segments, and hierarchical multi-part compound entities.
- **Materials & Prefabs**: Ready-to-use ASCII materials, procedural shaders, vehicle fleets, pedestrians, surveillance drones, and street furniture.
- **Grid Map Raycaster**: Fast DDA raycasting for multi-tiered buildings and inverse-perspective floor/ceiling rendering.
- **Particle System**: 3D particle emitters for steam, sparks, and atmospheric rain effects.
- **First-Person Controls**: Built-in locomotion (WASD, sprint, crouch, jump) and 360-degree mouse look with Pointer Lock.
- **Batched Canvas Blitter**: Optimized horizontal run-length batching that reduces canvas draw calls by over 90%.

---

## Running the Examples

The repository includes showcase projects demonstrating different aspects of `asciilib`:
- **Templates World**: A showcase world demonstrating all prefabs, materials, shaders, and companion drones.
- **ASCIITY**: A full city simulation featuring 25 traffic-controlled intersections, autonomous vehicles, walking pedestrians, and multi-tiered skyscrapers.

Because the project uses standard JavaScript ES Modules, browsers require a local HTTP server to run the files.

### Option 1: Using Node.js / npx (Recommended)

```bash
# Using 'serve'
npx serve .

# Or using 'http-server'
npx http-server . -p 8080
```

### Option 2: Using Python

```bash
# Python 3:
python -m http.server 8080

# Python 2 (legacy):
python -m SimpleHTTPServer 8080
```

### Option 3: VS Code / Cursor

Right-click any `index.html` in `examples/` and select **"Open with Live Server"**.

---

### Example URLs

Once your local server is running, navigate to:

- **Templates & Prefabs Showcase**:  
  `http://localhost:8080/examples/templates_world/`
- **ASCIITY City Simulation**:  
  `http://localhost:8080/examples/asciity/`
- **Legacy Standalone Reference Demo**:  
  `http://localhost:8080/`

---

## Controls

| Key / Input | Action |
| :--- | :--- |
| **`W` `A` `S` `D`** / **Arrow Keys** | Move Forward / Left / Backward / Right |
| **Mouse** | 360° Free Look (Yaw & Pitch) |
| **`Space`** / **`J`** | Jump |
| **`Shift`** | Sprint |
| **`C`** | Crouch / Drone Companion Toggle |
| **`P`** | Toggle Autonomous Traffic |
| **`ESC`** | Pause Game / Open Configuration Menu |

---

## Testing

To run the automated unit and integration tests:

```bash
node test/math_spatial_test.js
node test/engine_camera_test.js
node test/scene_primitives_test.js
node test/compound_entity_test.js
node test/materials_presets_test.js
node test/showcase_integrity_test.js
node test/templates_world_test.js
```

---

## License

This project is licensed under the [MIT License](LICENSE).
