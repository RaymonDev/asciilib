import { AudioEngine } from './AudioEngine.js';

export function noteToFrequency(noteStr: string | number): number;

export interface NotePlayOptions {
  time?: number;
  type?: OscillatorType;
  volume?: number;
}

export interface SequenceOptions {
  subdivision?: number;
  loop?: boolean;
  type?: OscillatorType;
  volume?: number;
}

export interface SequenceController {
  stop(): void;
}

export class SynthTracker {
  audioEngine: AudioEngine;

  constructor(audioEngine: AudioEngine);

  get ctx(): AudioContext | null;
  get musicGain(): GainNode | null;

  playNote(frequencyOrNote: string | number, duration?: number, options?: NotePlayOptions): OscillatorNode | null;
  playSequence(notes: (string | number)[], bpm?: number, options?: SequenceOptions): SequenceController | null;
}
