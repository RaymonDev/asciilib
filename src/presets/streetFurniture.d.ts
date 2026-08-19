import { Entity, EntityOptions } from '../primitives/Entity.js';
import { Camera } from '../camera/Camera.js';
import { Blitter } from '../core/Blitter.js';
import { Scene } from '../scene/Scene.js';

export interface TreeOptions extends EntityOptions {
  seed?: number;
}

export class TreeEntity extends Entity {
  seed: number;
  heightScale: number;
  widthScale: number;
  forkZ: number;
  topZ: number;

  constructor(options?: TreeOptions);

  render(camera: Camera, blitter: Blitter, scene: Scene, planar?: any, horizon?: number): void;
}

export interface StreetLampOptions extends EntityOptions {
  seed?: number;
}

export class StreetLampEntity extends Entity {
  seed: number;

  constructor(options?: StreetLampOptions);

  render(camera: Camera, blitter: Blitter, scene: Scene, planar?: any, horizon?: number): void;
}

export interface TrafficLightOptions extends EntityOptions {
  facingDir?: 'north' | 'south' | 'east' | 'west';
  phaseGroup?: string;
  activeState?: 'red' | 'yellow' | 'green';
}

export class TrafficLightEntity extends Entity {
  facingDir: 'north' | 'south' | 'east' | 'west';
  phaseGroup: string;
  activeState: 'red' | 'yellow' | 'green';

  constructor(options?: TrafficLightOptions);

  render(camera: Camera, blitter: Blitter, scene: Scene, planar?: any, horizon?: number): void;
}

export function createTree(options?: TreeOptions): TreeEntity;
export function createStreetLamp(options?: StreetLampOptions): StreetLampEntity;
export function createTrafficLight(options?: TrafficLightOptions): TrafficLightEntity;
export function createStreetFurniture(scene: Scene): (TreeEntity | StreetLampEntity | TrafficLightEntity)[];
