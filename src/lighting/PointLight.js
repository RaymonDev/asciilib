//omnidirectional 3d point light with euclidean distance falloff
import { Light } from './Light.js';

export class PointLight extends Light {
  constructor(options = {}) {
    super(options);
    this.type = 'point';
    this.decay = options.decay !== undefined ? options.decay : 1.0;
  }

  //compute omnidirectional euclidean attenuation at target point
  getLightContribution(targetX, targetY, targetZ) {
    if (!this.active || this.intensity <= 0) return null;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dz = (targetZ !== undefined ? targetZ : 0.0) - this.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq >= this.radiusSq) return null;

    const dist = Math.sqrt(distSq);
    const normalizedDist = dist / this.radius;
    const att = Math.pow(Math.max(0, 1.0 - normalizedDist), this.decay) * this.intensity;

    if (att <= 0.001) return null;

    return {
      intensity: att,
      r: this.rgb[0],
      g: this.rgb[1],
      b: this.rgb[2]
    };
  }
}
