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

### Pure JavaScript 3D ASCII Software Rendering, Physics & Web Audio Engine

[![npm version](https://img.shields.io/npm/v/asciilib-3d.svg?style=flat-square&color=00f0ff&logo=npm)](https://www.npmjs.com/package/asciilib-3d)
[![Read the Docs](https://img.shields.io/readthedocs/asciilib?style=flat-square&logo=readthedocs&logoColor=white&color=2ed573)](https://asciilib.readthedocs.io/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](./CONTRIBUTING.md)

[Documentation](https://asciilib.readthedocs.io/) • [Live Demos](#interactive-live-demos) • [Installation](#installation) • [Quickstart](#quickstart) • [Architecture](#engine-architecture) • [Contributing](#contributing)

</div>

---

## What is asciilib?

**`asciilib`** is a modular, zero-dependency software 3D rendering engine and game framework engineered in pure JavaScript. It transforms a standard HTML5 Canvas 2D context into a complete 3D graphics pipeline powered entirely by analytical mathematics and standard ASCII character grids.

Without requiring WebGL, Three.js, or external 3D asset files, `asciilib` delivers:
- **Full 3D Software Rasterization** with character-level floating-point depth testing (**Z-Buffer**).
- **2.5D DDA Raycasting** with multi-tiered stepped architectural geometry.
- **Dynamic 3D Lighting** with Euclidean point lights, spotlights, flashlight cones, and character density modulation.
- **Procedural Web Audio Engine** for synthesized sound effects, vehicle engine pitches, footsteps, and binaural 3D HRTF spatialization.
- **2D ASCII Map Serialization** to build full 3D interactive cities and dungeons directly from plain text strings.

---

## Interactive Live Demos

Experience `asciilib` running live directly in your browser:

| Showcase | Description | Live Link |
| :--- | :--- | :---: |
| **ASCIITY Metropolis** | Cyberpunk metropolis with 25 intersections, autonomous traffic AI, pedestrians, and skyscrapers | [Launch Demo](https://raymondev.github.io/asciilib/examples/asciity/) |
| **Templates World** | Comprehensive showcase with all 3D primitives, procedural materials, and companion drone AI | [Launch Demo](https://raymondev.github.io/asciilib/examples/templates_world/) |
| **Dynamic 3D Lighting** | Real-time Euclidean point lights, drone searchlights, flashlight beams, and Day/Night cycles | [Launch Demo](https://raymondev.github.io/asciilib/examples/light_test/) |
| **2D ASCII Map Test** | Multi-block town rendered directly from a 2D ASCII text blueprint | [Launch Demo](https://raymondev.github.io/asciilib/examples/map_test/) |

---

## Installation

### Package Manager (npm)

```bash
npm install asciilib-3d
```

```javascript
import { Engine, Scene, Camera, FirstPersonController, BoxEntity } from 'asciilib-3d';
```

### Modern ES Module / Direct Script (Zero Build Step)

```html
<canvas id="canvas3d"></canvas>
<script type="module">
  import { Engine, Scene, Camera, FirstPersonController, BoxEntity } from './src/index.js';
</script>
```

---

## Quickstart

Build and run an interactive 3D ASCII world in under 30 lines of code:

```javascript
import {
  Engine,
  Scene,
  Camera,
  FirstPersonController,
  BoxEntity,
  PointLight
} from 'asciilib-3d';

// 1. Initialize canvas, engine & scene
const canvas = document.getElementById('canvas3d');
const engine = new Engine({ canvas, cols: 160, rows: 90 });
const scene = new Scene({ mapSize: 80 });

// 2. Setup camera & first-person controller
const camera = new Camera({ x: 10, y: 10, z: 1.10, fov: 70 });
const controller = new FirstPersonController(camera, canvas);

// 3. Add 3D entities & dynamic lighting
const box = new BoxEntity({
  x: 15, y: 10, z: 0,
  sizeX: 2.0, sizeY: 2.0, sizeZ: 2.0,
  char: '#', color: '#00f0ff', bg: '#042730'
});
scene.add(box);

const light = new PointLight({
  x: 12, y: 10, z: 2.5,
  color: '#ffeaa7', radius: 8.0, intensity: 1.2
});
scene.addLight(light);

// 4. Start 60 FPS game loop
engine.start(
  (dt) => {
    controller.update(dt, scene);
    scene.update(dt);
  },
  (ctx) => {
    // Single-pass batched render to Canvas 2D
  }
);
```

---

## Key Features

- **Zero Dependencies**: Pure vanilla JavaScript running natively in any browser with no heavy binaries or WebGL overhead.
- **Fast 3D Rasterization & Z-Buffer**: Floating-point depth testing prevents character bleeding and enables accurate front-to-back sorting.
- **Batched 2D Blitter**: Groups identical character colors across horizontal spans, cutting canvas fillStyle draw calls by over 90%.
- **3D Primitives & Compound Hierarchies**: Analytical ray-geometry intersections for boxes, cylinders, ellipsoids, and multi-part `CompoundEntity` graphs.
- **Dynamic 3D Lighting**: Omnidirectional point lights and directional spotlights with Euclidean falloff and character density ramp modulation (` .:-=+*#%@`).
- **Procedural Web Audio Engine**: Zero-file audio synthesis powered purely by native Web Audio API oscillators, noise buffers, and 3D HRTF positional panners.
- **2D ASCII Map Serialization**: Parse complete 3D levels from plain text string blueprints with automatic collisions, shaders, and entity registration.
- **Simulation Prefabs**: Autonomous surveillance drones with companion escort AI, traffic-following vehicles, pedestrians, and interactive street furniture.
- **First-Person Controls**: Built-in locomotion (WASD, sprint, crouch, jump) and 360º yaw with 180º vertical pitch and Pointer Lock.
- **Spatial Partitioning**: 2D `SpatialHashGrid` for instant broadphase collision queries and frustum culling.
- **TypeScript Support**: Full `.d.ts` declaration coverage across all modules.

---

## Controls

| Input | Action |
| :--- | :--- |
| **`W` `A` `S` `D`** / **Arrow Keys** | Move Forward / Left / Backward / Right |
| **Mouse** | 360º Free Look (Yaw) & 180º Continuous Tilt (Pitch) |
| **`Space`** | Jump |
| **`Shift`** | Sprint |
| **`C`** | Toggle Companion Drone Escort |
| **`ESC`** | Release Pointer Lock |

---

## Documentation

Full API guides, architecture breakdowns, and interactive diagrams are available at:

**[https://asciilib.readthedocs.io/](https://asciilib.readthedocs.io/)**

- [Quickstart Guide](https://asciilib.readthedocs.io/quickstart/)
- [3D Pipeline & Blitter](https://asciilib.readthedocs.io/rendering/)
- [Cameras & Controls](https://asciilib.readthedocs.io/cameras/)
- [3D Primitives & Compound Entities](https://asciilib.readthedocs.io/primitives/)
- [Materials & Shaders](https://asciilib.readthedocs.io/materials/)
- [Dynamic 3D Lighting](https://asciilib.readthedocs.io/lighting/)
- [Procedural Web Audio](https://asciilib.readthedocs.io/audio/)
- [2D ASCII Maps](https://asciilib.readthedocs.io/maps/)
- [Simulation Prefabs](https://asciilib.readthedocs.io/prefabs/)
- [API Reference](https://asciilib.readthedocs.io/api_reference/)

---

## Testing

Run the automated test suite across all 12 modules:

```bash
npm test
```

---

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/RaymonDev/asciilib/issues).

Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting pull requests.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes and version history.

---

## License

This project is licensed under the [MIT License](LICENSE) — see the [LICENSE](LICENSE) file for details.
