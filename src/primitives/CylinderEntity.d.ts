import { Entity, EntityOptions } from './Entity.js';
import { Camera } from '../camera/Camera.js';
import { Blitter } from '../core/Blitter.js';
import { Scene } from '../scene/Scene.js';

export interface CylinderEntityOptions extends EntityOptions {
  radius?: number;
  minZ?: number;
  maxZ?: number;
  height?: number;
  char?: string | number;
  color?: string;
  bg?: string;
}

export class CylinderEntity extends Entity {
  radius: number;
  minZ: number;
  maxZ: number;
  char: string | number;
  color: string;
  bg: string;

  constructor(options?: CylinderEntityOptions);

  intersectRay(
    rayOrigX: number, rayOrigY: number, rayOrigZ: number,
    rayDirX: number, rayDirY: number, rayDirZ: number
  ): {
    hit: boolean;
    t: number;
    hitX?: number;
    hitY?: number;
    hitZ?: number;
    normalAngle?: number;
  };

  render(camera: Camera, blitter: Blitter, scene: Scene, planar?: any, horizon?: number): void;
}
