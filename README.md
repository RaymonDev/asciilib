# asciilib

**`asciilib`** is a zero-dependency, pure vanilla JavaScript software 3D rendering engine and urban simulation running on HTML5 Canvas 2D. It renders an expansive, walkable cyberpunk metropolis with multi-tier skyscrapers, autonomous vehicle fleets, articulated walking pedestrians, procedural trees, streetlights, and 4-way traffic signals using **pure mathematics and standard ASCII glyphs** (ASCII 32–126).

---

## Features

-  **Zero 3D Asset Files**: The entire 3D world is generated purely with implicit mathematics, procedural architectural facade shaders, and analytical geometry. No `.obj`, `.gltf`, or external textures.
-  **True Rectilinear Planar Projection**: Custom planar camera projection matrix eliminates the classic raycaster fish-eye distortion.
-  **Per-Pixel Floating-Point Depth Buffer**: Robust depth-buffer testing guarantees front-to-back occlusion between multi-tiered buildings, vehicles, pedestrians, trees, streetlights, and traffic signals.
-  **Autonomous Traffic Grid AI**: 25 Manhattan intersections managed by a synchronized 4-phase traffic light state machine, vehicle-to-vehicle OBB (Oriented Bounding Box) physical collision resolution, deceleration zones, and turning kinematics.
-  **Articulated Cyberpunk Pedestrians**: Hierarchical skeletal kinematics simulating human walking gait (foot plant, high-step swing lift, counter-phase arm swinging, torso bounce, and hip sway) paired with collision-slide navigation AI.
-  **Ultra-Fast Batched 2D Canvas Blitter**: Custom framebuffer run-length encoding batches horizontal background spans and contiguous ASCII text runs, reducing Canvas draw calls by 99% to deliver locked 60 FPS performance.
-  **First-Person Controller**: Smooth WASD movement, mouse-look camera with pointer lock, jumping, crouching, sprinting, and an in-game pause/settings menu via `ESC`.

---

##  Controls

| Key / Input | Action |
| :--- | :--- |
| **`W` `A` `S` `D`** / **Arrow Keys** | Move Forward / Left / Backward / Right |
| **Mouse** | 360° Free Look (Yaw & Pitch) |
| **`Space`** | Jump |
| **`Shift`** | Sprint |
| **`C`** | Crouch |
| **`P`** | Toggle Autonomous Traffic |
| **`ESC`** | Pause Game / Open Configuration Menu |

---

##  Quick Start

No build tools, bundlers, or `npm install` required.

1. Clone or download the repository:
   ```bash
   git clone https://github.com/RaymonDev/asciilib.git
   cd asciilib
   ```

2. Start any local HTTP server:
   ```bash
   # Using Python:
   python -m http.server 8080

   # Or using Node.js:
   npx serve .
   ```

3. Open your browser and navigate to `http://localhost:8080`.

---

## Repository Structure

```
asciilib/
├── index.html     # Minimalist canvas container, HUD, and configuration menu
├── main.js        # Core 3D engine, DDA raycaster, physics, AI & batched renderer
├── style.css      # CRT styling, crisp monospace typography, and responsive layout
└── README.md      # Project overview and documentation
```

---

##  In-Game Configuration

Press `ESC` at any time during gameplay to access the configuration menu:
- **Traffic Simulation**: Toggle vehicle AI on/off on the fly.
- **HUD Display**: Minimal diagnostic HUD (FPS counter, coordinate position, and cardinal compass heading).
- **Crosshair**: Center aiming dot with toggle support.
- **Player Eye Height**: Adjust camera height from low crouch (0.4m) to tall street view (2.0m).
- **Camera FOV / Zoom**: Fine-tune field of view from 50° to 100°.
- **Mouse Sensitivity**: Dynamic mouse-look sensitivity multiplier.

---
