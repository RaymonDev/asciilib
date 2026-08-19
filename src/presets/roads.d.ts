import { FloorShaderContext, ShaderResult } from '../map/GridMapRaycaster.js';

export interface RoadFloorShaderOptions {
  asphaltColor?: string;
  asphaltBg?: string;
  curbColor?: string;
  curbBg?: string;
  sidewalkColor?: string;
  sidewalkBg?: string;
}

export function createRoadFloorShader(options?: RoadFloorShaderOptions): (context?: Partial<FloorShaderContext>) => ShaderResult;
