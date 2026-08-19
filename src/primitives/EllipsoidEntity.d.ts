import { Entity, EntityOptions } from './Entity.js';
import { Camera } from '../camera/Camera.js';
import { Blitter } from '../core/Blitter.js';
import { Scene } from '../scene/Scene.js';

export interface EllipsoidEntityOptions extends EntityOptions {
  radiusXY?: number;
  radiusZ?: number;
  radius?: number;
  char?: string | number;
  color?: string;
  bg?: string;
}

export class EllipsoidEntity extends Entity {
  radiusXY: number;
  radiusZ: number;
  char: string | number;
  color: string;
  bg: string;

  constructor(options?: EllipsoidEntityOptions);

  intersectRay(
    rayOrigX: number, rayOrigY: number, rayOrigZ: number,
    rayDirX: number, rayDirY: number, rayDirZ: number
  ): {
    hit: boolean;
    t: number;
    hitX?: number;
    hitY?: number;
    hitZ?: number;
  };

  render(camera: Camera, blitter: Blitter, scene: Scene, planar?: any, horizon?: number): void;
}
