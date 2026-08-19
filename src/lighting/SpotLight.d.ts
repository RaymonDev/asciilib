import { Light, LightOptions, LightContribution } from './Light.js';

export interface SpotLightOptions extends LightOptions {
  decay?: number;
  angle?: number;
  penumbra?: number;
  direction?: { x: number; y: number; z: number };
}

export class SpotLight extends Light {
  decay: number;
  angle: number;
  penumbra: number;
  direction: { x: number; y: number; z: number };

  constructor(options?: SpotLightOptions);
  setDirection(dx: number, dy: number, dz: number): void;
  setAngle(newAngle: number): void;
  getLightContribution(targetX: number, targetY: number, targetZ?: number): LightContribution | null;
}
