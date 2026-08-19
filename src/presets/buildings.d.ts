import { WallShaderContext, ShaderResult } from '../map/GridMapRaycaster.js';

export interface SkyscraperShaderOptions {
  litColor?: string;
  unlitColor?: string;
  pillarColor?: string;
  spandrelColor?: string;
  signText?: string | null;
  signColor?: string;
}

export function createSkyscraperShader(options?: SkyscraperShaderOptions): (context?: Partial<WallShaderContext>) => ShaderResult;
