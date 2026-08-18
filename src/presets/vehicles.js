//vehicle prefabs, 3d voxel hierarchies, and autonomous traffic fleet simulation
import { Entity } from '../primitives/Entity.js';

export const INTERSECTION_DATA = [];
export const STOP_LINES = [];

const DEFAULT_EW = [
  { y1: 1.0, y2: 4.0 },
  { y1: 13.0, y2: 16.0 },
  { y1: 39.0, y2: 42.0 },
  { y1: 64.0, y2: 67.0 },
  { y1: 76.0, y2: 79.0 }
];

const DEFAULT_NS = [
  { x1: 1.0, x2: 4.0 },
  { x1: 13.0, x2: 16.0 },
  { x1: 39.0, x2: 42.0 },
  { x1: 64.0, x2: 67.0 },
  { x1: 76.0, x2: 79.0 }
];

(function initTrafficNetwork() {
  let id = 1;
  for (let j = 0; j < DEFAULT_EW.length; j++) {
    const ew = DEFAULT_EW[j];
    const cy = (ew.y1 + ew.y2 + 1) / 2;
    const ewEastY = cy + 1.15;
    const ewWestY = cy - 1.15;

    for (let i = 0; i < DEFAULT_NS.length; i++) {
      const ns = DEFAULT_NS[i];
      const cx = (ns.x1 + ns.x2 + 1) / 2;
      const nsSouthX = cx - 1.15;
      const nsNorthX = cx + 1.15;

      INTERSECTION_DATA.push({
        id: id,
        cx: cx,
        cy: cy,
        ewLanes: { east: ewEastY, west: ewWestY },
        nsLanes: { south: nsSouthX, north: nsNorthX }
      });

      if (ns.x1 > 2.0) {
        STOP_LINES.push({ interId: id, dir: 'east', phase: 'EW', stopCoord: ns.x1 - 2.2, laneMin: cy, laneMax: ew.y2 + 1.0, isX: true, checkSign: 1 });
      }
      if (ns.x2 < 78.0) {
        STOP_LINES.push({ interId: id, dir: 'west', phase: 'EW', stopCoord: ns.x2 + 3.2, laneMin: ew.y1, laneMax: cy, isX: true, checkSign: -1 });
      }
      if (ew.y1 > 2.0) {
        STOP_LINES.push({ interId: id, dir: 'south', phase: 'NS', stopCoord: ew.y1 - 2.2, laneMin: ns.x1, laneMax: cx, isX: false, checkSign: 1 });
      }
      if (ew.y2 < 78.0) {
        STOP_LINES.push({ interId: id, dir: 'north', phase: 'NS', stopCoord: ew.y2 + 3.2, laneMin: cx, laneMax: ns.x2 + 1.0, isX: false, checkSign: -1 });
      }

      id++;
    }
  }
})();

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export class VehicleEntity extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = options.vehicleType || 'taxi';
    this.entityType = 'vehicle';
    this.vehicleType = this.type;
    this.isBus = options.isBus || (this.type === 'bus');

    this.speed = options.speed || 4.8;
    this.cruiseSpeed = this.speed;
    this.angle = options.angle || 0;
    this.active = true;

    this.length = this.isBus ? 2.35 : (this.type === 'coupe' ? 1.38 : (this.type === 'vip_sedan' ? 1.56 : 1.50));
    this.width = this.isBus ? 1.08 : 0.94;
    this.hoodZ = this.isBus ? 1.78 : 0.46;
    this.beltZ = this.isBus ? 0.82 : 0.56;
    this.roofZ = this.isBus ? 1.78 : 1.02;
    this.height = this.roofZ;

    this.targetLaneCoord = (Math.abs(Math.cos(this.angle)) === 1) ? this.y : this.x;
    this.isTurning = false;
    this.turnTargetAngle = 0;
    this.turnRate = 0;
    this.lastIntersectionId = -1;
    this.waitingAtRedLight = false;
    this.stoppedTime = 0;

    this.primaryColor = options.primaryColor || (this.isBus ? '#0284c7' : (this.type === 'taxi' ? '#ffd700' : (this.type === 'coupe' ? '#ff0055' : '#00f0ff')));
    this.highlightColor = options.highlightColor || (this.isBus ? '#38bdf8' : (this.type === 'taxi' ? '#ffe600' : (this.type === 'coupe' ? '#fb7185' : '#7dd3fc')));
    this.shadowColor = options.shadowColor || (this.isBus ? '#0369a1' : (this.type === 'taxi' ? '#b45309' : (this.type === 'coupe' ? '#9f1239' : '#0284c7')));
    this.baseBg = options.baseBg || (this.isBus ? '#082f49' : (this.type === 'taxi' ? '#78350f' : (this.type === 'coupe' ? '#881337' : '#0369a1')));

    this.boundingRadius = Math.hypot(this.length * 0.5, this.width * 0.5) + 0.35;
  }

  render(camera, blitter, scene, planar, horizon) {
    const dx = this.x - camera.x;
    const dy = this.y - camera.y;
    const fwdDepth = dx * planar.cosAngle + dy * planar.sinAngle;
    if (fwdDepth <= 0.25 || fwdDepth > camera.far) return;

    const lateral = -dx * planar.sinAngle + dy * planar.cosAngle;
    const centerCol = (0.5 + (lateral / (fwdDepth * planar.halfFovTan)) * 0.5) * blitter.cols;

    const halfL = this.length * 0.5;
    const halfW = this.width * 0.5;
    const carBoundR = this.boundingRadius;
    const radCols = (carBoundR / (fwdDepth * planar.halfFovTan)) * (blitter.cols * 0.5);

    const minCol = Math.max(0, Math.floor(centerCol - radCols));
    const maxCol = Math.min(blitter.cols - 1, Math.ceil(centerCol + radCols));
    if (minCol > maxCol) return;

    const minDepth = Math.max(0.12, fwdDepth - carBoundR);
    const screenHNear = (blitter.rows * camera.projectionScale) / minDepth;
    const rowTop = Math.max(0, Math.floor(horizon - (this.roofZ + 0.35 - camera.z) * screenHNear));
    const rowBottom = Math.min(blitter.rows - 1, Math.ceil(horizon - (0.0 - camera.z) * screenHNear));
    if (rowTop > rowBottom) return;

    const carAngle = this.angle || 0;
    const cosCar = Math.cos(carAngle);
    const sinCar = Math.sin(carAngle);

    const startXLocal = -dx * cosCar - dy * sinCar;
    const startYLocal = dx * sinCar - dy * cosCar;

    const boxes = (this.type === 'bus') ? [
      { minX: -halfL * 0.96, maxX: halfL * 0.96, minY: -halfW * 0.94, maxY: halfW * 0.94, minZ: 0.18, maxZ: this.roofZ, type: 'bus_body' },
      { minX: halfL * 0.50, maxX: halfL * 0.78, minY: halfW * 0.78, maxY: halfW * 1.05, minZ: 0.0, maxZ: 0.38, type: 'wheel' },
      { minX: halfL * 0.50, maxX: halfL * 0.78, minY: -halfW * 1.05, maxY: -halfW * 0.78, minZ: 0.0, maxZ: 0.38, type: 'wheel' },
      { minX: -halfL * 0.78, maxX: -halfL * 0.50, minY: halfW * 0.78, maxY: halfW * 1.05, minZ: 0.0, maxZ: 0.38, type: 'wheel' },
      { minX: -halfL * 0.78, maxX: -halfL * 0.50, minY: -halfW * 1.05, maxY: -halfW * 0.78, minZ: 0.0, maxZ: 0.38, type: 'wheel' }
    ] : [
      { minX: halfL * 0.28, maxX: halfL, minY: -halfW * 0.90, maxY: halfW * 0.90, minZ: 0.16, maxZ: this.hoodZ, type: 'hood' },
      { minX: -halfL * 0.38, maxX: halfL * 0.28, minY: -halfW * 0.92, maxY: halfW * 0.92, minZ: 0.16, maxZ: this.roofZ, type: 'cabin' },
      { minX: -halfL, maxX: -halfL * 0.38, minY: -halfW * 0.90, maxY: halfW * 0.90, minZ: 0.16, maxZ: this.beltZ * 0.95, type: 'trunk' },
      { minX: halfL * 0.40, maxX: halfL * 0.70, minY: halfW * 0.78, maxY: halfW * 1.05, minZ: 0.0, maxZ: 0.34, type: 'wheel' },
      { minX: halfL * 0.40, maxX: halfL * 0.70, minY: -halfW * 1.05, maxY: -halfW * 0.78, minZ: 0.0, maxZ: 0.34, type: 'wheel' },
      { minX: -halfL * 0.70, maxX: -halfL * 0.40, minY: halfW * 0.78, maxY: halfW * 1.05, minZ: 0.0, maxZ: 0.34, type: 'wheel' },
      { minX: -halfL * 0.70, maxX: -halfL * 0.40, minY: -halfW * 1.05, maxY: -halfW * 0.78, minZ: 0.0, maxZ: 0.34, type: 'wheel' }
    ];

    if (this.type === 'taxi') {
      boxes.push({ minX: -0.22, maxX: 0.22, minY: -0.25, maxY: 0.25, minZ: this.roofZ, maxZ: this.roofZ + 0.14, type: 'taxilight' });
    }

    for (let col = minCol; col <= maxCol; col++) {
      const ray = camera.getRay(col, blitter.cols, planar);
      const dirXLocal = ray.cosAngle * cosCar + ray.sinAngle * sinCar;
      const dirYLocal = -ray.cosAngle * sinCar + ray.sinAngle * cosCar;

      const invDx = (Math.abs(dirXLocal) > 1e-5) ? (1.0 / dirXLocal) : 1e5;
      const invDy = (Math.abs(dirYLocal) > 1e-5) ? (1.0 / dirYLocal) : 1e5;

      for (let row = rowTop; row <= rowBottom; row++) {
        const Dz = (horizon - row) / (blitter.rows * camera.projectionScale);
        const invDz = (Math.abs(Dz) > 1e-5) ? (1.0 / Dz) : 1e5;

        let closestCarTHit = Infinity;
        let bestPart = null;
        let hitWorldZ = 0;
        let hitLocalX = 0;
        let hitLocalY = 0;
        let hitFace = '';

        for (let b = 0; b < boxes.length; b++) {
          const box = boxes[b];
          const tx1 = (box.minX - startXLocal) * invDx;
          const tx2 = (box.maxX - startXLocal) * invDx;
          const ty1 = (box.minY - startYLocal) * invDy;
          const ty2 = (box.maxY - startYLocal) * invDy;

          const dzP = camera.z;
          const tz1 = (box.minZ - dzP) * invDz;
          const tz2 = (box.maxZ - dzP) * invDz;

          const tminX = Math.min(tx1, tx2);
          const tmaxX = Math.max(tx1, tx2);
          const tminY = Math.min(ty1, ty2);
          const tmaxY = Math.max(ty1, ty2);
          const tminZ = Math.min(tz1, tz2);
          const tmaxZ = Math.max(tz1, tz2);

          const tEnter = Math.max(tminX, Math.max(tminY, tminZ));
          const tExit = Math.min(tmaxX, Math.min(tmaxY, tmaxZ));

          if (tEnter <= tExit && tExit > 0.12) {
            const hitT = (tEnter > 0.12) ? tEnter : tExit;
            if (hitT < closestCarTHit) {
              closestCarTHit = hitT;
              bestPart = box.type;
              hitLocalX = startXLocal + hitT * dirXLocal;
              hitLocalY = startYLocal + hitT * dirYLocal;
              hitWorldZ = camera.z + hitT * Dz;

              if (tEnter === tminZ && Dz < 0) hitFace = 'top';
              else if (tEnter === tminX || tEnter === tmaxX) hitFace = 'frontback';
              else hitFace = 'side';
            }
          }
        }

        if (bestPart === null || closestCarTHit === Infinity) continue;

        const corrDistCar = closestCarTHit * ray.cosOffset;
        if (corrDistCar >= blitter.getDepth(col, row)) continue;
        blitter.setDepth(col, row, corrDistCar);

        const isNoseBumper = (hitLocalX > halfL * 0.88);
        const isRearBumper = (hitLocalX < -halfL * 0.88);

        let ch = '#';
        let color = this.primaryColor;
        let cellBg = this.baseBg;

        if (bestPart === 'wheel') {
          const isHubCenter = (hitWorldZ >= 0.12 && hitWorldZ <= 0.24);
          if (hitFace === 'side' && isHubCenter) {
            ch = 'O';
            color = '#f1f5f9';
            cellBg = '#1e293b';
          } else if (hitFace === 'side') {
            ch = '@';
            color = '#334155';
            cellBg = '#090d16';
          } else {
            ch = (hitWorldZ < 0.10) ? '=' : '#';
            color = '#1e293b';
            cellBg = '#020617';
          }
        } else if (this.type === 'bus') {
          if (hitFace === 'top') {
            const isAC = (Math.abs(hitLocalX) < halfL * 0.45 && Math.abs(hitLocalY) < halfW * 0.55);
            ch = isAC ? '#' : '=';
            color = isAC ? '#94a3b8' : this.highlightColor;
            cellBg = isAC ? '#1e293b' : this.baseBg;
          } else if (isNoseBumper) {
            if (hitWorldZ >= 1.45 && hitWorldZ <= 1.72) {
              ch = (Math.abs(hitLocalY) < halfW * 0.65) ? '=' : '#';
              color = '#facc15';
              cellBg = '#020617';
            } else if (hitWorldZ >= 0.72 && hitWorldZ < 1.45) {
              const isWiper = (hitWorldZ < 0.80 && Math.abs(hitLocalY) < halfW * 0.65);
              ch = isWiper ? '/' : ((Math.abs(hitLocalY) < 0.04) ? '|' : '=');
              color = isWiper ? '#0f172a' : '#38bdf8';
              cellBg = isWiper ? '#1e293b' : '#0c4a6e';
            } else if (hitWorldZ >= 0.32 && hitWorldZ < 0.62 && Math.abs(hitLocalY) > halfW * 0.45 && Math.abs(hitLocalY) < halfW * 0.88) {
              ch = (hitWorldZ > 0.38 && hitWorldZ < 0.55) ? '*' : 'O';
              color = '#ffffff';
              cellBg = '#64748b';
            } else {
              ch = (Math.abs(hitLocalY) < halfW * 0.35) ? '|' : '=';
              color = '#334155';
              cellBg = '#020617';
            }
          } else if (isRearBumper) {
            if (hitWorldZ >= 1.48) {
              ch = '=';
              color = '#facc15';
              cellBg = '#020617';
            } else if (hitWorldZ >= 0.85 && hitWorldZ < 1.45) {
              ch = '=';
              color = '#38bdf8';
              cellBg = '#0c4a6e';
            } else if (hitWorldZ >= 0.44 && hitWorldZ < 0.75 && Math.abs(hitLocalY) > halfW * 0.48) {
              ch = '*';
              color = '#ff0055';
              cellBg = '#881337';
            } else {
              ch = (Math.floor(hitLocalY * 12) % 2 === 0) ? '|' : '#';
              color = '#475569';
              cellBg = '#020617';
            }
          } else {
            if (hitWorldZ >= 0.78 && hitWorldZ < 1.55) {
              const isPillar = (Math.floor((hitLocalX + halfL) * 2.5) % 2 === 0);
              ch = isPillar ? '|' : '=';
              color = isPillar ? '#0f172a' : '#38bdf8';
              cellBg = isPillar ? '#020617' : '#075985';
            } else {
              const isStripe = (hitWorldZ >= 0.60 && hitWorldZ <= 0.76);
              ch = isStripe ? '=' : '#';
              color = isStripe ? this.highlightColor : this.primaryColor;
              cellBg = this.baseBg;
            }
          }
        } else if (bestPart === 'taxilight') {
          ch = (Math.abs(hitLocalX) < 0.10) ? '*' : '=';
          color = '#fffb00';
          cellBg = '#451a03';
        } else if (bestPart === 'cabin' && hitWorldZ > this.beltZ) {
          if (hitFace === 'top') {
            ch = '=';
            color = this.highlightColor;
            cellBg = this.baseBg;
          } else if (hitFace === 'frontback') {
            ch = (hitLocalX > 0) ? '/' : '\\';
            color = '#38bdf8';
            cellBg = '#0c4a6e';
          } else {
            const isPillar = (Math.abs(hitLocalX) < 0.08);
            if (isPillar) {
              ch = 'I';
              color = '#0f172a';
              cellBg = '#020617';
            } else {
              ch = '=';
              color = '#38bdf8';
              cellBg = '#075985';
            }
          }
        } else if (isNoseBumper) {
          const isLeftLight = (hitLocalY > halfW * 0.42 && hitLocalY < halfW * 0.88);
          const isRightLight = (hitLocalY < -halfW * 0.42 && hitLocalY > -halfW * 0.88);

          if ((isLeftLight || isRightLight) && hitWorldZ > 0.28 && hitWorldZ < 0.54) {
            const isLightCenter = (hitWorldZ > 0.34 && hitWorldZ < 0.48);
            ch = isLightCenter ? '*' : 'O';
            color = '#ffffff';
            cellBg = '#64748b';
          } else if (Math.abs(hitLocalY) < halfW * 0.38 && hitWorldZ > 0.22 && hitWorldZ < 0.50) {
            ch = (Math.floor(hitLocalY * 12) % 2 === 0) ? '|' : '=';
            color = '#cbd5e1';
            cellBg = '#0f172a';
          } else {
            ch = '=';
            color = '#334155';
            cellBg = '#020617';
          }
        } else if (isRearBumper) {
          const isLeftTail = (hitLocalY > halfW * 0.42 && hitLocalY < halfW * 0.88);
          const isRightTail = (hitLocalY < -halfW * 0.42 && hitLocalY > -halfW * 0.88);

          if ((isLeftTail || isRightTail) && hitWorldZ > 0.30 && hitWorldZ < 0.54) {
            const isLightCenter = (hitWorldZ > 0.36 && hitWorldZ < 0.48);
            ch = isLightCenter ? '*' : 'O';
            color = '#ff0055';
            cellBg = '#881337';
          } else if (Math.abs(hitLocalY) < 0.24 && hitWorldZ > 0.20 && hitWorldZ < 0.36) {
            ch = '#';
            color = '#f8fafc';
            cellBg = '#0f172a';
          } else {
            ch = '=';
            color = '#334155';
            cellBg = '#020617';
          }
        } else {
          if (hitFace === 'top') {
            ch = (Math.abs(hitLocalY) < 0.08) ? '|' : '=';
            color = this.highlightColor;
            cellBg = this.baseBg;
          } else if (this.type === 'taxi' && hitWorldZ >= 0.44 && hitWorldZ <= 0.58 && Math.abs(hitLocalX) < halfL * 0.70) {
            const checkSlot = (Math.floor(hitLocalX * 6.5) % 2 === 0);
            ch = checkSlot ? '#' : ':';
            color = checkSlot ? '#0f172a' : '#ffffff';
            cellBg = checkSlot ? '#1e293b' : '#94a3b8';
          } else {
            ch = (Math.abs(hitLocalY) > halfW * 0.80) ? '#' : 'H';
            color = (hitWorldZ > this.beltZ * 0.6) ? this.primaryColor : this.shadowColor;
            cellBg = this.baseBg;
          }
        }

        blitter.drawOpaqueChar(col, row, ch, color, 1.0, cellBg);
      }
    }
  }
}

export function updateVehicleFleet(vehicles, dt, getSignalState, mapSize = 80) {
  for (let v = 0; v < vehicles.length; v++) {
    const car = vehicles[v];
    if (car.active === false) continue;

    let vDesired = car.cruiseSpeed;
    const cosA = Math.round(Math.cos(car.angle));
    const sinA = Math.round(Math.sin(car.angle));

    const isNearBorder = (car.x <= 2.5 || car.x >= mapSize - 2.5 || car.y <= 2.5 || car.y >= mapSize - 2.5);
    car.waitingAtRedLight = false;

    if (!car.isTurning && !isNearBorder && getSignalState) {
      for (let s = 0; s < STOP_LINES.length; s++) {
        const sl = STOP_LINES[s];
        let isMatchingLane = false;
        let distToLine = Infinity;

        if (sl.isX) {
          if (sl.checkSign === 1 && cosA === 1 && car.x < sl.stopCoord) {
            distToLine = sl.stopCoord - car.x;
            isMatchingLane = (car.y >= sl.laneMin && car.y <= sl.laneMax);
          } else if (sl.checkSign === -1 && cosA === -1 && car.x > sl.stopCoord) {
            distToLine = car.x - sl.stopCoord;
            isMatchingLane = (car.y >= sl.laneMin && car.y <= sl.laneMax);
          }
        } else {
          if (sl.checkSign === 1 && sinA === 1 && car.y < sl.stopCoord) {
            distToLine = sl.stopCoord - car.y;
            isMatchingLane = (car.x >= sl.laneMin && car.x <= sl.laneMax);
          } else if (sl.checkSign === -1 && sinA === -1 && car.y > sl.stopCoord) {
            distToLine = car.y - sl.stopCoord;
            isMatchingLane = (car.x >= sl.laneMin && car.x <= sl.laneMax);
          }
        }

        if (isMatchingLane && distToLine > 0 && distToLine < 12.0) {
          const signal = getSignalState(sl.phase);
          const isRed = (signal === 'red');
          const isYellow = (signal === 'yellow');

          let crossTrafficInBox = false;
          const inter = INTERSECTION_DATA.find(it => it.id === sl.interId);
          if (inter) {
            for (let o = 0; o < vehicles.length; o++) {
              if (o === v) continue;
              const other = vehicles[o];
              const distToInter = Math.hypot(other.x - inter.cx, other.y - inter.cy);
              const cosHeading = Math.cos(car.angle) * Math.cos(other.angle) + Math.sin(car.angle) * Math.sin(other.angle);
              if (distToInter < 2.8 && Math.abs(cosHeading) < 0.6) {
                crossTrafficInBox = true;
                break;
              }
            }
          }

          if (isRed || (isYellow && distToLine > 2.5) || (crossTrafficInBox && distToLine < 4.0)) {
            const stopGap = Math.max(0, distToLine - 0.40);
            if (stopGap < 0.15) {
              vDesired = 0.0;
              car.waitingAtRedLight = true;
            } else {
              const stopSpeed = Math.sqrt(2.0 * 3.0 * stopGap);
              vDesired = Math.min(vDesired, stopSpeed);
              if (vDesired < 0.2) car.waitingAtRedLight = true;
            }
          }
        }
      }
    }

    for (let o = 0; o < vehicles.length; o++) {
      if (o === v) continue;
      const other = vehicles[o];
      if (other.active === false) continue;

      const toOtherX = other.x - car.x;
      const toOtherY = other.y - car.y;
      const directDist = Math.hypot(toOtherX, toOtherY);

      if (directDist > 14.0) continue;

      const cosCar = Math.cos(car.angle);
      const sinCar = Math.sin(car.angle);

      const fwdDist = toOtherX * cosCar + toOtherY * sinCar;
      const latDist = -toOtherX * sinCar + toOtherY * cosCar;

      const cosHeading = Math.cos(car.angle) * Math.cos(other.angle) + Math.sin(car.angle) * Math.sin(other.angle);

      if (cosHeading > 0.5 && fwdDist > 0.1 && fwdDist < 12.0 && Math.abs(latDist) < 1.35) {
        const bumperGap = fwdDist - (car.length * 0.5) - (other.length * 0.5);
        const minSafetyGap = 1.40;

        if (bumperGap <= minSafetyGap) {
          vDesired = 0.0;
        } else if (bumperGap < 8.0) {
          const safeSpeed = (bumperGap - minSafetyGap) * 0.90 + other.speed * 0.85;
          vDesired = Math.min(vDesired, Math.max(0, safeSpeed));
        }
      } else if (cosHeading < -0.5) {
        if (Math.abs(latDist) < 0.85 && fwdDist > 0.0 && directDist < 4.0) {
          vDesired = 0.0;
        }
      } else if (!isNearBorder && directDist < 4.5 && fwdDist > 0.0 && Math.abs(latDist) < 2.2) {
        const hasPriority = (car.speed > other.speed + 0.5) || (Math.abs(car.speed - other.speed) <= 0.5 && v < o);
        if (!hasPriority) {
          const gap = directDist - 2.8;
          if (gap <= 1.2) {
            vDesired = 0.0;
          } else {
            vDesired = Math.min(vDesired, Math.max(0, gap * 1.0));
          }
        }
      }
    }

    if (car.speed < 0.1 && vDesired < 0.1 && isNearBorder) {
      vDesired = car.cruiseSpeed;
    } else if (car.speed < 0.1 && vDesired < 0.1 && !car.waitingAtRedLight) {
      car.stoppedTime = (car.stoppedTime || 0) + dt;
      if (car.stoppedTime > 8.0) {
        vDesired = 2.0;
      }
    } else {
      car.stoppedTime = 0;
    }

    const maxAccel = 3.2;
    const maxBrake = 7.5;

    if (vDesired > car.speed) {
      car.speed = Math.min(vDesired, car.speed + maxAccel * dt);
    } else {
      car.speed = Math.max(vDesired, car.speed - maxBrake * dt);
    }
    car.speed = Math.max(0.0, car.speed);

    if (car.isTurning) {
      if (car.speed > 0) {
        let angleDiff = normalizeAngle(car.turnTargetAngle - car.angle);
        const maxStep = car.turnRate * dt;

        if (Math.abs(angleDiff) <= maxStep) {
          car.angle = car.turnTargetAngle;
          car.isTurning = false;
        } else {
          car.angle += Math.sign(angleDiff) * maxStep;
        }

        car.x += Math.cos(car.angle) * car.speed * dt;
        car.y += Math.sin(car.angle) * car.speed * dt;
      }
    } else {
      if (car.speed > 0) {
        car.x += Math.cos(car.angle) * car.speed * dt;
        car.y += Math.sin(car.angle) * car.speed * dt;

        if (Math.abs(cosA) === 1) {
          car.y += (car.targetLaneCoord - car.y) * 0.08;
        } else if (Math.abs(sinA) === 1) {
          car.x += (car.targetLaneCoord - car.x) * 0.08;
        }
      }

      if (car.speed > 1.0) {
        for (let i = 0; i < INTERSECTION_DATA.length; i++) {
          const inter = INTERSECTION_DATA[i];
          const distToCenter = Math.hypot(car.x - inter.cx, car.y - inter.cy);

          if (distToCenter < 3.5 && car.lastIntersectionId !== inter.id) {
            if (car.pendingTurnChoice === undefined || car.pendingIntersectionId !== inter.id) {
              car.pendingIntersectionId = inter.id;
              const roll = Math.random();
              if (roll < 0.32) car.pendingTurnChoice = 'right';
              else if (roll < 0.60) car.pendingTurnChoice = 'left';
              else car.pendingTurnChoice = 'straight';
            }

            if (car.pendingTurnChoice !== 'straight') {
              const isRight = (car.pendingTurnChoice === 'right');
              const ewEastY = inter.ewLanes.east;
              const ewWestY = inter.ewLanes.west;
              const nsSouthX = inter.nsLanes.south;
              const nsNorthX = inter.nsLanes.north;

              let shouldStartTurn = false;
              let R = 1.60;
              let targetAngle = car.angle;
              let targetLane = 0;

              if (cosA === 1) {
                if (isRight) {
                  R = 1.55;
                  targetLane = nsSouthX;
                  targetAngle = Math.PI / 2;
                  if (car.x >= nsSouthX - R) shouldStartTurn = true;
                } else {
                  R = 2.20;
                  targetLane = nsNorthX;
                  targetAngle = -Math.PI / 2;
                  if (car.x >= nsNorthX - R) shouldStartTurn = true;
                }
              } else if (cosA === -1) {
                if (isRight) {
                  R = 1.55;
                  targetLane = nsNorthX;
                  targetAngle = -Math.PI / 2;
                  if (car.x <= nsNorthX + R) shouldStartTurn = true;
                } else {
                  R = 2.20;
                  targetLane = nsSouthX;
                  targetAngle = Math.PI / 2;
                  if (car.x <= nsSouthX + R) shouldStartTurn = true;
                }
              } else if (sinA === 1) {
                if (isRight) {
                  R = 1.55;
                  targetLane = ewWestY;
                  targetAngle = Math.PI;
                  if (car.y >= ewWestY - R) shouldStartTurn = true;
                } else {
                  R = 2.20;
                  targetLane = ewEastY;
                  targetAngle = 0;
                  if (car.y >= ewEastY - R) shouldStartTurn = true;
                }
              } else if (sinA === -1) {
                if (isRight) {
                  R = 1.55;
                  targetLane = ewEastY;
                  targetAngle = 0;
                  if (car.y <= ewEastY + R) shouldStartTurn = true;
                } else {
                  R = 2.20;
                  targetLane = ewWestY;
                  targetAngle = Math.PI;
                  if (car.y <= ewWestY + R) shouldStartTurn = true;
                }
              }

              if (shouldStartTurn) {
                car.lastIntersectionId = inter.id;
                car.pendingTurnChoice = 'straight';
                car.isTurning = true;
                car.turnTargetAngle = targetAngle;
                car.turnRate = (car.cruiseSpeed / R);
                car.targetLaneCoord = targetLane;
              }
            } else {
              car.lastIntersectionId = inter.id;
            }
          } else if (distToCenter > 4.0 && car.lastIntersectionId === inter.id) {
            car.lastIntersectionId = -1;
            car.pendingTurnChoice = undefined;
          }
        }
      }

      if (car.x > mapSize + 4.0) car.x = -3.0;
      else if (car.x < -4.0) car.x = mapSize + 3.0;

      if (car.y > mapSize + 4.0) car.y = -3.0;
      else if (car.y < -4.0) car.y = mapSize + 3.0;
    }
  }

  for (let i = 0; i < vehicles.length; i++) {
    const c1 = vehicles[i];
    if (c1.active === false) continue;
    for (let j = i + 1; j < vehicles.length; j++) {
      const c2 = vehicles[j];
      if (c2.active === false) continue;
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      if (Math.abs(dx) > 4.0 || Math.abs(dy) > 4.0) continue;

      const cos1 = Math.cos(c1.angle);
      const sin1 = Math.sin(c1.angle);

      const localX = dx * cos1 + dy * sin1;
      const localY = -dx * sin1 + dy * cos1;

      const halfLen = (c1.length + c2.length) * 0.48;
      const halfWid = (c1.width + c2.width) * 0.48;

      if (Math.abs(localX) < halfLen && Math.abs(localY) < halfWid) {
        const overlapX = halfLen - Math.abs(localX);
        const overlapY = halfWid - Math.abs(localY);

        if (overlapX < overlapY) {
          const pushDir = (localX >= 0) ? 1 : -1;
          const pushX = cos1 * pushDir * overlapX * 0.5;
          const pushY = sin1 * pushDir * overlapX * 0.5;
          c1.x -= pushX;
          c1.y -= pushY;
          c2.x += pushX;
          c2.y += pushY;
        } else {
          const pushDir = (localY >= 0) ? 1 : -1;
          const pushX = -sin1 * pushDir * overlapY * 0.5;
          const pushY = cos1 * pushDir * overlapY * 0.5;
          c1.x -= pushX;
          c1.y -= pushY;
          c2.x += pushX;
          c2.y += pushY;
        }
      }
    }
  }
}

export function createTaxi(options = {}) {
  return new VehicleEntity({
    vehicleType: 'taxi',
    x: options.x || 0.0,
    y: options.y || 0.0,
    angle: options.angle || 0.0,
    speed: options.speed || 5.2,
    primaryColor: options.primaryColor || '#ffd700',
    highlightColor: options.highlightColor || '#ffe600',
    shadowColor: options.shadowColor || '#b45309',
    baseBg: options.baseBg || '#78350f'
  });
}

export function createCyberCoupe(options = {}) {
  return new VehicleEntity({
    vehicleType: 'coupe',
    x: options.x || 0.0,
    y: options.y || 0.0,
    angle: options.angle || 0.0,
    speed: options.speed || 5.4,
    primaryColor: options.primaryColor || '#ff0055',
    highlightColor: options.highlightColor || '#fb7185',
    shadowColor: options.shadowColor || '#9f1239',
    baseBg: options.baseBg || '#881337'
  });
}

export function createCityBus(options = {}) {
  return new VehicleEntity({
    vehicleType: 'bus',
    isBus: true,
    x: options.x || 0.0,
    y: options.y || 0.0,
    angle: options.angle || 0.0,
    speed: options.speed || 4.0,
    primaryColor: options.primaryColor || '#0284c7',
    highlightColor: options.highlightColor || '#38bdf8',
    shadowColor: options.shadowColor || '#0369a1',
    baseBg: options.baseBg || '#082f49'
  });
}

export function createVipSedan(options = {}) {
  return new VehicleEntity({
    vehicleType: 'vip_sedan',
    x: options.x || 0.0,
    y: options.y || 0.0,
    angle: options.angle || 0.0,
    speed: options.speed || 4.8,
    primaryColor: options.primaryColor || '#9333ea',
    highlightColor: options.highlightColor || '#c084fc',
    shadowColor: options.shadowColor || '#6b21a8',
    baseBg: options.baseBg || '#581c87'
  });
}

export function createVehicleFleet(scene) {
  const fleet = [];

  function createCar(type, x, y, angle, speed, colorPrimary, colorHighlight, colorShadow, baseBg) {
    const isBus = (type === 'bus');
    const v = new VehicleEntity({
      vehicleType: type,
      isBus: isBus,
      x: x,
      y: y,
      angle: angle,
      speed: speed,
      primaryColor: colorPrimary,
      highlightColor: colorHighlight,
      shadowColor: colorShadow,
      baseBg: baseBg
    });
    scene.add(v);
    fleet.push(v);
    return v;
  }

  createCar('taxi', 8.0, 3.65, 0.0, 5.2, '#ffd700', '#ffe600', '#b45309', '#78350f');
  createCar('bus', 32.0, 3.65, 0.0, 4.0, '#0284c7', '#38bdf8', '#0369a1', '#082f49');
  createCar('cyber_sedan', 72.0, 1.35, Math.PI, 4.8, '#00f0ff', '#7dd3fc', '#0284c7', '#0369a1');
  createCar('taxi', 22.0, 15.65, 0.0, 5.2, '#ffd700', '#ffe600', '#b45309', '#78350f');
  createCar('coupe', 68.0, 13.35, Math.PI, 5.4, '#ff0055', '#fb7185', '#9f1239', '#881337');
  createCar('taxi', 22.0, 41.65, 0.0, 5.3, '#ffd700', '#ffe600', '#b45309', '#78350f');
  createCar('vip_sedan', 58.0, 39.35, Math.PI, 4.7, '#9333ea', '#c084fc', '#6b21a8', '#581c87');
  createCar('coupe', 12.0, 66.65, 0.0, 5.5, '#ff0055', '#fb7185', '#9f1239', '#881337');
  createCar('cyber_sedan', 68.0, 64.35, Math.PI, 4.9, '#00f0ff', '#7dd3fc', '#0284c7', '#0369a1');
  createCar('taxi', 16.0, 78.65, 0.0, 5.1, '#ffd700', '#ffe600', '#b45309', '#78350f');
  createCar('vip_sedan', 64.0, 76.35, Math.PI, 4.6, '#9333ea', '#c084fc', '#6b21a8', '#581c87');

  createCar('coupe', 1.35, 12.0, Math.PI / 2, 5.0, '#ff0055', '#fb7185', '#9f1239', '#881337');
  createCar('taxi', 3.65, 68.0, -Math.PI / 2, 5.1, '#ffd700', '#ffe600', '#b45309', '#78350f');
  createCar('cyber_sedan', 13.35, 20.0, Math.PI / 2, 4.9, '#00f0ff', '#7dd3fc', '#0284c7', '#0369a1');
  createCar('taxi', 15.65, 70.0, -Math.PI / 2, 5.1, '#ffd700', '#ffe600', '#b45309', '#78350f');
  createCar('bus', 39.35, 52.0, Math.PI / 2, 4.0, '#0284c7', '#38bdf8', '#0369a1', '#082f49');
  createCar('vip_sedan', 39.35, 20.0, Math.PI / 2, 4.8, '#9333ea', '#c084fc', '#6b21a8', '#581c87');
  createCar('cyber_sedan', 41.65, 60.0, -Math.PI / 2, 5.0, '#00f0ff', '#7dd3fc', '#0284c7', '#0369a1');
  createCar('taxi', 64.35, 15.0, Math.PI / 2, 5.2, '#ffd700', '#ffe600', '#b45309', '#78350f');
  createCar('coupe', 66.65, 72.0, -Math.PI / 2, 5.4, '#ff0055', '#fb7185', '#9f1239', '#881337');
  createCar('cyber_sedan', 76.35, 18.0, Math.PI / 2, 5.0, '#00f0ff', '#7dd3fc', '#0284c7', '#0369a1');
  createCar('taxi', 78.65, 65.0, -Math.PI / 2, 5.2, '#ffd700', '#ffe600', '#b45309', '#78350f');

  return fleet;
}
