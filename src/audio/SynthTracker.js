//zero-dependency 8-bit chiptune and retro synth sequencer
const NOTE_OFFSETS = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11
};

export function noteToFrequency(noteStr) {
  if (!noteStr || noteStr === '-' || noteStr === '.') return 0;
  if (typeof noteStr === 'number') return noteStr;

  const match = noteStr.trim().match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return 440;

  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  const semitone = NOTE_OFFSETS[noteName] !== undefined ? NOTE_OFFSETS[noteName] : 9;

  //midi note number (A4 is note 69, 440Hz)
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class SynthTracker {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
  }

  get ctx() {
    return this.audioEngine ? this.audioEngine.ctx : null;
  }

  get musicGain() {
    return this.audioEngine ? this.audioEngine.musicGain : null;
  }

  playNote(frequencyOrNote, duration = 0.2, options = {}) {
    const ctx = this.ctx;
    if (!ctx || this.audioEngine.isMuted) return null;

    const freq = typeof frequencyOrNote === 'string' ? noteToFrequency(frequencyOrNote) : frequencyOrNote;
    if (freq <= 0) return null;

    const t = options.time !== undefined ? options.time : ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = options.type || 'square';
    osc.frequency.setValueAtTime(freq, t);

    const volume = options.volume !== undefined ? options.volume : 0.2;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.95);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + duration);
    return osc;
  }

  playSequence(notes, bpm = 120, options = {}) {
    const ctx = this.ctx;
    if (!ctx) return null;

    const stepDuration = 60 / bpm / (options.subdivision || 2); //eighth note steps
    const loop = options.loop || false;
    let currentStep = 0;
    let timerId = null;
    let isStopped = false;

    const playStep = () => {
      if (isStopped || !this.ctx || this.ctx.state === 'closed') return;

      const note = notes[currentStep];
      if (note && note !== '-' && note !== '.') {
        this.playNote(note, stepDuration * 0.9, {
          type: options.type || 'square',
          volume: options.volume !== undefined ? options.volume : 0.2
        });
      }

      currentStep++;
      if (currentStep >= notes.length) {
        if (loop) {
          currentStep = 0;
          timerId = setTimeout(playStep, stepDuration * 1000);
        }
      } else {
        timerId = setTimeout(playStep, stepDuration * 1000);
      }
    };

    playStep();

    return {
      stop: () => {
        isStopped = true;
        if (timerId) clearTimeout(timerId);
      }
    };
  }
}
