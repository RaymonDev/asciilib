import { Entity } from '../primitives/Entity.js';
import { SpatialHashGrid } from '../spatial/SpatialHashGrid.js';
import { ParticleSystem, ParticleSystemOptions } from '../particles/ParticleSystem.js';
import { Camera } from '../camera/Camera.js';
import { Blitter } from '../core/Blitter.js';
import { Light, LightContribution } from '../lighting/Light.js';

export interface SceneOptions {
  mapSize?: number;
  map?: Uint8Array;
  buildingHeights?: Float32Array;
  cellSize?: number;
  particleOptions?: ParticleSystemOptions;
  ambientLight?: string;
  sunDirection?: { x: number; y: number; z: number };
}

export interface FrustumQueryResult {
  staticEntities: Entity[];
  dynamicEntities: Entity[];
}

export class Scene {
  mapSize: number;
  map: Uint8Array;
  buildingHeights: Float32Array;
  entities: Entity[];
  lights: Light[];
  staticGrid: SpatialHashGrid<Entity>;
  dynamicGrid: SpatialHashGrid<any>;
  particleSystem: ParticleSystem;
  ambientLight: string;
  ambientRGB: [number, number, number];
  sunDirection: { x: number; y: number; z: number };

  constructor(options?: SceneOptions);

  add<T extends Entity = Entity>(entity: T): T;
  remove<T extends Entity = Entity>(entity: T): T;
  addLight<T extends Light = Light>(light: T): T;
  removeLight<T extends Light = Light>(light: T): T;
  getLightingAt(targetX: number, targetY: number, targetZ?: number): LightContribution;
  getLightLevel(targetX: number, targetY: number, targetZ?: number, ambientFloor?: number): number;
  rebuildStaticGrid(): void;
  rebuildDynamicGrid(): void;
  update(dt: number): void;
  queryFrustum(camera: Camera, outStatic?: Entity[], outDynamic?: Entity[]): FrustumQueryResult;
  renderEntities(camera: Camera, blitter: Blitter): void;
}

