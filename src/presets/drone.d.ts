import { CompoundEntity, CompoundEntityOptions } from '../primitives/CompoundEntity.js';

export interface DroneOptions extends CompoundEntityOptions {
  mode?: 'patrol' | 'companion' | 'hover' | string;
  patrolCenter?: { x: number; y: number; z?: number };
  patrolRadius?: number;
  patrolSpeed?: number;
  patrolAngle?: number;
  companionTarget?: { x: number; y: number; z?: number; angle?: number } | null;
  companionDist?: number;
  companionHeight?: number;
  propellerSpeed?: number;
  chassisColor?: string;
  chassisBg?: string;
}

export class DroneEntity extends CompoundEntity {
  mode: string;
  patrolCenter: { x: number; y: number; z?: number };
  patrolRadius: number;
  patrolSpeed: number;
  patrolAngle: number;

  companionTarget: { x: number; y: number; z?: number; angle?: number } | null;
  companionDist: number;
  companionHeight: number;
  companionElevationAngle: number;
  escortHeading: number;

  propellerAngle: number;
  propellerSpeed: number;
  hoverBobTimer: number;

  constructor(options?: DroneOptions);

  buildGeometry(options?: DroneOptions): void;
  setMode(mode: string, target?: any): void;
  toggleCompanion(target?: any): string;
  update(dt: number, now?: any): void;
}

export function createSurveillanceDrone(options?: DroneOptions): DroneEntity;
