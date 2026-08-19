//asciilib main typescript definitions
export { Engine, EngineOptions } from './core/Engine.js';
export { Blitter } from './core/Blitter.js';

export { Camera, CameraOptions, PlanarVectors, CameraRay, FrustumAABB } from './camera/Camera.js';
export { FirstPersonController, FirstPersonControllerOptions } from './camera/FirstPersonController.js';

export { Scene, SceneOptions, FrustumQueryResult } from './scene/Scene.js';
export { GridMapRaycaster, GridMapRaycasterOptions, RaycasterRenderOptions, WallShaderContext, FloorShaderContext, ShaderResult } from './map/GridMapRaycaster.js';

export { Entity, EntityOptions } from './primitives/Entity.js';
export { BoxEntity, BoxEntityOptions } from './primitives/BoxEntity.js';
export { CylinderEntity, CylinderEntityOptions } from './primitives/CylinderEntity.js';
export { EllipsoidEntity, EllipsoidEntityOptions } from './primitives/EllipsoidEntity.js';
export {
  CompoundEntity,
  CompoundEntityOptions,
  CompoundPart,
  CompoundBoxPart,
  CompoundCylinderPart,
  CompoundEllipsoidPart,
  CompoundSegmentPart,
  CustomShaderContext,
  ShadedSample
} from './primitives/CompoundEntity.js';

export * from './materials/index.js';
export * from './presets/index.js';

export { ParticleSystem, ParticleSystemOptions, Particle, ParticleConfig, ParticleEmitter } from './particles/ParticleSystem.js';

export * from './math/MathUtils.js';
export { Vector2 } from './math/Vector2.js';
export { Vector3 } from './math/Vector3.js';
export { Ray } from './math/Ray.js';
export * from './math/Intersection.js';

export { SpatialHashGrid, SpatialEntity } from './spatial/SpatialHashGrid.js';
