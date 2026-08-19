//street furniture prefabs: foliage trees, street lamps, and traffic signals
import { Entity } from '../primitives/Entity.js';
import { PointLight } from '../lighting/PointLight.js';
import {
  intersectRayCylinder,
  intersectRayEllipsoid,
  intersectRaySegmentDistance,
  intersectRayAABB
} from '../math/Intersection.js';

const PURE_ASCII_BARK = ['#', 'H', '|', 'I', '%', '&', '#', '8'];
const PURE_ASCII_LEAVES = ['@', '8', '0', '&', '%', '*', 'o', '#', 's', 'O'];

export class TreeEntity extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = 'tree';
    this.entityType = 'tree';
    this.isStatic = true;
    this.seed = options.seed || Math.random() * 100;

    const s1 = Math.sin(this.seed * 17.1);
    const s2 = Math.cos(this.seed * 23.3);
    const s3 = Math.sin(this.seed * 31.7);

    this.heightScale = 0.92 + (s1 + 1) * 0.10;
    this.widthScale = 0.88 + (s2 + 1) * 0.10;
    this.forkZ = 1.10 + (s3 + 1) * 0.08;
    this.topZ = this.forkZ + 1.95 * this.heightScale;
    this.boundingRadius = 1.6 * this.widthScale;

    function createBough(bx, by, bz, brXY, brZ, isCr) {
      return {
        x: bx,
        y: by,
        z: bz,
        radXY: brXY,
        radZ: brZ,
        isCrown: isCr
      };
    }

    this.boughs = [
      createBough(this.x + Math.cos(this.seed * 1.7) * 0.25 * this.widthScale, this.y + Math.sin(this.seed * 1.7) * 0.25 * this.widthScale, this.forkZ + 0.35 * this.heightScale, 0.38 * this.widthScale, 0.42 * this.heightScale, false),
      createBough(this.x + Math.cos(this.seed * 1.7 + 2.1) * 0.26 * this.widthScale, this.y + Math.sin(this.seed * 1.7 + 2.1) * 0.26 * this.widthScale, this.forkZ + 0.50 * this.heightScale, 0.40 * this.widthScale, 0.44 * this.heightScale, false),
      createBough(this.x + Math.cos(this.seed * 1.7 + 4.2) * 0.24 * this.widthScale, this.y + Math.sin(this.seed * 1.7 + 4.2) * 0.24 * this.widthScale, this.forkZ + 0.95 * this.heightScale, 0.42 * this.widthScale, 0.48 * this.heightScale, false),
      createBough(this.x + s1 * 0.04, this.y + s2 * 0.04, this.forkZ + 1.45 * this.heightScale, 0.35 * this.widthScale, 0.50 * this.heightScale, true)
    ];
  }

  render(camera, blitter, scene, planar, horizon) {
    const dx = this.x - camera.x;
    const dy = this.y - camera.y;
    const fwdDepth = dx * planar.cosAngle + dy * planar.sinAngle;
    if (fwdDepth <= 0.35 || fwdDepth > camera.far) return;

    const lateral = -dx * planar.sinAngle + dy * planar.cosAngle;
    const centerCol = (0.5 + (lateral / (fwdDepth * planar.halfFovTan)) * 0.5) * blitter.cols;

    const treeR = 0.85 * this.widthScale;
    const radCols = (treeR / (fwdDepth * planar.halfFovTan)) * (blitter.cols * 0.5);

    const minCol = Math.max(0, Math.floor(centerCol - radCols));
    const maxCol = Math.min(blitter.cols - 1, Math.ceil(centerCol + radCols));
    if (minCol > maxCol) return;

    const minDepth = Math.max(0.12, fwdDepth - treeR);
    const screenHNear = (blitter.rows * camera.projectionScale) / minDepth;
    const rowTop = Math.max(0, Math.floor(horizon - (this.topZ + 0.25 - camera.z) * screenHNear));
    const rowBottom = Math.min(blitter.rows - 1, Math.ceil(horizon - (0.0 - camera.z) * screenHNear));
    if (rowTop > rowBottom) return;

    const trunkR = 0.095;

    for (let col = minCol; col <= maxCol; col++) {
      const ray = camera.getRay(col, blitter.cols, planar);

      //trunk cylinder
      const vxP = this.x - camera.x;
      const vyP = this.y - camera.y;
      const tProjP = vxP * ray.cosAngle + vyP * ray.sinAngle;

      if (tProjP > 0.12) {
        const dPerpSqP = (vxP * vxP + vyP * vyP) - (tProjP * tProjP);
        if (dPerpSqP < trunkR * trunkR) {
          const dtTrunk = Math.sqrt(trunkR * trunkR - dPerpSqP);
          const hitDistTrunk = tProjP - dtTrunk;
          const corrDistTrunk = hitDistTrunk * ray.cosOffset;

          const trunkScreenH = (blitter.rows * camera.projectionScale / corrDistTrunk);
          const tRowTop = Math.max(0, Math.floor(horizon - (this.forkZ + 0.35 - camera.z) * trunkScreenH));
          const tRowBottom = Math.min(blitter.rows - 1, Math.ceil(horizon - (0.0 - camera.z) * trunkScreenH));

          const hitWorldX = camera.x + hitDistTrunk * ray.cosAngle;
          const hitWorldY = camera.y + hitDistTrunk * ray.sinAngle;
          const normAngle = Math.atan2(hitWorldY - this.y, hitWorldX - this.x);
          const sunDot = Math.cos(normAngle - (-Math.PI * 0.3));
          const depthAlpha = Math.max(0.70, 1 - (corrDistTrunk / camera.far));

          for (let row = tRowTop; row <= tRowBottom; row++) {
            if (corrDistTrunk >= blitter.getDepth(col, row)) continue;
            blitter.setDepth(col, row, corrDistTrunk);

            const worldZ = camera.z + (horizon - row) / trunkScreenH;
            const grainNoise = Math.sin(normAngle * 5.0 + worldZ * 8.0 + this.seed * 7.0);
            const barkIndex = Math.abs(Math.floor(grainNoise * 4.0 + 4.0)) % PURE_ASCII_BARK.length;
            const ch = PURE_ASCII_BARK[barkIndex];
            const color = (sunDot > 0.2) ? '#744729' : '#472714';
            const trunkBg = (sunDot > 0.2) ? '#2a1808' : '#1a0e06';

            blitter.drawOpaqueChar(col, row, ch, color, depthAlpha, trunkBg);
          }
        }
      }

      //canopy boughs
      for (let row = rowTop; row <= rowBottom; row++) {
        const Dz = (horizon - row) / (blitter.rows * camera.projectionScale);

        let closestTHit = Infinity;
        let bestBough = null;

        for (let b = 0; b < this.boughs.length; b++) {
          const bough = this.boughs[b];
          const hit = intersectRayEllipsoid(camera.x, camera.y, camera.z, ray.cosAngle, ray.sinAngle, Dz, bough.x, bough.y, bough.z, bough.radXY, bough.radZ);
          if (hit.hit && hit.t > 0.12 && hit.t < closestTHit) {
            closestTHit = hit.t;
            bestBough = bough;
          }
        }

        if (bestBough === null || closestTHit === Infinity) continue;

        const corrDist = closestTHit * ray.cosOffset;
        if (corrDist >= blitter.getDepth(col, row)) continue;
        blitter.setDepth(col, row, corrDist);

        const hitX = camera.x + closestTHit * ray.cosAngle;
        const hitY = camera.y + closestTHit * ray.sinAngle;
        const hitZ = camera.z + closestTHit * Dz;

        const nx = (hitX - bestBough.x) / bestBough.radXY;
        const ny = (hitY - bestBough.y) / bestBough.radXY;
        const nz = (hitZ - bestBough.z) / bestBough.radZ;

        const lobe = 0.10 * Math.sin(nx * 5.0 + hitZ * 7.0 + this.seed * 13.0);
        const sunDot = (nx + lobe) * 0.40 - (ny - lobe) * 0.65 + nz * 0.60;
        const depthAlpha = Math.max(0.60, 1 - (corrDist / camera.far));

        const texNoise = Math.sin(col * 9.1 + row * 15.7 + this.seed * 23.0);
        const texIdx = Math.abs(Math.floor((texNoise + 1.0) * 5.0)) % PURE_ASCII_LEAVES.length;
        const ch = PURE_ASCII_LEAVES[texIdx];
        const color = (sunDot > 0.20) ? '#2ed573' : ((sunDot > -0.25) ? '#1fb559' : '#137537');
        const leafBg = (sunDot > 0.20) ? '#0a2e15' : ((sunDot > -0.25) ? '#071f0e' : '#041408');

        blitter.drawOpaqueChar(col, row, ch, color, depthAlpha, leafBg);
      }
    }
  }
}

export class StreetLightEntity extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = 'lamp';
    this.entityType = 'lamp';
    this.isStatic = true;
    this.headX = options.headX || (this.x + 1.0);
    this.headY = options.headY || this.y;
    this.boundingRadius = 1.8;

    //attach warm point light at lantern position
    this.light = new PointLight({
      x: this.headX,
      y: this.headY,
      z: 2.85,
      color: options.lightColor || '#ffeaa7',
      radius: options.lightRadius !== undefined ? options.lightRadius : 9.0,
      intensity: options.lightIntensity !== undefined ? options.lightIntensity : 1.1,
      decay: options.lightDecay !== undefined ? options.lightDecay : 1.0
    });
  }

  render(camera, blitter, scene, planar, horizon) {
    const dx = this.x - camera.x;
    const dy = this.y - camera.y;
    const fwdDepth = dx * planar.cosAngle + dy * planar.sinAngle;
    if (fwdDepth <= 0.15 || fwdDepth > camera.far) return;

    const lateral = -dx * planar.sinAngle + dy * planar.cosAngle;
    const centerCol = (0.5 + (lateral / (fwdDepth * planar.halfFovTan)) * 0.5) * blitter.cols;

    const lampR = 1.35;
    const radCols = (lampR / (fwdDepth * planar.halfFovTan)) * (blitter.cols * 0.5);

    const minCol = Math.max(0, Math.floor(centerCol - radCols));
    const maxCol = Math.min(blitter.cols - 1, Math.ceil(centerCol + radCols));
    if (minCol > maxCol) return;

    const minDepth = Math.max(0.12, fwdDepth - lampR);
    const screenHNear = (blitter.rows * camera.projectionScale) / minDepth;
    const rowTop = Math.max(0, Math.floor(horizon - (3.10 - camera.z) * screenHNear));
    const rowBottom = Math.min(blitter.rows - 1, Math.ceil(horizon - (0.0 - camera.z) * screenHNear));
    if (rowTop > rowBottom) return;

    const poleR = 0.065;
    const headRadXY = 0.14;
    const headRadZ = 0.15;

    const segAx = this.x;
    const segAy = this.y;
    const segAz = 2.85;
    const segBx = this.headX;
    const segBy = this.headY;
    const segBz = 2.85;

    for (let col = minCol; col <= maxCol; col++) {
      const ray = camera.getRay(col, blitter.cols, planar);

      //pole cylinder
      const vxP = this.x - camera.x;
      const vyP = this.y - camera.y;
      const tProjP = vxP * ray.cosAngle + vyP * ray.sinAngle;

      if (tProjP > 0.12) {
        const dPerpSqP = (vxP * vxP + vyP * vyP) - (tProjP * tProjP);
        if (dPerpSqP < poleR * poleR) {
          const dtPole = Math.sqrt(poleR * poleR - dPerpSqP);
          const hitDistPole = tProjP - dtPole;
          const corrDistPole = hitDistPole * ray.cosOffset;

          const poleScreenH = (blitter.rows * camera.projectionScale / corrDistPole);
          const pRowTop = Math.max(0, Math.floor(horizon - (2.85 - camera.z) * poleScreenH));
          const pRowBottom = Math.min(blitter.rows - 1, Math.ceil(horizon - (0.0 - camera.z) * poleScreenH));
          const chordFrac = Math.sqrt(dPerpSqP) / poleR;
          const depthAlpha = Math.max(0.75, 1 - (corrDistPole / camera.far));

          for (let row = pRowTop; row <= pRowBottom; row++) {
            if (corrDistPole >= blitter.getDepth(col, row)) continue;
            blitter.setDepth(col, row, corrDistPole);

            const worldZ = camera.z + (horizon - row) / poleScreenH;
            if (worldZ < 0.35) {
              const ch = (chordFrac < 0.5) ? '#' : 'H';
              blitter.drawOpaqueChar(col, row, ch, '#334155', depthAlpha, '#0a0f1a');
            } else {
              const ch = '|';
              const color = (chordFrac < 0.4) ? '#64748b' : ((chordFrac < 0.75) ? '#475569' : '#334155');
              blitter.drawOpaqueChar(col, row, ch, color, depthAlpha, '#0a0f1a');
            }
          }
        }
      }

      //arm & lantern head
      for (let row = rowTop; row <= rowBottom; row++) {
        const Dz = (horizon - row) / (blitter.rows * camera.projectionScale);

        const armHit = intersectRaySegmentDistance(camera.x, camera.y, camera.z, ray.cosAngle, ray.sinAngle, Dz, segAx, segAy, segAz, segBx, segBy, segBz, 0.003);
        if (armHit.hit && armHit.t > 0.12) {
          const corrDistArm = armHit.t * ray.cosOffset;
          if (corrDistArm < blitter.getDepth(col, row)) {
            blitter.setDepth(col, row, corrDistArm);
            const depthAlpha = Math.max(0.75, 1 - (corrDistArm / camera.far));
            blitter.drawOpaqueChar(col, row, '=', '#64748b', depthAlpha, '#0a0f1a');
          }
        }

        const headHit = intersectRayEllipsoid(camera.x, camera.y, camera.z, ray.cosAngle, ray.sinAngle, Dz, this.headX, this.headY, 2.85, headRadXY, headRadZ);
        if (headHit.hit && headHit.t > 0.12) {
          const hCorrDist = headHit.t * ray.cosOffset;
          if (hCorrDist < blitter.getDepth(col, row)) {
            blitter.setDepth(col, row, hCorrDist);
            const hitZ = headHit.hitZ;
            const depthAlpha = Math.max(0.85, 1 - (hCorrDist / camera.far));
            const ch = (hitZ >= 2.88) ? '^' : '*';
            const color = (hitZ >= 2.88) ? '#475569' : '#fff275';
            blitter.drawOpaqueChar(col, row, ch, color, depthAlpha, '#0a0f1a');
          }
        }
      }
    }
  }
}

export class TrafficLightEntity extends Entity {
  constructor(options = {}) {
    super(options);
    this.type = 'trafficLight';
    this.entityType = 'trafficLight';
    this.isStatic = true;
    this.headX = options.headX || (this.x + 0.82);
    this.headY = options.headY || this.y;
    this.facingDir = options.facingDir || 'north';
    this.phaseGroup = options.phaseGroup || 'NS';
    this.activeState = options.activeState || (this.phaseGroup === 'EW' ? 'green' : 'red');
    this.boundingRadius = 1.8;
  }

  render(camera, blitter, scene, planar, horizon) {
    const dx = this.x - camera.x;
    const dy = this.y - camera.y;
    const fwdDepth = dx * planar.cosAngle + dy * planar.sinAngle;
    if (fwdDepth <= 0.05 || fwdDepth > camera.far) return;

    const lateral = -dx * planar.sinAngle + dy * planar.cosAngle;
    const centerCol = (0.5 + (lateral / (fwdDepth * planar.halfFovTan)) * 0.5) * blitter.cols;

    const poleR = 0.07;
    const radCols = (poleR / (fwdDepth * planar.halfFovTan)) * (blitter.cols * 0.5);

    const minCol = Math.max(0, Math.floor(centerCol - radCols));
    const maxCol = Math.min(blitter.cols - 1, Math.ceil(centerCol + radCols));

    //render pole
    if (minCol <= maxCol) {
      for (let col = minCol; col <= maxCol; col++) {
        const ray = camera.getRay(col, blitter.cols, planar);
        const vxP = this.x - camera.x;
        const vyP = this.y - camera.y;
        const tProjP = vxP * ray.cosAngle + vyP * ray.sinAngle;

        if (tProjP > 0.05) {
          const dPerpSqP = (vxP * vxP + vyP * vyP) - (tProjP * tProjP);
          if (dPerpSqP < poleR * poleR) {
            const dtPole = Math.sqrt(poleR * poleR - dPerpSqP);
            const hitDistPole = tProjP - dtPole;
            const corrDistPole = hitDistPole * ray.cosOffset;

            const poleScreenH = (blitter.rows * camera.projectionScale / corrDistPole);
            const pRowTop = Math.max(0, Math.floor(horizon - (2.70 - camera.z) * poleScreenH));
            const pRowBottom = Math.min(blitter.rows - 1, Math.ceil(horizon - (0.0 - camera.z) * poleScreenH));
            const depthAlpha = Math.max(0.75, 1 - (corrDistPole / camera.far));

            for (let row = pRowTop; row <= pRowBottom; row++) {
              if (corrDistPole >= blitter.getDepth(col, row)) continue;
              blitter.setDepth(col, row, corrDistPole);
              blitter.drawOpaqueChar(col, row, '|', '#64748b', depthAlpha, '#0f172a');
            }
          }
        }
      }
    }

    //render cantilever arm & 3-lens signal head
    const dxHead = this.headX - camera.x;
    const dyHead = this.headY - camera.y;
    const fwdDepthHead = dxHead * planar.cosAngle + dyHead * planar.sinAngle;

    if (fwdDepthHead > 0.05 && fwdDepthHead <= camera.far) {
      const lateralHead = -dxHead * planar.sinAngle + dyHead * planar.cosAngle;
      const centerColHead = (0.5 + (lateralHead / (Math.max(0.08, fwdDepthHead) * planar.halfFovTan)) * 0.5) * blitter.cols;

      const headBoundR = 0.95;
      const radColsHead = (headBoundR / (Math.max(0.08, fwdDepthHead) * planar.halfFovTan)) * (blitter.cols * 0.5);

      const minColH = (fwdDepthHead <= 0.20) ? 0 : Math.max(0, Math.floor(centerColHead - radColsHead));
      const maxColH = (fwdDepthHead <= 0.20) ? (blitter.cols - 1) : Math.min(blitter.cols - 1, Math.ceil(centerColHead + radColsHead));

      const minDepthH = Math.max(0.05, fwdDepthHead - headBoundR);
      const maxDepthH = fwdDepthHead + headBoundR;
      const hr1 = horizon - (2.85 - camera.z) * (blitter.rows * camera.projectionScale) / minDepthH;
      const hr2 = horizon - (2.85 - camera.z) * (blitter.rows * camera.projectionScale) / maxDepthH;
      const hr3 = horizon - (1.70 - camera.z) * (blitter.rows * camera.projectionScale) / minDepthH;
      const hr4 = horizon - (1.70 - camera.z) * (blitter.rows * camera.projectionScale) / maxDepthH;

      const hRowTop = Math.max(0, Math.floor(Math.min(hr1, hr2, hr3, hr4)));
      const hRowBottom = Math.min(blitter.rows - 1, Math.ceil(Math.max(hr1, hr2, hr3, hr4)));

      if (minColH <= maxColH && hRowTop <= hRowBottom) {
        const segAx = this.x;
        const segAy = this.y;
        const segAz = 2.70;
        const segBx = this.headX;
        const segBy = this.headY;
        const segBz = 2.70;

        const isAlongX = (this.facingDir === 'east' || this.facingDir === 'west');
        const halfW = 0.18;
        const halfD = 0.09;
        const boxMinX = this.headX - (isAlongX ? halfD : halfW);
        const boxMaxX = this.headX + (isAlongX ? halfD : halfW);
        const boxMinY = this.headY - (isAlongX ? halfW : halfD);
        const boxMaxY = this.headY + (isAlongX ? halfW : halfD);
        const boxMinZ = 1.80;
        const boxMaxZ = 2.65;

        for (let col = minColH; col <= maxColH; col++) {
          const ray = camera.getRay(col, blitter.cols, planar);

          for (let row = hRowTop; row <= hRowBottom; row++) {
            const Dz = (horizon - row) / (blitter.rows * camera.projectionScale);

            //arm
            const armHit = intersectRaySegmentDistance(camera.x, camera.y, camera.z, ray.cosAngle, ray.sinAngle, Dz, segAx, segAy, segAz, segBx, segBy, segBz, 0.0035);
            if (armHit.hit && armHit.t > 0.05) {
              const corrDistArm = armHit.t * ray.cosOffset;
              if (corrDistArm < blitter.getDepth(col, row)) {
                blitter.setDepth(col, row, corrDistArm);
                const depthAlpha = Math.max(0.75, 1 - (corrDistArm / camera.far));
                blitter.drawOpaqueChar(col, row, '=', '#475569', depthAlpha, '#0a0f1a');
              }
            }

            //signal box
            const boxHit = intersectRayAABB(camera.x, camera.y, camera.z, ray.cosAngle, ray.sinAngle, Dz, boxMinX, boxMaxX, boxMinY, boxMaxY, boxMinZ, boxMaxZ);
            if (boxHit.hit && boxHit.t > 0.05) {
              const corrDist = boxHit.t * ray.cosOffset;
              if (corrDist < blitter.getDepth(col, row)) {
                blitter.setDepth(col, row, corrDist);

                const hitWorldX = boxHit.hitX;
                const hitWorldY = boxHit.hitY;
                const hitWorldZ = boxHit.hitZ;

                let isFrontFace = false;
                if (this.facingDir === 'west') {
                  isFrontFace = (ray.cosAngle > 0 && Math.abs(boxHit.tEnter - boxHit.tminX) < 1e-3);
                } else if (this.facingDir === 'east') {
                  isFrontFace = (ray.cosAngle < 0 && Math.abs(boxHit.tEnter - boxHit.tminX) < 1e-3);
                } else if (this.facingDir === 'north') {
                  isFrontFace = (ray.sinAngle > 0 && Math.abs(boxHit.tEnter - boxHit.tminY) < 1e-3);
                } else if (this.facingDir === 'south') {
                  isFrontFace = (ray.sinAngle < 0 && Math.abs(boxHit.tEnter - boxHit.tminY) < 1e-3);
                }

                let ch = '#';
                let color = '#d97706';
                let cellBg = '#0f172a';

                if (isFrontFace) {
                  const localLateral = isAlongX ? (hitWorldY - this.headY) : (hitWorldX - this.headX);

                  //red lens
                  if (hitWorldZ >= 2.38 && hitWorldZ <= 2.64) {
                    const dCenterSq = localLateral * localLateral + Math.pow(hitWorldZ - 2.51, 2);
                    if (dCenterSq < 0.011) {
                      ch = (dCenterSq < 0.0035) ? '*' : 'O';
                      color = (this.activeState === 'red') ? '#ff0033' : '#7f1d1d';
                      cellBg = (this.activeState === 'red') ? '#450a0a' : '#18181b';
                    } else if (hitWorldZ >= 2.58) {
                      ch = '^';
                      color = '#334155';
                      cellBg = '#0f172a';
                    } else {
                      ch = '|';
                      color = '#b45309';
                      cellBg = '#0f172a';
                    }
                  }
                  //yellow lens
                  else if (hitWorldZ >= 2.10 && hitWorldZ < 2.38) {
                    const dCenterSq = localLateral * localLateral + Math.pow(hitWorldZ - 2.24, 2);
                    if (dCenterSq < 0.011) {
                      ch = (dCenterSq < 0.0035) ? '*' : 'O';
                      color = (this.activeState === 'yellow') ? '#ffcc00' : '#78350f';
                      cellBg = (this.activeState === 'yellow') ? '#451a03' : '#18181b';
                    } else if (hitWorldZ >= 2.32) {
                      ch = '^';
                      color = '#334155';
                      cellBg = '#0f172a';
                    } else {
                      ch = '|';
                      color = '#b45309';
                      cellBg = '#0f172a';
                    }
                  }
                  //green lens
                  else if (hitWorldZ >= 1.80 && hitWorldZ < 2.10) {
                    const dCenterSq = localLateral * localLateral + Math.pow(hitWorldZ - 1.95, 2);
                    if (dCenterSq < 0.011) {
                      ch = (dCenterSq < 0.0035) ? '*' : 'O';
                      color = (this.activeState === 'green') ? '#00ff88' : '#064e3b';
                      cellBg = (this.activeState === 'green') ? '#064e3b' : '#18181b';
                    } else if (hitWorldZ >= 2.04) {
                      ch = '^';
                      color = '#334155';
                      cellBg = '#0f172a';
                    } else {
                      ch = '|';
                      color = '#b45309';
                      cellBg = '#0f172a';
                    }
                  } else {
                    ch = '=';
                    color = '#b45309';
                    cellBg = '#0f172a';
                  }
                } else {
                  //back and sides
                  const isSide = isAlongX ? (Math.abs(hitWorldX - this.headX) > halfD * 0.75) : (Math.abs(hitWorldY - this.headY) > halfD * 0.75);
                  if (isSide) {
                    ch = '|';
                    color = '#b45309';
                    cellBg = '#0f172a';
                  } else {
                    ch = '#';
                    color = '#78350f';
                    cellBg = '#0a0f18';
                  }
                }

                const depthAlpha = Math.max(0.85, 1 - (corrDist / camera.far));
                blitter.drawOpaqueChar(col, row, ch, color, depthAlpha, cellBg);
              }
            }
          }
        }
      }
    }
  }
}

export function createTree(options = {}) {
  return new TreeEntity({
    x: options.x || 0.0,
    y: options.y || 0.0,
    seed: options.seed || Math.random() * 100,
    ...options
  });
}

export function createStreetLamp(options = {}) {
  const armLen = options.armLength || 0.38;
  const dirX = options.armDirX !== undefined ? options.armDirX : 0;
  const dirY = options.armDirY !== undefined ? options.armDirY : 1;

  return new StreetLightEntity({
    x: options.x || 0.0,
    y: options.y || 0.0,
    headX: options.headX || (options.x + dirX * armLen),
    headY: options.headY || (options.y + dirY * armLen),
    ...options
  });
}

export function createTrafficLight(options = {}) {
  const armLen = options.armLength || 0.82;
  const dirX = options.armDirX !== undefined ? options.armDirX : 1;
  const dirY = options.armDirY !== undefined ? options.armDirY : 0;

  return new TrafficLightEntity({
    x: options.x || 0.0,
    y: options.y || 0.0,
    headX: options.headX || (options.x + dirX * armLen),
    headY: options.headY || (options.y + dirY * armLen),
    facingDir: options.facingDir || 'north',
    phaseGroup: options.phaseGroup || 'NS',
    activeState: options.activeState || 'red',
    ...options
  });
}

export function createStreetFurniture(scene) {
  const lights = [];
  const treeLocs = [
    { x: 26.5, y: 10.5 }, { x: 30.5, y: 10.5 }, { x: 34.5, y: 10.5 },
    { x: 10.5, y: 26.5 }, { x: 10.5, y: 30.5 }, { x: 10.5, y: 34.5 }
  ];
  treeLocs.forEach(t => scene.add(createTree(t)));

  const lampLocs = [
    { x: 18.0, y: 18.0, armDirX: 0, armDirY: 1 },
    { x: 43.0, y: 18.0, armDirX: 0, armDirY: 1 }
  ];
  lampLocs.forEach(l => scene.add(createStreetLamp(l)));

  const tl = createTrafficLight({ x: 36.8, y: 36.8, facingDir: 'north', phaseGroup: 'NS' });
  scene.add(tl);
  lights.push(tl);

  return lights;
}

export { StreetLightEntity as StreetLampEntity };
