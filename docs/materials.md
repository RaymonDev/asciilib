# Materials, Brushes & Shaders

Bridging 3D spatial mathematics and textual art: map UV coordinates, surface normals, and dynamic lighting levels into procedural ASCII glyphs and RGB color blends.

---

## 1. ASCII Material System (`ASCIIMaterial.js`)

An `ASCIIMaterial` defines the visual appearance (character, foreground color, background color, and lighting sensitivity) of any surface:

```javascript
import { ASCIIMaterial } from 'asciilib';

const cyberGlass = new ASCIIMaterial({
  char: '#',
  color: '#00f0ff',
  bg: '#082f49',
  reflectivity: 0.8,
  emissive: true
});
```

---

## 2. Built-in Material Presets (`MaterialPresets.js`)

Ready-to-use procedural materials for common architectural and industrial surfaces:

```javascript
import { MaterialPresets } from 'asciilib';

// Blue reflective glass skyscraper windows
const glass = MaterialPresets.GLASS_BLUE;

// Metallic steel framing
const chrome = MaterialPresets.METAL_CHROME;

// Brick and masonry
const brick = MaterialPresets.BRICK_RED;

// Dark asphalt and concrete road paving
const concrete = MaterialPresets.CONCRETE_DARK;

// High-contrast neon accents
const neonCyan = MaterialPresets.NEON_CYAN;
const neonAmber = MaterialPresets.NEON_AMBER;
```

---

## 3. Procedural ASCII Brushes (`ASCIIBrush.js`)

The `ASCIIBrush` module provides mathematical texture generators:

```javascript
import { ASCIIBrush } from 'asciilib';

// Sample animated water or ripple patterns
const waterChar = ASCIIBrush.sampleWavePattern(u, v, time);

// Sample brick / mortar grid lines
const brickChar = ASCIIBrush.sampleBrickGrid(u, v, { aspect: 2.0 });

// Multi-octave Perlin / Simplex pseudo-noise
const noiseChar = ASCIIBrush.sampleNoiseRamp(u, v, ' .:-=+*#%@');
```

---

## 4. Custom Building & Road Shaders

When rendering the grid world with `GridMapRaycaster`, you can provide custom shaders for building walls and ground tiles:

### Skyscraper Shader

```javascript
import { createSkyscraperShader } from 'asciilib';

const wallShader = createSkyscraperShader({
  litColor: '#ffeaa7',       // Illuminated window color
  unlitColor: '#1e293b',     // Dark window color
  pillarColor: '#94a3b8',    // Structural vertical columns
  spandrelColor: '#64748b',  // Horizontal floor dividers
  windowLitProbability: 0.40 // Fraction of rooms with lights on
});
```

### Road & Crosswalk Floor Shader

```javascript
import { createRoadFloorShader } from 'asciilib';

const floorShader = createRoadFloorShader({
  roadColor: '#334155',
  laneDividerColor: '#f1c40f', // Yellow center divider lines
  sidewalkColor: '#64748b',
  crosswalkColor: '#f8fafc'
});
```

### Writing a Custom Callback Shader

A custom shader is a simple callback receiving surface context (`hitWorldZ`, `mapX`, `mapY`, `side`, etc.) and returning character, color, and background:

```javascript
function customMatrixShader(ctx) {
  // Generate digital matrix rain on building facades
  const isDrop = Math.sin(ctx.hitWorldZ * 8.0 + performance.now() * 0.005) > 0.8;
  return {
    char: isDrop ? '1' : '0',
    color: isDrop ? '#2ed573' : '#0a2e15',
    bg: '#000000'
  };
}

raycaster.render(scene, camera, blitter, { wallShader: customMatrixShader });
```
