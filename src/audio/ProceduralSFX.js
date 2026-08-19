//zero-dependency procedural sound effects generator using Web Audio API oscillators, noise, and filters
export class ProceduralSFX {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
  }

  get ctx() {
    return this.audioEngine ? this.audioEngine.ctx : null;
  }

  get sfxGain() {
    return this.audioEngine ? this.audioEngine.sfxGain : null;
  }

  get ambientGain() {
    return this.audioEngine ? this.audioEngine.ambientGain : null;
  }

  //footstep sound synthesized with randomized pitch and surface-specific filters
  playFootstep(surface = 'concrete', options = {}) {
    const ctx = this.ctx;
    if (!ctx || this.audioEngine.isMuted) return null;

    const t = ctx.currentTime;
    const volume = (options.volume !== undefined ? options.volume : 0.4) * (0.85 + Math.random() * 0.3);
    const panner = options.panner || null;

    //noise pulse
    const noiseBuffer = this.audioEngine.getNoiseBuffer('pink') || this.audioEngine.getNoiseBuffer('white');
    if (!noiseBuffer) return null;

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.playbackRate.value = 0.8 + Math.random() * 0.4;

    const filter = ctx.createBiquadFilter();
    if (surface === 'concrete') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450 + Math.random() * 120, t);
      filter.Q.setValueAtTime(1.8, t);
    } else if (surface === 'wood') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + Math.random() * 80, t);
      filter.Q.setValueAtTime(2.2, t);
    } else if (surface === 'metal') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200 + Math.random() * 300, t);
      filter.Q.setValueAtTime(3.5, t);
    } else {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280 + Math.random() * 60, t);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    noiseSrc.connect(filter);
    filter.connect(gain);

    if (panner) {
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }

    noiseSrc.start(t);
    noiseSrc.stop(t + 0.1);
    return noiseSrc;
  }

  //realistic athletic jump push-off (shoe friction on pavement + low ground impulse)
  playJump(options = {}) {
    const ctx = this.ctx;
    if (!ctx || this.audioEngine.isMuted) return null;

    const t = ctx.currentTime;
    const volume = options.volume !== undefined ? options.volume : 0.35;
    const panner = options.panner || null;

    if (options.retro) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = options.type || 'square';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.16);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(panner || this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.19);
      return osc;
    }

    //1. shoe sole push-off scuff (filtered friction noise burst)
    const noiseBuffer = this.audioEngine.getNoiseBuffer('pink') || this.audioEngine.getNoiseBuffer('white');
    if (noiseBuffer) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.playbackRate.value = 1.1 + Math.random() * 0.2;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650 + Math.random() * 100, t);
      filter.Q.setValueAtTime(1.6, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(volume * 0.75, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      noiseSrc.connect(filter);
      filter.connect(noiseGain);
      if (panner) {
        noiseGain.connect(panner);
        panner.connect(this.sfxGain);
      } else {
        noiseGain.connect(this.sfxGain);
      }

      noiseSrc.start(t);
      noiseSrc.stop(t + 0.09);
    }

    //2. low ground push impulse
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.07);

    oscGain.gain.setValueAtTime(volume * 0.6, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(oscGain);
    if (panner) {
      oscGain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      oscGain.connect(this.sfxGain);
    }

    osc.start(t);
    osc.stop(t + 0.09);
    return osc;
  }

  //realistic landing impact (sole slap + body weight damping)
  playLand(options = {}) {
    const ctx = this.ctx;
    if (!ctx || this.audioEngine.isMuted) return null;

    const t = ctx.currentTime;
    const volume = options.volume !== undefined ? options.volume : 0.45;
    const panner = options.panner || null;

    //1. sole slap on pavement (quick bandpass noise slap)
    const noiseBuffer = this.audioEngine.getNoiseBuffer('pink') || this.audioEngine.getNoiseBuffer('white');
    if (noiseBuffer) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.playbackRate.value = 0.9 + Math.random() * 0.2;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(520, t);
      filter.Q.setValueAtTime(1.4, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(volume * 0.85, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      noiseSrc.connect(filter);
      filter.connect(noiseGain);
      if (panner) {
        noiseGain.connect(panner);
        panner.connect(this.sfxGain);
      } else {
        noiseGain.connect(this.sfxGain);
      }

      noiseSrc.start(t);
      noiseSrc.stop(t + 0.12);
    }

    //2. heavy ground thump
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.13);

    oscGain.gain.setValueAtTime(volume * 0.9, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(oscGain);
    if (panner) {
      oscGain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      oscGain.connect(this.sfxGain);
    }

    osc.start(t);
    osc.stop(t + 0.15);
    return osc;
  }

  //clean retro UI beeps and clicks
  playUiBeep(tone = 'select', options = {}) {
    const ctx = this.ctx;
    if (!ctx || this.audioEngine.isMuted) return null;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let freq = 880;
    let dur = 0.06;
    let wave = 'sine';

    if (tone === 'click') {
      freq = 1200;
      dur = 0.025;
      wave = 'triangle';
    } else if (tone === 'confirm') {
      freq = 1174.66; //D6
      dur = 0.09;
      wave = 'sine';
    } else if (tone === 'cancel') {
      freq = 330; //E4
      dur = 0.12;
      wave = 'sawtooth';
    } else if (tone === 'error') {
      freq = 160;
      dur = 0.18;
      wave = 'sawtooth';
    }

    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);

    const volume = options.volume !== undefined ? options.volume : 0.25;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + dur + 0.01);
    return osc;
  }

  //retro 8-bit laser zap
  playLaser(options = {}) {
    const ctx = this.ctx;
    if (!ctx || this.audioEngine.isMuted) return null;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.14);

    const volume = options.volume !== undefined ? options.volume : 0.3;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
    return osc;
  }

  //powerup / success arpeggiated chime
  playPowerUp(options = {}) {
    const ctx = this.ctx;
    if (!ctx || this.audioEngine.isMuted) return null;

    const notes = [523.25, 659.25, 783.99, 1046.50]; //C5, E5, G5, C6
    const t = ctx.currentTime;
    const volume = options.volume !== undefined ? options.volume : 0.25;

    for (let i = 0; i < notes.length; i++) {
      const noteTime = t + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[i], noteTime);

      gain.gain.setValueAtTime(volume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.13);
    }
  }

  //collision / metallic crash impact
  playImpact(intensity = 1.0, options = {}) {
    const ctx = this.ctx;
    if (!ctx || this.audioEngine.isMuted) return null;

    const t = ctx.currentTime;
    const panner = options.panner || null;

    //1. Low thud
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160 * intensity, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.22);
    oscGain.gain.setValueAtTime(0.6 * intensity, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(oscGain);

    //2. Noise burst
    const noiseBuffer = this.audioEngine.getNoiseBuffer('white');
    if (noiseBuffer) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(800 * intensity, t);
      noiseFilter.Q.setValueAtTime(2.0, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4 * intensity, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseGain);

      if (panner) {
        oscGain.connect(panner);
        noiseGain.connect(panner);
        panner.connect(this.sfxGain);
      } else {
        oscGain.connect(this.sfxGain);
        noiseGain.connect(this.sfxGain);
      }

      noiseSrc.start(t);
      noiseSrc.stop(t + 0.18);
    } else {
      if (panner) {
        oscGain.connect(panner);
        panner.connect(this.sfxGain);
      } else {
        oscGain.connect(this.sfxGain);
      }
    }

    osc.start(t);
    osc.stop(t + 0.25);
  }

  //continuous vehicular engine hum with dynamic RPM / throttle control
  createEngineHum(options = {}) {
    const ctx = this.ctx;
    if (!ctx) return null;

    const t = ctx.currentTime;
    const panner = options.panner || null;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    const baseFreq = options.baseFreq || 42;
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc2.frequency.setValueAtTime(baseFreq * 1.5, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);
    filter.Q.setValueAtTime(1.5, t);

    const baseVol = options.volume !== undefined ? options.volume : 0.3;
    gain.gain.setValueAtTime(baseVol, t);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);

    if (panner) {
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }

    osc1.start(t);
    osc2.start(t);

    return {
      setSpeed: (speedRatio) => {
        if (!ctx || ctx.state === 'closed') return;
        const now = ctx.currentTime;
        const targetFreq = baseFreq + speedRatio * 120;
        osc1.frequency.setTargetAtTime(targetFreq, now, 0.05);
        osc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.05);
        filter.frequency.setTargetAtTime(200 + speedRatio * 600, now, 0.05);
      },
      setVolume: (vol) => {
        if (!ctx || ctx.state === 'closed') return;
        gain.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
      },
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
        } catch (_) {}
      }
    };
  }

  //dual-rotor high-speed buzzing drone hum
  createDroneHum(options = {}) {
    const ctx = this.ctx;
    if (!ctx) return null;

    const t = ctx.currentTime;
    const panner = options.panner || null;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const modOsc = ctx.createOscillator();
    const modGain = ctx.createGain();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    modOsc.type = 'sine';

    const baseFreq = options.baseFreq || 165; //drone rotor buzz frequency
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc2.frequency.setValueAtTime(baseFreq * 1.02, t); //slight detune for rotor chorus
    modOsc.frequency.setValueAtTime(32, t); //rotor chop rate
    modGain.gain.setValueAtTime(15, t);

    modOsc.connect(osc1.frequency);
    modOsc.connect(osc2.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.Q.setValueAtTime(2.0, t);

    const baseVol = options.volume !== undefined ? options.volume : 0.25;
    gain.gain.setValueAtTime(baseVol, t);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);

    if (panner) {
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }

    osc1.start(t);
    osc2.start(t);
    modOsc.start(t);

    return {
      setRotorSpeed: (speedMultiplier) => {
        if (!ctx || ctx.state === 'closed') return;
        const now = ctx.currentTime;
        osc1.frequency.setTargetAtTime(baseFreq * speedMultiplier, now, 0.05);
        osc2.frequency.setTargetAtTime(baseFreq * 1.02 * speedMultiplier, now, 0.05);
        modOsc.frequency.setTargetAtTime(32 * speedMultiplier, now, 0.05);
      },
      setVolume: (vol) => {
        if (!ctx || ctx.state === 'closed') return;
        gain.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
      },
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
          modOsc.stop();
          osc1.disconnect();
          osc2.disconnect();
          modOsc.disconnect();
        } catch (_) {}
      }
    };
  }

  //ambient city hum layer with low-frequency rumble and filtered background noise
  createAmbientCityHum(options = {}) {
    const ctx = this.ctx;
    if (!ctx) return null;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscFilter = ctx.createBiquadFilter();
    const oscGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(55, t); //55Hz deep city transformer hum
    oscFilter.type = 'lowpass';
    oscFilter.frequency.setValueAtTime(90, t);
    oscGain.gain.setValueAtTime(options.humVolume || 0.35, t);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(this.ambientGain);

    osc.start(t);

    let noiseSrc = null;
    const noiseBuffer = this.audioEngine.getNoiseBuffer('pink');
    if (noiseBuffer) {
      noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(280, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(options.windVolume || 0.20, t);

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ambientGain);

      noiseSrc.start(t);
    }

    return {
      setVolume: (vol) => {
        if (!ctx || ctx.state === 'closed') return;
        oscGain.gain.setTargetAtTime(vol * 0.6, ctx.currentTime, 0.1);
      },
      stop: () => {
        try {
          osc.stop();
          osc.disconnect();
          if (noiseSrc) {
            noiseSrc.stop();
            noiseSrc.disconnect();
          }
        } catch (_) {}
      }
    };
  }
}
