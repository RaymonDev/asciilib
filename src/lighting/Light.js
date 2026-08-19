//base 3d light source
import { parseColorRGB } from './LightingUtils.js';

export class Light {
  constructor(options = {}) {
    this.x = options.x || 0.0;
    this.y = options.y || 0.0;
    this.z = options.z !== undefined ? options.z : 0.0;
    this.color = options.color || '#ffffff';
    this.intensity = options.intensity !== undefined ? options.intensity : 1.0;
    this.radius = options.radius !== undefined ? options.radius : 8.0;
    this.radiusSq = this.radius * this.radius;
    this.active = options.active !== undefined ? options.active : true;
    this.type = 'light';

    this.rgb = parseColorRGB(this.color);
  }

  setColor(newColor) {
    this.color = newColor;
    this.rgb = parseColorRGB(newColor);
  }

  setRadius(newRadius) {
    this.radius = newRadius;
    this.radiusSq = newRadius * newRadius;
  }

  setPosition(x, y, z) {
    this.x = x;
    this.y = y;
    if (z !== undefined) this.z = z;
  }

  //compute light intensity and color at target 3d point
  getLightContribution(targetX, targetY, targetZ) {
    if (!this.active || this.intensity <= 0) return null;
    return null;
  }
}
