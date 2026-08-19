import { Camera } from '../camera/Camera.js';
import { Blitter } from '../core/Blitter.js';
import { PlanarVectors } from '../camera/Camera.js';

export interface ParticleConfig {
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  life?: number;
  maxLife?: number;
  char?: string | number;
  color?: string;
  seed?: number;
  customData?: Record<string, any>;
}

export interface Particle extends Required<Omit<ParticleConfig, 'customData'>> {
  customData: Record<string, any>;
}

export interface ParticleEmitter {
  update: (dt: number, ps: ParticleSystem) => void;
  [key: string]: any;
}

export interface ParticleSystemOptions {
  maxParticles?: number;
  enabled?: boolean;
}

export class ParticleSystem {
  maxParticles: number;
  particles: Particle[];
  emitters: ParticleEmitter[];
  enabled: boolean;

  constructor(options?: ParticleSystemOptions);

  addEmitter(emitter: ParticleEmitter): ParticleEmitter;
  removeEmitter(emitter: ParticleEmitter): void;
  emit(particleConfig: ParticleConfig): void;
  update(dt: number): void;
  render(camera: Camera, blitter: Blitter, planar?: PlanarVectors | null, horizon?: number): void;
  clear(): void;
}
