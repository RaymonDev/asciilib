//multi-part hierarchical 3d entity with local-space raycasting and bounding volume hierarchy
import { Entity } from './Entity.js';
import {
  intersectRayAABB,
  intersectRayCylinder,
  intersectRayEllipsoid,
  intersectRaySegmentDistance
} from '../math/Intersection.js';

export class CompoundEntity extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = options.type || 'compound';
    this.entityType = options.entityType || 'compound';
    this.parts = [];
    this.height = options.height || 1.0;
    this.boundingRadius = options.boundingRadius || 1.0;

    if (options.parts && Array.isArray(options.parts)) {
      for (let i = 0; i < options.parts.length; i++) {
        this.addPart(options.parts[i]);
      }
    }
  }

  addPart(part) {
    this.parts.push(part);
    this.recomputeBounds();
    return this;
  }

  getPart(name) {
    return this.parts.find(p => p.name === name);
  }

  addBox(options = {}) {
    const part = {
      type: 'box',
      name: options.name || `box_${this.parts.length}`,
      minX: options.minX !== undefined ? options.minX : -0.5,
      maxX: options.maxX !== undefined ? options.maxX : 0.5,
      minY: options.minY !== undefined ? options.minY : -0.5,
      maxY: options.maxY !== undefined ? options.maxY : 0.5,
      minZ: options.minZ !== undefined ? options.minZ : 0.0,
      maxZ: options.maxZ !== undefined ? options.maxZ : 1.0,
      char: options.char || '#',
      color: options.color || '#ffffff',
      bg: options.bg || '#000000',
      alpha: options.alpha !== undefined ? options.alpha : 1.0,
      material: options.material || null,
      customShader: options.customShader || null
    };
    return this.addPart(part);
  }

  addCylinder(options = {}) {
    const part = {
      type: 'cylinder',
      name: options.name || `cyl_${this.parts.length}`,
      x: options.x || 0.0,
      y: options.y || 0.0,
      radius: options.radius || 0.5,
      minZ: options.minZ !== undefined ? options.minZ : 0.0,
      maxZ: options.maxZ !== undefined ? options.maxZ : 1.0,
      char: options.char || '|',
      color: options.color || '#ffffff',
      bg: options.bg || '#000000',
      alpha: options.alpha !== undefined ? options.alpha : 1.0,
      material: options.material || null,
      customShader: options.customShader || null
    };
    return this.addPart(part);
  }

  addEllipsoid(options = {}) {
    const part = {
      type: 'ellipsoid',
      name: options.name || `ellip_${this.parts.length}`,
      x: options.x || 0.0,
      y: options.y || 0.0,
      z: options.z || 0.5,
      radXY: options.radXY || options.radius || 0.5,
      radZ: options.radZ || options.radius || 0.5,
      char: options.char || '@',
      color: options.color || '#ffffff',
      bg: options.bg || '#000000',
      alpha: options.alpha !== undefined ? options.alpha : 1.0,
      material: options.material || null,
      customShader: options.customShader || null
    };
    return this.addPart(part);
  }

  addSegment(options = {}) {
    const part = {
      type: 'segment',
      name: options.name || `seg_${this.parts.length}`,
      ax: options.ax || 0.0,
      ay: options.ay || 0.0,
      az: options.az || 0.0,
      bx: options.bx || 0.0,
      by: options.by || 0.0,
      bz: options.bz || 1.0,
      thicknessSq: options.thicknessSq || (options.thickness ? options.thickness * options.thickness : 0.0035),
      char: options.char || '=',
      color: options.color || '#ffffff',
      bg: options.bg || '#000000',
      alpha: options.alpha !== undefined ? options.alpha : 1.0,
      material: options.material || null,
      customShader: options.customShader || null
    };
    return this.addPart(part);
  }

  recomputeBounds() {
    let maxR = 0.2;
    let minZ = 0.0;
    let maxZ = 0.5;

    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      if (p.type === 'box') {
        const rx = Math.max(Math.abs(p.minX), Math.abs(p.maxX));
        const ry = Math.max(Math.abs(p.minY), Math.abs(p.maxY));
        maxR = Math.max(maxR, Math.hypot(rx, ry));
        minZ = Math.min(minZ, p.minZ);
        maxZ = Math.max(maxZ, p.maxZ);
      } else if (p.type === 'cylinder') {
        maxR = Math.max(maxR, Math.hypot(p.x, p.y) + p.radius);
        minZ = Math.min(minZ, p.minZ);
        maxZ = Math.max(maxZ, p.maxZ);
      } else if (p.type === 'ellipsoid') {
        maxR = Math.max(maxR, Math.hypot(p.x, p.y) + p.radXY);
        minZ = Math.min(minZ, p.z - p.radZ);
        maxZ = Math.max(maxZ, p.z + p.radZ);
      } else if (p.type === 'segment') {
        maxR = Math.max(maxR, Math.hypot(p.ax, p.ay), Math.hypot(p.bx, p.by));
        minZ = Math.min(minZ, p.az, p.bz);
        maxZ = Math.max(maxZ, p.az, p.bz);
      }
    }

    this.boundingRadius = maxR + 0.15;
    this.minZ = minZ;
    this.height = maxZ;
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

    const topZ = entZ + (this.height !== undefined ? this.height : 0.5) + 0.45;
    const botZ = entZ + (this.minZ !== undefined ? this.minZ : 0.0) - 0.45;

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

        let closestTHit = Infinity;
        let bestPart = null;
        let bestHit = null;

        for (let i = 0; i < this.parts.length; i++) {
          const part = this.parts[i];
          let hit = null;

          if (part.type === 'box') {
            hit = intersectRayAABB(startXLocal, startYLocal, startZLocal, dirXLocal, dirYLocal, Dz, part.minX, part.maxX, part.minY, part.maxY, part.minZ, part.maxZ);
          } else if (part.type === 'cylinder') {
            hit = intersectRayCylinder(startXLocal, startYLocal, startZLocal, dirXLocal, dirYLocal, Dz, part.x, part.y, part.radius, part.minZ, part.maxZ);
          } else if (part.type === 'ellipsoid') {
            hit = intersectRayEllipsoid(startXLocal, startYLocal, startZLocal, dirXLocal, dirYLocal, Dz, part.x, part.y, part.z, part.radXY, part.radZ);
          } else if (part.type === 'segment') {
            hit = intersectRaySegmentDistance(startXLocal, startYLocal, startZLocal, dirXLocal, dirYLocal, Dz, part.ax, part.ay, part.az, part.bx, part.by, part.bz, part.thicknessSq);
          }

          if (hit && hit.hit && hit.t > 0.05 && hit.t < closestTHit) {
            closestTHit = hit.t;
            bestPart = part;
            bestHit = hit;
          }
        }

        if (bestPart === null || closestTHit === Infinity) continue;

        const corrDist = closestTHit * ray.cosOffset;
        if (corrDist >= blitter.getDepth(col, row)) continue;
        blitter.setDepth(col, row, corrDist);

        const hitLocalX = bestHit.hitX;
        const hitLocalY = bestHit.hitY;
        const hitWorldZ = bestHit.hitZ;

        let ch = bestPart.char || '#';
        let color = bestPart.color || '#ffffff';
        let bg = bestPart.bg || '#000000';
        let alpha = (bestPart.alpha !== undefined) ? bestPart.alpha : 1.0;

        if (bestPart.customShader) {
          const shaded = bestPart.customShader({
            entity: this,
            part: bestPart,
            hit: bestHit,
            col,
            row,
            corrDist,
            hitLocalX,
            hitLocalY,
            hitWorldZ,
            camera,
            scene
          });
          if (shaded) {
            ch = shaded.char !== undefined ? shaded.char : ch;
            color = shaded.color !== undefined ? shaded.color : color;
            bg = shaded.bg !== undefined ? shaded.bg : bg;
            alpha = shaded.alpha !== undefined ? shaded.alpha : alpha;
          }
        } else if (bestPart.material) {
          const shaded = bestPart.material.sample({
            u: hitLocalX,
            v: hitLocalY,
            z: hitWorldZ,
            face: bestHit.hitFace || 'side',
            dist: corrDist,
            maxDepth: camera.far
          });
          if (shaded) {
            ch = shaded.char !== undefined ? shaded.char : ch;
            color = shaded.color !== undefined ? shaded.color : color;
            bg = shaded.bg !== undefined ? shaded.bg : bg;
            alpha = shaded.alpha !== undefined ? shaded.alpha : alpha;
          }
        }

        const depthAlpha = Math.max(0.65, 1 - (corrDist / camera.far)) * alpha;
        blitter.drawOpaqueChar(col, row, ch, color, depthAlpha, bg);
      }
    }
  }
}
