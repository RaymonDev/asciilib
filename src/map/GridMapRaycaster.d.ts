import { Scene } from '../scene/Scene.js';
import { Camera } from '../camera/Camera.js';
import { Blitter } from '../core/Blitter.js';

export interface WallShaderContext {
  mapX: number;
  mapY: number;
  wallType: number;
  wallX: number;
  row: number;
  col: number;
  height: number;
  normZ: number;
  side: number;
  corrDist: number;
  dist: number;
  maxDepth: number;
  scene?: Scene;
  map?: Uint8Array;
}

export interface FloorShaderContext {
  worldX: number;
  worldY: number;
  row: number;
  col: number;
  straightDist: number;
  corrDist: number;
  dist?: number;
  maxDepth: number;
  scene?: Scene;
  map?: Uint8Array;
}

export interface ShaderResult {
  char?: string | number;
  color?: string;
  bg?: string;
  alpha?: number;
}

export interface GridMapRaycasterOptions {
  maxDepth?: number;
}

export interface RaycasterRenderOptions {
  wallShader?: ((ctx: WallShaderContext) => ShaderResult | null) | null;
  floorShader?: ((ctx: FloorShaderContext) => ShaderResult | null) | null;
}

export class GridMapRaycaster {
  maxDepth: number;

  constructor(options?: GridMapRaycasterOptions);

  render(scene: Scene, camera: Camera, blitter: Blitter, options?: RaycasterRenderOptions): void;
}
