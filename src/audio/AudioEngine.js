//zero-dependency web audio api engine with master routing, spatial listener, and audio file loader
export class AudioEngine {
  constructor(options = {}) {
    this.options = options;
    this.ctx = null;
    this.isUnlocked = false;
    this.isMuted = options.muted || false;

    this.masterVolume = options.masterVolume !== undefined ? options.masterVolume : 1.0;
    this.sfxVolume = options.sfxVolume !== undefined ? options.sfxVolume : 1.0;
    this.musicVolume = options.musicVolume !== undefined ? options.musicVolume : 0.8;
    this.ambientVolume = options.ambientVolume !== undefined ? options.ambientVolume : 0.7;

    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.ambientGain = null;

    this.soundBuffers = new Map();
    this.noiseBuffers = new Map();

    if (options.autoInit !== false && typeof window !== 'undefined') {
      this.initContext();
    }
  }

  initContext() {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      this.ctx = new AudioContextClass();

      //master routing
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.ambientVolume, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      //pre-generate noise buffers
      this.generateNoiseBuffers();

      //bind user gesture unlock
      this.bindUnlockEvents();
    } catch (e) {
      console.warn('[asciilib] Web Audio API failed to initialize:', e);
    }

    return this.ctx;
  }

  bindUnlockEvents() {
    if (typeof window === 'undefined' || this.isUnlocked) return;

    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.isUnlocked = true;
        });
      } else {
        this.isUnlocked = true;
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  unlock() {
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume().then(() => {
        this.isUnlocked = true;
      });
    }
    this.isUnlocked = true;
    return Promise.resolve();
  }

  generateNoiseBuffers() {
    if (!this.ctx) return;

    //1. white noise buffer (2 seconds)
    const sampleRate = this.ctx.sampleRate;
    const bufferLen = sampleRate * 2;
    const whiteBuffer = this.ctx.createBuffer(1, bufferLen, sampleRate);
    const whiteData = whiteBuffer.getChannelData(0);
    for (let i = 0; i < bufferLen; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffers.set('white', whiteBuffer);

    //2. pink noise buffer (2 seconds)
    const pinkBuffer = this.ctx.createBuffer(1, bufferLen, sampleRate);
    const pinkData = pinkBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.noiseBuffers.set('pink', pinkBuffer);
  }

  getNoiseBuffer(type = 'white') {
    return this.noiseBuffers.get(type) || this.noiseBuffers.get('white');
  }

  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  setAmbientVolume(vol) {
    this.ambientVolume = Math.max(0, Math.min(1, vol));
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.ambientVolume, this.ctx.currentTime);
    }
  }

  mute() {
    this.isMuted = true;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  unmute() {
    this.isMuted = false;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }

  updateListener(camera) {
    if (!this.ctx || !camera) return;

    const listener = this.ctx.listener;
    if (!listener) return;

    const time = this.ctx.currentTime;
    if (listener.positionX) {
      listener.positionX.setValueAtTime(camera.x, time);
      listener.positionY.setValueAtTime(camera.y, time);
      listener.positionZ.setValueAtTime(camera.z || 1.6, time);

      const forwardX = Math.cos(camera.angle);
      const forwardY = Math.sin(camera.angle);
      listener.forwardX.setValueAtTime(forwardX, time);
      listener.forwardY.setValueAtTime(forwardY, time);
      listener.forwardZ.setValueAtTime(0, time);
      listener.upX.setValueAtTime(0, time);
      listener.upY.setValueAtTime(0, time);
      listener.upZ.setValueAtTime(1, time);
    } else if (listener.setPosition) {
      //legacy web audio api
      listener.setPosition(camera.x, camera.y, camera.z || 1.6);
      listener.setOrientation(Math.cos(camera.angle), Math.sin(camera.angle), 0, 0, 0, 1);
    }
  }

  createPanner(x = 0, y = 0, z = 0, options = {}) {
    if (!this.ctx) return null;

    const panner = this.ctx.createPanner();
    panner.panningModel = options.panningModel || 'HRTF';
    panner.distanceModel = options.distanceModel || 'inverse';
    panner.refDistance = options.refDistance || 1.5;
    panner.maxDistance = options.maxDistance || 50;
    panner.rolloffFactor = options.rolloffFactor || 1.2;
    panner.coneInnerAngle = options.coneInnerAngle || 360;

    if (panner.positionX) {
      panner.positionX.setValueAtTime(x, this.ctx.currentTime);
      panner.positionY.setValueAtTime(y, this.ctx.currentTime);
      panner.positionZ.setValueAtTime(z, this.ctx.currentTime);
    } else if (panner.setPosition) {
      panner.setPosition(x, y, z);
    }

    return panner;
  }

  async loadSound(name, url) {
    if (!this.ctx) this.initContext();
    if (!this.ctx) return null;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.soundBuffers.set(name, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.warn(`[asciilib] Failed to load audio file "${name}" from ${url}:`, e);
      return null;
    }
  }

  playSound(name, options = {}) {
    if (!this.ctx || this.isMuted) return null;
    const buffer = this.soundBuffers.get(name);
    if (!buffer) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop || false;
    source.playbackRate.value = options.pitch || options.playbackRate || 1.0;

    const gainNode = this.ctx.createGain();
    const vol = options.volume !== undefined ? options.volume : 1.0;
    gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);

    source.connect(gainNode);

    if (options.panner) {
      gainNode.connect(options.panner);
      options.panner.connect(this.sfxGain);
    } else {
      gainNode.connect(this.sfxGain);
    }

    source.start(0);
    return source;
  }
}
