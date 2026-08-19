import { Entity, EntityOptions } from './Entity.js';
import { ASCIIMaterial } from '../materials/ASCIIMaterial.js';
import { Camera } from '../camera/Camera.js';
import { Blitter } from '../core/Blitter.js';
import { Scene } from '../scene/Scene.js';

export interface ShadedSample {
  char?: string | number;
  color?: string;
  bg?: string;
  alpha?: number;
}

export interface CustomShaderContext {
  entity: CompoundEntity;
  part: CompoundPart;
  localX: number;
  localY: number;
  worldZ: number;
  hitFace: string;
  dist: number;
}

export interface CompoundPartBase {
  name: string;
  char?: string | number;
  color?: string;
  bg?: string;
  alpha?: number;
  material?: ASCIIMaterial | null;
  customShader?: ((ctx: CustomShaderContext) => ShadedSample | null) | null;
}

export interface CompoundBoxPart extends CompoundPartBase {
  type: 'box';
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  minZ?: number;
  maxZ?: number;
}

export interface CompoundCylinderPart extends CompoundPartBase {
  type: 'cylinder';
  x?: number;
  y?: number;
  radius?: number;
  minZ?: number;
  maxZ?: number;
}

export interface CompoundEllipsoidPart extends CompoundPartBase {
  type: 'ellipsoid';
  x?: number;
  y?: number;
  z?: number;
  radXY?: number;
  radZ?: number;
  radius?: number;
}

export interface CompoundSegmentPart extends CompoundPartBase {
  type: 'segment';
  ax?: number;
  ay?: number;
  az?: number;
  bx?: number;
  by?: number;
  bz?: number;
  thickness?: number;
  thicknessSq?: number;
}

export type CompoundPart =
  | CompoundBoxPart
  | CompoundCylinderPart
  | CompoundEllipsoidPart
  | CompoundSegmentPart;

export interface CompoundEntityOptions extends EntityOptions {
  height?: number;
  parts?: CompoundPart[];
}

export class CompoundEntity extends Entity {
  parts: CompoundPart[];
  height: number;
  minZ: number;

  constructor(options?: CompoundEntityOptions);

  addPart(part: CompoundPart): this;
  getPart<T extends CompoundPart = CompoundPart>(name: string): T | undefined;
  addBox(options?: Partial<CompoundBoxPart>): this;
  addCylinder(options?: Partial<CompoundCylinderPart>): this;
  addEllipsoid(options?: Partial<CompoundEllipsoidPart>): this;
  addSegment(options?: Partial<CompoundSegmentPart>): this;
  recomputeBounds(): void;
  render(camera: Camera, blitter: Blitter, scene: Scene, planar?: any, horizon?: number): void;
}
