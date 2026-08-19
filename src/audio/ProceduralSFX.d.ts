import { AudioEngine } from './AudioEngine.js';

export interface FootstepOptions {
  volume?: number;
  panner?: PannerNode | null;
}

export interface SfxOptions {
  volume?: number;
  type?: OscillatorType;
  panner?: PannerNode | null;
}

export interface EngineHumController {
  setSpeed(speedRatio: number): void;
  setVolume(volume: number): void;
  stop(): void;
}

export interface DroneHumController {
  setRotorSpeed(speedMultiplier: number): void;
  setVolume(volume: number): void;
  stop(): void;
}

export interface AmbientHumController {
  setVolume(volume: number): void;
  stop(): void;
}

export class ProceduralSFX {
  audioEngine: AudioEngine;

  constructor(audioEngine: AudioEngine);

  get ctx(): AudioContext | null;
  get sfxGain(): GainNode | null;
  get ambientGain(): GainNode | null;

  playFootstep(surface?: 'concrete' | 'wood' | 'metal' | 'grass' | string, options?: FootstepOptions): AudioBufferSourceNode | null;
  playJump(options?: SfxOptions): OscillatorNode | null;
  playLand(options?: SfxOptions): OscillatorNode | null;
  playUiBeep(tone?: 'select' | 'click' | 'confirm' | 'cancel' | 'error' | string, options?: SfxOptions): OscillatorNode | null;
  playLaser(options?: SfxOptions): OscillatorNode | null;
  playPowerUp(options?: SfxOptions): void;
  playImpact(intensity?: number, options?: SfxOptions): void;

  createEngineHum(options?: { baseFreq?: number; volume?: number; panner?: PannerNode | null }): EngineHumController | null;
  createDroneHum(options?: { baseFreq?: number; volume?: number; panner?: PannerNode | null }): DroneHumController | null;
  createAmbientCityHum(options?: { humVolume?: number; windVolume?: number }): AmbientHumController | null;
}
