# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-19

### Added
- **3D Software Rasterizer**: Character depth testing (`Uint16Array` + `Float32Array`) with batched single-pass Canvas 2D rendering (`Blitter`, `Engine`).
- **Raycasting & Spatial Grid**: 2.5D DDA raycasting with stepped multi-tier walls (`GridMapRaycaster`) and 2D `SpatialHashGrid` for broadphase collision and frustum culling.
- **Analytical 3D Primitives**: Ray-geometry intersection math for `BoxEntity`, `CylinderEntity`, `EllipsoidEntity`, and hierarchical `CompoundEntity`.
- **Procedural Shaders & Materials**: `ASCIIMaterial` and `ASCIIBrush` systems for skyscraper facades, asphalt roads, and sidewalk patterns.
- **Dynamic 3D Lighting**: Omnidirectional `PointLight` and directional `SpotLight` systems with Euclidean distance falloff, angular gating, and luminance modulation.
- **Procedural Web Audio**: Real-time sound synthesis (`AudioEngine`, `ProceduralSFX`) using Web Audio API oscillators, biquad filters, and 3D HRTF positional panners.
- **2D ASCII Map Serialization**: Level parsing and scene graph serialization from plain text blueprints (`parseAsciiMap`, `serializeScene`, `deserializeScene`).
- **Simulation Prefabs**: Autonomous surveillance drones with escort AI, traffic-following vehicles, pedestrians, and street furniture.
- **TypeScript Declarations**: Complete `.d.ts` type definition coverage across all modules.
- **Documentation Suite**: MkDocs Material documentation site with Mermaid flowcharts and interactive demos.
- **Community Standards**: Added `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`.

### Fixed
- Implemented `setChar(col, row, ch, color, bg, alpha)` and `renderToCanvas(...)` in `Blitter.js` to match TypeScript definitions and primitive entity rendering.
