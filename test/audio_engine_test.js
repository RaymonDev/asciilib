import { AudioEngine, ProceduralSFX, SynthTracker, noteToFrequency } from '../src/index.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

console.log('[TEST] Starting asciilib audio engine test suite...');

//1. AudioEngine instantiation and volume controls
const audio = new AudioEngine({ autoInit: false, masterVolume: 0.8, sfxVolume: 0.9, musicVolume: 0.7 });
assert(audio.masterVolume === 0.8, 'Master volume matches initialization');
assert(audio.sfxVolume === 0.9, 'SFX volume matches initialization');
assert(audio.musicVolume === 0.7, 'Music volume matches initialization');
assert(audio.isMuted === false, 'Audio starts unmuted');

audio.mute();
assert(audio.isMuted === true, 'Audio muting works');
audio.unmute();
assert(audio.isMuted === false, 'Audio unmuting works');
audio.toggleMute();
assert(audio.isMuted === true, 'Audio toggleMute works');
audio.toggleMute();
assert(audio.isMuted === false, 'Audio toggleMute restore works');

audio.setMasterVolume(0.5);
assert(audio.masterVolume === 0.5, 'setMasterVolume updates masterVolume');
audio.setSfxVolume(0.6);
assert(audio.sfxVolume === 0.6, 'setSfxVolume updates sfxVolume');
audio.setMusicVolume(0.4);
assert(audio.musicVolume === 0.4, 'setMusicVolume updates musicVolume');
audio.setAmbientVolume(0.3);
assert(audio.ambientVolume === 0.3, 'setAmbientVolume updates ambientVolume');

console.log('AudioEngine volume and mute tests passed');

//2. noteToFrequency conversions
const a4 = noteToFrequency('A4');
assert(Math.abs(a4 - 440) < 0.01, `A4 note frequency should be 440Hz, got ${a4}`);

const c4 = noteToFrequency('C4');
assert(Math.abs(c4 - 261.63) < 0.1, `C4 note frequency should be ~261.63Hz, got ${c4}`);

const a5 = noteToFrequency('A5');
assert(Math.abs(a5 - 880) < 0.01, `A5 note frequency should be 880Hz, got ${a5}`);

const rest = noteToFrequency('-');
assert(rest === 0, 'Rest note returns 0 frequency');

console.log('noteToFrequency conversion tests passed');

//3. ProceduralSFX and SynthTracker instantiation
const sfx = new ProceduralSFX(audio);
assert(sfx.audioEngine === audio, 'ProceduralSFX connects to AudioEngine');

//test safe headless execution (does not throw even without window/AudioContext)
const footstep = sfx.playFootstep('concrete');
assert(footstep === null, 'Headless footstep safely returns null');

const jump = sfx.playJump();
assert(jump === null, 'Headless jump safely returns null');

const beep = sfx.playUiBeep('confirm');
assert(beep === null, 'Headless beep safely returns null');

const tracker = new SynthTracker(audio);
assert(tracker.audioEngine === audio, 'SynthTracker connects to AudioEngine');

const seq = tracker.playSequence(['C4', 'E4', 'G4', 'B4'], 120);
assert(seq === null, 'Headless playSequence safely returns null');

console.log('ProceduralSFX and SynthTracker headless safety tests passed');

console.log('[ALL AUDIO ENGINE TESTS PASSED SUCCESSFULLY]');
