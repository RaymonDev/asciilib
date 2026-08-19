import { Camera } from '../camera/Camera.js';

export interface AudioEngineOptions {
  autoInit?: boolean;
  muted?: boolean;
  masterVolume?: number;
  sfxVolume?: number;
  musicVolume?: number;
  ambientVolume?: number;
}

export interface SoundPlayOptions {
  volume?: number;
  pitch?: number;
  playbackRate?: number;
  loop?: boolean;
  panner?: PannerNode | null;
}

export interface PannerOptions {
  panningModel?: PanningModelType;
  distanceModel?: DistanceModelType;
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  coneInnerAngle?: number;
}

export class AudioEngine {
  ctx: AudioContext | null;
  isUnlocked: boolean;
  isMuted: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  ambientVolume: number;

  masterGain: GainNode | null;
  sfxGain: GainNode | null;
  musicGain: GainNode | null;
  ambientGain: GainNode | null;

  soundBuffers: Map<string, AudioBuffer>;
  noiseBuffers: Map<string, AudioBuffer>;

  constructor(options?: AudioEngineOptions);

  initContext(): AudioContext | null;
  unlock(): Promise<void>;
  generateNoiseBuffers(): void;
  getNoiseBuffer(type?: string): AudioBuffer | undefined;

  setMasterVolume(vol: number): void;
  setSfxVolume(vol: number): void;
  setMusicVolume(vol: number): void;
  setAmbientVolume(vol: number): void;

  mute(): void;
  unmute(): void;
  toggleMute(): boolean;

  updateListener(camera: Camera): void;
  createPanner(x?: number, y?: number, z?: number, options?: PannerOptions): PannerNode | null;

  loadSound(name: string, url: string): Promise<AudioBuffer | null>;
  playSound(name: string, options?: SoundPlayOptions): AudioBufferSourceNode | null;
}
