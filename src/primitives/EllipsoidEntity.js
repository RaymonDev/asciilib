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

    const topZ = entZ + this.radiusZ + 0.35;
    const botZ = entZ - this.radiusZ - 0.35;

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
        const hit = intersectRayEllipsoid(
          startXLocal, startYLocal, startZLocal,
          dirXLocal, dirYLocal, Dz,
          0.0, 0.0, 0.0,
          this.radiusXY, this.radiusZ
        );

        if (hit && hit.hit && hit.t > 0.05) {
          const corrDist = hit.t * ray.cosOffset;
          if (corrDist < blitter.getDepth(col, row)) {
            blitter.setDepth(col, row, corrDist);
            blitter.setChar(col, row, this.char, this.color, this.bg, 1.0);
          }
        }
      }
    }
  }
}
