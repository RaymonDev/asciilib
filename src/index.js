//asciilib main library entry point

//core engine & blitting
export { Engine } from './core/Engine.js';
export { Blitter } from './core/Blitter.js';

//camera & controllers
export { Camera } from './camera/Camera.js';
export { FirstPersonController } from './camera/FirstPersonController.js';

//scene & map raycasting & serialization
export { Scene } from './scene/Scene.js';
export { GridMapRaycaster } from './map/GridMapRaycaster.js';
export { parseAsciiMap, DEFAULT_MAP_LEGEND } from './map/MapParser.js';
export { serializeScene, deserializeScene, exportAsciiMap } from './map/SceneSerializer.js';

//3d primitive entities
export { Entity } from './primitives/Entity.js';
export { BoxEntity } from './primitives/BoxEntity.js';
export { CylinderEntity } from './primitives/CylinderEntity.js';
export { EllipsoidEntity } from './primitives/EllipsoidEntity.js';
export { CompoundEntity } from './primitives/CompoundEntity.js';

//materials & procedural styling
export * from './materials/index.js';

//prefabs & presets
export * from './presets/index.js';

//particle system
export { ParticleSystem } from './particles/ParticleSystem.js';

//math utilities & geometry
export * from './math/MathUtils.js';
export { Vector2 } from './math/Vector2.js';
export { Vector3 } from './math/Vector3.js';
export { Ray } from './math/Ray.js';
export * from './math/Intersection.js';

//audio engine & procedural sfx
export * from './audio/index.js';

//spatial partitioning
export { SpatialHashGrid } from './spatial/SpatialHashGrid.js';

