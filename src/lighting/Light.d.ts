export interface LightOptions {
  x?: number;
  y?: number;
  z?: number;
  color?: string;
  intensity?: number;
  radius?: number;
  active?: boolean;
}

export interface LightContribution {
  intensity: number;
  r: number;
  g: number;
  b: number;
}

export class Light {
  x: number;
  y: number;
  z: number;
  color: string;
  intensity: number;
  radius: number;
  radiusSq: number;
  active: boolean;
  type: string;
  rgb: [number, number, number];

  constructor(options?: LightOptions);
  setColor(newColor: string): void;
  setRadius(newRadius: number): void;
  setPosition(x: number, y: number, z?: number): void;
  getLightContribution(targetX: number, targetY: number, targetZ: number): LightContribution | null;
}
