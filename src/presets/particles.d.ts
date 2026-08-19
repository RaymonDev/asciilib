import { ParticleSystem } from '../particles/ParticleSystem.js';

export interface SteamPuffOptions {
  spread?: number;
  z?: number;
  vz?: number;
  life?: number;
  char?: string | number;
  color?: string;
}

export interface SparksOptions {
  color?: string;
}

export interface RainBounds {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  topZ?: number;
}

export function emitSteamPuff(particleSystem: ParticleSystem, x: number, y: number, options?: SteamPuffOptions): void;
export function emitSparks(particleSystem: ParticleSystem, x: number, y: number, z: number, count?: number, options?: SparksOptions): void;
export function emitRainDrop(particleSystem: ParticleSystem, bounds?: RainBounds): void;
