//3d box and oriented bounding box entity
import { Entity } from './Entity.js';
import { intersectRayAABB } from '../math/Intersection.js';

export class BoxEntity extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = options.type || 'box';

    this.sizeX = options.sizeX || options.length || 1.0;
    this.sizeY = options.sizeY || options.width || 1.0;
    this.sizeZ = options.sizeZ || options.height || 1.0;

    this.minX = options.minX !== undefined ? options.minX : -this.sizeX * 0.5;
    this.maxX = options.maxX !== undefined ? options.maxX : this.sizeX * 0.5;
    this.minY = options.minY !== undefined ? options.minY : -this.sizeY * 0.5;
    this.maxY = options.maxY !== undefined ? options.maxY : this.sizeY * 0.5;
    this.minZ = options.minZ !== undefined ? options.minZ : 0;
    this.maxZ = options.maxZ !== undefined ? options.maxZ : this.sizeZ;

    this.boundingRadius = options.boundingRadius || Math.hypot(this.sizeX * 0.5, this.sizeY * 0.5) + 0.2;

    this.char = options.char || '#';
    this.color = options.color || '#ffffff';
    this.bg = options.bg || '#000000';
    this.alpha = options.alpha !== undefined ? options.alpha : 1.0;
    this.material = options.material || null;
  }

  intersectRay(rayOrigX, rayOrigY, rayOrigZ, rayDirX, rayDirY, rayDirZ) {
    let localOrigX = rayOrigX - this.x;
    let localOrigY = rayOrigY - this.y;
    let localOrigZ = rayOrigZ - this.z;

    let localDirX = rayDirX;
    let localDirY = rayDirY;
    let localDirZ = rayDirZ;

    //transform into local obb coordinate frame if rotated
    if (Math.abs(this.angle) > 1e-4) {
      const cosA = Math.cos(-this.angle);
      const sinA = Math.sin(-this.angle);

      const rotOx = localOrigX * cosA - localOrigY * sinA;
      const rotOy = localOrigX * sinA + localOrigY * cosA;
      localOrigX = rotOx;
      localOrigY = rotOy;

      const rotDx = localDirX * cosA - localDirY * sinA;
      const rotDy = localDirX * sinA + localDirY * cosA;
      localDirX = rotDx;
      localDirY = rotDy;
    }

    const hit = intersectRayAABB(
      localOrigX, localOrigY, localOrigZ,
      localDirX, localDirY, localDirZ,
      this.minX, this.maxX,
      this.minY, this.maxY,
      this.minZ, this.maxZ
    );

    if (hit.hit) {
      return {
        hit: true,
        t: hit.t,
        hitFace: hit.hitFace,
        localX: hit.hitX,
        localY: hit.hitY,
        localZ: hit.hitZ,
        worldX: rayOrigX + hit.t * rayDirX,
        worldY: rayOrigY + hit.t * rayDirY,
        worldZ: rayOrigZ + hit.t * rayDirZ
      };
    }

    return { hit: false, t: Infinity };
  }
}
