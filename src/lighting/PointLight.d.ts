import { Light, LightOptions, LightContribution } from './Light.js';

export interface PointLightOptions extends LightOptions {
  decay?: number;
}

export class PointLight extends Light {
  decay: number;

  constructor(options?: PointLightOptions);
  getLightContribution(targetX: number, targetY: number, targetZ?: number): LightContribution | null;
}
