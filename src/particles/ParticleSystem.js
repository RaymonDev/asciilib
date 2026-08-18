//3d particle system for steam, sparks, and atmospheric effects
export class ParticleSystem {
  constructor(options = {}) {
    this.maxParticles = options.maxParticles || 1000;
    this.particles = [];
    this.emitters = [];
    this.enabled = options.enabled !== false;
  }

  addEmitter(emitter) {
    this.emitters.push(emitter);
    return emitter;
  }

  removeEmitter(emitter) {
    const idx = this.emitters.indexOf(emitter);
    if (idx !== -1) {
      this.emitters.splice(idx, 1);
    }
  }

  emit(particleConfig) {
    if (!this.enabled || this.particles.length >= this.maxParticles) return;

    this.particles.push({
      x: particleConfig.x || 0,
      y: particleConfig.y || 0,
      z: particleConfig.z || 0,
      vx: particleConfig.vx || 0,
      vy: particleConfig.vy || 0,
      vz: particleConfig.vz || 0,
      life: particleConfig.life || 2.0,
      maxLife: particleConfig.maxLife || particleConfig.life || 2.0,
      char: particleConfig.char || '%',
      color: particleConfig.color || '#ffffff',
      seed: particleConfig.seed || Math.random() * 100,
      customData: particleConfig.customData || {}
    });
  }

  update(dt) {
    if (!this.enabled) {
      this.particles.length = 0;
      return;
    }

    //update emitters
    for (let e = 0; e < this.emitters.length; e++) {
      this.emitters[e].update(dt, this);
    }

    //update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
  }

  render(camera, blitter, planar, horizon) {
    if (!this.enabled || this.particles.length === 0) return;

    if (!planar) planar = camera.getPlanarVectors();
    if (horizon === undefined) horizon = Math.floor(blitter.rows * 0.5 + camera.pitch * blitter.rows * 0.5);

    const cols = blitter.cols;
    const rows = blitter.rows;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const dx = p.x - camera.x;
      const dy = p.y - camera.y;

      const fwdDepth = dx * planar.cosAngle + dy * planar.sinAngle;
      if (fwdDepth <= 0.20 || fwdDepth > camera.far) continue;

      const lateral = -dx * planar.sinAngle + dy * planar.cosAngle;
      const centerCol = Math.floor((0.5 + (lateral / (fwdDepth * planar.halfFovTan)) * 0.5) * cols);
      if (centerCol < 0 || centerCol >= cols) continue;

      const screenH = (rows * camera.projectionScale) / fwdDepth;
      const centerRow = Math.floor(horizon - (p.z - camera.z) * screenH);
      if (centerRow < 0 || centerRow >= rows) continue;

      if (fwdDepth < blitter.getDepth(centerCol, centerRow)) {
        const depthAlpha = Math.max(0.40, 1 - (fwdDepth / camera.far));
        blitter.drawChar(centerCol, centerRow, p.char, p.color, depthAlpha);
      }
    }
  }

  clear() {
    this.particles.length = 0;
  }
}
