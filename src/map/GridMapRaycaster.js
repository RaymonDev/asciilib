//2.5d dda grid raycaster for multi-tiered buildings and inverse perspective floor/ceiling
export class GridMapRaycaster {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || 85.0;
  }

  render(scene, camera, blitter, options = {}) {
    if (!scene) throw new Error('[asciilib] GridMapRaycaster.render: scene parameter is required');
    if (!camera) throw new Error('[asciilib] GridMapRaycaster.render: camera parameter is required');
    if (!blitter) throw new Error('[asciilib] GridMapRaycaster.render: blitter parameter is required');
    if (!scene.map) throw new Error('[asciilib] GridMapRaycaster.render: scene.map grid array is required');

    const cols = blitter.cols;
    const rows = blitter.rows;
    if (cols <= 0 || rows <= 0) return;

    const planar = camera.getPlanarVectors();
    const horizon = Math.floor(rows * 0.5 + camera.pitch * rows * 0.75);
    const wallShader = options.wallShader || null;
    const floorShader = options.floorShader || null;

    const map = scene.map;
    const mapSize = scene.mapSize;
    const buildingHeights = scene.buildingHeights;

    const rowStraightDist = new Float32Array(rows);
    for (let r = 0; r < rows; r++) {
      if (r > horizon) {
        rowStraightDist[r] = (camera.z * rows * camera.projectionScale) / (r - horizon);
      } else {
        rowStraightDist[r] = this.maxDepth;
      }
    }

    for (let col = 0; col < cols; col++) {
      const ray = camera.getRay(col, cols, planar);
      const cameraX = ray.cameraX;
      const rayDirX = ray.rayDirX;
      const rayDirY = ray.rayDirY;
      const cosAngle = ray.cosAngle;
      const sinAngle = ray.sinAngle;
      const cosOffset = ray.cosOffset;

      let mapX = Math.floor(camera.x);
      let mapY = Math.floor(camera.y);

      const deltaDistX = Math.abs(1.0 / cosAngle);
      const deltaDistY = Math.abs(1.0 / sinAngle);

      let stepX = cosAngle < 0 ? -1 : 1;
      let sideDistX = cosAngle < 0 ? (camera.x - mapX) * deltaDistX : (mapX + 1.0 - camera.x) * deltaDistX;

      let stepY = sinAngle < 0 ? -1 : 1;
      let sideDistY = sinAngle < 0 ? (camera.y - mapY) * deltaDistY : (mapY + 1.0 - camera.y) * deltaDistY;

      let side = 0;
      const tiers = [];
      let maxHSeen = 0;
      let steps = 0;

      while (steps < 120 && maxHSeen < 60.0) {
        steps++;
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }

        if (mapX < 0 || mapX >= mapSize || mapY < 0 || mapY >= mapSize) {
          break;
        }

        const tileIdx = mapY * mapSize + mapX;
        const tile = map[tileIdx];
        const cellH = buildingHeights ? buildingHeights[tileIdx] : 0;

        if (tile >= 10 && cellH > maxHSeen) {
          let hitDist;
          if (side === 0) {
            hitDist = (mapX - camera.x + (1 - stepX) / 2) / cosAngle;
          } else {
            hitDist = (mapY - camera.y + (1 - stepY) / 2) / sinAngle;
          }

          const worldHitU = (side === 0) ? (camera.y + hitDist * sinAngle) : (camera.x + hitDist * cosAngle);
          const corrDist = Math.max(0.1, hitDist * cosOffset);

          tiers.push({
            minZ: maxHSeen,
            maxZ: cellH,
            hitDist: hitDist,
            corrDist: corrDist,
            hitTile: tile,
            side: side,
            mapX: mapX,
            mapY: mapY,
            worldHitU: worldHitU,
            isFrontSouth: (side === 1 && stepY < 0),
            isWestFace: (side === 0 && stepX < 0),
            isEastFace: (side === 0 && stepX > 0)
          });

          maxHSeen = cellH;
        }
      }

      const hasHit = (tiers.length > 0);
      const firstTier = hasHit ? tiers[0] : null;
      const baseScreenH = hasHit ? (rows * camera.projectionScale / firstTier.corrDist) : 1;
      const baseWallBottom = hasHit ? Math.min(rows - 1, Math.ceil(horizon + (camera.z * baseScreenH))) : (rows - 1);

      //1. floor & streets
      const startFloorRow = Math.max(0, Math.min(rows, hasHit ? Math.max(horizon + 1, baseWallBottom + 1) : (horizon + 1)));

      for (let row = startFloorRow; row < rows; row++) {
        const straightDist = rowStraightDist[row];

        if (straightDist < this.maxDepth) {
          blitter.setDepth(col, row, straightDist);

          const floorX = camera.x + straightDist * rayDirX;
          const floorY = camera.y + straightDist * rayDirY;

          if (floorShader) {
            const shaded = floorShader({
              col,
              row,
              floorX,
              floorY,
              corrDist: straightDist,
              maxDepth: this.maxDepth,
              scene,
              camera
            });
            if (shaded) {
              blitter.drawOpaqueChar(col, row, shaded.char, shaded.color, shaded.alpha || 1.0, shaded.bg || '#000000');
            }
          }
        }
      }

      //2. multi-tier stepped walls with occlusion
      let topClip = rows;

      for (let ti = 0; ti < tiers.length; ti++) {
        const tier = tiers[ti];
        const tierScreenH = (rows * camera.projectionScale / tier.corrDist);
        const wallTop = Math.max(0, Math.floor(horizon - ((tier.maxZ - camera.z) * tierScreenH)));

        let drawStart, drawEnd;
        if (ti === 0) {
          const wallBottom = Math.min(rows - 1, Math.ceil(horizon + (camera.z * tierScreenH)));
          drawStart = wallTop;
          drawEnd = wallBottom;
          topClip = wallTop;
        } else {
          if (wallTop >= topClip) continue;
          drawStart = wallTop;
          drawEnd = topClip - 1;
          topClip = wallTop;
        }

        if (drawStart > drawEnd) continue;

        for (let row = drawStart; row <= drawEnd; row++) {
          blitter.setDepth(col, row, tier.corrDist);
          const worldZ = camera.z + (horizon - row) / tierScreenH;

          if (wallShader) {
            const shaded = wallShader({
              col,
              row,
              tileVal: tier.hitTile,
              mapX: tier.mapX,
              mapY: tier.mapY,
              side: tier.side,
              hitU: tier.worldHitU,
              hitWorldZ: worldZ,
              dist: tier.corrDist,
              maxDepth: this.maxDepth,
              isFrontSouth: tier.isFrontSouth,
              isWestFace: tier.isWestFace,
              isEastFace: tier.isEastFace,
              scene,
              camera
            });

            if (shaded) {
              blitter.drawOpaqueChar(col, row, shaded.char, shaded.color, shaded.alpha || 1.0, shaded.bg || '#000000');
            }
          }
        }

        if (drawStart < topClip) topClip = Math.max(0, drawStart);
        if (topClip <= 0) break;
      }
    }
  }

  renderFloors(scene, camera, blitter, options = {}) {
    this.render(scene, camera, blitter, options);
  }

  renderWalls(scene, camera, blitter, options = {}) {
    //handled directly in unified render pipeline
  }
}
