//directional cone spotlight for drones, searchlights, and vehicle headlights
import { Light } from './Light.js';

export class SpotLight extends Light {
  constructor(options = {}) {
    super(options);
    this.type = 'spot';
    this.decay = options.decay !== undefined ? options.decay : 1.0;
    this.angle = options.angle !== undefined ? options.angle : Math.PI / 4; //45 degrees
    this.penumbra = options.penumbra !== undefined ? options.penumbra : 0.25;

    this.direction = { x: 0, y: 0, z: -1 };
    if (options.direction) {
      this.setDirection(options.direction.x, options.direction.y, options.direction.z);
    }
  }

  setDirection(dx, dy, dz) {
    const len = Math.hypot(dx, dy, dz) || 1.0;
    this.direction.x = dx / len;
    this.direction.y = dy / len;
    this.direction.z = dz / len;
  }

  setAngle(newAngle) {
    this.angle = newAngle;
  }

  //compute directional conical attenuation at target point
  getLightContribution(targetX, targetY, targetZ) {
    if (!this.active || this.intensity <= 0) return null;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dz = (targetZ !== undefined ? targetZ : 0.0) - this.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq >= this.radiusSq || distSq < 1e-4) return null;

    const dist = Math.sqrt(distSq);
    const invDist = 1.0 / dist;
    const toTargetX = dx * invDist;
    const toTargetY = dy * invDist;
    const toTargetZ = dz * invDist;

    //dot product between spot direction and target vector
    const cosTheta = toTargetX * this.direction.x + toTargetY * this.direction.y + toTargetZ * this.direction.z;
    const cosAngle = Math.cos(this.angle);

    if (cosTheta < cosAngle) return null;

    //angular cone falloff with penumbra
    const cosInner = Math.cos(this.angle * (1.0 - this.penumbra));
    let angularAtt = 1.0;
    if (cosTheta < cosInner) {
      angularAtt = (cosTheta - cosAngle) / (cosInner - cosAngle);
    }

    //distance falloff
    const normalizedDist = dist / this.radius;
    const distAtt = Math.pow(Math.max(0, 1.0 - normalizedDist), this.decay);

    const totalAtt = distAtt * angularAtt * this.intensity;
    if (totalAtt <= 0.001) return null;

    return {
      intensity: totalAtt,
      r: this.rgb[0],
      g: this.rgb[1],
      b: this.rgb[2]
    };
  }
}
