//3d ellipsoid entity for foliage crowns, lanterns, and spheres
import { Entity } from './Entity.js';
import { intersectRayEllipsoid } from '../math/Intersection.js';

export class EllipsoidEntity extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = options.type || 'ellipsoid';

    this.radiusXY = options.radiusXY || options.radius || 1.0;
    this.radiusZ = options.radiusZ || options.radius || 1.0;
    this.boundingRadius = options.boundingRadius || Math.max(this.radiusXY, this.radiusZ) + 0.1;

    this.char = options.char || '@';
    this.color = options.color || '#2ed573';
    this.bg = options.bg || '#0a2e15';
  }

  intersectRay(rayOrigX, rayOrigY, rayOrigZ, rayDirX, rayDirY, rayDirZ) {
    const hit = intersectRayEllipsoid(
      rayOrigX, rayOrigY, rayOrigZ,
      rayDirX, rayDirY, rayDirZ,
      this.x, this.y, this.z,
      this.radiusXY, this.radiusZ
    );

    if (hit.hit) {
      return {
        hit: true,
        t: hit.t,
        hitX: hit.hitX,
        hitY: hit.hitY,
        hitZ: hit.hitZ
      };
    }

    return { hit: false, t: Infinity };
  }
}
