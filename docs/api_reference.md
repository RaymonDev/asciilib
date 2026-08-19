# API Reference

Complete reference of all classes, functions, and interfaces exported by `asciilib`.

---

## Core Engine

### `Blitter`
Manages character and depth framebuffers and batch rasterizes to Canvas 2D.
- `constructor(cols, rows, charWidth, charHeight)`
- `resize(cols, rows, charWidth, charHeight)`
- `clear(defaultBg, maxDepth)`
- `drawChar(col, row, ch, color, alpha)`
- `drawOpaqueChar(col, row, ch, color, alpha, bg)`
- `setDepth(col, row, depth)`
- `getDepth(col, row): number`
- `blit(ctx, canvasWidth, canvasHeight, fontStyle)`

### `Camera`
First-person and orbital 3D camera with continuous 180º vertical pitch.
- `constructor(options)`: `x`, `y`, `z`, `angle`, `pitch`, `fov`, `baseHeight`, `projectionScale`, `far`.
- `getPlanarVectors(): PlanarVectors`
- `getRay(col, totalCols, planar): CameraRay`
- `getFrustumAABB(): FrustumAABB`

### `FirstPersonController`
Standard WASD and mouse look controller.
- `constructor(camera, domElement, options)`
- `update(dt, scene)`

### `Scene`
Container managing entities, grid maps, spatial hash grids, dynamic lighting, and particles.
- `constructor(options)`: `mapSize`, `map`, `buildingHeights`, `cellSize`, `ambientLight`, `sunDirection`.
- `add(entity): Entity`
- `remove(entity): Entity`
- `addLight(light): Light`
- `removeLight(light): Light`
- `getLightingAt(targetX, targetY, targetZ): LightContribution`
- `getLightLevel(targetX, targetY, targetZ, ambientFloor): number`
- `update(dt)`
- `queryFrustum(camera, outStatic, outDynamic)`
- `renderEntities(camera, blitter)`

---

## 3D Primitives

### `BoxEntity`
- `constructor(options)`: `x`, `y`, `z`, `sizeX`, `sizeY`, `sizeZ`, `angle`, `char`, `color`, `bg`.

### `CylinderEntity`
- `constructor(options)`: `x`, `y`, `z`, `radius`, `height`, `char`, `color`, `bg`.

### `EllipsoidEntity`
- `constructor(options)`: `x`, `y`, `z`, `radXY`, `radZ`, `char`, `color`, `bg`.

### `CompoundEntity`
- `addBox(part)`
- `addCylinder(part)`
- `addEllipsoid(part)`
- `addSegment(part)`
- `recomputeBounds()`
- `getPart(name)`

---

## Dynamic Lighting

### `PointLight`
- `constructor(options)`: `x`, `y`, `z`, `color`, `intensity`, `radius`, `decay`.

### `SpotLight`
- `constructor(options)`: `x`, `y`, `z`, `color`, `intensity`, `radius`, `decay`, `angle`, `penumbra`, `direction`.

### `LightingUtils`
- `modulateCharLuminance(char, lightFactor, ramp): string`
- `blendLightColor(baseColorStr, lightR, lightG, lightB, lightIntensity): string`
- `parseColorRGB(colorStr): [number, number, number]`
- `rgbToHex(r, g, b): string`

---

## Procedural Audio

### `AudioEngine`
- `constructor(options)`: `masterVolume`, `sfxVolume`, `musicVolume`, `ambientVolume`, `muted`, `autoInit`.
- `unlock(): Promise<void>`
- `mute() / unmute() / toggleMute()`
- `setMasterVolume(val)`
- `createPanner(x, y, z, options): PannerNode`
- `updateListener(camera)`
- `loadSound(name, url)`
- `playSound(name, options)`

### `ProceduralSFX`
- `playFootstep(surface, options)`
- `playJump(options)`
- `playLand(options)`
- `playUiBeep(tone, options)`
- `playLaser(options)`
- `playPowerUp(options)`
- `playImpact(magnitude, options)`
- `createEngineHum(options)`
- `createDroneHum(options)`
- `createAmbientCityHum(options)`

### `SynthTracker`
- `playSequence(sequence, options)`
- `noteToFrequency(noteStr): number`

---

## Map & Scene Serialization

### `parseAsciiMap(asciiString, options)`
Parses a 2D ASCII layout string into an instantiated `Scene` with entities and spawn points.
- Returns `{ scene, width, height, mapSize, map, buildingHeights, entities, spawnPoints, defaultSpawn }`.

### `serializeScene(scene, options)`
Exports a live `Scene` to a JSON object or string.

### `deserializeScene(jsonOrObject, options)`
Reconstructs a `Scene` from serialized JSON data.

### `exportAsciiMap(scene, options)`
Converts a `Scene` into a 2D ASCII text diagram.
