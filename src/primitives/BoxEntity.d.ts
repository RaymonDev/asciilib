import { Entity, EntityOptions } from './Entity.js';
import { ASCIIMaterial } from '../materials/ASCIIMaterial.js';
import { Camera } from '../camera/Camera.js';
import { Blitter } from '../core/Blitter.js';
import { Scene } from '../scene/Scene.js';

export interface BoxEntityOptions extends EntityOptions {
  sizeX?: number;
  sizeY?: number;
  sizeZ?: number;
  length?: number;
  width?: number;
  height?: number;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  minZ?: number;
  maxZ?: number;
  char?: string | number;
  color?: string;
  bg?: string;
  alpha?: number;
  material?: ASCIIMaterial | null;
}

export class BoxEntity extends Entity {
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;

  char: string | number;
  color: string;
  bg: string;
  alpha: number;
  material: ASCIIMaterial | null;

  constructor(options?: BoxEntityOptions);

  intersectRay(
    rayOrigX: number, rayOrigY: number, rayOrigZ: number,
    rayDirX: number, rayDirY: number, rayDirZ: number
  ): {
    hit: boolean;
    t: number;
    hitFace?: string;
    localX?: number;
    localY?: number;
    localZ?: number;
    worldX?: number;
    worldY?: number;
    worldZ?: number;
  };

  render(camera: Camera, blitter: Blitter, scene: Scene, planar?: any, horizon?: number): void;
}
