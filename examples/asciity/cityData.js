//city layout, map heightmaps, and procedural world structure
export const MAP_SIZE = 80;

export const EW_ROADS = [
  { y1: 0, y2: 4 },
  { y1: 12, y2: 16 },
  { y1: 38, y2: 42 },
  { y1: 63, y2: 67 },
  { y1: 75, y2: 79 }
];

export const NS_ROADS = [
  { x1: 0, x2: 4 },
  { x1: 12, x2: 16 },
  { x1: 38, x2: 42 },
  { x1: 63, x2: 67 },
  { x1: 75, x2: 79 }
];

export const MANHOLES = [
  { x: 39.2, y: 34.0 }, //5th ave north
  { x: 41.8, y: 48.0 }, //5th ave south
  { x: 32.0, y: 39.2 }, //broadway west
  { x: 49.0, y: 41.8 }, //broadway east
  { x: 14.5, y: 25.0 }, //6th ave midtown
  { x: 65.5, y: 25.0 }, //3rd ave east
  { x: 25.0, y: 14.5 }, //42nd st uptown
  { x: 50.0, y: 65.5 }  //wall st downtown
];

export function isMetropolisCrosswalk(floorX, floorY) {
  for (let i = 0; i < NS_ROADS.length; i++) {
    const ns = NS_ROADS[i];
    const roadXMin = ns.x1;
    const roadXMax = ns.x2 + 1.0;

    for (let j = 0; j < EW_ROADS.length; j++) {
      const ew = EW_ROADS[j];
      const roadYMin = ew.y1;
      const roadYMax = ew.y2 + 1.0;

      //west
      if (floorX >= roadXMin - 1.6 && floorX <= roadXMin && floorY >= roadYMin && floorY <= roadYMax) return { isVert: true };
      //east
      if (floorX >= roadXMax && floorX <= roadXMax + 1.6 && floorY >= roadYMin && floorY <= roadYMax) return { isVert: true };
      //north
      if (floorY >= roadYMin - 1.6 && floorY <= roadYMin && floorX >= roadXMin && floorX <= roadXMax) return { isVert: false };
      //south
      if (floorY >= roadYMax && floorY <= roadYMax + 1.6 && floorX >= roadXMin && floorX <= roadXMax) return { isVert: false };
    }
  }
  return null;
}

export function getManholeDetails(floorX, floorY) {
  for (let m = 0; m < MANHOLES.length; m++) {
    const mh = MANHOLES[m];
    const dx = floorX - mh.x;
    const dy = floorY - mh.y;
    const distSq = dx * dx + dy * dy;
    const r = 0.28;
    if (distSq <= r * r) {
      const d = Math.sqrt(distSq);
      if (d > 0.21) {
        return {
          ch: (Math.abs(dx) > Math.abs(dy)) ? '|' : '=',
          color: '#64748b',
          bg: '#1e293b'
        };
      } else if (d > 0.10) {
        const pat = (Math.floor(floorX * 10.0) + Math.floor(floorY * 10.0)) % 2;
        return {
          ch: pat === 0 ? '#' : '%',
          color: '#475569',
          bg: '#0f172a'
        };
      } else {
        return {
          ch: '*',
          color: '#94a3b8',
          bg: '#0f172a'
        };
      }
    }
  }
  return null;
}

export function getIntersections() {
  const list = [];
  for (let r = 0; r < EW_ROADS.length; r++) {
    const ew = EW_ROADS[r];
    for (let c = 0; c < NS_ROADS.length; c++) {
      const ns = NS_ROADS[c];
      list.push({
        xMin: ns.x1,
        xMax: ns.x2,
        yMin: ew.y1,
        yMax: ew.y2,
        phaseGroup: (r + c) % 2 === 0 ? 'EW' : 'NS'
      });
    }
  }
  return list;
}

export function buildCityGrid() {
  const map = new Uint8Array(MAP_SIZE * MAP_SIZE);
  const buildingHeights = new Float32Array(MAP_SIZE * MAP_SIZE);
  map.fill(1); //sidewalk default

  //roads
  for (let r = 0; r < EW_ROADS.length; r++) {
    const road = EW_ROADS[r];
    for (let y = road.y1; y <= road.y2; y++) {
      for (let x = 0; x < MAP_SIZE; x++) map[y * MAP_SIZE + x] = 0;
    }
  }
  for (let c = 0; c < NS_ROADS.length; c++) {
    const road = NS_ROADS[c];
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = road.x1; x <= road.x2; x++) map[y * MAP_SIZE + x] = 0;
    }
  }

  function setBlock(x1, x2, y1, y2, tile, h) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const idx = y * MAP_SIZE + x;
        map[idx] = tile;
        buildingHeights[idx] = h;
      }
    }
  }

  //16 architectural blocks with setbacks
  //row 1: north district
  setBlock(7, 9, 7, 9, 18, 9.0); //block 1: brick townhouses
  setBlock(19, 35, 7, 9, 16, 6.5); //block 2: ramen diner & courtyard cafe
  setBlock(19, 26, 9, 10, 16, 6.5);
  setBlock(45, 59, 7, 9, 17, 7.5); //block 3: clinic & tech mart
  setBlock(53, 59, 9, 10, 17, 7.5);
  setBlock(70, 72, 7, 9, 18, 9.0); //block 4: brownstones

  //row 2: midtown
  setBlock(7, 9, 19, 35, 15, 8.0); //block 5: arcade megaplex
  setBlock(7, 9, 23, 31, 15, 18.0);
  setBlock(19, 35, 19, 35, 10, 14.0); //block 6: empire supertall (4-tier setbacks)
  setBlock(21, 33, 21, 33, 10, 28.0);
  setBlock(23, 31, 23, 31, 10, 42.0);
  setBlock(25, 29, 25, 29, 10, 50.0);
  setBlock(26, 28, 26, 28, 10, 56.0);
  setBlock(45, 59, 19, 35, 11, 10.0); //block 7: arasaka monolith
  setBlock(47, 57, 21, 33, 11, 52.0);
  setBlock(70, 72, 19, 35, 13, 14.0); //block 8: metropolis hotel & lofts
  setBlock(70, 72, 23, 31, 13, 24.0);

  //row 3: financial & tech district
  setBlock(7, 9, 45, 59, 14, 16.0); //block 9: net-sec citadel
  setBlock(7, 9, 48, 56, 14, 26.0);
  setBlock(19, 24, 45, 59, 12, 46.0); //block 10: quantum twin towers & skybridge
  setBlock(30, 35, 45, 59, 12, 46.0);
  setBlock(25, 29, 50, 54, 12, 28.0);
  setBlock(45, 59, 45, 59, 13, 12.0); //block 11: lofts & nightclub
  setBlock(47, 57, 47, 57, 13, 24.0);
  setBlock(70, 72, 45, 59, 16, 6.5);  //block 12: ramen alley

  //row 4: south district
  setBlock(7, 9, 70, 72, 18, 9.0);   //block 13: townhouses
  setBlock(19, 35, 70, 72, 17, 7.5);  //block 14: tech mart
  setBlock(45, 59, 70, 72, 16, 6.5);  //block 15: diner
  setBlock(70, 72, 70, 72, 18, 9.0);  //block 16: walk-ups

  return { map, buildingHeights };
}
