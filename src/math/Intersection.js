//analytical 3d ray intersection tests for primitive geometry

//ray vs aabb box slab intersection
export function intersectRayAABB(
  origX, origY, origZ,
  dirX, dirY, dirZ,
  minX, maxX,
  minY, maxY,
  minZ, maxZ
) {
  const invDx = (Math.abs(dirX) > 1e-6) ? (1.0 / dirX) : 1e6;
  const invDy = (Math.abs(dirY) > 1e-6) ? (1.0 / dirY) : 1e6;
  const invDz = (Math.abs(dirZ) > 1e-6) ? (1.0 / dirZ) : 1e6;

  const tx1 = (minX - origX) * invDx;
  const tx2 = (maxX - origX) * invDx;
  const ty1 = (minY - origY) * invDy;
  const ty2 = (maxY - origY) * invDy;
  const tz1 = (minZ - origZ) * invDz;
  const tz2 = (maxZ - origZ) * invDz;

  const tminX = Math.min(tx1, tx2);
  const tmaxX = Math.max(tx1, tx2);
  const tminY = Math.min(ty1, ty2);
  const tmaxY = Math.max(ty1, ty2);
  const tminZ = Math.min(tz1, tz2);
  const tmaxZ = Math.max(tz1, tz2);

  const tEnter = Math.max(tminX, Math.max(tminY, tminZ));
  const tExit = Math.min(tmaxX, Math.min(tmaxY, tmaxZ));

  if (tEnter <= tExit && tExit > 0.001) {
    const tHit = (tEnter > 0.001) ? tEnter : tExit;
    let hitFace = 'side';
    if (Math.abs(tEnter - tminZ) < 1e-3 || Math.abs(tEnter - tmaxZ) < 1e-3) {
      hitFace = (dirZ < 0) ? 'pos_z' : 'neg_z';
    } else if (Math.abs(tEnter - tminX) < 1e-3 || Math.abs(tEnter - tmaxX) < 1e-3) {
      hitFace = (dirX < 0) ? 'pos_x' : 'neg_x';
    } else {
      hitFace = (dirY < 0) ? 'pos_y' : 'neg_y';
    }

    return {
      hit: true,
      t: tHit,
      tEnter: tEnter,
      tExit: tExit,
      tminX: tminX,
      tmaxX: tmaxX,
      tminY: tminY,
      tmaxY: tmaxY,
      tminZ: tminZ,
      tmaxZ: tmaxZ,
      tx1: tx1,
      tx2: tx2,
      ty1: ty1,
      ty2: ty2,
      tz1: tz1,
      tz2: tz2,
      hitX: origX + tHit * dirX,
      hitY: origY + tHit * dirY,
      hitZ: origZ + tHit * dirZ,
      hitFace: hitFace
    };
  }

  return { hit: false, t: Infinity };
}

//ray vs vertical cylinder intersection
export function intersectRayCylinder(
  origX, origY, origZ,
  dirX, dirY, dirZ,
  cylX, cylY, cylRadius,
  minZ = -Infinity, maxZ = Infinity
) {
  const vxP = cylX - origX;
  const vyP = cylY - origY;
  const dirLen2D = Math.hypot(dirX, dirY);
  if (dirLen2D < 1e-6) return { hit: false, t: Infinity };

  const cosAngle = dirX / dirLen2D;
  const sinAngle = dirY / dirLen2D;
  const tProj = vxP * cosAngle + vyP * sinAngle;

  if (tProj > 0.05) {
    const dPerpSq = (vxP * vxP + vyP * vyP) - (tProj * tProj);
    const rSq = cylRadius * cylRadius;
    if (dPerpSq < rSq) {
      const dt = Math.sqrt(rSq - dPerpSq);
      const hitT2D = tProj - dt;
      const hitT = hitT2D / dirLen2D;
      const hitZ = origZ + hitT * dirZ;

      if (hitZ >= minZ && hitZ <= maxZ) {
        const hitX = origX + hitT * dirX;
        const hitY = origY + hitT * dirY;
        const normalAngle = Math.atan2(hitY - cylY, hitX - cylX);
        return {
          hit: true,
          t: hitT,
          hitX: hitX,
          hitY: hitY,
          hitZ: hitZ,
          normalAngle: normalAngle
        };
      }
    }
  }

  return { hit: false, t: Infinity };
}

//ray vs ellipsoid intersection
export function intersectRayEllipsoid(
  origX, origY, origZ,
  dirX, dirY, dirZ,
  centerX, centerY, centerZ,
  radiusXY, radiusZ
) {
  const dx = origX - centerX;
  const dy = origY - centerY;
  const dz = origZ - centerZ;

  const invRadXYSq = 1.0 / (radiusXY * radiusXY);
  const invRadZSq = 1.0 / (radiusZ * radiusZ);

  const A = (dirX * dirX + dirY * dirY) * invRadXYSq + (dirZ * dirZ) * invRadZSq;
  const B = 2.0 * ((dx * dirX + dy * dirY) * invRadXYSq + (dz * dirZ) * invRadZSq);
  const C = (dx * dx + dy * dy) * invRadXYSq + (dz * dz) * invRadZSq - 1.0;

  const disc = B * B - 4.0 * A * C;
  if (disc >= 0 && A > 1e-6) {
    const tHit = (-B - Math.sqrt(disc)) / (2.0 * A);
    if (tHit > 0.05) {
      return {
        hit: true,
        t: tHit,
        hitX: origX + tHit * dirX,
        hitY: origY + tHit * dirY,
        hitZ: origZ + tHit * dirZ
      };
    }
  }

  return { hit: false, t: Infinity };
}

//ray vs 3d line segment shortest distance proximity test
export function intersectRaySegmentDistance(
  origX, origY, origZ,
  dirX, dirY, dirZ,
  ax, ay, az,
  bx, by, bz,
  thresholdDistSq = 0.005
) {
  const vx = bx - ax;
  const vy = by - ay;
  const vz = bz - az;
  const segLenSq = vx * vx + vy * vy + vz * vz;
  if (segLenSq < 1e-6) return { hit: false, t: Infinity };

  const wx = origX - ax;
  const wy = origY - ay;
  const wz = origZ - az;

  const aDotV = dirX * vx + dirY * vy + dirZ * vz;
  const aDotD = dirX * dirX + dirY * dirY + dirZ * dirZ;
  const dDotW = dirX * wx + dirY * wy + dirZ * wz;
  const vDotW = vx * wx + vy * wy + vz * wz;

  const denom = aDotD * segLenSq - aDotV * aDotV;
  let uOpt = 0;
  if (Math.abs(denom) > 1e-6) {
    uOpt = (aDotD * vDotW - aDotV * dDotW) / denom;
  }
  uOpt = Math.max(0.0, Math.min(1.0, uOpt));
  const tOpt = (uOpt * aDotV - dDotW) / Math.max(1e-6, aDotD);

  if (tOpt > 0.05) {
    const ptX = ax + uOpt * vx;
    const ptY = ay + uOpt * vy;
    const ptZ = az + uOpt * vz;

    const rayX = origX + tOpt * dirX;
    const rayY = origY + tOpt * dirY;
    const rayZ = origZ + tOpt * dirZ;

    const distSq = (rayX - ptX) * (rayX - ptX) + (rayY - ptY) * (rayY - ptY) + (rayZ - ptZ) * (rayZ - ptZ);
    if (distSq < thresholdDistSq) {
      return {
        hit: true,
        t: tOpt,
        u: uOpt,
        distSq: distSq,
        pointOnRay: { x: rayX, y: rayY, z: rayZ },
        pointOnSeg: { x: ptX, y: ptY, z: ptZ }
      };
    }
  }

  return { hit: false, t: Infinity };
}
