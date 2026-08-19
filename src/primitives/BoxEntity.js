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

  render(camera, blitter, scene, planar, horizon) {
    const dx = this.x - camera.x;
    const dy = this.y - camera.y;
    const fwdDepth = dx * planar.cosAngle + dy * planar.sinAngle;
    if (fwdDepth <= 0.15 || fwdDepth > camera.far) return;

    const lateral = -dx * planar.sinAngle + dy * planar.cosAngle;
    const centerCol = (0.5 + (lateral / (fwdDepth * planar.halfFovTan)) * 0.5) * blitter.cols;

    const boundR = this.boundingRadius || 1.0;
    const radCols = (boundR / (fwdDepth * planar.halfFovTan)) * (blitter.cols * 0.5);
    const isVeryClose = (fwdDepth <= boundR + 0.25);

    const minCol = isVeryClose ? 0 : Math.max(0, Math.floor(centerCol - radCols));
    const maxCol = isVeryClose ? (blitter.cols - 1) : Math.min(blitter.cols - 1, Math.ceil(centerCol + radCols));
    if (minCol > maxCol) return;

    const entZ = this.z || 0.0;
    const minDepth = Math.max(0.05, fwdDepth - boundR);
    const maxDepth = fwdDepth + boundR;
    const scaleNear = (blitter.rows * camera.projectionScale) / minDepth;
    const scaleFar = (blitter.rows * camera.projectionScale) / maxDepth;

    const topZ = entZ + this.maxZ + 0.35;
    const botZ = entZ + this.minZ - 0.35;

    const r1 = horizon - (topZ - camera.z) * scaleNear;
    const r2 = horizon - (topZ - camera.z) * scaleFar;
    const r3 = horizon - (botZ - camera.z) * scaleNear;
    const r4 = horizon - (botZ - camera.z) * scaleFar;

    const rowTop = isVeryClose ? 0 : Math.max(0, Math.floor(Math.min(r1, r2, r3, r4)));
    const rowBottom = isVeryClose ? (blitter.rows - 1) : Math.min(blitter.rows - 1, Math.ceil(Math.max(r1, r2, r3, r4)));
    if (rowTop > rowBottom) return;

    const entAngle = this.angle || 0;
    const cosA = Math.cos(entAngle);
    const sinA = Math.sin(entAngle);

    const startXLocal = -dx * cosA - dy * sinA;
    const startYLocal = dx * sinA - dy * cosA;
    const startZLocal = camera.z - entZ;

    for (let col = minCol; col <= maxCol; col++) {
      const ray = camera.getRay(col, blitter.cols, planar);
      const dirXLocal = ray.cosAngle * cosA + ray.sinAngle * sinA;
      const dirYLocal = -ray.cosAngle * sinA + ray.sinAngle * cosA;

      for (let row = rowTop; row <= rowBottom; row++) {
        const Dz = (horizon - row) / (blitter.rows * camera.projectionScale);
        const hit = intersectRayAABB(
          startXLocal, startYLocal, startZLocal,
          dirXLocal, dirYLocal, Dz,
          this.minX, this.maxX,
          this.minY, this.maxY,
          this.minZ, this.maxZ
        );

        if (hit && hit.hit && hit.t > 0.05) {
          const corrDist = hit.t * ray.cosOffset;
          if (corrDist < blitter.getDepth(col, row)) {
            blitter.setDepth(col, row, corrDist);

            let ch = this.char;
            let color = this.color;
            let bg = this.bg;

            if (this.material) {
              const sample = this.material.sample({
                u: hit.hitX,
                v: hit.hitY,
                z: hit.hitZ,
                face: hit.hitFace,
                normalAngle: 0,
                dist: corrDist
              });
              ch = sample.char || ch;
              color = sample.color || color;
              bg = sample.bg || bg;
            }

            blitter.setChar(col, row, ch, color, bg, this.alpha);
          }
        }
      }
    }
  }
}
