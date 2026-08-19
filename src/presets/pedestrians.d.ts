import { Entity, EntityOptions } from '../primitives/Entity.js';
import { Camera } from '../camera/Camera.js';
import { Blitter } from '../core/Blitter.js';
import { Scene } from '../scene/Scene.js';

export interface PedestrianArchetype {
  type: string;
  height: number;
  speed: number;
  hairColor: string;
  skinColor: string;
  jacketColor: string;
  jacketAccentColor: string;
  pantsColor: string;
  shoesColor: string;
  baseBg: string;
}

export interface Waypoint {
  x: number;
  y: number;
}

export interface PedestrianOptions extends EntityOptions {
  path?: Waypoint[];
  isLoop?: boolean;
  pathDir?: number;
  waypointIdx?: number;
  speed?: number;
  height?: number;
  hairColor?: string;
  skinColor?: string;
  jacketColor?: string;
  jacketAccentColor?: string;
  pantsColor?: string;
  shoesColor?: string;
  baseBg?: string;
  walkCycle?: number;
  seed?: number;
  archetypeIndex?: number;
}

export class PedestrianEntity extends Entity {
  path: Waypoint[];
  isLoop: boolean;
  pathDir: number;
  waypointIdx: number;
  speed: number;
  height: number;
  hairColor: string;
  skinColor: string;
  jacketColor: string;
  jacketAccentColor: string;
  pantsColor: string;
  shoesColor: string;
  baseBg: string;
  walkCycle: number;
  seed: number;

  constructor(options?: PedestrianOptions);

  render(camera: Camera, blitter: Blitter, scene: Scene, planar?: any, horizon?: number): void;
}

export function createPedestrian(options?: PedestrianOptions): PedestrianEntity;
export function createPedestrianFleet(scene: Scene): PedestrianEntity[];
export function updatePedestrianFleet(pedestrians: PedestrianEntity[], dt: number): void;

export const PEDESTRIAN_ARCHETYPES: PedestrianArchetype[];
