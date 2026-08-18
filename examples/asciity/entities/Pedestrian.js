import { Entity } from '../../../src/primitives/Entity.js';
import { intersectRayAABB } from '../../../src/math/Intersection.js';
import { MAP_SIZE, isMetropolisCrosswalk } from '../cityData.js';

export const PEDESTRIAN_ARCHETYPES = [
  { type: 'camel_coat', height: 0.94, speed: 0.65, hairColor: '#4a3319', skinColor: '#f5cba7', jacketColor: '#c99a6b', jacketAccentColor: '#eed7a1', pantsColor: '#2b3e50', shoesColor: '#6d4c2b', baseBg: '#23170e' },
  { type: 'denim_jacket', height: 0.95, speed: 0.68, hairColor: '#5c4326', skinColor: '#fad7b8', jacketColor: '#4b6584', jacketAccentColor: '#2c3e50', pantsColor: '#b8a98f', shoesColor: '#dfe4ea', baseBg: '#1e272e' },
  { type: 'olive_overcoat', height: 0.93, speed: 0.62, hairColor: '#3d3429', skinColor: '#ebd0b0', jacketColor: '#576574', jacketAccentColor: '#8395a7', pantsColor: '#3c4043', shoesColor: '#483424', baseBg: '#1a1f1b' },
  { type: 'autumn_rust', height: 0.96, speed: 0.67, hairColor: '#6e3820', skinColor: '#f7d0b3', jacketColor: '#b35436', jacketAccentColor: '#d68a52', pantsColor: '#2d3748', shoesColor: '#8c532b', baseBg: '#2a160e' },
  { type: 'slate_blazer', height: 0.92, speed: 0.60, hairColor: '#606870', skinColor: '#fce0cb', jacketColor: '#718093', jacketAccentColor: '#95a5a6', pantsColor: '#34495e', shoesColor: '#574134', baseBg: '#20262e' },
  { type: 'burgundy_sweater', height: 0.94, speed: 0.64, hairColor: '#382518', skinColor: '#f2cc9f', jacketColor: '#78283a', jacketAccentColor: '#a85060', pantsColor: '#a69d8b', shoesColor: '#422c1d', baseBg: '#240f16' }
];

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export class PedestrianEntity extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = 'pedestrian';
    this.entityType = 'pedestrian';
    this.path = options.path || [];
    this.isLoop = options.isLoop ?? false;
    this.pathDir = options.pathDir || 1;
    this.waypointIdx = options.waypointIdx || 0;
    this.speed = options.speed || 0.65;
    this.height = options.height || 0.94;
    this.hairColor = options.hairColor || '#4a3319';
    this.skinColor = options.skinColor || '#f5cba7';
    this.jacketColor = options.jacketColor || '#c99a6b';
    this.jacketAccentColor = options.jacketAccentColor || '#eed7a1';
    this.pantsColor = options.pantsColor || '#2b3e50';
    this.shoesColor = options.shoesColor || '#6d4c2b';
    this.baseBg = options.baseBg || '#23170e';
    this.walkCycle = options.walkCycle || Math.random() * Math.PI * 2;
    this.boundingRadius = 0.35;
    this.seed = options.seed || Math.random() * 100;
    this.stuckTimer = 0;
    this.lastDistToWp = undefined;
  }

  render(camera, blitter, scene, planar, horizon) {
    const dx = this.x - camera.x;
    const dy = this.y - camera.y;
    const fwdDepth = dx * planar.cosAngle + dy * planar.sinAngle;
    if (fwdDepth <= 0.25 || fwdDepth > camera.far) return;

    const lateral = -dx * planar.sinAngle + dy * planar.cosAngle;
    const centerCol = (0.5 + (lateral / (fwdDepth * planar.halfFovTan)) * 0.5) * blitter.cols;

    const pedBoundR = 0.35;
    const radCols = (pedBoundR / (fwdDepth * planar.halfFovTan)) * (blitter.cols * 0.5);

    const minCol = Math.max(0, Math.floor(centerCol - radCols));
    const maxCol = Math.min(blitter.cols - 1, Math.ceil(centerCol + radCols));
    if (minCol > maxCol) return;

    const minDepth = Math.max(0.12, fwdDepth - pedBoundR);
    const screenHNear = (blitter.rows * camera.projectionScale) / minDepth;
    const rowTop = Math.max(0, Math.floor(horizon - (this.height + 0.10 - camera.z) * screenHNear));
    const rowBottom = Math.min(blitter.rows - 1, Math.ceil(horizon - (0.0 - camera.z) * screenHNear));
    if (rowTop > rowBottom) return;

    const pedAngle = this.angle || 0;
    const cosPed = Math.cos(pedAngle);
    const sinPed = Math.sin(pedAngle);

    const startXLocal = -dx * cosPed - dy * sinPed;
    const startYLocal = dx * sinPed - dy * cosPed;

    //gait kinematics
    const cycle = this.walkCycle;
    const strideSin = Math.sin(cycle);

    const verticalBounce = (1.0 - Math.abs(strideSin)) * 0.024;
    const hipSway = strideSin * 0.012;

    const leftThighOffset = strideSin * 0.08;
    const leftFootOffset = strideSin * 0.15;
    const leftFootZLift = Math.max(0, strideSin) * 0.048;

    const rightThighOffset = -strideSin * 0.08;
    const rightFootOffset = -strideSin * 0.15;
    const rightFootZLift = Math.max(0, -strideSin) * 0.048;

    const armSwing = -strideSin * 0.09;

    const headZBase = 0.74 + verticalBounce;
    const headZTop = this.height + verticalBounce;
    const torsoZBase = 0.38 + verticalBounce * 0.4;
    const torsoZTop = 0.74 + verticalBounce;

    const boxes = [
      //head & face
      {
        minX: -0.045, maxX: 0.045,
        minY: -0.045 + hipSway * 0.5, maxY: 0.045 + hipSway * 0.5,
        minZ: headZBase, maxZ: headZTop,
        type: 'head'
      },
      //torso / jacket
      {
        minX: -0.05, maxX: 0.05,
        minY: -0.075 + hipSway, maxY: 0.075 + hipSway,
        minZ: torsoZBase, maxZ: torsoZTop,
        type: 'torso'
      },
      //left arm
      {
        minX: -0.035 + armSwing, maxX: 0.035 + armSwing,
        minY: 0.075 + hipSway, maxY: 0.11 + hipSway,
        minZ: 0.34 + verticalBounce * 0.5, maxZ: 0.70 + verticalBounce,
        type: 'arm'
      },
      //right arm
      {
        minX: -0.035 - armSwing, maxX: 0.035 - armSwing,
        minY: -0.11 + hipSway, maxY: -0.075 + hipSway,
        minZ: 0.34 + verticalBounce * 0.5, maxZ: 0.70 + verticalBounce,
        type: 'arm'
      },
      //left thigh
      {
        minX: -0.04 + leftThighOffset, maxX: 0.04 + leftThighOffset,
        minY: 0.01 + hipSway * 0.3, maxY: 0.065 + hipSway * 0.3,
        minZ: 0.18 + leftFootZLift * 0.5, maxZ: torsoZBase,
        type: 'thigh'
      },
      //left shin & foot
      {
        minX: -0.04 + leftFootOffset, maxX: 0.04 + leftFootOffset,
        minY: 0.01 + hipSway * 0.3, maxY: 0.065 + hipSway * 0.3,
        minZ: leftFootZLift, maxZ: 0.18 + leftFootZLift * 0.5,
        type: 'foot'
      },
      //right thigh
      {
        minX: -0.04 + rightThighOffset, maxX: 0.04 + rightThighOffset,
        minY: -0.065 + hipSway * 0.3, maxY: -0.01 + hipSway * 0.3,
        minZ: 0.18 + rightFootZLift * 0.5, maxZ: torsoZBase,
        type: 'thigh'
      },
      //right shin & foot
      {
        minX: -0.04 + rightFootOffset, maxX: 0.04 + rightFootOffset,
        minY: -0.065 + hipSway * 0.3, maxY: -0.01 + hipSway * 0.3,
        minZ: rightFootZLift, maxZ: 0.18 + rightFootZLift * 0.5,
        type: 'foot'
      }
    ];

    for (let col = minCol; col <= maxCol; col++) {
      const ray = camera.getRay(col, blitter.cols, planar);
      const dirXLocal = ray.cosAngle * cosPed + ray.sinAngle * sinPed;
      const dirYLocal = -ray.cosAngle * sinPed + ray.sinAngle * cosPed;

      const invDx = (Math.abs(dirXLocal) > 1e-5) ? (1.0 / dirXLocal) : 1e5;
      const invDy = (Math.abs(dirYLocal) > 1e-5) ? (1.0 / dirYLocal) : 1e5;

      for (let row = rowTop; row <= rowBottom; row++) {
        const Dz = (horizon - row) / (blitter.rows * camera.projectionScale);
        const invDz = (Math.abs(Dz) > 1e-5) ? (1.0 / Dz) : 1e5;

        let closestPedTHit = Infinity;
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
            if (hitT < closestPedTHit) {
              closestPedTHit = hitT;
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

        if (bestPart === null || closestPedTHit === Infinity) continue;

        const corrDistPed = closestPedTHit * ray.cosOffset;
        if (corrDistPed >= blitter.getDepth(col, row)) continue;
        blitter.setDepth(col, row, corrDistPed);

        let ch = '#';
        let color = this.jacketColor;
        let cellBg = this.baseBg;
        const depthAlpha = Math.max(0.70, 1 - (corrDistPed / camera.far));

        //head & face / hair
        if (bestPart === 'head') {
          const isFront = (hitLocalX > 0.01);
          const isBack = (hitLocalX < -0.01);
          const isEyeLevel = (hitWorldZ >= headZBase + 0.05 && hitWorldZ <= headZBase + 0.12);

          if (isFront) {
            if (hitWorldZ > headZBase + 0.12) {
              ch = '^';
              color = this.hairColor;
              cellBg = '#1e1b18';
            } else if (isEyeLevel) {
              ch = (Math.abs(hitLocalY) < 0.02) ? '.' : ':';
              color = '#2c1e13';
              cellBg = this.skinColor;
            } else {
              ch = '_';
              color = '#5c3826';
              cellBg = this.skinColor;
            }
          } else if (isBack) {
            ch = (hitWorldZ > headZBase + 0.10) ? '@' : '#';
            color = this.hairColor;
            cellBg = '#1e1b18';
          } else {
            ch = (isEyeLevel) ? '(' : '|';
            color = isEyeLevel ? '#2c1e13' : this.hairColor;
            cellBg = isEyeLevel ? this.skinColor : '#1e1b18';
          }
        }
        //torso / jacket
        else if (bestPart === 'torso') {
          const isFront = (hitLocalX > 0.015);
          const isBack = (hitLocalX < -0.015);

          if (isFront) {
            if (Math.abs(hitLocalY) < 0.02) {
              ch = '|';
              color = this.jacketAccentColor;
              cellBg = this.baseBg;
            } else {
              ch = (hitWorldZ > 0.58) ? 'Y' : 'H';
              color = this.jacketColor;
              cellBg = this.baseBg;
            }
          } else if (isBack) {
            ch = (hitWorldZ > 0.58) ? '=' : '#';
            color = this.jacketColor;
            cellBg = this.baseBg;
          } else {
            ch = (hitFace === 'top') ? '=' : '|';
            color = (hitFace === 'top') ? this.jacketAccentColor : this.jacketColor;
            cellBg = this.baseBg;
          }
        }
        //arms & hands
        else if (bestPart === 'arm') {
          if (hitWorldZ < 0.44) {
            ch = 'o';
            color = this.skinColor;
            cellBg = '#1e1b18';
          } else {
            ch = '|';
            color = this.jacketColor;
            cellBg = this.baseBg;
          }
        }
        //legs & shoes
        else if (bestPart === 'thigh') {
          ch = (Math.abs(hitLocalX) > 0.02) ? 'I' : '|';
          color = this.pantsColor;
          cellBg = '#14181c';
        } else if (bestPart === 'foot') {
          if (hitWorldZ < 0.10) {
            ch = (hitLocalX > 0.01) ? '_' : '=';
            color = this.shoesColor;
            cellBg = '#181512';
          } else {
            ch = (Math.abs(hitLocalX) > 0.02) ? 'I' : '|';
            color = this.pantsColor;
            cellBg = '#14181c';
          }
        }

        if (corrDistPed > 6.0) {
          blitter.drawChar(col, row, ch, color, Math.min(1.0, depthAlpha * 1.35));
        } else {
          blitter.drawOpaqueChar(col, row, ch, color, depthAlpha, cellBg);
        }
      }
    }
  }
}

export function updatePedestrianFleet(pedestrians, dt, map, player) {
  for (let i = 0; i < pedestrians.length; i++) {
    const ped = pedestrians[i];
    if (!ped.path || ped.path.length === 0) continue;

    const target = ped.path[ped.waypointIdx];
    const dx = target.x - ped.x;
    const dy = target.y - ped.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.45) {
      if (ped.isLoop) {
        ped.waypointIdx = (ped.waypointIdx + 1) % ped.path.length;
      } else {
        if (ped.pathDir === 1) {
          if (ped.waypointIdx >= ped.path.length - 1) {
            ped.pathDir = -1;
            ped.waypointIdx = ped.path.length - 2;
          } else {
            ped.waypointIdx++;
          }
        } else {
          if (ped.waypointIdx <= 0) {
            ped.pathDir = 1;
            ped.waypointIdx = 1;
          } else {
            ped.waypointIdx--;
          }
        }
      }
      ped.stuckTimer = 0;
    } else {
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = normalizeAngle(targetAngle - ped.angle);
      ped.angle += angleDiff * Math.min(1.0, dt * 4.0);

      const vx = Math.cos(ped.angle) * ped.speed;
      const vy = Math.sin(ped.angle) * ped.speed;

      ped.x += vx * dt;
      ped.y += vy * dt;
      ped.walkCycle += dt * ped.speed * 4.8;

      //anti-stuck watchdog
      if (ped.lastDistToWp !== undefined && Math.abs(dist - ped.lastDistToWp) < 0.003) {
        ped.stuckTimer = (ped.stuckTimer || 0) + dt;
        if (ped.stuckTimer > 3.5) {
          if (ped.isLoop) {
            ped.waypointIdx = (ped.waypointIdx + 1) % ped.path.length;
          } else {
            ped.pathDir = -ped.pathDir;
            ped.waypointIdx = Math.max(0, Math.min(ped.path.length - 1, ped.waypointIdx + ped.pathDir));
          }
          ped.stuckTimer = 0;
        }
      } else {
        ped.stuckTimer = 0;
      }
      ped.lastDistToWp = dist;
    }

    //road curb guide
    if (map) {
      const curTileX = Math.floor(ped.x);
      const curTileY = Math.floor(ped.y);
      if (curTileX >= 0 && curTileX < MAP_SIZE && curTileY >= 0 && curTileY < MAP_SIZE) {
        if (map[curTileY * MAP_SIZE + curTileX] === 0 && !isMetropolisCrosswalk(ped.x, ped.y)) {
          const pushBackDx = target.x - ped.x;
          const pushBackDy = target.y - ped.y;
          const pbDist = Math.hypot(pushBackDx, pushBackDy);
          if (pbDist > 0.001) {
            ped.x += (pushBackDx / pbDist) * 0.035;
            ped.y += (pushBackDy / pbDist) * 0.035;
          }
        }
      }

      //building wall collision slide
      const pedR = 0.22;
      const minTileX = Math.floor(ped.x - pedR);
      const maxTileX = Math.floor(ped.x + pedR);
      const minTileY = Math.floor(ped.y - pedR);
      const maxTileY = Math.floor(ped.y + pedR);

      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          if (tx >= 0 && tx < MAP_SIZE && ty >= 0 && ty < MAP_SIZE) {
            if (map[ty * MAP_SIZE + tx] >= 10) {
              const nearestX = Math.max(tx, Math.min(tx + 1.0, ped.x));
              const nearestY = Math.max(ty, Math.min(ty + 1.0, ped.y));
              const pushDx = ped.x - nearestX;
              const pushDy = ped.y - nearestY;
              const pushDist = Math.hypot(pushDx, pushDy);

              if (pushDist < pedR) {
                if (pushDist > 1e-4) {
                  ped.x = nearestX + (pushDx / pushDist) * pedR;
                  ped.y = nearestY + (pushDy / pushDist) * pedR;
                }
              }
            }
          }
        }
      }
    }

    //mutual pedestrian soft avoidance
    for (let j = i + 1; j < pedestrians.length; j++) {
      const other = pedestrians[j];
      const sepX = other.x - ped.x;
      const sepY = other.y - ped.y;
      const sepDist = Math.hypot(sepX, sepY);
      if (sepDist < 0.65 && sepDist > 0.001) {
        const overlap = (0.65 - sepDist) * 0.5;
        const nx = sepX / sepDist;
        const ny = sepY / sepDist;
        ped.x -= nx * overlap;
        ped.y -= ny * overlap;
        other.x += nx * overlap;
        other.y += ny * overlap;
      }
    }

    //player soft avoidance
    if (player) {
      const pDx = player.x - ped.x;
      const pDy = player.y - ped.y;
      const pDist = Math.hypot(pDx, pDy);
      if (pDist < 0.60 && pDist > 0.001) {
        const push = (0.60 - pDist) * 0.4;
        ped.x -= (pDx / pDist) * push;
        ped.y -= (pDy / pDist) * push;
      }
    }
  }
}

export function createPedestrians(scene) {
  const pedestrians = [];

  function addPedestrian(path, archIndex, startIdx = 0, isLoop = false) {
    const arch = PEDESTRIAN_ARCHETYPES[archIndex % PEDESTRIAN_ARCHETYPES.length];
    const startPt = path[startIdx % path.length];
    const nextPt = path[(startIdx + 1) % path.length];
    const initAngle = Math.atan2(nextPt.y - startPt.y, nextPt.x - startPt.x);

    const ped = new PedestrianEntity({
      ...arch,
      x: startPt.x,
      y: startPt.y,
      angle: initAngle,
      path: path,
      isLoop: isLoop,
      pathDir: 1,
      waypointIdx: (startIdx + 1) % path.length,
      walkCycle: Math.random() * Math.PI * 2,
      seed: Math.random() * 100
    });

    scene.add(ped);
    pedestrians.push(ped);
  }

  //central plazas
  const pathTimesSquareLoop = [{ x: 36.8, y: 17.8 }, { x: 36.8, y: 36.8 }, { x: 43.8, y: 36.8 }, { x: 43.8, y: 17.8 }];
  const pathEmpirePlaza = [{ x: 17.8, y: 36.8 }, { x: 36.8, y: 36.8 }, { x: 36.8, y: 17.8 }, { x: 17.8, y: 17.8 }];
  const pathArasakaPlaza = [{ x: 43.8, y: 36.8 }, { x: 61.8, y: 36.8 }, { x: 61.8, y: 17.8 }, { x: 43.8, y: 17.8 }];
  const pathQuantumPlaza = [{ x: 17.8, y: 43.8 }, { x: 36.8, y: 43.8 }, { x: 36.8, y: 61.8 }, { x: 17.8, y: 61.8 }];
  const pathCafePlaza = [{ x: 27.0, y: 10.0 }, { x: 35.0, y: 10.0 }, { x: 35.0, y: 11.2 }, { x: 27.0, y: 11.2 }];

  //sidewalk promenades
  const pathBwyNorth = [{ x: 5.8, y: 36.8 }, { x: 11.2, y: 36.8 }, { x: 17.8, y: 36.8 }, { x: 36.8, y: 36.8 }, { x: 43.8, y: 36.8 }, { x: 61.8, y: 36.8 }, { x: 68.8, y: 36.8 }, { x: 74.2, y: 36.8 }];
  const pathBwySouth = [{ x: 74.2, y: 43.8 }, { x: 68.8, y: 43.8 }, { x: 61.8, y: 43.8 }, { x: 43.8, y: 43.8 }, { x: 36.8, y: 43.8 }, { x: 17.8, y: 43.8 }, { x: 11.2, y: 43.8 }, { x: 5.8, y: 43.8 }];

  const path5thAveWest = [{ x: 36.8, y: 5.8 }, { x: 36.8, y: 11.2 }, { x: 36.8, y: 17.8 }, { x: 36.8, y: 36.8 }, { x: 36.8, y: 43.8 }, { x: 36.8, y: 61.8 }, { x: 36.8, y: 68.8 }, { x: 36.8, y: 74.2 }];
  const path5thAveEast = [{ x: 43.8, y: 74.2 }, { x: 43.8, y: 68.8 }, { x: 43.8, y: 61.8 }, { x: 43.8, y: 43.8 }, { x: 43.8, y: 36.8 }, { x: 43.8, y: 17.8 }, { x: 43.8, y: 11.2 }, { x: 43.8, y: 5.8 }];

  addPedestrian(pathTimesSquareLoop, 0, 0, true);
  addPedestrian(pathTimesSquareLoop, 1, 2, true);
  addPedestrian(pathEmpirePlaza, 2, 0, true);
  addPedestrian(pathEmpirePlaza, 3, 2, true);
  addPedestrian(pathArasakaPlaza, 4, 1, true);
  addPedestrian(pathQuantumPlaza, 0, 1, true);
  addPedestrian(pathCafePlaza, 1, 0, true);
  addPedestrian(pathBwyNorth, 2, 1, false);
  addPedestrian(pathBwySouth, 3, 2, false);
  addPedestrian(path5thAveWest, 4, 2, false);
  addPedestrian(path5thAveEast, 5, 1, false);

  return pedestrians;
}
