//3d vertical cylinder entity for poles, pillars, and tree trunks
import { Entity } from './Entity.js';
import { intersectRayCylinder } from '../math/Intersection.js';

export class CylinderEntity extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = options.type || 'cylinder';

    this.radius = options.radius || 0.1;
    this.minZ = options.minZ !== undefined ? options.minZ : 0;
    this.maxZ = options.maxZ !== undefined ? options.maxZ : (options.height || 2.0);
    this.boundingRadius = options.boundingRadius || this.radius + 0.1;

    this.char = options.char || '|';
    this.color = options.color || '#94a3b8';
    this.bg = options.bg || '#0f172a';
  }

  intersectRay(rayOrigX, rayOrigY, rayOrigZ, rayDirX, rayDirY, rayDirZ) {
    const hit = intersectRayCylinder(
      rayOrigX, rayOrigY, rayOrigZ,
      rayDirX, rayDirY, rayDirZ,
      this.x, this.y, this.radius,
      this.z + this.minZ, this.z + this.maxZ
    );

    if (hit.hit) {
      return {
        hit: true,
        t: hit.t,
        hitX: hit.hitX,
        hitY: hit.hitY,
        hitZ: hit.hitZ,
        normalAngle: hit.normalAngle
      };
    }

    return { hit: false, t: Infinity };
  }
}
