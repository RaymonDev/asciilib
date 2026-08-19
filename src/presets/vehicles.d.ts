import { Entity, EntityOptions } from '../primitives/Entity.js';
import { Scene } from '../scene/Scene.js';
import { Camera } from '../camera/Camera.js';
import { Blitter } from '../core/Blitter.js';

export interface VehicleOptions extends EntityOptions {
  vehicleType?: 'taxi' | 'coupe' | 'cyber_sedan' | 'vip_sedan' | 'bus' | string;
  isBus?: boolean;
  length?: number;
  width?: number;
  speed?: number;
  cruiseSpeed?: number;
  primaryColor?: string;
  highlightColor?: string;
  shadowColor?: string;
  baseBg?: string;
}

export class VehicleEntity extends Entity {
  vehicleType: string;
  isBus: boolean;
  length: number;
  width: number;
  speed: number;
  cruiseSpeed: number;
  targetSpeed: number;
  primaryColor: string;
  highlightColor: string;
  shadowColor: string;
  baseBg: string;

  wheelAngle: number;
  wheelBaseSpeed: number;
  waitingAtRedLight: boolean;
  isTurning: boolean;
  targetLaneCoord: number;

  constructor(options?: VehicleOptions);

  render(camera: Camera, blitter: Blitter, scene: Scene, planar?: any, horizon?: number): void;
}

export function createTaxi(options?: Partial<VehicleOptions>): VehicleEntity;
export function createCyberCoupe(options?: Partial<VehicleOptions>): VehicleEntity;
export function createCityBus(options?: Partial<VehicleOptions>): VehicleEntity;
export function createVipSedan(options?: Partial<VehicleOptions>): VehicleEntity;
export function createVehicleFleet(scene: Scene): VehicleEntity[];
export function updateVehicleFleet(vehicles: VehicleEntity[], dt: number, getSignalState?: (phase: string) => string): void;

export interface IntersectionInfo {
  id: number;
  cx: number;
  cy: number;
  ewLanes: { east: number; west: number };
  nsLanes: { south: number; north: number };
}

export interface StopLineInfo {
  interId: number;
  dir: string;
  phase: string;
  stopCoord: number;
  laneMin: number;
  laneMax: number;
  isX: boolean;
  checkSign: number;
}

export const INTERSECTION_DATA: IntersectionInfo[];
export const STOP_LINES: StopLineInfo[];
