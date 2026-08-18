// -------------------------------------------------------------------------
// 1. engine constants and manhattan grid setup
// -------------------------------------------------------------------------
const MAP_SIZE = 80;
let FOV = (85 * Math.PI) / 180;
const PROJECTION_SCALE = 0.60;
const MAX_DEPTH = 85.0;

const DEFAULT_CONFIG = {
  traffic: true,
  particles: true,
  showHud: false,
  showCrosshair: true,
  playerHeight: 1.00,
  cameraFov: 70,
  mouseSens: 1.0
};

const config = { ...DEFAULT_CONFIG };

function loadSavedConfig() {
  try {
    const saved = localStorage.getItem('asciilib_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(config, parsed);
    }
  } catch (e) { }
}

function saveConfig() {
  try {
    localStorage.setItem('asciilib_config', JSON.stringify(config));
  } catch (e) { }
}

loadSavedConfig();

let CHAR_WIDTH = 7;
let CHAR_HEIGHT = 10;
let RENDER_COLS = 160;
let RENDER_ROWS = 90;

const map = new Uint8Array(MAP_SIZE * MAP_SIZE);
const buildingHeights = new Float32Array(MAP_SIZE * MAP_SIZE);

//3d scene objects
const trees = [];
const streetLights = [];
const trafficLights = [];
const vehicles = [];
const pedestrians = [];
const particles = [];

//2d spatial hash grid for fast frustum culling and collision queries
const SPATIAL_CELL_SIZE = 8.0;
const SPATIAL_GRID_DIM = Math.ceil(MAP_SIZE / SPATIAL_CELL_SIZE);

class SpatialHashGrid {
  constructor(cellDim = SPATIAL_GRID_DIM) {
    this.dim = cellDim;
    this.cells = new Array(cellDim * cellDim);
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = [];
    }
    this.queryToken = 0;
  }

  clear() {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].length = 0;
    }
  }

  insert(entity, radius = 0.5) {
    const x = entity.x;
    const y = entity.y;
    const minCx = Math.max(0, Math.floor((x - radius) / SPATIAL_CELL_SIZE));
    const maxCx = Math.min(this.dim - 1, Math.floor((x + radius) / SPATIAL_CELL_SIZE));
    const minCy = Math.max(0, Math.floor((y - radius) / SPATIAL_CELL_SIZE));
    const maxCy = Math.min(this.dim - 1, Math.floor((y + radius) / SPATIAL_CELL_SIZE));

    for (let cy = minCy; cy <= maxCy; cy++) {
      const rowOffset = cy * this.dim;
      for (let cx = minCx; cx <= maxCx; cx++) {
        this.cells[rowOffset + cx].push(entity);
      }
    }
  }

  queryAABB(minX, minY, maxX, maxY, outList = []) {
    outList.length = 0;
    this.queryToken++;
    const token = this.queryToken;

    const minCx = Math.max(0, Math.floor(minX / SPATIAL_CELL_SIZE));
    const maxCx = Math.min(this.dim - 1, Math.floor(maxX / SPATIAL_CELL_SIZE));
    const minCy = Math.max(0, Math.floor(minY / SPATIAL_CELL_SIZE));
    const maxCy = Math.min(this.dim - 1, Math.floor(maxY / SPATIAL_CELL_SIZE));

    for (let cy = minCy; cy <= maxCy; cy++) {
      const rowOffset = cy * this.dim;
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.cells[rowOffset + cx];
        for (let i = 0; i < bucket.length; i++) {
          const item = bucket[i];
          if (item._sqToken !== token) {
            item._sqToken = token;
            outList.push(item);
          }
        }
      }
    }
    return outList;
  }
}

const staticSpatialGrid = new SpatialHashGrid();
const dynamicSpatialGrid = new SpatialHashGrid();

const _visibleStaticBuffer = [];
const _visibleDynamicBuffer = [];
const _playerNearbyBuffer = [];
const _pedNearbyBuffer = [];

let cullVisibleCount = 0;
let cullTotalCount = 0;

//crosswalk zebra stripe check
function isMetropolisCrosswalk(floorX, floorY) {
  const EW = [{ y1: 0, y2: 4 }, { y1: 12, y2: 16 }, { y1: 38, y2: 42 }, { y1: 63, y2: 67 }, { y1: 75, y2: 79 }];
  const NS = [{ x1: 0, x2: 4 }, { x1: 12, x2: 16 }, { x1: 38, x2: 42 }, { x1: 63, x2: 67 }, { x1: 75, x2: 79 }];

  for (let i = 0; i < NS.length; i++) {
    const ns = NS[i];
    const roadXMin = ns.x1;
    const roadXMax = ns.x2 + 1.0;

    for (let j = 0; j < EW.length; j++) {
      const ew = EW[j];
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

//manhole cover positions
const MANHOLES = [
  { x: 39.2, y: 34.0 }, //5th ave north
  { x: 41.8, y: 48.0 }, //5th ave south
  { x: 32.0, y: 39.2 }, //broadway west
  { x: 49.0, y: 41.8 }, //broadway east
  { x: 14.5, y: 25.0 }, //6th ave midtown
  { x: 65.5, y: 25.0 }, //3rd ave east
  { x: 25.0, y: 14.5 }, //42nd st uptown
  { x: 50.0, y: 65.5 }  //wall st downtown
];

function getManholeDetails(floorX, floorY) {
  for (let m = 0; m < MANHOLES.length; m++) {
    const mh = MANHOLES[m];
    const dx = floorX - mh.x;
    const dy = floorY - mh.y;
    const distSq = dx * dx + dy * dy;
    const r = 0.28;
    if (distSq <= r * r) {
      const d = Math.sqrt(distSq);
      if (d > 0.21) {
        //outer cast iron ring
        return {
          ch: (Math.abs(dx) > Math.abs(dy)) ? '|' : '=',
          color: '#64748b',
          bg: '#1e293b'
        };
      } else if (d > 0.10) {
        //slotted vent & waffle traction pattern
        const pat = (Math.floor(floorX * 10.0) + Math.floor(floorY * 10.0)) % 2;
        return {
          ch: pat === 0 ? '#' : '%',
          color: '#475569',
          bg: '#0f172a'
        };
      } else {
        //center emblem
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

//projects sign text onto building facades
function getSignChar(worldHitU, worldZ, uStart, uEnd, zStart, zEnd, text) {
  if (worldHitU < uStart || worldHitU > uEnd || worldZ < zStart || worldZ > zEnd) return null;
  const uFrac = (worldHitU - uStart) / (uEnd - uStart);
  const charIdx = Math.floor(uFrac * text.length);
  const ch = text[Math.min(text.length - 1, Math.max(0, charIdx))];
  return (ch !== ' ') ? ch : null;
}

// -------------------------------------------------------------------------
// 2. map generator and 3d city blocks
// -------------------------------------------------------------------------
function buildWorld() {
  map.fill(1); //sidewalk default
  buildingHeights.fill(0);

  //5 boulevards and 5 avenues (5m wide each)
  const EW_ROADS = [
    { y1: 0, y2: 4 },
    { y1: 12, y2: 16 },
    { y1: 38, y2: 42 },
    { y1: 63, y2: 67 },
    { y1: 75, y2: 79 }
  ];
  const NS_ROADS = [
    { x1: 0, x2: 4 },
    { x1: 12, x2: 16 },
    { x1: 38, x2: 42 },
    { x1: 63, x2: 67 },
    { x1: 75, x2: 79 }
  ];

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

  //block 2: ramen diner & courtyard cafe
  setBlock(19, 35, 7, 9, 16, 6.5);
  setBlock(19, 26, 9, 10, 16, 6.5); //open courtyard

  //block 3: clinic & tech mart
  setBlock(45, 59, 7, 9, 17, 7.5);
  setBlock(53, 59, 9, 10, 17, 7.5); //open terrace

  setBlock(70, 72, 7, 9, 18, 9.0); //block 4: brownstones

  //row 2: midtown
  //block 5: arcade megaplex
  setBlock(7, 9, 19, 35, 15, 8.0);
  setBlock(7, 9, 23, 31, 15, 18.0);

  //block 6: empire supertall (4-tier setbacks)
  setBlock(19, 35, 19, 35, 10, 14.0); //podium base
  setBlock(21, 33, 21, 33, 10, 28.0); //tier 2
  setBlock(23, 31, 23, 31, 10, 42.0); //tier 3
  setBlock(25, 29, 25, 29, 10, 50.0); //tower crown
  setBlock(26, 28, 26, 28, 10, 56.0); //spire

  //block 7: arasaka monolith
  setBlock(45, 59, 19, 35, 11, 10.0);
  setBlock(47, 57, 21, 33, 11, 52.0);

  //block 8: metropolis hotel & lofts
  setBlock(70, 72, 19, 35, 13, 14.0);
  setBlock(70, 72, 23, 31, 13, 24.0);

  //row 3: financial & tech district
  //block 9: net-sec citadel
  setBlock(7, 9, 45, 59, 14, 16.0);
  setBlock(7, 9, 48, 56, 14, 26.0);

  //block 10: quantum twin towers & skybridge
  setBlock(19, 24, 45, 59, 12, 46.0); //west tower
  setBlock(30, 35, 45, 59, 12, 46.0); //east tower
  setBlock(25, 29, 50, 54, 12, 28.0); //skybridge

  //block 11: lofts & nightclub
  setBlock(45, 59, 45, 59, 13, 12.0);
  setBlock(47, 57, 47, 57, 13, 24.0);

  //block 12: ramen alley
  setBlock(70, 72, 45, 59, 16, 6.5);

  //row 4: south district
  setBlock(7, 9, 70, 72, 18, 9.0);   //block 13: townhouses
  setBlock(19, 35, 70, 72, 17, 7.5);  //block 14: tech mart
  setBlock(45, 59, 70, 72, 16, 6.5);  //block 15: diner
  setBlock(70, 72, 70, 72, 18, 9.0);  //block 16: walk-ups

  // -------------------------------------------------------------------------
  // 3. sidewalk placement engine (trees, lamps, traffic signals)
  // -------------------------------------------------------------------------
  trees.length = 0;
  streetLights.length = 0;
  trafficLights.length = 0;

  function isValidSidewalkLocation(x, y) {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    if (cellX < 0 || cellX >= MAP_SIZE || cellY < 0 || cellY >= MAP_SIZE) return false;
    if (map[cellY * MAP_SIZE + cellX] !== 1) return false;

    //keep clear of intersections and crosswalks
    for (let j = 0; j < EW_ROADS.length; j++) {
      const ew = EW_ROADS[j];
      for (let i = 0; i < NS_ROADS.length; i++) {
        const ns = NS_ROADS[i];
        if (x >= ns.x1 - 2.2 && x <= ns.x2 + 3.2 && y >= ew.y1 - 2.2 && y <= ew.y2 + 3.2) {
          return false;
        }
      }
    }

    for (let i = 0; i < trees.length; i++) {
      if (Math.hypot(trees[i].x - x, trees[i].y - y) < 1.4) return false;
    }
    for (let i = 0; i < streetLights.length; i++) {
      if (Math.hypot(streetLights[i].x - x, streetLights[i].y - y) < 1.4) return false;
    }
    return true;
  }

  function addTrafficLight(baseX, baseY, armDirX, armDirY, facingDir = 'west', phaseGroup = 'EW') {
    const cellX = Math.floor(baseX);
    const cellY = Math.floor(baseY);
    if (cellX < 0 || cellX >= MAP_SIZE || cellY < 0 || cellY >= MAP_SIZE) return;
    if (map[cellY * MAP_SIZE + cellX] !== 1) return;

    const armLen = 0.82;
    trafficLights.push({
      x: baseX,
      y: baseY,
      headX: baseX + armDirX * armLen,
      headY: baseY + armDirY * armLen,
      armDirX: armDirX,
      armDirY: armDirY,
      facingDir: facingDir,
      phaseGroup: phaseGroup,
      activeState: (phaseGroup === 'EW') ? 'green' : 'red'
    });
  }

  function addLamp(baseX, baseY, armDirX, armDirY) {
    if (!isValidSidewalkLocation(baseX, baseY)) return;
    const armLen = 0.38;
    streetLights.push({
      x: baseX,
      y: baseY,
      headX: baseX + armDirX * armLen,
      headY: baseY + armDirY * armLen
    });
  }

  function addTree(x, y, seedVal) {
    if (!isValidSidewalkLocation(x, y)) return;

    const s1 = Math.sin(seedVal * 17.1);
    const s2 = Math.cos(seedVal * 23.3);
    const s3 = Math.sin(seedVal * 31.7);
    const s4 = Math.cos(seedVal * 43.9);

    const hScale = 0.92 + (s1 + 1) * 0.10;
    const wScale = 0.88 + (s2 + 1) * 0.10;
    const forkZ = 1.10 + (s3 + 1) * 0.08;

    function createBough(bx, by, bz, brXY, brZ, isCr) {
      return {
        x: bx,
        y: by,
        z: bz,
        radXY: brXY,
        radZ: brZ,
        invRadXYSq: 1.0 / (brXY * brXY),
        invRadZSq: 1.0 / (brZ * brZ),
        isCrown: isCr
      };
    }

    const boughs = [
      createBough(x + Math.cos(seedVal * 1.7) * 0.25 * wScale, y + Math.sin(seedVal * 1.7) * 0.25 * wScale, forkZ + 0.35 * hScale, 0.38 * wScale, 0.42 * hScale, false),
      createBough(x + Math.cos(seedVal * 1.7 + 2.1) * 0.26 * wScale, y + Math.sin(seedVal * 1.7 + 2.1) * 0.26 * wScale, forkZ + 0.50 * hScale, 0.40 * wScale, 0.44 * hScale, false),
      createBough(x + Math.cos(seedVal * 1.7 + 4.2) * 0.24 * wScale, y + Math.sin(seedVal * 1.7 + 4.2) * 0.24 * wScale, forkZ + 0.95 * hScale, 0.42 * wScale, 0.48 * hScale, false),
      createBough(x + s1 * 0.04, y + s2 * 0.04, forkZ + 1.45 * hScale, 0.35 * wScale, 0.50 * hScale, true)
    ];

    trees.push({
      x: x,
      y: y,
      seed: seedVal,
      heightScale: hScale,
      widthScale: wScale,
      forkZ: forkZ,
      topZ: forkZ + 1.95 * hScale,
      boughs: boughs
    });
  }

  //street furniture along curbs
  const CURBS_EW = [5.4, 11.4, 17.4, 37.4, 43.4, 62.4, 68.4, 74.4];
  const CURBS_NS = [5.4, 11.4, 17.4, 37.4, 43.4, 62.4, 68.4, 74.4];

  for (let ci = 0; ci < CURBS_EW.length; ci++) {
    const cy = CURBS_EW[ci];
    const armDirY = (cy % 1 < 0.5) ? 1 : -1;
    for (let x = 5.4; x < 75.0; x += 3.4) {
      if (Math.floor(x * 2) % 2 === 0) {
        addTree(x, cy, ci * 100 + x);
      } else {
        addLamp(x, cy, 0, armDirY);
      }
    }
  }

  for (let ci = 0; ci < CURBS_NS.length; ci++) {
    const cx = CURBS_NS[ci];
    const armDirX = (cx % 1 < 0.5) ? 1 : -1;
    for (let y = 5.4; y < 75.0; y += 3.4) {
      if (Math.floor(y * 2) % 2 === 0) {
        addTree(cx, y, ci * 200 + y);
      } else {
        addLamp(cx, y, armDirX, 0);
      }
    }
  }

  //courtyard trees & lamps
  addTree(28.0, 9.5, 901);
  addLamp(32.0, 9.5, 0, 1);
  addTree(34.0, 9.5, 902);
  addTree(27.0, 47.0, 903);
  addLamp(27.0, 57.0, 1, 0);

  //traffic signals at intersections
  const INT_EW_GRID = [
    { y1: 0, y2: 4 },
    { y1: 12, y2: 16 },
    { y1: 38, y2: 42 },
    { y1: 63, y2: 67 },
    { y1: 75, y2: 79 }
  ];
  const INT_NS_GRID = [
    { x1: 0, x2: 4 },
    { x1: 12, x2: 16 },
    { x1: 38, x2: 42 },
    { x1: 63, x2: 67 },
    { x1: 75, x2: 79 }
  ];

  for (let j = 0; j < INT_EW_GRID.length; j++) {
    const ew = INT_EW_GRID[j];
    for (let i = 0; i < INT_NS_GRID.length; i++) {
      const ns = INT_NS_GRID[i];

      //only place on sides that face inward from map boundary
      const hasWestSidewalk = (ns.x1 > 0);
      const hasEastSidewalk = (ns.x2 < 78);
      const hasNorthSidewalk = (ew.y1 > 0);
      const hasSouthSidewalk = (ew.y2 < 78);

      const xWest = hasWestSidewalk ? (ns.x1 - 0.6) : -1;
      const xEast = hasEastSidewalk ? (ns.x2 + 1.4) : -1;
      const yNorth = hasNorthSidewalk ? (ew.y1 - 0.6) : -1;
      const ySouth = hasSouthSidewalk ? (ew.y2 + 1.4) : -1;

      //nw corner
      if (hasWestSidewalk && hasNorthSidewalk) {
        addTrafficLight(xWest, yNorth, 1, 0, 'north', 'NS');
      }
      //ne corner
      if (hasEastSidewalk && hasNorthSidewalk) {
        addTrafficLight(xEast, yNorth, 0, 1, 'east', 'EW');
      }
      //sw corner
      if (hasWestSidewalk && hasSouthSidewalk) {
        addTrafficLight(xWest, ySouth, 0, -1, 'west', 'EW');
      }
      //se corner
      if (hasEastSidewalk && hasSouthSidewalk) {
        addTrafficLight(xEast, ySouth, -1, 0, 'south', 'NS');
      }
    }
  }

  //vehicle fleet
  vehicles.length = 0;

  function createCar(type, x, y, angle, speed, colorPrimary, colorHighlight, colorShadow, baseBg) {
    const isBus = (type === 'bus');
    return {
      type: type,
      x: x,
      y: y,
      angle: angle,
      cruiseSpeed: speed,
      speed: speed,
      length: isBus ? 2.35 : (type === 'coupe' ? 1.38 : (type === 'vip_sedan' ? 1.56 : 1.50)),
      width: isBus ? 1.08 : 0.94,
      hoodZ: isBus ? 1.78 : 0.46,
      beltZ: isBus ? 0.82 : 0.56,
      roofZ: isBus ? 1.78 : 1.02,
      primaryColor: colorPrimary,
      highlightColor: colorHighlight,
      shadowColor: colorShadow,
      baseBg: baseBg,
      isTurning: false,
      turnTargetAngle: 0,
      turnProgress: 0,
      targetLaneCoord: (Math.abs(Math.sin(angle)) > 0.5 ? x : y),
      lastIntersectionId: -1
    };
  }

  //east-west boulevards
  vehicles.push(createCar('taxi', 8.0, 3.65, 0.0, 5.2, '#ffd700', '#ffe600', '#b45309', '#78350f'));
  vehicles.push(createCar('bus', 32.0, 3.65, 0.0, 4.0, '#0284c7', '#38bdf8', '#0369a1', '#082f49'));
  vehicles.push(createCar('cyber_sedan', 72.0, 1.35, Math.PI, 4.8, '#00f0ff', '#7dd3fc', '#0284c7', '#0369a1'));
  vehicles.push(createCar('taxi', 22.0, 15.65, 0.0, 5.2, '#ffd700', '#ffe600', '#b45309', '#78350f'));
  vehicles.push(createCar('coupe', 68.0, 13.35, Math.PI, 5.4, '#ff0055', '#fb7185', '#9f1239', '#881337'));
  vehicles.push(createCar('taxi', 22.0, 41.65, 0.0, 5.3, '#ffd700', '#ffe600', '#b45309', '#78350f'));
  vehicles.push(createCar('vip_sedan', 58.0, 39.35, Math.PI, 4.7, '#9333ea', '#c084fc', '#6b21a8', '#581c87'));
  vehicles.push(createCar('coupe', 12.0, 66.65, 0.0, 5.5, '#ff0055', '#fb7185', '#9f1239', '#881337'));
  vehicles.push(createCar('cyber_sedan', 68.0, 64.35, Math.PI, 4.9, '#00f0ff', '#7dd3fc', '#0284c7', '#0369a1'));
  vehicles.push(createCar('taxi', 16.0, 78.65, 0.0, 5.1, '#ffd700', '#ffe600', '#b45309', '#78350f'));
  vehicles.push(createCar('vip_sedan', 64.0, 76.35, Math.PI, 4.6, '#9333ea', '#c084fc', '#6b21a8', '#581c87'));

  //north-south avenues
  vehicles.push(createCar('coupe', 1.35, 12.0, Math.PI / 2, 5.0, '#ff0055', '#fb7185', '#9f1239', '#881337'));
  vehicles.push(createCar('taxi', 3.65, 68.0, -Math.PI / 2, 5.1, '#ffd700', '#ffe600', '#b45309', '#78350f'));
  vehicles.push(createCar('cyber_sedan', 13.35, 20.0, Math.PI / 2, 4.9, '#00f0ff', '#7dd3fc', '#0284c7', '#0369a1'));
  vehicles.push(createCar('taxi', 15.65, 70.0, -Math.PI / 2, 5.1, '#ffd700', '#ffe600', '#b45309', '#78350f'));
  vehicles.push(createCar('bus', 39.35, 52.0, Math.PI / 2, 4.0, '#0284c7', '#38bdf8', '#0369a1', '#082f49'));
  vehicles.push(createCar('vip_sedan', 39.35, 20.0, Math.PI / 2, 4.8, '#9333ea', '#c084fc', '#6b21a8', '#581c87'));
  vehicles.push(createCar('cyber_sedan', 41.65, 60.0, -Math.PI / 2, 5.0, '#00f0ff', '#7dd3fc', '#0284c7', '#0369a1'));
  vehicles.push(createCar('taxi', 64.35, 15.0, Math.PI / 2, 5.2, '#ffd700', '#ffe600', '#b45309', '#78350f'));
  vehicles.push(createCar('coupe', 66.65, 72.0, -Math.PI / 2, 5.4, '#ff0055', '#fb7185', '#9f1239', '#881337'));
  vehicles.push(createCar('cyber_sedan', 76.35, 18.0, Math.PI / 2, 5.0, '#00f0ff', '#7dd3fc', '#0284c7', '#0369a1'));
  vehicles.push(createCar('taxi', 78.65, 65.0, -Math.PI / 2, 5.2, '#ffd700', '#ffe600', '#b45309', '#78350f'));

  // -------------------------------------------------------------------------
  // 4. pedestrian population and walking routes
  // -------------------------------------------------------------------------
  pedestrians.length = 0;

  const PEDESTRIAN_ARCHETYPES = [
    { type: 'camel_coat', height: 0.94, speed: 0.65, hairColor: '#4a3319', skinColor: '#f5cba7', jacketColor: '#c99a6b', jacketAccentColor: '#eed7a1', pantsColor: '#2b3e50', shoesColor: '#6d4c2b', baseBg: '#23170e' },
    { type: 'denim_jacket', height: 0.95, speed: 0.68, hairColor: '#5c4326', skinColor: '#fad7b8', jacketColor: '#4b6584', jacketAccentColor: '#2c3e50', pantsColor: '#b8a98f', shoesColor: '#dfe4ea', baseBg: '#1e272e' },
    { type: 'olive_overcoat', height: 0.93, speed: 0.62, hairColor: '#3d3429', skinColor: '#ebd0b0', jacketColor: '#576574', jacketAccentColor: '#8395a7', pantsColor: '#3c4043', shoesColor: '#483424', baseBg: '#1a1f1b' },
    { type: 'autumn_rust', height: 0.96, speed: 0.67, hairColor: '#6e3820', skinColor: '#f7d0b3', jacketColor: '#b35436', jacketAccentColor: '#d68a52', pantsColor: '#2d3748', shoesColor: '#8c532b', baseBg: '#2a160e' },
    { type: 'slate_blazer', height: 0.92, speed: 0.60, hairColor: '#606870', skinColor: '#fce0cb', jacketColor: '#718093', jacketAccentColor: '#95a5a6', pantsColor: '#34495e', shoesColor: '#574134', baseBg: '#20262e' },
    { type: 'burgundy_sweater', height: 0.94, speed: 0.64, hairColor: '#382518', skinColor: '#f2cc9f', jacketColor: '#78283a', jacketAccentColor: '#a85060', pantsColor: '#a69d8b', shoesColor: '#422c1d', baseBg: '#240f16' }
  ];

  function addPedestrian(path, archIndex, startIdx = 0, isLoop = false) {
    const arch = PEDESTRIAN_ARCHETYPES[archIndex % PEDESTRIAN_ARCHETYPES.length];
    const startPt = path[startIdx % path.length];
    const nextPt = path[(startIdx + 1) % path.length];
    const initAngle = Math.atan2(nextPt.y - startPt.y, nextPt.x - startPt.x);

    pedestrians.push({
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

  //populate static spatial grid
  staticSpatialGrid.clear();
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i];
    t.entityType = 'tree';
    staticSpatialGrid.insert(t, 1.2);
  }
  for (let i = 0; i < streetLights.length; i++) {
    const sl = streetLights[i];
    sl.entityType = 'lamp';
    staticSpatialGrid.insert(sl, 1.2);
  }
  for (let i = 0; i < trafficLights.length; i++) {
    const tl = trafficLights[i];
    tl.entityType = 'trafficLight';
    staticSpatialGrid.insert(tl, 1.2);
  }
}

// -------------------------------------------------------------------------
// 5. traffic light state machine & intersection grid
// -------------------------------------------------------------------------
let trafficLightTimer = 0;

function getSignalState(phaseGroup) {
  if (phaseGroup === 'EW') {
    if (trafficLightTimer < 12.5) return 'green';
    if (trafficLightTimer < 15.0) return 'yellow';
    return 'red';
  } else { // 'NS'
    if (trafficLightTimer < 15.0) return 'red';
    if (trafficLightTimer < 27.5) return 'green';
    return 'yellow';
  }
}

function updateTrafficLights(dt) {
  trafficLightTimer = (trafficLightTimer + dt) % 30.0;
  for (let i = 0; i < trafficLights.length; i++) {
    const tl = trafficLights[i];
    tl.activeState = getSignalState(tl.phaseGroup);
  }
}

let isTrafficActive = true;

//25 intersections (5x5 grid)
const INTERSECTION_DATA = [];
const STOP_LINES = [];

(function initMetropolisIntersections() {
  const EW_R = [
    { y1: 0, y2: 4 },
    { y1: 12, y2: 16 },
    { y1: 38, y2: 42 },
    { y1: 63, y2: 67 },
    { y1: 75, y2: 79 }
  ];
  const NS_R = [
    { x1: 0, x2: 4 },
    { x1: 12, x2: 16 },
    { x1: 38, x2: 42 },
    { x1: 63, x2: 67 },
    { x1: 75, x2: 79 }
  ];

  let id = 1;
  for (let j = 0; j < EW_R.length; j++) {
    const ew = EW_R[j];
    const cy = (ew.y1 + ew.y2 + 1) / 2;
    const ewEastY = cy + 1.15;
    const ewWestY = cy - 1.15;

    for (let i = 0; i < NS_R.length; i++) {
      const ns = NS_R[i];
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

      //eastbound stop line
      if (ns.x1 > 2.0) {
        STOP_LINES.push({ interId: id, dir: 'east', phase: 'EW', stopCoord: ns.x1 - 2.2, laneMin: cy, laneMax: ew.y2 + 1.0, isX: true, checkSign: 1 });
      }
      //westbound stop line
      if (ns.x2 < 78.0) {
        STOP_LINES.push({ interId: id, dir: 'west', phase: 'EW', stopCoord: ns.x2 + 3.2, laneMin: ew.y1, laneMax: cy, isX: true, checkSign: -1 });
      }
      //southbound stop line
      if (ew.y1 > 2.0) {
        STOP_LINES.push({ interId: id, dir: 'south', phase: 'NS', stopCoord: ew.y1 - 2.2, laneMin: ns.x1, laneMax: cx, isX: false, checkSign: 1 });
      }
      //northbound stop line
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

// -------------------------------------------------------------------------
// 6. autonomous vehicle simulation & stop line logic
// -------------------------------------------------------------------------
function updateVehicles(dt) {
  if (!isTrafficActive) return;

  for (let v = 0; v < vehicles.length; v++) {
    const car = vehicles[v];
    let vDesired = car.cruiseSpeed;
    const cosA = Math.round(Math.cos(car.angle));
    const sinA = Math.round(Math.sin(car.angle));

    const isNearBorder = (car.x <= 2.5 || car.x >= MAP_SIZE - 2.5 || car.y <= 2.5 || car.y >= MAP_SIZE - 2.5);
    car.waitingAtRedLight = false;

    //traffic light stop line & cross-traffic check
    if (!car.isTurning && !isNearBorder) {
      for (let s = 0; s < STOP_LINES.length; s++) {
        const sl = STOP_LINES[s];
        let isMatchingLane = false;
        let distToLine = Infinity;

        if (sl.isX) {
          //east-west road
          if (sl.checkSign === 1 && cosA === 1 && car.x < sl.stopCoord) {
            distToLine = sl.stopCoord - car.x;
            isMatchingLane = (car.y >= sl.laneMin && car.y <= sl.laneMax);
          } else if (sl.checkSign === -1 && cosA === -1 && car.x > sl.stopCoord) {
            distToLine = car.x - sl.stopCoord;
            isMatchingLane = (car.y >= sl.laneMin && car.y <= sl.laneMax);
          }
        } else {
          //north-south road
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

          //check if cross-traffic is blocking the box
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

    //car-following & collision avoidance
    for (let o = 0; o < vehicles.length; o++) {
      if (o === v) continue;
      const other = vehicles[o];

      const toOtherX = other.x - car.x;
      const toOtherY = other.y - car.y;
      const directDist = Math.hypot(toOtherX, toOtherY);

      if (directDist > 14.0) continue;

      const cosCar = Math.cos(car.angle);
      const sinCar = Math.sin(car.angle);

      const fwdDist = toOtherX * cosCar + toOtherY * sinCar;
      const latDist = -toOtherX * sinCar + toOtherY * cosCar;

      //heading alignment
      const cosHeading = Math.cos(car.angle) * Math.cos(other.angle) + Math.sin(car.angle) * Math.sin(other.angle);

      //same-lane car following
      if (cosHeading > 0.5 && fwdDist > 0.1 && fwdDist < 12.0 && Math.abs(latDist) < 1.35) {
        const bumperGap = fwdDist - (car.length * 0.5) - (other.length * 0.5);
        const minSafetyGap = 1.40; //safe standstill buffer

        if (bumperGap <= minSafetyGap) {
          vDesired = 0.0;
        } else if (bumperGap < 8.0) {
          const safeSpeed = (bumperGap - minSafetyGap) * 0.90 + other.speed * 0.85;
          vDesired = Math.min(vDesired, Math.max(0, safeSpeed));
        }
      }
      //opposing lane passing
      else if (cosHeading < -0.5) {
        //only brake if directly blocking same lane
        if (Math.abs(latDist) < 0.85 && fwdDist > 0.0 && directDist < 4.0) {
          vDesired = 0.0; //emergency brake if blocking lane
        }
      }
      //perpendicular cross-traffic / turning
      else if (!isNearBorder && directDist < 4.5 && fwdDist > 0.0 && Math.abs(latDist) < 2.2) {
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

    //anti-gridlock watchdog
    if (car.speed < 0.1 && vDesired < 0.1 && isNearBorder) {
      vDesired = car.cruiseSpeed; //force free flow at borders
    } else if (car.speed < 0.1 && vDesired < 0.1 && !car.waitingAtRedLight) {
      car.stoppedTime = (car.stoppedTime || 0) + dt;
      if (car.stoppedTime > 8.0) {
        //jammed for >8s, nudge forward
        vDesired = 2.0;
      }
    } else {
      car.stoppedTime = 0;
    }

    //smooth accel & braking
    const maxAccel = 3.2; //m/s^2
    const maxBrake = 7.5; //m/s^2

    if (vDesired > car.speed) {
      car.speed = Math.min(vDesired, car.speed + maxAccel * dt);
    } else {
      car.speed = Math.max(vDesired, car.speed - maxBrake * dt);
    }
    car.speed = Math.max(0.0, car.speed);

    //kinematic turning
    if (car.isTurning) {
      if (car.speed > 0) {
        const angleDiff = normalizeAngle(car.turnTargetAngle - car.angle);
        const maxStep = car.turnRate * dt;

        if (Math.abs(angleDiff) <= maxStep) {
          car.angle = car.turnTargetAngle;
          car.isTurning = false;
        } else {
          car.angle += Math.sign(angleDiff) * maxStep;
        }

        //smooth displacement along heading
        car.x += Math.cos(car.angle) * car.speed * dt;
        car.y += Math.sin(car.angle) * car.speed * dt;
      }
    } else {
      if (car.speed > 0) {
        car.x += Math.cos(car.angle) * car.speed * dt;
        car.y += Math.sin(car.angle) * car.speed * dt;

        //lateral lane-centering spring
        if (Math.abs(cosA) === 1) {
          car.y += (car.targetLaneCoord - car.y) * 0.08;
        } else if (Math.abs(sinA) === 1) {
          car.x += (car.targetLaneCoord - car.x) * 0.08;
        }
      }

      //intersection approach turning decisions
      if (car.speed > 1.0) {
        for (let i = 0; i < INTERSECTION_DATA.length; i++) {
          const inter = INTERSECTION_DATA[i];
          const distToCenter = Math.hypot(car.x - inter.cx, car.y - inter.cy);

          if (distToCenter < 3.5 && car.lastIntersectionId !== inter.id) {
            //decide turn on approach
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

              if (cosA === 1) { //heading east
                if (isRight) {
                  //right to southbound
                  R = 1.55;
                  targetLane = nsSouthX;
                  targetAngle = Math.PI / 2;
                  if (car.x >= nsSouthX - R) shouldStartTurn = true;
                } else {
                  //left to northbound
                  R = 2.20;
                  targetLane = nsNorthX;
                  targetAngle = -Math.PI / 2;
                  if (car.x >= nsNorthX - R) shouldStartTurn = true;
                }
              } else if (cosA === -1) { //heading west
                if (isRight) {
                  //right to northbound
                  R = 1.55;
                  targetLane = nsNorthX;
                  targetAngle = -Math.PI / 2;
                  if (car.x <= nsNorthX + R) shouldStartTurn = true;
                } else {
                  //left to southbound
                  R = 2.20;
                  targetLane = nsSouthX;
                  targetAngle = Math.PI / 2;
                  if (car.x <= nsSouthX + R) shouldStartTurn = true;
                }
              } else if (sinA === 1) { //heading south
                if (isRight) {
                  //right to westbound
                  R = 1.55;
                  targetLane = ewWestY;
                  targetAngle = Math.PI;
                  if (car.y >= ewWestY - R) shouldStartTurn = true;
                } else {
                  //left to eastbound
                  R = 2.20;
                  targetLane = ewEastY;
                  targetAngle = 0;
                  if (car.y >= ewEastY - R) shouldStartTurn = true;
                }
              } else if (sinA === -1) { //heading north
                if (isRight) {
                  //right to eastbound
                  R = 1.55;
                  targetLane = ewEastY;
                  targetAngle = 0;
                  if (car.y <= ewEastY + R) shouldStartTurn = true;
                } else {
                  //left to westbound
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

      //city boundary wrap-around
      if (car.x > MAP_SIZE + 4.0) car.x = -3.0;
      else if (car.x < -4.0) car.x = MAP_SIZE + 3.0;

      if (car.y > MAP_SIZE + 4.0) car.y = -3.0;
      else if (car.y < -4.0) car.y = MAP_SIZE + 3.0;
    }
  }

  //vehicle vs vehicle obb collision
  for (let i = 0; i < vehicles.length; i++) {
    const c1 = vehicles[i];
    for (let j = i + 1; j < vehicles.length; j++) {
      const c2 = vehicles[j];
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      if (Math.abs(dx) > 4.0 || Math.abs(dy) > 4.0) continue;

      const cos1 = Math.cos(c1.angle);
      const sin1 = Math.sin(c1.angle);

      //transform into c1's local space
      const localX = dx * cos1 + dy * sin1;
      const localY = -dx * sin1 + dy * cos1;

      const halfLen = (c1.length + c2.length) * 0.48;
      const halfWid = (c1.width + c2.width) * 0.48;

      //2d box overlap
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

// -------------------------------------------------------------------------
// 7. pedestrian navigation & anti-stuck watchdog
// -------------------------------------------------------------------------
function updatePedestrians(dt) {
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
        //ping-pong along linear sidewalk promenade
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

      //anti-stuck watchdog: only triggers after prolonged blockage (>3.5s)
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

    //road curb guide: steer back onto sidewalk if pushed into road
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
              } else {
                const distLeft = Math.abs(ped.x - tx);
                const distRight = Math.abs(ped.x - (tx + 1.0));
                const distTop = Math.abs(ped.y - ty);
                const distBot = Math.abs(ped.y - (ty + 1.0));
                const minDist = Math.min(distLeft, distRight, distTop, distBot);

                if (minDist === distLeft) ped.x = tx - pedR;
                else if (minDist === distRight) ped.x = tx + 1.0 + pedR;
                else if (minDist === distTop) ped.y = ty - pedR;
                else ped.y = ty + 1.0 + pedR;
              }
            }
          }
        }
      }
    }

    //tree trunk collision
    for (let t = 0; t < trees.length; t++) {
      const tree = trees[t];
      const pDx = ped.x - tree.x;
      const pDy = ped.y - tree.y;
      const pDist = Math.hypot(pDx, pDy);
      const minTreeDist = 0.28;
      if (pDist < minTreeDist && pDist > 0.001) {
        ped.x = tree.x + (pDx / pDist) * minTreeDist;
        ped.y = tree.y + (pDy / pDist) * minTreeDist;
      }
    }

    //street lamp pole collision
    for (let l = 0; l < streetLights.length; l++) {
      const lamp = streetLights[l];
      const pDx = ped.x - lamp.x;
      const pDy = ped.y - lamp.y;
      const pDist = Math.hypot(pDx, pDy);
      const minLampDist = 0.22;
      if (pDist < minLampDist && pDist > 0.001) {
        ped.x = lamp.x + (pDx / pDist) * minLampDist;
        ped.y = lamp.y + (pDy / pDist) * minLampDist;
      }
    }

    //traffic light mast pole collision
    for (let tl = 0; tl < trafficLights.length; tl++) {
      const light = trafficLights[tl];
      const pDx = ped.x - light.x;
      const pDy = ped.y - light.y;
      const pDist = Math.hypot(pDx, pDy);
      const minTlDist = 0.22;
      if (pDist < minTlDist && pDist > 0.001) {
        ped.x = light.x + (pDx / pDist) * minTlDist;
        ped.y = light.y + (pDy / pDist) * minTlDist;
      }
    }

    //soft avoidance between pedestrians
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

    //soft avoidance with player
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

// -------------------------------------------------------------------------
// 7.5 subtle steam particle engine
// -------------------------------------------------------------------------
let particleSpawnTimer = 0;

function updateParticles(dt) {
  if (!config.particles) {
    particles.length = 0;
    return;
  }

  //spawn dense steam puffs from sewer manholes
  particleSpawnTimer += dt;
  if (particleSpawnTimer >= 0.10) {
    particleSpawnTimer = 0;
    for (let m = 0; m < MANHOLES.length; m++) {
      const mh = MANHOLES[m];
      const count = (Math.random() < 0.75) ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 0.03 + Math.random() * 0.18;
        particles.push({
          x: mh.x + Math.cos(angle) * r,
          y: mh.y + Math.sin(angle) * r,
          z: 0.02,
          vx: (Math.random() - 0.5) * 0.06,
          vy: (Math.random() - 0.5) * 0.06,
          vz: 0.22 + Math.random() * 0.22,
          life: 2.2 + Math.random() * 0.9,
          maxLife: 3.1,
          seed: Math.random() * 20
        });
      }
    }
  }

  //update active particles with rising plume kinematics
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    const age = 1.0 - (p.life / p.maxLife);
    const spread = 0.03 * (1.0 + age * 2.2);
    p.x += p.vx * dt + Math.sin(p.life * 4.0 + p.seed) * spread * dt;
    p.y += p.vy * dt + Math.cos(p.life * 3.2 + p.seed) * spread * dt;
    p.z += p.vz * dt;
  }
}

//rebuild dynamic spatial hash grid every frame
function rebuildDynamicSpatialGrid() {
  dynamicSpatialGrid.clear();
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    v.entityType = 'vehicle';
    v.entityId = i;
    dynamicSpatialGrid.insert(v, (v.length || 1.5) * 0.5 + 0.3);
  }
  for (let i = 0; i < pedestrians.length; i++) {
    const p = pedestrians[i];
    p.entityType = 'pedestrian';
    p.entityId = i;
    dynamicSpatialGrid.insert(p, 0.4);
  }
  for (let i = 0; i < particles.length; i++) {
    const part = particles[i];
    part.entityType = 'particle';
    part.entityId = i;
    dynamicSpatialGrid.insert(part, 0.3);
  }
}

// -------------------------------------------------------------------------
// 8. player physics and first-person controller
// -------------------------------------------------------------------------
const player = {
  x: 37.0,
  y: 43.5,
  baseHeight: 1.00,
  z: 1.00,
  vz: 0,
  isGrounded: true,
  angle: -Math.PI / 2, //facing north
  pitch: 0.08,
  speed: 0.075,
  baseTurnSpeed: 0.0022,
  turnSpeed: 0.0022
};

const keys = {};
let isPointerLocked = false;
let wasPointerLocked = false;
let hasStarted = false;
let isPaused = true;

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyP') {
    config.traffic = !config.traffic;
    applyConfig();
  }
  if (e.code === 'Escape') {
    e.preventDefault();
    if (!hasStarted) return;
    if (isPaused) {
      startGame();
    } else {
      pauseGame();
    }
  } else if (hasStarted && !isPaused && !isPointerLocked) {
    //any active gameplay keypress (WASD, Space, Arrows) locks pointer on user gesture
    tryRequestLock();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

window.addEventListener('blur', () => {
  for (const k in keys) {
    keys[k] = false;
  }
  if (hasStarted && !isPaused) {
    pauseGame();
  }
});

const canvas = document.getElementById('canvas3d');
const ctx = canvas.getContext('2d', { alpha: false });

function updatePointerLockState() {
  const currentLock = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
  isPointerLocked = (currentLock !== null && currentLock !== undefined);

  //only pause if the pointer was previously locked and user unlocked via browser Esc
  if (wasPointerLocked && !isPointerLocked && hasStarted && !isPaused) {
    pauseGame();
  }
  wasPointerLocked = isPointerLocked;
}

document.addEventListener('pointerlockchange', updatePointerLockState);
document.addEventListener('mozpointerlockchange', updatePointerLockState);
document.addEventListener('webkitpointerlockchange', updatePointerLockState);

function tryRequestLock() {
  if (hasStarted && !isPaused && !isPointerLocked) {
    try {
      canvas.focus();
      canvas.requestPointerLock();
    } catch (e) { }
  }
}

window.addEventListener('click', tryRequestLock);
window.addEventListener('pointerdown', tryRequestLock);
window.addEventListener('mousedown', tryRequestLock);

document.addEventListener('mousemove', (e) => {
  if (!hasStarted || isPaused) return;

  const mx = e.movementX ?? 0;
  const my = e.movementY ?? 0;

  if (Math.abs(mx) < 400 && Math.abs(my) < 400) {
    const activeSens = player.baseTurnSpeed * (config.mouseSens || 1.0);
    player.angle = (player.angle + mx * activeSens);
    player.pitch -= my * activeSens * 1.1;
    //allow full 180 degree vertical look
    player.pitch = Math.max(-2.0, Math.min(2.0, player.pitch));
  }
});

function updatePlayer() {
  const moveSpeed = keys['ShiftLeft'] || keys['ShiftRight'] ? player.speed * 1.8 : player.speed;
  let moveX = 0;
  let moveY = 0;

  if (keys['KeyW']) {
    moveX += Math.cos(player.angle) * moveSpeed;
    moveY += Math.sin(player.angle) * moveSpeed;
  }
  if (keys['KeyS']) {
    moveX -= Math.cos(player.angle) * moveSpeed;
    moveY -= Math.sin(player.angle) * moveSpeed;
  }
  if (keys['KeyA']) {
    moveX += Math.cos(player.angle - Math.PI / 2) * moveSpeed;
    moveY += Math.sin(player.angle - Math.PI / 2) * moveSpeed;
  }
  if (keys['KeyD']) {
    moveX += Math.cos(player.angle + Math.PI / 2) * moveSpeed;
    moveY += Math.sin(player.angle + Math.PI / 2) * moveSpeed;
  }
  if (keys['ArrowUp']) {
    moveX += Math.cos(player.angle) * moveSpeed;
    moveY += Math.sin(player.angle) * moveSpeed;
  }
  if (keys['ArrowDown']) {
    moveX -= Math.cos(player.angle) * moveSpeed;
    moveY -= Math.sin(player.angle) * moveSpeed;
  }
  if (keys['ArrowLeft'] || keys['KeyQ']) {
    player.angle -= 0.035;
  }
  if (keys['ArrowRight'] || keys['KeyE']) {
    player.angle += 0.035;
  }

  //building wall collision
  const newX = player.x + moveX;
  const newY = player.y + moveY;
  const buf = 0.28;

  const targetCellX = Math.floor(newX + (moveX > 0 ? buf : -buf));
  const currentCellY = Math.floor(player.y);
  if (targetCellX >= 0 && targetCellX < MAP_SIZE && currentCellY >= 0 && currentCellY < MAP_SIZE) {
    if (map[currentCellY * MAP_SIZE + targetCellX] < 10) {
      player.x = newX;
    }
  }

  const currentCellX = Math.floor(player.x);
  const targetCellY = Math.floor(newY + (moveY > 0 ? buf : -buf));
  if (currentCellX >= 0 && currentCellX < MAP_SIZE && targetCellY >= 0 && targetCellY < MAP_SIZE) {
    if (map[targetCellY * MAP_SIZE + currentCellX] < 10) {
      player.y = newY;
    }
  }

  //local spatial grid collision query for player
  const nearbyStatic = staticSpatialGrid.queryAABB(player.x - 1.5, player.y - 1.5, player.x + 1.5, player.y + 1.5, _playerNearbyBuffer);
  for (let i = 0; i < nearbyStatic.length; i++) {
    const obj = nearbyStatic[i];
    if (obj.entityType === 'tree') {
      const dist = Math.hypot(player.x - obj.x, player.y - obj.y);
      if (dist < 0.28) {
        const pushAngle = Math.atan2(player.y - obj.y, player.x - obj.x);
        player.x = obj.x + Math.cos(pushAngle) * 0.28;
        player.y = obj.y + Math.sin(pushAngle) * 0.28;
      }
    } else if (obj.entityType === 'lamp' || obj.entityType === 'trafficLight') {
      const dist = Math.hypot(player.x - obj.x, player.y - obj.y);
      if (dist < 0.22) {
        const pushAngle = Math.atan2(player.y - obj.y, player.x - obj.x);
        player.x = obj.x + Math.cos(pushAngle) * 0.22;
        player.y = obj.y + Math.sin(pushAngle) * 0.22;
      }
    }
  }

  //vehicle collision
  if (isTrafficActive) {
    for (const car of vehicles) {
      const dx = player.x - car.x;
      const dy = player.y - car.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 3.0) {
        const cosCar = Math.cos(car.angle || 0);
        const sinCar = Math.sin(car.angle || 0);
        const localX = dx * cosCar + dy * sinCar;
        const localY = -dx * sinCar + dy * cosCar;

        if (Math.abs(localX) < car.length * 0.55 && Math.abs(localY) < car.width * 0.65) {
          const pushDirY = (localY >= 0) ? 1 : -1;
          const pushX = -sinCar * pushDirY * (car.width * 0.70);
          const pushY = cosCar * pushDirY * (car.width * 0.70);
          player.x = car.x + dx * 0.5 + pushX * 0.5;
          player.y = car.y + dy * 0.5 + pushY * 0.5;
        }
      }
    }
  }

  //jump physics
  if (keys['Space'] && player.isGrounded) {
    player.vz = 0.13;
    player.isGrounded = false;
  }

  const targetBaseZ = keys['KeyC'] ? (player.baseHeight * 0.5) : player.baseHeight;

  if (!player.isGrounded) {
    player.z += player.vz;
    player.vz -= 0.007;
    if (player.z <= targetBaseZ) {
      player.z = targetBaseZ;
      player.vz = 0;
      player.isGrounded = true;
    }
  } else {
    player.z += (targetBaseZ - player.z) * 0.2;
  }
}

// -------------------------------------------------------------------------
// 9. 3d raycaster & per-pixel depth buffer
// -------------------------------------------------------------------------
let pixelDepthBuffer = new Float32Array(300 * 200);

//batched ascii framebuffer
let frameCharCodes = null;
let frameColors = null;
let frameBgs = null;
let frameAlphas = null;
let rowStraightDist = null;

let fontStyle = "bold 13px 'Courier New', monospace";

function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;

  const targetFontSize = Math.max(9, Math.min(18, Math.floor(h / 72)));
  fontStyle = `bold ${targetFontSize}px 'Courier New', monospace`;
  ctx.font = fontStyle;

  CHAR_WIDTH = ctx.measureText('M').width;
  CHAR_HEIGHT = Math.round(targetFontSize * 1.25);

  RENDER_COLS = Math.floor(w / CHAR_WIDTH);
  RENDER_ROWS = Math.floor(h / CHAR_HEIGHT);

  const totalCells = RENDER_COLS * RENDER_ROWS;
  pixelDepthBuffer = new Float32Array(totalCells);
  frameCharCodes = new Uint16Array(totalCells);
  frameColors = new Array(totalCells);
  frameBgs = new Array(totalCells);
  frameAlphas = new Float32Array(totalCells);
  rowStraightDist = new Float32Array(RENDER_ROWS);
}
window.addEventListener('resize', resizeCanvas);

function drawChar(col, row, ch, color, alpha = 1.0) {
  if (col < 0 || col >= RENDER_COLS || row < 0 || row >= RENDER_ROWS) return;
  const idx = col * RENDER_ROWS + row;
  frameCharCodes[idx] = (typeof ch === 'number') ? ch : (ch ? ch.charCodeAt(0) : 32);
  frameColors[idx] = color;
  frameAlphas[idx] = alpha;
}

//draws opaque char with custom bg
function drawOpaqueChar(col, row, ch, color, alpha = 1.0, bg = '#020408') {
  if (col < 0 || col >= RENDER_COLS || row < 0 || row >= RENDER_ROWS) return;
  const idx = col * RENDER_ROWS + row;
  frameCharCodes[idx] = (typeof ch === 'number') ? ch : (ch ? ch.charCodeAt(0) : 32);
  frameColors[idx] = color;
  frameAlphas[idx] = alpha;
  frameBgs[idx] = bg;
}

const NY_WINDOWS = ['00', '88', 'XX', 'ZZ', '##', '[]'];

function render3DWorld() {
  pixelDepthBuffer.fill(MAX_DEPTH);
  frameCharCodes.fill(32);
  frameBgs.fill('#000000');

  const halfRows = Math.floor(RENDER_ROWS / 2);
  const horizon = Math.floor(halfRows + player.pitch * RENDER_ROWS);
  const halfFovTan = Math.tan(FOV / 2);
  const cosPlayerAngle = Math.cos(player.angle);
  const sinPlayerAngle = Math.sin(player.angle);

  const planeX = -sinPlayerAngle * halfFovTan;
  const planeY = cosPlayerAngle * halfFovTan;

  //precompute row distances for ground raycasting
  for (let r = 0; r < RENDER_ROWS; r++) {
    if (r > horizon) {
      rowStraightDist[r] = (player.z * RENDER_ROWS * PROJECTION_SCALE) / (r - horizon);
    } else {
      rowStraightDist[r] = MAX_DEPTH;
    }
  }

  //raycast columns for buildings & ground (planar perspective)
  for (let col = 0; col < RENDER_COLS; col++) {
    const cameraX = (2 * (col + 0.5) / RENDER_COLS) - 1;
    const rayDirX = cosPlayerAngle + planeX * cameraX;
    const rayDirY = sinPlayerAngle + planeY * cameraX;
    const rayLen = Math.hypot(rayDirX, rayDirY);
    const cosAngle = rayDirX / rayLen;
    const sinAngle = rayDirY / rayLen;
    const rayAngle = Math.atan2(rayDirY, rayDirX);
    const cosOffset = 1.0 / rayLen;

    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    const deltaDistX = Math.abs(1 / cosAngle);
    const deltaDistY = Math.abs(1 / sinAngle);

    let stepX = cosAngle < 0 ? -1 : 1;
    let sideDistX = cosAngle < 0 ? (player.x - mapX) * deltaDistX : (mapX + 1.0 - player.x) * deltaDistX;

    let stepY = sinAngle < 0 ? -1 : 1;
    let sideDistY = sinAngle < 0 ? (player.y - mapY) * deltaDistY : (mapY + 1.0 - player.y) * deltaDistY;

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

      if (mapX < 0 || mapX >= MAP_SIZE || mapY < 0 || mapY >= MAP_SIZE) {
        break;
      }

      const tileIdx = mapY * MAP_SIZE + mapX;
      const tile = map[tileIdx];
      const cellH = buildingHeights[tileIdx];

      if (tile >= 10 && cellH > maxHSeen) {
        let hitDist;
        if (side === 0) {
          hitDist = (mapX - player.x + (1 - stepX) / 2) / cosAngle;
        } else {
          hitDist = (mapY - player.y + (1 - stepY) / 2) / sinAngle;
        }

        const worldHitU = (side === 0) ? (player.y + hitDist * sinAngle) : (player.x + hitDist * cosAngle);
        const corrDist = Math.max(0.1, hitDist * cosOffset);

        tiers.push({
          minZ: maxHSeen,
          maxZ: cellH,
          hitDist: hitDist,
          corrDist: corrDist,
          hitTile: tile,
          side: side,
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
    const baseScreenH = hasHit ? (RENDER_ROWS * PROJECTION_SCALE / firstTier.corrDist) : 1;
    const baseWallBottom = hasHit ? Math.min(RENDER_ROWS - 1, Math.ceil(horizon + (player.z * baseScreenH))) : (RENDER_ROWS - 1);

    //floor & streets
    const startFloorRow = Math.max(0, Math.min(RENDER_ROWS, hasHit ? Math.max(horizon + 1, baseWallBottom + 1) : (horizon + 1)));

    for (let row = startFloorRow; row < RENDER_ROWS; row++) {
      const straightDist = rowStraightDist[row];

      if (straightDist < MAX_DEPTH) {
        pixelDepthBuffer[col * RENDER_ROWS + row] = straightDist;

        const floorX = player.x + straightDist * rayDirX;
        const floorY = player.y + straightDist * rayDirY;

        const fCellX = Math.floor(floorX);
        const fCellY = Math.floor(floorY);

        if (fCellX >= 0 && fCellX < MAP_SIZE && fCellY >= 0 && fCellY < MAP_SIZE) {
          const tile = map[fCellY * MAP_SIZE + fCellX];
          let ch = ' ';
          let color = '#080c14';
          let floorBg = null;

          const depthAlpha = Math.max(0.15, 1 - (straightDist / MAX_DEPTH));

          //asphalt road
          if (tile === 0) {
            if (straightDist > 25.0) {
              //far distance: uniform flat asphalt, no detail
              ch = ' ';
              color = '#050810';
            } else {
              const mh = (straightDist < 16.0) ? getManholeDetails(floorX, floorY) : null;
              if (mh) {
                ch = mh.ch;
                color = mh.color;
                floorBg = mh.bg;
              } else {
                const crosswalkInfo = isMetropolisCrosswalk(floorX, floorY);
                if (crosswalkInfo) {
                  const isVertStripe = crosswalkInfo.isVert;
                  //at distance crosswalks become solid white bands
                  if (straightDist > 14.0) {
                    ch = isVertStripe ? '|' : '=';
                    color = '#c0c8d0';
                  } else {
                    const isStripe = isVertStripe
                      ? ((((floorY % 0.8) + 0.8) % 0.8) < 0.46)
                      : ((((floorX % 0.8) + 0.8) % 0.8) < 0.46);
                    if (isStripe) {
                      ch = isVertStripe ? '|' : '=';
                      color = '#f1f5f9';
                    } else {
                      ch = ' ';
                      color = '#050810';
                    }
                  }
                } else {
                  //double yellow dividing lines
                  const yellHalf = Math.max(0.15, straightDist * 0.025);
                  const isEWYell = (
                    (Math.abs(floorY - 2.50) < yellHalf) ||
                    (Math.abs(floorY - 14.50) < yellHalf) ||
                    (Math.abs(floorY - 40.50) < yellHalf) ||
                    (Math.abs(floorY - 65.50) < yellHalf) ||
                    (Math.abs(floorY - 77.50) < yellHalf)
                  );
                  const isNSYell = (
                    (Math.abs(floorX - 2.50) < yellHalf) ||
                    (Math.abs(floorX - 14.50) < yellHalf) ||
                    (Math.abs(floorX - 40.50) < yellHalf) ||
                    (Math.abs(floorX - 65.50) < yellHalf) ||
                    (Math.abs(floorX - 77.50) < yellHalf)
                  );

                  if (isEWYell) {
                    ch = (straightDist > 10.0) ? '=' : ((Math.floor(floorX * 2.5) % 2 === 0) ? '=' : ' ');
                    color = '#ffd700';
                  } else if (isNSYell) {
                    ch = (straightDist > 10.0) ? '|' : ((Math.floor(floorY * 2.5) % 2 === 0) ? '|' : ' ');
                    color = '#ffd700';
                  } else {
                    ch = ' ';
                    color = '#050810';
                  }
                }
              }
            }
          }
          //concrete sidewalks & curbs
          else {
            if (straightDist > 32.0) {
              //far distance: clean uniform sidewalk
              ch = '.';
              color = '#2d3b4b';
            } else {
              const curbHalf = Math.max(0.15, straightDist * 0.02);
              const isNearRoadWest = (Math.abs(floorX - 0) < curbHalf || Math.abs(floorX - 12) < curbHalf || Math.abs(floorX - 38) < curbHalf || Math.abs(floorX - 63) < curbHalf || Math.abs(floorX - 75) < curbHalf);
              const isNearRoadEast = (Math.abs(floorX - 5) < curbHalf || Math.abs(floorX - 17) < curbHalf || Math.abs(floorX - 43) < curbHalf || Math.abs(floorX - 68) < curbHalf || Math.abs(floorX - 80) < curbHalf);
              const isNearRoadNorth = (Math.abs(floorY - 0) < curbHalf || Math.abs(floorY - 12) < curbHalf || Math.abs(floorY - 38) < curbHalf || Math.abs(floorY - 63) < curbHalf || Math.abs(floorY - 75) < curbHalf);
              const isNearRoadSouth = (Math.abs(floorY - 5) < curbHalf || Math.abs(floorY - 17) < curbHalf || Math.abs(floorY - 43) < curbHalf || Math.abs(floorY - 68) < curbHalf || Math.abs(floorY - 80) < curbHalf);

              if (isNearRoadSouth || isNearRoadNorth || isNearRoadWest || isNearRoadEast) {
                ch = '_';
                color = '#94a3b8';
              } else if (straightDist > 16.0) {
                //mid distance: clean uniform sidewalk
                ch = '.';
                color = '#3b4b5b';
              } else {
                const tileU = Math.floor(floorX * 0.8);
                const tileV = Math.floor(floorY * 0.8);
                const slab = (tileU + tileV) % 2;
                ch = (slab === 0 ? '.' : ',');
                color = (slab === 0 ? '#475569' : '#334155');
              }
            }
          }

          if (floorBg) {
            drawOpaqueChar(col, row, ch, color, depthAlpha, floorBg);
          } else {
            drawChar(col, row, ch, color, depthAlpha);
          }
        }
      }
    }

    //multi-tier stepped walls with occlusion
    let topClip = RENDER_ROWS;

    for (let ti = 0; ti < tiers.length; ti++) {
      const tier = tiers[ti];
      const tierScreenH = (RENDER_ROWS * PROJECTION_SCALE / tier.corrDist);
      const wallTop = Math.max(0, Math.floor(horizon - ((tier.maxZ - player.z) * tierScreenH)));

      let drawStart, drawEnd;
      if (ti === 0) {
        const wallBottom = Math.min(RENDER_ROWS - 1, Math.ceil(horizon + (player.z * tierScreenH)));
        drawStart = wallTop;
        drawEnd = wallBottom;
        topClip = wallTop;
      } else {
        if (wallTop >= topClip) continue; //occluded by closer building
        drawStart = wallTop;
        drawEnd = topClip - 1;
        topClip = wallTop;
      }

      if (drawStart > drawEnd) continue;

      const depthAlpha = Math.max(0.25, 1 - (tier.corrDist / MAX_DEPTH));

      for (let row = drawStart; row <= drawEnd; row++) {
        pixelDepthBuffer[col * RENDER_ROWS + row] = tier.corrDist;
      }

      const colSlot = Math.floor(tier.worldHitU * 4);
      const isWindowCol = (colSlot % 2 === 1);
      const hitTile = tier.hitTile;
      const isFrontSouth = tier.isFrontSouth;
      const isWestFace = tier.isWestFace;
      const isEastFace = tier.isEastFace;
      const worldHitU = tier.worldHitU;

      //tile 10: empire supertall (gold/limestone/bronze)
      if (hitTile === 10) {
        //summit spire & beacon
        if (tier.maxZ >= 54.0 && drawStart > 0 && drawStart < RENDER_ROWS) {
          const centerDist = Math.abs((worldHitU % 16.0) - 8.0);
          if (centerDist < 0.45) {
            drawChar(col, drawStart - 1, '^', '#ffd700', depthAlpha);
            drawChar(col, drawStart - 2, '|', '#ffe600', depthAlpha * 0.95);
            drawChar(col, drawStart - 3, '|', '#ffffff', depthAlpha * 0.9);
            drawChar(col, drawStart - 4, '*', '#00f0ff', depthAlpha * 0.85);
          } else if (centerDist < 1.6) {
            drawChar(col, drawStart - 1, '=', '#e5a93c', depthAlpha * 0.85);
          }
        }

        for (let row = drawStart; row <= drawEnd; row++) {
          const worldZ = player.z + (horizon - row) / tierScreenH;
          const floorIdx = Math.floor(worldZ * 1.5);
          let ch = ' ';
          let color = '#ffd700';
          let wallBg = isFrontSouth ? '#140c03' : '#0c0802';

          const sign1 = getSignChar(worldHitU % 16, worldZ, 4.0, 12.0, 3.2, 4.6, '[ EMPIRE TOWER ]');
          const sign2 = getSignChar(worldHitU % 16, worldZ, 5.0, 11.0, 43.0, 44.8, '[ CHRONOS ]');

          if (sign1) {
            ch = sign1;
            color = '#ffd700';
            wallBg = '#050f26';
          } else if (sign2) {
            ch = sign2;
            color = '#ffffff';
            wallBg = '#3b1c05';
          } else if (worldZ < 2.4) {
            //bronze lobby entrance
            if (isFrontSouth && worldHitU % 16 >= 6.5 && worldHitU % 16 <= 9.5) {
              ch = (worldZ >= 1.9) ? '=' : ((Math.floor(worldHitU * 6) % 2 === 0) ? '|' : ' ');
              color = '#ffd700';
              wallBg = '#221505';
            } else {
              ch = isWindowCol ? ':' : '#';
              color = '#8c6239';
            }
          } else if (worldZ >= 48.0) {
            //deco crown fluting
            ch = (colSlot % 2 === 1) ? '^' : '|';
            color = (worldZ >= 52.0) ? '#ffffff' : '#ffd700';
          } else {
            //office windows & limestone piers
            if (isWindowCol) {
              const isLit = ((colSlot * 7 + floorIdx * 11) % 7 < 4);
              ch = isLit ? ':' : '.';
              color = isLit ? '#fef08a' : '#475569';
            } else {
              ch = '|';
              color = isFrontSouth ? '#d97706' : '#92400e';
            }
            if (Math.abs(worldZ - Math.round(worldZ)) < 0.08) {
              ch = '=';
              color = isFrontSouth ? '#b45309' : '#78350f';
            }
          }
          drawOpaqueChar(col, row, ch, color, depthAlpha, wallBg);
        }
      }
      //tile 11: arasaka monolith (obsidian & cyan)
      else if (hitTile === 11) {
        if (tier.maxZ >= 50.0 && drawStart > 0 && drawStart < RENDER_ROWS) {
          const centerDist = Math.abs((worldHitU % 15.0) - 7.5);
          if (centerDist < 0.4) {
            drawChar(col, drawStart - 1, '^', '#00f0ff', depthAlpha);
            drawChar(col, drawStart - 2, '|', '#38bdf8', depthAlpha * 0.95);
            drawChar(col, drawStart - 3, '+', '#ffffff', depthAlpha * 0.9);
            drawChar(col, drawStart - 4, '*', '#ff007f', depthAlpha * 0.85);
          } else if (centerDist < 1.6) {
            drawChar(col, drawStart - 1, '=', '#0284c7', depthAlpha * 0.85);
          }
        }

        for (let row = drawStart; row <= drawEnd; row++) {
          const worldZ = player.z + (horizon - row) / tierScreenH;
          const floorIdx = Math.floor(worldZ * 1.5);
          let ch = ' ';
          let color = '#38bdf8';
          let wallBg = isFrontSouth ? '#050c18' : '#030810';

          const sign1 = getSignChar(worldHitU % 15, worldZ, 3.5, 11.5, 3.2, 4.6, '[ ARASAKA CORP ]');
          const sign2 = getSignChar(worldHitU % 15, worldZ, 4.5, 10.5, 43.0, 44.8, '[ NEXUS-6 ]');

          if (sign1) {
            ch = sign1;
            color = '#00f0ff';
            wallBg = '#022438';
          } else if (sign2) {
            ch = sign2;
            color = '#ff007f';
            wallBg = '#220022';
          } else if (worldZ < 2.4) {
            ch = isWindowCol ? ':' : '|';
            color = '#0369a1';
          } else if (worldZ >= 46.0) {
            ch = (colSlot % 2 === 1) ? '^' : '|';
            color = (worldZ >= 49.0) ? '#ffffff' : '#00f0ff';
          } else {
            if (isWindowCol) {
              const isLit = ((colSlot * 5 + floorIdx * 13) % 5 < 3);
              ch = isLit ? ':' : '.';
              color = isLit ? '#e0f2fe' : '#1e293b';
            } else {
              ch = '|';
              color = isFrontSouth ? '#0284c7' : '#0369a1';
            }
            if (Math.abs(worldZ - Math.round(worldZ)) < 0.07) {
              ch = '=';
              color = isFrontSouth ? '#0369a1' : '#075985';
            }
          }
          drawOpaqueChar(col, row, ch, color, depthAlpha, wallBg);
        }
      }
      //tile 12: quantum twin towers (charcoal & mint)
      else if (hitTile === 12) {
        if (tier.maxZ >= 44.0 && drawStart > 0 && drawStart < RENDER_ROWS) {
          drawChar(col, drawStart - 1, '*', '#10b981', depthAlpha);
          drawChar(col, drawStart - 2, 'O', '#6ee7b7', depthAlpha * 0.9);
        }

        for (let row = drawStart; row <= drawEnd; row++) {
          const worldZ = player.z + (horizon - row) / tierScreenH;
          const floorIdx = Math.floor(worldZ * 1.5);
          let ch = ' ';
          let color = '#10b981';
          let wallBg = isFrontSouth ? '#06130e' : '#040d0a';

          const sign = getSignChar(worldHitU % 16, worldZ, 2.5, 13.5, 3.2, 4.6, '[ QUANTUM LABS ]');

          if (sign) {
            ch = sign;
            color = '#6ee7b7';
            wallBg = '#062d1f';
          } else if (worldZ < 2.4) {
            ch = isWindowCol ? ':' : '|';
            color = '#047857';
          } else if (worldZ >= 42.0) {
            ch = (colSlot % 2 === 1) ? '^' : '=';
            color = '#6ee7b7';
          } else {
            if (isWindowCol) {
              const isLit = ((colSlot * 3 + floorIdx * 7) % 6 < 3);
              ch = isLit ? ':' : '.';
              color = isLit ? '#a7f3d0' : '#1e293b';
            } else {
              ch = '|';
              color = '#059669';
            }
            if (Math.abs(worldZ - Math.round(worldZ)) < 0.08) {
              ch = '=';
              color = '#047857';
            }
          }
          drawOpaqueChar(col, row, ch, color, depthAlpha, wallBg);
        }
      }
      //tile 13: metropolis hotel (amber & slate)
      else if (hitTile === 13) {
        for (let row = drawStart; row <= drawEnd; row++) {
          const worldZ = player.z + (horizon - row) / tierScreenH;
          const floorIdx = Math.floor(worldZ * 1.6);
          let ch = ' ';
          let color = '#f59e0b';
          let wallBg = isFrontSouth ? '#140f08' : '#0d0a05';

          const sign1 = getSignChar(worldHitU % 15, worldZ, 3.0, 12.0, 20.0, 21.6, '[ THE METROPOLIS ]');
          const sign2 = getSignChar(worldHitU % 15, worldZ, 3.5, 11.5, 2.8, 4.0, '[ GRAND HOTEL ]');

          if (sign1) {
            ch = sign1;
            color = '#fde047';
            wallBg = '#2b1e06';
          } else if (sign2) {
            ch = sign2;
            color = '#f59e0b';
            wallBg = '#241402';
          } else if (worldZ < 2.4) {
            ch = isWindowCol ? ':' : '|';
            color = '#d97706';
          } else {
            if (isWindowCol) {
              const isLit = ((colSlot * 7 + floorIdx * 5) % 5 < 3);
              ch = isLit ? ':' : '.';
              color = isLit ? '#fed7aa' : '#334155';
            } else {
              const isBalcony = (Math.floor(worldHitU * 2) % 3 === 0);
              ch = isBalcony ? 'H' : '|';
              color = isBalcony ? '#94a3b8' : '#78350f';
            }
            if (Math.abs(worldZ - Math.round(worldZ)) < 0.08) {
              ch = '=';
              color = '#92400e';
            }
          }
          drawOpaqueChar(col, row, ch, color, depthAlpha, wallBg);
        }
      }
      //tile 14: brutalist citadel
      else if (hitTile === 14) {
        for (let row = drawStart; row <= drawEnd; row++) {
          const worldZ = player.z + (horizon - row) / tierScreenH;
          let ch = '#';
          let color = '#94a3b8';
          let wallBg = '#0f172a';

          const sign = getSignChar(worldHitU % 8, worldZ, 1.0, 7.0, 3.0, 4.4, '[ NET-SEC CIVIC ]');

          if (sign) {
            ch = sign;
            color = '#f97316';
            wallBg = '#2a1205';
          } else if (worldZ < 2.4) {
            ch = '#';
            color = '#475569';
          } else if (worldZ >= 24.0) {
            ch = '=';
            color = '#cbd5e1';
          } else {
            const isFin = (Math.floor(worldHitU * 4) % 2 === 0);
            ch = isFin ? '|' : ':';
            color = isFin ? '#94a3b8' : '#0284c7';
            if (Math.abs(worldZ - Math.round(worldZ)) < 0.08) {
              ch = '=';
              color = '#64748b';
            }
          }
          drawOpaqueChar(col, row, ch, color, depthAlpha, wallBg);
        }
      }
      //tile 15: cyber arcade
      else if (hitTile === 15) {
        for (let row = drawStart; row <= drawEnd; row++) {
          const worldZ = player.z + (horizon - row) / tierScreenH;
          let ch = ' ';
          let color = '#06b6d4';
          let wallBg = '#0c071a';

          const sign1 = getSignChar(worldHitU % 8, worldZ, 1.0, 7.0, 3.0, 4.6, '[ CYBER ARCADE ]');
          const sign2 = getSignChar(worldHitU % 8, worldZ, 1.5, 6.5, 13.5, 15.0, '[ VR LOUNGE ]');

          if (sign1) {
            ch = sign1;
            color = '#ec4899';
            wallBg = '#27082e';
          } else if (sign2) {
            ch = sign2;
            color = '#facc15';
            wallBg = '#261a04';
          } else if (worldZ < 2.4) {
            ch = isWindowCol ? ':' : '|';
            color = '#8b5cf6';
          } else {
            const gridPattern = (Math.floor(worldHitU * 2) + Math.floor(worldZ * 1.5)) % 3;
            ch = (gridPattern === 0) ? ':' : ((gridPattern === 1) ? '.' : '|');
            color = (gridPattern === 0) ? '#06b6d4' : ((gridPattern === 1) ? '#ec4899' : '#6366f1');
          }
          drawOpaqueChar(col, row, ch, color, depthAlpha, wallBg);
        }
      }
      //tile 16: ramen bar
      else if (hitTile === 16) {
        for (let row = drawStart; row <= drawEnd; row++) {
          const worldZ = player.z + (horizon - row) / tierScreenH;
          let ch = '#';
          let color = '#ef4444';
          let wallBg = '#140505';

          const sign = getSignChar(worldHitU % 16, worldZ, 4.5, 11.5, 2.6, 3.8, '[ RAMEN 24/7 ]');

          if (sign) {
            ch = sign;
            color = '#f59e0b';
            wallBg = '#2e0a0a';
          } else if (worldZ >= 5.5) {
            ch = (Math.floor(worldHitU * 4) % 3 === 0) ? 'o' : '=';
            color = '#94a3b8';
          } else if (worldZ < 2.2) {
            const isLantern = (Math.floor(worldHitU * 2) % 2 === 1 && worldZ >= 1.6);
            ch = isLantern ? '@' : '=';
            color = isLantern ? '#ef4444' : '#b45309';
          } else {
            ch = isWindowCol ? ':' : '|';
            color = isWindowCol ? '#fef08a' : '#78350f';
          }
          drawOpaqueChar(col, row, ch, color, depthAlpha, wallBg);
        }
      }
      //tile 17: bodega & cyber-clinic
      else if (hitTile === 17) {
        for (let row = drawStart; row <= drawEnd; row++) {
          const worldZ = player.z + (horizon - row) / tierScreenH;
          let ch = '+';
          let color = '#14b8a6';
          let wallBg = '#041715';

          const sign1 = getSignChar(worldHitU % 15, worldZ, 3.0, 12.0, 2.6, 3.8, '[ CYBERWARE CLINIC ]');
          const sign2 = getSignChar(worldHitU % 15, worldZ, 3.5, 11.5, 5.4, 6.6, '[ 24H TECH MART ]');

          if (sign1) {
            ch = sign1;
            color = '#14b8a6';
            wallBg = '#042b26';
          } else if (sign2) {
            ch = sign2;
            color = '#fde047';
            wallBg = '#292002';
          } else if (worldZ >= 6.5) {
            ch = (Math.floor(worldHitU * 3) % 2 === 0) ? 'O' : '=';
            color = '#64748b';
          } else if (worldZ < 2.4) {
            ch = isWindowCol ? ':' : '|';
            color = '#0f766e';
          } else {
            ch = isWindowCol ? ':' : '|';
            color = isWindowCol ? '#a7f3d0' : '#115e59';
          }
          drawOpaqueChar(col, row, ch, color, depthAlpha, wallBg);
        }
      }
      //tile 18: brick brownstones
      else {
        for (let row = drawStart; row <= drawEnd; row++) {
          const worldZ = player.z + (horizon - row) / tierScreenH;
          const floorIdx = Math.floor(worldZ * 1.5);
          let ch = '#';
          let color = '#b91c1c';
          let wallBg = '#140606';

          if (worldZ >= 8.2) {
            ch = (Math.floor(worldHitU * 4) % 2 === 0) ? '^' : '=';
            color = '#cbd5e1';
          } else if (worldZ < 2.2) {
            ch = (Math.floor(worldHitU * 4) % 4 === 1) ? '|' : '=';
            color = '#94a3b8';
          } else {
            if (isWindowCol) {
              const isLit = ((colSlot * 3 + floorIdx * 5) % 4 < 3);
              ch = isLit ? ':' : '.';
              color = isLit ? '#fed7aa' : '#334155';
            } else {
              const isFireEscape = (Math.floor(worldHitU * 2) % 3 === 0);
              ch = isFireEscape ? 'H' : '#';
              color = isFireEscape ? '#475569' : '#991b1b';
            }
          }
          drawOpaqueChar(col, row, ch, color, depthAlpha, wallBg);
        }
      }
      if (topClip <= 0) break;
    }
  }

  //frustum culling query against spatial grids
  const p1x = player.x;
  const p1y = player.y;
  const p2x = player.x + (cosPlayerAngle - planeX) * MAX_DEPTH;
  const p2y = player.y + (sinPlayerAngle - planeY) * MAX_DEPTH;
  const p3x = player.x + (cosPlayerAngle + planeX) * MAX_DEPTH;
  const p3y = player.y + (sinPlayerAngle + planeY) * MAX_DEPTH;

  const frustumMinX = Math.min(p1x, Math.min(p2x, p3x)) - 2.5;
  const frustumMaxX = Math.max(p1x, Math.max(p2x, p3x)) + 2.5;
  const frustumMinY = Math.min(p1y, Math.min(p2y, p3y)) - 2.5;
  const frustumMaxY = Math.max(p1y, Math.max(p2y, p3y)) + 2.5;

  const visibleStatic = staticSpatialGrid.queryAABB(frustumMinX, frustumMinY, frustumMaxX, frustumMaxY, _visibleStaticBuffer);
  const visibleDynamic = dynamicSpatialGrid.queryAABB(frustumMinX, frustumMinY, frustumMaxX, frustumMaxY, _visibleDynamicBuffer);

  cullVisibleCount = visibleStatic.length + visibleDynamic.length;
  cullTotalCount = trees.length + streetLights.length + trafficLights.length + vehicles.length + pedestrians.length + (config.particles ? particles.length : 0);

  // -------------------------------------------------------------------------
  // 10. 3d vehicles with yaw rotation
  // -------------------------------------------------------------------------
  if (isTrafficActive) {
    for (let c = 0; c < visibleDynamic.length; c++) {
      const car = visibleDynamic[c];
      if (car.entityType !== 'vehicle') continue;
      const dx = car.x - player.x;
      const dy = car.y - player.y;

      const fwdDepth = dx * cosPlayerAngle + dy * sinPlayerAngle;
      if (fwdDepth <= 0.25 || fwdDepth > MAX_DEPTH) continue;

      const lateral = -dx * sinPlayerAngle + dy * cosPlayerAngle;
      const centerCol = (0.5 + (lateral / (fwdDepth * halfFovTan)) * 0.5) * RENDER_COLS;

      const halfL = car.length * 0.5;
      const halfW = car.width * 0.5;
      const carBoundR = Math.hypot(halfL, halfW) + 0.35;
      const radCols = (carBoundR / (fwdDepth * halfFovTan)) * (RENDER_COLS * 0.5);

      const minCol = Math.max(0, Math.floor(centerCol - radCols));
      const maxCol = Math.min(RENDER_COLS - 1, Math.ceil(centerCol + radCols));
      if (minCol > maxCol) continue;

      const minDepth = Math.max(0.12, fwdDepth - carBoundR);
      const screenHNear = (RENDER_ROWS * PROJECTION_SCALE) / minDepth;
      const rowTop = Math.max(0, Math.floor(horizon - (car.roofZ + 0.35 - player.z) * screenHNear));
      const rowBottom = Math.min(RENDER_ROWS - 1, Math.ceil(horizon - (0.0 - player.z) * screenHNear));
      if (rowTop > rowBottom) continue;

      const carAngle = car.angle || 0;
      const cosCar = Math.cos(carAngle);
      const sinCar = Math.sin(carAngle);

      //car local origin relative to player
      const startXLocal = -dx * cosCar - dy * sinCar;
      const startYLocal = dx * sinCar - dy * cosCar;

      const boxes = (car.type === 'bus') ? [
        //bus main body (tall rectangular monocoque)
        {
          minX: -halfL * 0.96, maxX: halfL * 0.96,
          minY: -halfW * 0.94, maxY: halfW * 0.94,
          minZ: 0.18, maxZ: car.roofZ,
          type: 'bus_body'
        },
        //front-left wheel
        {
          minX: halfL * 0.50, maxX: halfL * 0.78,
          minY: halfW * 0.78, maxY: halfW * 1.05,
          minZ: 0.0, maxZ: 0.38,
          type: 'wheel'
        },
        //front-right wheel
        {
          minX: halfL * 0.50, maxX: halfL * 0.78,
          minY: -halfW * 1.05, maxY: -halfW * 0.78,
          minZ: 0.0, maxZ: 0.38,
          type: 'wheel'
        },
        //rear-left wheel
        {
          minX: -halfL * 0.78, maxX: -halfL * 0.50,
          minY: halfW * 0.78, maxY: halfW * 1.05,
          minZ: 0.0, maxZ: 0.38,
          type: 'wheel'
        },
        //rear-right wheel
        {
          minX: -halfL * 0.78, maxX: -halfL * 0.50,
          minY: -halfW * 1.05, maxY: -halfW * 0.78,
          minZ: 0.0, maxZ: 0.38,
          type: 'wheel'
        }
      ] : [
        //hood / front end
        {
          minX: halfL * 0.28, maxX: halfL,
          minY: -halfW * 0.90, maxY: halfW * 0.90,
          minZ: 0.16, maxZ: car.hoodZ,
          type: 'hood'
        },
        //cabin / greenhouse
        {
          minX: -halfL * 0.38, maxX: halfL * 0.28,
          minY: -halfW * 0.92, maxY: halfW * 0.92,
          minZ: 0.16, maxZ: car.roofZ,
          type: 'cabin'
        },
        //trunk / rear end
        {
          minX: -halfL, maxX: -halfL * 0.38,
          minY: -halfW * 0.90, maxY: halfW * 0.90,
          minZ: 0.16, maxZ: car.beltZ * 0.95,
          type: 'trunk'
        },
        //front-left wheel
        {
          minX: halfL * 0.40, maxX: halfL * 0.70,
          minY: halfW * 0.78, maxY: halfW * 1.05,
          minZ: 0.0, maxZ: 0.34,
          type: 'wheel'
        },
        //front-right wheel
        {
          minX: halfL * 0.40, maxX: halfL * 0.70,
          minY: -halfW * 1.05, maxY: -halfW * 0.78,
          minZ: 0.0, maxZ: 0.34,
          type: 'wheel'
        },
        //rear-left wheel
        {
          minX: -halfL * 0.70, maxX: -halfL * 0.40,
          minY: halfW * 0.78, maxY: halfW * 1.05,
          minZ: 0.0, maxZ: 0.34,
          type: 'wheel'
        },
        //rear-right wheel
        {
          minX: -halfL * 0.70, maxX: -halfL * 0.40,
          minY: -halfW * 1.05, maxY: -halfW * 0.78,
          minZ: 0.0, maxZ: 0.34,
          type: 'wheel'
        }
      ];

      if (car.type === 'taxi') {
        boxes.push({
          minX: -0.22, maxX: 0.22,
          minY: -0.25, maxY: 0.25,
          minZ: car.roofZ, maxZ: car.roofZ + 0.14,
          type: 'taxilight'
        });
      }

      for (let col = minCol; col <= maxCol; col++) {
        const cameraX = (2 * (col + 0.5) / RENDER_COLS) - 1;
        const rayDirX = cosPlayerAngle + planeX * cameraX;
        const rayDirY = sinPlayerAngle + planeY * cameraX;
        const rayLen = Math.hypot(rayDirX, rayDirY);
        const cosAngle = rayDirX / rayLen;
        const sinAngle = rayDirY / rayLen;
        const cosOffset = 1.0 / rayLen;

        //ray direction in car local space
        const dirXLocal = cosAngle * cosCar + sinAngle * sinCar;
        const dirYLocal = -cosAngle * sinCar + sinAngle * cosCar;

        const invDx = (Math.abs(dirXLocal) > 1e-5) ? (1.0 / dirXLocal) : 1e5;
        const invDy = (Math.abs(dirYLocal) > 1e-5) ? (1.0 / dirYLocal) : 1e5;

        for (let row = rowTop; row <= rowBottom; row++) {
          const Dz = (horizon - row) / (RENDER_ROWS * PROJECTION_SCALE);
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

            const dzP = player.z;
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
                hitWorldZ = player.z + hitT * Dz;

                if (tEnter === tminZ && Dz < 0) hitFace = 'top';
                else if (tEnter === tminX || tEnter === tmaxX) hitFace = 'frontback';
                else hitFace = 'side';
              }
            }
          }

          if (bestPart === null || closestCarTHit === Infinity) continue;

          const corrDistCar = closestCarTHit * cosOffset;
          const pixIdx = col * RENDER_ROWS + row;
          if (corrDistCar >= pixelDepthBuffer[pixIdx]) continue;
          pixelDepthBuffer[pixIdx] = corrDistCar;

          const isNoseBumper = (hitLocalX > halfL * 0.88);
          const isRearBumper = (hitLocalX < -halfL * 0.88);

          let ch = '#';
          let color = car.primaryColor;
          let cellBg = car.baseBg;

          //wheels
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
          }
          //bus body & features
          else if (car.type === 'bus') {
            if (hitFace === 'top') {
              const isAC = (Math.abs(hitLocalX) < halfL * 0.45 && Math.abs(hitLocalY) < halfW * 0.55);
              ch = isAC ? '#' : '=';
              color = isAC ? '#94a3b8' : car.highlightColor;
              cellBg = isAC ? '#1e293b' : car.baseBg;
            } else if (isNoseBumper) {
              //front destination sign (amber LED)
              if (hitWorldZ >= 1.45 && hitWorldZ <= 1.72) {
                ch = (Math.abs(hitLocalY) < halfW * 0.65) ? '=' : '#';
                color = '#facc15';
                cellBg = '#020617';
              }
              //panoramic windshield
              else if (hitWorldZ >= 0.72 && hitWorldZ < 1.45) {
                const isWiper = (hitWorldZ < 0.80 && Math.abs(hitLocalY) < halfW * 0.65);
                ch = isWiper ? '/' : ((Math.abs(hitLocalY) < 0.04) ? '|' : '=');
                color = isWiper ? '#0f172a' : '#38bdf8';
                cellBg = isWiper ? '#1e293b' : '#0c4a6e';
              }
              //front dual headlights & transit badge
              else if (hitWorldZ >= 0.32 && hitWorldZ < 0.62 && Math.abs(hitLocalY) > halfW * 0.45 && Math.abs(hitLocalY) < halfW * 0.88) {
                ch = (hitWorldZ > 0.38 && hitWorldZ < 0.55) ? '*' : 'O';
                color = '#ffffff';
                cellBg = '#64748b';
              } else {
                ch = (Math.abs(hitLocalY) < halfW * 0.35) ? '|' : '=';
                color = '#334155';
                cellBg = '#020617';
              }
            } else if (isRearBumper) {
              //rear route number
              if (hitWorldZ >= 1.48) {
                ch = '=';
                color = '#facc15';
                cellBg = '#020617';
              }
              //rear passenger window
              else if (hitWorldZ >= 0.85 && hitWorldZ < 1.45) {
                ch = '=';
                color = '#38bdf8';
                cellBg = '#0c4a6e';
              }
              //rear brake lights
              else if (hitWorldZ >= 0.44 && hitWorldZ < 0.75 && Math.abs(hitLocalY) > halfW * 0.48) {
                ch = '*';
                color = '#ff0055';
                cellBg = '#881337';
              }
              //rear diesel / electric engine ventilation grille
              else {
                ch = (Math.floor(hitLocalY * 12) % 2 === 0) ? '|' : '#';
                color = '#475569';
                cellBg = '#020617';
              }
            } else {
              //side passenger windows
              if (hitWorldZ >= 0.78 && hitWorldZ < 1.55) {
                const isPillar = (Math.floor((hitLocalX + halfL) * 2.5) % 2 === 0);
                ch = isPillar ? '|' : '=';
                color = isPillar ? '#0f172a' : '#38bdf8';
                cellBg = isPillar ? '#020617' : '#075985';
              }
              //lower transit livery panels
              else {
                const isStripe = (hitWorldZ >= 0.60 && hitWorldZ <= 0.76);
                ch = isStripe ? '=' : '#';
                color = isStripe ? car.highlightColor : car.primaryColor;
                cellBg = car.baseBg;
              }
            }
          }
          //taxi dome light
          else if (bestPart === 'taxilight') {
            ch = (Math.abs(hitLocalX) < 0.10) ? '*' : '=';
            color = '#fffb00';
            cellBg = '#451a03';
          }
          //cabin greenhouse
          else if (bestPart === 'cabin' && hitWorldZ > car.beltZ) {
            if (hitFace === 'top') {
              ch = '=';
              color = car.highlightColor;
              cellBg = car.baseBg;
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
          }
          //front headlights & grille
          else if (isNoseBumper) {
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
          }
          //rear lights & plate
          else if (isRearBumper) {
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
          }
          //hood, trunk & body lacquer
          else {
            if (hitFace === 'top') {
              ch = (Math.abs(hitLocalY) < 0.08) ? '|' : '=';
              color = car.highlightColor;
              cellBg = car.baseBg;
            } else if (car.type === 'taxi' && hitWorldZ >= 0.44 && hitWorldZ <= 0.58 && Math.abs(hitLocalX) < halfL * 0.70) {
              const checkSlot = (Math.floor(hitLocalX * 6.5) % 2 === 0);
              ch = checkSlot ? '#' : ':';
              color = checkSlot ? '#0f172a' : '#ffffff';
              cellBg = checkSlot ? '#1e293b' : '#94a3b8';
            } else {
              ch = (Math.abs(hitLocalY) > halfW * 0.80) ? '#' : 'H';
              color = (hitWorldZ > car.beltZ * 0.6) ? car.primaryColor : car.shadowColor;
              cellBg = car.baseBg;
            }
          }

          drawOpaqueChar(col, row, ch, color, 1.0, cellBg);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 11. 3d street lamps
  // -------------------------------------------------------------------------
  for (let l = 0; l < visibleStatic.length; l++) {
    const lamp = visibleStatic[l];
    if (lamp.entityType !== 'lamp') continue;
    const dx = lamp.x - player.x;
    const dy = lamp.y - player.y;

    const fwdDepth = dx * cosPlayerAngle + dy * sinPlayerAngle;
    if (fwdDepth <= 0.25 || fwdDepth > MAX_DEPTH) continue;

    const lateral = -dx * sinPlayerAngle + dy * cosPlayerAngle;
    const centerCol = (0.5 + (lateral / (fwdDepth * halfFovTan)) * 0.5) * RENDER_COLS;

    const lampR = 0.65;
    const radCols = (lampR / (fwdDepth * halfFovTan)) * (RENDER_COLS * 0.5);

    const minCol = Math.max(0, Math.floor(centerCol - radCols));
    const maxCol = Math.min(RENDER_COLS - 1, Math.ceil(centerCol + radCols));
    if (minCol > maxCol) continue;

    const minDepthL = Math.max(0.05, fwdDepth - lampR);
    const maxDepthL = fwdDepth + lampR;
    const lr1 = horizon - (3.10 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / minDepthL;
    const lr2 = horizon - (3.10 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / maxDepthL;
    const lr3 = horizon - (0.00 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / minDepthL;
    const lr4 = horizon - (0.00 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / maxDepthL;

    const rowTop = Math.max(0, Math.floor(Math.min(lr1, lr2, lr3, lr4)));
    const rowBottom = Math.min(RENDER_ROWS - 1, Math.ceil(Math.max(lr1, lr2, lr3, lr4)));
    if (rowTop > rowBottom) continue;

    const poleR = 0.075;
    const segAx = lamp.x;
    const segAy = lamp.y;
    const segAz = 2.85;
    const segBx = lamp.headX;
    const segBy = lamp.headY;
    const segBz = 2.85;

    const segVx = segBx - segAx;
    const segVy = segBy - segAy;
    const segVz = segBz - segAz;
    const segLenSq = segVx * segVx + segVy * segVy + segVz * segVz;

    const headDx = player.x - lamp.headX;
    const headDy = player.y - lamp.headY;
    const headDz = player.z - 2.85;
    const headRadXY = 0.14;
    const headRadZ = 0.15;
    const invHRXYSq = 1.0 / (headRadXY * headRadXY);
    const invHRZSq = 1.0 / (headRadZ * headRadZ);

    for (let col = minCol; col <= maxCol; col++) {
      const cameraX = (2 * (col + 0.5) / RENDER_COLS) - 1;
      const rayDirX = cosPlayerAngle + planeX * cameraX;
      const rayDirY = sinPlayerAngle + planeY * cameraX;
      const rayLen = Math.hypot(rayDirX, rayDirY);
      const cosAngle = rayDirX / rayLen;
      const sinAngle = rayDirY / rayLen;
      const cosOffset = 1.0 / rayLen;

      //vertical pole cylinder
      const vxP = lamp.x - player.x;
      const vyP = lamp.y - player.y;
      const tProjP = vxP * cosAngle + vyP * sinAngle;

      if (tProjP > 0.12) {
        const dPerpSqP = (vxP * vxP + vyP * vyP) - (tProjP * tProjP);
        if (dPerpSqP < poleR * poleR) {
          const dtPole = Math.sqrt(poleR * poleR - dPerpSqP);
          const hitDistPole = tProjP - dtPole;
          const corrDistPole = hitDistPole * cosOffset;

          const poleScreenH = (RENDER_ROWS * PROJECTION_SCALE / corrDistPole);
          const pRowTop = Math.max(0, Math.floor(horizon - (2.85 - player.z) * poleScreenH));
          const pRowBottom = Math.min(RENDER_ROWS - 1, Math.ceil(horizon - (0.0 - player.z) * poleScreenH));

          const chordFrac = Math.sqrt(dPerpSqP) / poleR;
          const depthAlpha = Math.max(0.75, 1 - (corrDistPole / MAX_DEPTH));

          for (let row = pRowTop; row <= pRowBottom; row++) {
            const pixIdx = col * RENDER_ROWS + row;
            if (corrDistPole >= pixelDepthBuffer[pixIdx]) continue;
            pixelDepthBuffer[pixIdx] = corrDistPole;

            const worldZ = player.z + (horizon - row) / poleScreenH;

            if (worldZ < 0.35) {
              const ch = (chordFrac < 0.5) ? '#' : 'H';
              drawOpaqueChar(col, row, ch, '#334155', depthAlpha, '#0a0f1a');
            } else {
              let ch = '|';
              let color = (chordFrac < 0.4) ? '#64748b' : ((chordFrac < 0.75) ? '#475569' : '#334155');
              drawOpaqueChar(col, row, ch, color, depthAlpha, '#0a0f1a');
            }
          }
        }
      }

      //horizontal arm & lantern head
      const Wx = player.x - segAx;
      const Wy = player.y - segAy;
      const Wz = player.z - segAz;
      const vDotW = segVx * Wx + segVy * Wy + segVz * Wz;
      const vDotV = segLenSq;

      for (let row = rowTop; row <= rowBottom; row++) {
        const Dz = (horizon - row) / (RENDER_ROWS * PROJECTION_SCALE);

        //arm ray test
        const aDotD = 1.0 + Dz * Dz;
        const aDotV = cosAngle * segVx + sinAngle * segVy + Dz * segVz;
        const dDotW = cosAngle * Wx + sinAngle * Wy + Dz * Wz;

        const denom = aDotD * vDotV - aDotV * aDotV;
        if (Math.abs(denom) > 1e-6) {
          let uOpt = (aDotD * vDotW - aDotV * dDotW) / denom;
          uOpt = Math.max(0.0, Math.min(1.0, uOpt));
          const tOpt = (uOpt * aDotV - dDotW) / aDotD;

          if (tOpt > 0.12) {
            const ptX = segAx + uOpt * segVx;
            const ptY = segAy + uOpt * segVy;
            const ptZ = segAz + uOpt * segVz;

            const rayX = player.x + tOpt * cosAngle;
            const rayY = player.y + tOpt * sinAngle;
            const rayZ = player.z + tOpt * Dz;

            const d3Sq = (rayX - ptX) * (rayX - ptX) + (rayY - ptY) * (rayY - ptY) + (rayZ - ptZ) * (rayZ - ptZ);
            if (d3Sq < 0.003) {
              const corrDistArm = tOpt * cosOffset;
              const pixIdx = col * RENDER_ROWS + row;
              if (corrDistArm < pixelDepthBuffer[pixIdx]) {
                pixelDepthBuffer[pixIdx] = corrDistArm;
                const depthAlpha = Math.max(0.75, 1 - (corrDistArm / MAX_DEPTH));
                drawOpaqueChar(col, row, '=', '#64748b', depthAlpha, '#0a0f1a');
              }
            }
          }
        }

        //lantern head ellipsoid
        const HA = invHRXYSq + (Dz * Dz) * invHRZSq;
        const HB = 2.0 * ((headDx * cosAngle + headDy * sinAngle) * invHRXYSq + (headDz * Dz) * invHRZSq);
        const HC = (headDx * headDx + headDy * headDy) * invHRXYSq + (headDz * headDz) * invHRZSq - 1.0;

        const hDisc = HB * HB - 4.0 * HA * HC;
        if (hDisc >= 0) {
          const htHit = (-HB - Math.sqrt(hDisc)) / (2.0 * HA);
          if (htHit > 0.12) {
            const hCorrDist = htHit * cosOffset;
            const pixIdx = col * RENDER_ROWS + row;
            if (hCorrDist < pixelDepthBuffer[pixIdx]) {
              pixelDepthBuffer[pixIdx] = hCorrDist;
              const hitZ = player.z + htHit * Dz;
              const depthAlpha = Math.max(0.85, 1 - (hCorrDist / MAX_DEPTH));
              const ch = (hitZ >= 2.88) ? '^' : '*';
              const color = (hitZ >= 2.88) ? '#475569' : '#fff275';
              drawOpaqueChar(col, row, ch, color, depthAlpha, '#0a0f1a');
            }
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 12. 3d traffic signals
  // -------------------------------------------------------------------------
  for (let tlIdx = 0; tlIdx < visibleStatic.length; tlIdx++) {
    const tl = visibleStatic[tlIdx];
    if (tl.entityType !== 'trafficLight') continue;

    //vertical mast pole
    const dxPole = tl.x - player.x;
    const dyPole = tl.y - player.y;
    const fwdDepthPole = dxPole * cosPlayerAngle + dyPole * sinPlayerAngle;

    if (fwdDepthPole > 0.05 && fwdDepthPole <= MAX_DEPTH) {
      const lateralPole = -dxPole * sinPlayerAngle + dyPole * cosPlayerAngle;
      const centerColPole = (0.5 + (lateralPole / (Math.max(0.08, fwdDepthPole) * halfFovTan)) * 0.5) * RENDER_COLS;
      const poleR = 0.08;
      const radColsPole = (poleR * 3.5 / (Math.max(0.08, fwdDepthPole) * halfFovTan)) * (RENDER_COLS * 0.5);

      const minColP = (fwdDepthPole <= 0.15) ? 0 : Math.max(0, Math.floor(centerColPole - radColsPole));
      const maxColP = (fwdDepthPole <= 0.15) ? (RENDER_COLS - 1) : Math.min(RENDER_COLS - 1, Math.ceil(centerColPole + radColsPole));

      const minDepthP = Math.max(0.05, fwdDepthPole - poleR);
      const maxDepthP = fwdDepthPole + poleR;
      const pr1 = horizon - (2.85 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / minDepthP;
      const pr2 = horizon - (2.85 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / maxDepthP;
      const pr3 = horizon - (0.00 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / minDepthP;
      const pr4 = horizon - (0.00 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / maxDepthP;

      const pRowTop = Math.max(0, Math.floor(Math.min(pr1, pr2, pr3, pr4)));
      const pRowBottom = Math.min(RENDER_ROWS - 1, Math.ceil(Math.max(pr1, pr2, pr3, pr4)));

      if (minColP <= maxColP && pRowTop <= pRowBottom) {
        for (let col = minColP; col <= maxColP; col++) {
          const cameraX = (2 * (col + 0.5) / RENDER_COLS) - 1;
          const rayDirX = cosPlayerAngle + planeX * cameraX;
          const rayDirY = sinPlayerAngle + planeY * cameraX;
          const rayLen = Math.hypot(rayDirX, rayDirY);
          const cosAngle = rayDirX / rayLen;
          const sinAngle = rayDirY / rayLen;
          const cosOffset = 1.0 / rayLen;

          const vxP = tl.x - player.x;
          const vyP = tl.y - player.y;
          const tProjP = vxP * cosAngle + vyP * sinAngle;

          if (tProjP > 0.04) {
            const dPerpSqP = (vxP * vxP + vyP * vyP) - (tProjP * tProjP);
            if (dPerpSqP < poleR * poleR) {
              const dtPole = Math.sqrt(poleR * poleR - dPerpSqP);
              const hitDistPole = tProjP - dtPole;
              const corrDistPole = hitDistPole * cosOffset;

              const actualPoleScreenH = (RENDER_ROWS * PROJECTION_SCALE / corrDistPole);
              const topR = Math.max(0, Math.floor(horizon - (2.85 - player.z) * actualPoleScreenH));
              const botR = Math.min(RENDER_ROWS - 1, Math.ceil(horizon - (0.0 - player.z) * actualPoleScreenH));
              const chordFrac = Math.sqrt(dPerpSqP) / poleR;
              const depthAlpha = Math.max(0.75, 1 - (corrDistPole / MAX_DEPTH));

              for (let row = topR; row <= botR; row++) {
                const pixIdx = col * RENDER_ROWS + row;
                if (corrDistPole >= pixelDepthBuffer[pixIdx]) continue;
                pixelDepthBuffer[pixIdx] = corrDistPole;

                const worldZ = player.z + (horizon - row) / actualPoleScreenH;
                if (worldZ < 0.35) {
                  drawOpaqueChar(col, row, (chordFrac < 0.5) ? '#' : 'H', '#1e293b', depthAlpha, '#0a0f1a');
                } else {
                  const ch = (chordFrac < 0.35) ? '|' : 'I';
                  const color = (chordFrac < 0.4) ? '#64748b' : '#334155';
                  drawOpaqueChar(col, row, ch, color, depthAlpha, '#0a0f1a');
                }
              }
            }
          }
        }
      }
    }

    //cantilever arm & signal head
    const dxHead = tl.headX - player.x;
    const dyHead = tl.headY - player.y;
    const fwdDepthHead = dxHead * cosPlayerAngle + dyHead * sinPlayerAngle;

    if (fwdDepthHead > 0.05 && fwdDepthHead <= MAX_DEPTH) {
      const lateralHead = -dxHead * sinPlayerAngle + dyHead * cosPlayerAngle;
      const centerColHead = (0.5 + (lateralHead / (Math.max(0.08, fwdDepthHead) * halfFovTan)) * 0.5) * RENDER_COLS;

      const headBoundR = 0.95;
      const radColsHead = (headBoundR / (Math.max(0.08, fwdDepthHead) * halfFovTan)) * (RENDER_COLS * 0.5);

      const minColH = (fwdDepthHead <= 0.20) ? 0 : Math.max(0, Math.floor(centerColHead - radColsHead));
      const maxColH = (fwdDepthHead <= 0.20) ? (RENDER_COLS - 1) : Math.min(RENDER_COLS - 1, Math.ceil(centerColHead + radColsHead));

      const minDepthH = Math.max(0.05, fwdDepthHead - headBoundR);
      const maxDepthH = fwdDepthHead + headBoundR;
      const hr1 = horizon - (2.85 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / minDepthH;
      const hr2 = horizon - (2.85 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / maxDepthH;
      const hr3 = horizon - (1.70 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / minDepthH;
      const hr4 = horizon - (1.70 - player.z) * (RENDER_ROWS * PROJECTION_SCALE) / maxDepthH;

      const hRowTop = Math.max(0, Math.floor(Math.min(hr1, hr2, hr3, hr4)));
      const hRowBottom = Math.min(RENDER_ROWS - 1, Math.ceil(Math.max(hr1, hr2, hr3, hr4)));

      if (minColH <= maxColH && hRowTop <= hRowBottom) {
        const segAx = tl.x;
        const segAy = tl.y;
        const segAz = 2.70;
        const segBx = tl.headX;
        const segBy = tl.headY;
        const segBz = 2.70;
        const segVx = segBx - segAx;
        const segVy = segBy - segAy;
        const segVz = 0;
        const segLenSq = segVx * segVx + segVy * segVy;

        const isAlongX = (tl.facingDir === 'east' || tl.facingDir === 'west');
        const halfW = 0.18; //width across face
        const halfD = 0.09; //thickness
        const boxMinX = tl.headX - (isAlongX ? halfD : halfW);
        const boxMaxX = tl.headX + (isAlongX ? halfD : halfW);
        const boxMinY = tl.headY - (isAlongX ? halfW : halfD);
        const boxMaxY = tl.headY + (isAlongX ? halfW : halfD);
        const boxMinZ = 1.80;
        const boxMaxZ = 2.65;

        for (let col = minColH; col <= maxColH; col++) {
          const cameraX = (2 * (col + 0.5) / RENDER_COLS) - 1;
          const rayDirX = cosPlayerAngle + planeX * cameraX;
          const rayDirY = sinPlayerAngle + planeY * cameraX;
          const rayLen = Math.hypot(rayDirX, rayDirY);
          const cosAngle = rayDirX / rayLen;
          const sinAngle = rayDirY / rayLen;
          const cosOffset = 1.0 / rayLen;

          const invDx = (Math.abs(cosAngle) > 1e-5) ? (1.0 / cosAngle) : 1e5;
          const invDy = (Math.abs(sinAngle) > 1e-5) ? (1.0 / sinAngle) : 1e5;

          const tx1 = (boxMinX - player.x) * invDx;
          const tx2 = (boxMaxX - player.x) * invDx;
          const ty1 = (boxMinY - player.y) * invDy;
          const ty2 = (boxMaxY - player.y) * invDy;

          const tminX = Math.min(tx1, tx2);
          const tmaxX = Math.max(tx1, tx2);
          const tminY = Math.min(ty1, ty2);
          const tmaxY = Math.max(ty1, ty2);

          const Wx = player.x - segAx;
          const Wy = player.y - segAy;
          const Wz = player.z - segAz;
          const vDotW = segVx * Wx + segVy * Wy + segVz * Wz;
          const vDotV = segLenSq;

          for (let row = hRowTop; row <= hRowBottom; row++) {
            const Dz = (horizon - row) / (RENDER_ROWS * PROJECTION_SCALE);

            //horizontal arm cylinder
            const aDotD = 1.0 + Dz * Dz;
            const aDotV = cosAngle * segVx + sinAngle * segVy + Dz * segVz;
            const dDotW = cosAngle * Wx + sinAngle * Wy + Dz * Wz;

            const denom = aDotD * vDotV - aDotV * aDotV;
            if (Math.abs(denom) > 1e-6) {
              let uOpt = (aDotD * vDotW - aDotV * dDotW) / denom;
              uOpt = Math.max(0.0, Math.min(1.0, uOpt));
              const tOpt = (uOpt * aDotV - dDotW) / aDotD;

              if (tOpt > 0.05) {
                const ptX = segAx + uOpt * segVx;
                const ptY = segAy + uOpt * segVy;
                const ptZ = segAz + uOpt * segVz;

                const rayX = player.x + tOpt * cosAngle;
                const rayY = player.y + tOpt * sinAngle;
                const rayZ = player.z + tOpt * Dz;

                const d3Sq = (rayX - ptX) * (rayX - ptX) + (rayY - ptY) * (rayY - ptY) + (rayZ - ptZ) * (rayZ - ptZ);
                if (d3Sq < 0.0035) {
                  const corrDistArm = tOpt * cosOffset;
                  const pixIdx = col * RENDER_ROWS + row;
                  if (corrDistArm < pixelDepthBuffer[pixIdx]) {
                    pixelDepthBuffer[pixIdx] = corrDistArm;
                    const depthAlpha = Math.max(0.75, 1 - (corrDistArm / MAX_DEPTH));
                    drawOpaqueChar(col, row, '=', '#475569', depthAlpha, '#0a0f1a');
                  }
                }
              }
            }

            //signal box raycast
            const invDz = (Math.abs(Dz) > 1e-5) ? (1.0 / Dz) : 1e5;
            const tz1 = (boxMinZ - player.z) * invDz;
            const tz2 = (boxMaxZ - player.z) * invDz;
            const tminZ = Math.min(tz1, tz2);
            const tmaxZ = Math.max(tz1, tz2);

            const tEnter = Math.max(tminX, Math.max(tminY, tminZ));
            const tExit = Math.min(tmaxX, Math.min(tmaxY, tmaxZ));

            if (tEnter <= tExit && tExit > 0.05) {
              const hitT = (tEnter > 0.05) ? tEnter : tExit;
              const corrDist = hitT * cosOffset;
              const pixIdx = col * RENDER_ROWS + row;
              if (corrDist < pixelDepthBuffer[pixIdx]) {
                pixelDepthBuffer[pixIdx] = corrDist;

                const hitWorldX = player.x + hitT * cosAngle;
                const hitWorldY = player.y + hitT * sinAngle;
                const hitWorldZ = player.z + hitT * Dz;

                let isFrontFace = false;
                if (tl.facingDir === 'west') {
                  isFrontFace = (cosAngle > 0 && Math.abs(tEnter - tminX) < 1e-3);
                } else if (tl.facingDir === 'east') {
                  isFrontFace = (cosAngle < 0 && Math.abs(tEnter - tminX) < 1e-3);
                } else if (tl.facingDir === 'north') {
                  isFrontFace = (sinAngle > 0 && Math.abs(tEnter - tminY) < 1e-3);
                } else if (tl.facingDir === 'south') {
                  isFrontFace = (sinAngle < 0 && Math.abs(tEnter - tminY) < 1e-3);
                }

                let ch = '#';
                let color = '#d97706';
                let cellBg = '#0f172a';

                if (isFrontFace) {
                  const localLateral = isAlongX ? (hitWorldY - tl.headY) : (hitWorldX - tl.headX);

                  //red lens
                  if (hitWorldZ >= 2.38 && hitWorldZ <= 2.64) {
                    const dCenterSq = localLateral * localLateral + Math.pow(hitWorldZ - 2.51, 2);
                    if (dCenterSq < 0.011) {
                      ch = (dCenterSq < 0.0035) ? '*' : 'O';
                      color = (tl.activeState === 'red') ? '#ff0033' : '#7f1d1d';
                      cellBg = (tl.activeState === 'red') ? '#450a0a' : '#18181b';
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
                      color = (tl.activeState === 'yellow') ? '#ffcc00' : '#78350f';
                      cellBg = (tl.activeState === 'yellow') ? '#451a03' : '#18181b';
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
                      color = (tl.activeState === 'green') ? '#00ff88' : '#064e3b';
                      cellBg = (tl.activeState === 'green') ? '#064e3b' : '#18181b';
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
                  const isSide = isAlongX ? (Math.abs(hitWorldX - tl.headX) > halfD * 0.75) : (Math.abs(hitWorldY - tl.headY) > halfD * 0.75);
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

                const depthAlpha = Math.max(0.85, 1 - (corrDist / MAX_DEPTH));
                drawOpaqueChar(col, row, ch, color, depthAlpha, cellBg);
              }
            }
          }
        }
      }
    }
  }

  //3d trees
  const PURE_ASCII_BARK = ['#', 'H', '|', 'I', '%', '&', '#', '8'];
  const PURE_ASCII_LEAVES = ['@', '8', '0', '&', '%', '*', 'o', '#', 's', 'O'];

  for (let t = 0; t < visibleStatic.length; t++) {
    const tree = visibleStatic[t];
    if (tree.entityType !== 'tree') continue;
    const dx = tree.x - player.x;
    const dy = tree.y - player.y;

    const fwdDepth = dx * cosPlayerAngle + dy * sinPlayerAngle;
    if (fwdDepth <= 0.35 || fwdDepth > MAX_DEPTH) continue;

    const lateral = -dx * sinPlayerAngle + dy * cosPlayerAngle;
    const centerCol = (0.5 + (lateral / (fwdDepth * halfFovTan)) * 0.5) * RENDER_COLS;

    const treeR = 0.85 * tree.widthScale;
    const radCols = (treeR / (fwdDepth * halfFovTan)) * (RENDER_COLS * 0.5);

    const minCol = Math.max(0, Math.floor(centerCol - radCols));
    const maxCol = Math.min(RENDER_COLS - 1, Math.ceil(centerCol + radCols));
    if (minCol > maxCol) continue;

    const minDepth = Math.max(0.12, fwdDepth - treeR);
    const screenHNear = (RENDER_ROWS * PROJECTION_SCALE) / minDepth;
    const rowTop = Math.max(0, Math.floor(horizon - (tree.topZ + 0.25 - player.z) * screenHNear));
    const rowBottom = Math.min(RENDER_ROWS - 1, Math.ceil(horizon - (0.0 - player.z) * screenHNear));
    if (rowTop > rowBottom) continue;

    const trunkR = 0.095;

    for (let col = minCol; col <= maxCol; col++) {
      const cameraX = (2 * (col + 0.5) / RENDER_COLS) - 1;
      const rayDirX = cosPlayerAngle + planeX * cameraX;
      const rayDirY = sinPlayerAngle + planeY * cameraX;
      const rayLen = Math.hypot(rayDirX, rayDirY);
      const cosAngle = rayDirX / rayLen;
      const sinAngle = rayDirY / rayLen;
      const cosOffset = 1.0 / rayLen;

      //trunk cylinder
      const vxP = tree.x - player.x;
      const vyP = tree.y - player.y;
      const tProjP = vxP * cosAngle + vyP * sinAngle;

      if (tProjP > 0.12) {
        const dPerpSqP = (vxP * vxP + vyP * vyP) - (tProjP * tProjP);
        if (dPerpSqP < trunkR * trunkR) {
          const dtTrunk = Math.sqrt(trunkR * trunkR - dPerpSqP);
          const hitDistTrunk = tProjP - dtTrunk;
          const corrDistTrunk = hitDistTrunk * cosOffset;

          const trunkScreenH = (RENDER_ROWS * PROJECTION_SCALE / corrDistTrunk);
          const tRowTop = Math.max(0, Math.floor(horizon - (tree.forkZ + 0.35 - player.z) * trunkScreenH));
          const tRowBottom = Math.min(RENDER_ROWS - 1, Math.ceil(horizon - (0.0 - player.z) * trunkScreenH));

          const hitWorldX = player.x + hitDistTrunk * cosAngle;
          const hitWorldY = player.y + hitDistTrunk * sinAngle;
          const normAngle = Math.atan2(hitWorldY - tree.y, hitWorldX - tree.x);
          const sunDot = Math.cos(normAngle - (-Math.PI * 0.3));
          const chordFrac = Math.sqrt(dPerpSqP) / trunkR;
          const depthAlpha = Math.max(0.70, 1 - (corrDistTrunk / MAX_DEPTH));

          for (let row = tRowTop; row <= tRowBottom; row++) {
            const pixIdx = col * RENDER_ROWS + row;
            if (corrDistTrunk >= pixelDepthBuffer[pixIdx]) continue;
            pixelDepthBuffer[pixIdx] = corrDistTrunk;

            const worldZ = player.z + (horizon - row) / trunkScreenH;
            const grainNoise = Math.sin(normAngle * 5.0 + worldZ * 8.0 + tree.seed * 7.0);
            const barkIndex = Math.abs(Math.floor(grainNoise * 4.0 + 4.0)) % PURE_ASCII_BARK.length;
            let ch = PURE_ASCII_BARK[barkIndex];
            let color = (sunDot > 0.2) ? '#744729' : '#472714';
            const trunkBg = (sunDot > 0.2) ? '#2a1808' : '#1a0e06';

            drawOpaqueChar(col, row, ch, color, depthAlpha, trunkBg);
          }
        }
      }

      //canopy bough ellipsoids
      for (let row = rowTop; row <= rowBottom; row++) {
        const Dz = (horizon - row) / (RENDER_ROWS * PROJECTION_SCALE);

        let closestTHit = Infinity;
        let bestBough = null;

        for (let b = 0; b < tree.boughs.length; b++) {
          const bough = tree.boughs[b];
          const bdx = player.x - bough.x;
          const bdy = player.y - bough.y;
          const bdz = player.z - bough.z;

          const invRadXYSq = bough.invRadXYSq;
          const invRadZSq = bough.invRadZSq;

          const A = invRadXYSq + (Dz * Dz) * invRadZSq;
          const B = 2.0 * ((bdx * cosAngle + bdy * sinAngle) * invRadXYSq + (bdz * Dz) * invRadZSq);
          const C = (bdx * bdx + bdy * bdy) * invRadXYSq + (bdz * bdz) * invRadZSq - 1.0;

          const disc = B * B - 4.0 * A * C;
          if (disc >= 0) {
            const tHit = (-B - Math.sqrt(disc)) / (2.0 * A);
            if (tHit > 0.12 && tHit < closestTHit) {
              closestTHit = tHit;
              bestBough = bough;
            }
          }
        }

        if (bestBough === null || closestTHit === Infinity) continue;

        const corrDist = closestTHit * cosOffset;
        const pixIdx = col * RENDER_ROWS + row;
        if (corrDist >= pixelDepthBuffer[pixIdx]) continue;
        pixelDepthBuffer[pixIdx] = corrDist;

        const hitX = player.x + closestTHit * cosAngle;
        const hitY = player.y + closestTHit * sinAngle;
        const hitZ = player.z + closestTHit * Dz;

        const nx = (hitX - bestBough.x) / bestBough.radXY;
        const ny = (hitY - bestBough.y) / bestBough.radXY;
        const nz = (hitZ - bestBough.z) / bestBough.radZ;

        const lobe = 0.10 * Math.sin(nx * 5.0 + hitZ * 7.0 + tree.seed * 13.0);
        const sunDot = (nx + lobe) * 0.40 - (ny - lobe) * 0.65 + nz * 0.60;
        const depthAlpha = Math.max(0.60, 1 - (corrDist / MAX_DEPTH));

        const texNoise = Math.sin(col * 9.1 + row * 15.7 + tree.seed * 23.0);
        const texIdx = Math.abs(Math.floor((texNoise + 1.0) * 5.0)) % PURE_ASCII_LEAVES.length;
        let ch = PURE_ASCII_LEAVES[texIdx];
        let color = (sunDot > 0.20) ? '#2ed573' : ((sunDot > -0.25) ? '#1fb559' : '#137537');
        const leafBg = (sunDot > 0.20) ? '#0a2e15' : ((sunDot > -0.25) ? '#071f0e' : '#041408');

        drawOpaqueChar(col, row, ch, color, depthAlpha, leafBg);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 13. 3d articulated pedestrians (gait cycle)
  // -------------------------------------------------------------------------
  for (let p = 0; p < visibleDynamic.length; p++) {
    const ped = visibleDynamic[p];
    if (ped.entityType !== 'pedestrian') continue;
    const dx = ped.x - player.x;
    const dy = ped.y - player.y;

    const fwdDepth = dx * cosPlayerAngle + dy * sinPlayerAngle;
    if (fwdDepth <= 0.25 || fwdDepth > MAX_DEPTH) continue;

    const lateral = -dx * sinPlayerAngle + dy * cosPlayerAngle;
    const centerCol = (0.5 + (lateral / (fwdDepth * halfFovTan)) * 0.5) * RENDER_COLS;

    const pedBoundR = 0.35;
    const radCols = (pedBoundR / (fwdDepth * halfFovTan)) * (RENDER_COLS * 0.5);

    const minCol = Math.max(0, Math.floor(centerCol - radCols));
    const maxCol = Math.min(RENDER_COLS - 1, Math.ceil(centerCol + radCols));
    if (minCol > maxCol) continue;

    const minDepth = Math.max(0.12, fwdDepth - pedBoundR);
    const screenHNear = (RENDER_ROWS * PROJECTION_SCALE) / minDepth;
    const rowTop = Math.max(0, Math.floor(horizon - (ped.height + 0.10 - player.z) * screenHNear));
    const rowBottom = Math.min(RENDER_ROWS - 1, Math.ceil(horizon - (0.0 - player.z) * screenHNear));
    if (rowTop > rowBottom) continue;

    const pedAngle = ped.angle || 0;
    const cosPed = Math.cos(pedAngle);
    const sinPed = Math.sin(pedAngle);

    //pedestrian local coords
    const startXLocal = -dx * cosPed - dy * sinPed;
    const startYLocal = dx * sinPed - dy * cosPed;

    //gait cycle
    const cycle = ped.walkCycle;
    const strideSin = Math.sin(cycle);

    //vertical bounce & hip sway
    const verticalBounce = (1.0 - Math.abs(strideSin)) * 0.024;
    const hipSway = strideSin * 0.012;

    //leg & arm motion
    const leftThighOffset = strideSin * 0.08;
    const leftFootOffset = strideSin * 0.15;
    const leftFootZLift = Math.max(0, strideSin) * 0.048;

    const rightThighOffset = -strideSin * 0.08;
    const rightFootOffset = -strideSin * 0.15;
    const rightFootZLift = Math.max(0, -strideSin) * 0.048;

    const armSwing = -strideSin * 0.09;

    const headZBase = 0.74 + verticalBounce;
    const headZTop = ped.height + verticalBounce;
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
      const cameraX = (2 * (col + 0.5) / RENDER_COLS) - 1;
      const rayDirX = cosPlayerAngle + planeX * cameraX;
      const rayDirY = sinPlayerAngle + planeY * cameraX;
      const rayLen = Math.hypot(rayDirX, rayDirY);
      const cosAngle = rayDirX / rayLen;
      const sinAngle = rayDirY / rayLen;
      const cosOffset = 1.0 / rayLen;

      //ray dir in ped local space
      const dirXLocal = cosAngle * cosPed + sinAngle * sinPed;
      const dirYLocal = -cosAngle * sinPed + sinAngle * cosPed;

      const invDx = (Math.abs(dirXLocal) > 1e-5) ? (1.0 / dirXLocal) : 1e5;
      const invDy = (Math.abs(dirYLocal) > 1e-5) ? (1.0 / dirYLocal) : 1e5;

      for (let row = rowTop; row <= rowBottom; row++) {
        const Dz = (horizon - row) / (RENDER_ROWS * PROJECTION_SCALE);
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

          const dzP = player.z;
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
              hitWorldZ = player.z + hitT * Dz;

              if (tEnter === tminZ && Dz < 0) hitFace = 'top';
              else if (tEnter === tminX || tEnter === tmaxX) hitFace = 'frontback';
              else hitFace = 'side';
            }
          }
        }

        if (bestPart === null || closestPedTHit === Infinity) continue;

        const corrDistPed = closestPedTHit * cosOffset;
        const pixIdx = col * RENDER_ROWS + row;
        if (corrDistPed >= pixelDepthBuffer[pixIdx]) continue;
        pixelDepthBuffer[pixIdx] = corrDistPed;

        let ch = '#';
        let color = ped.jacketColor;
        let cellBg = ped.baseBg;
        const depthAlpha = Math.max(0.70, 1 - (corrDistPed / MAX_DEPTH));

        //head & face / hair
        if (bestPart === 'head') {
          const isFront = (hitLocalX > 0.01);
          const isBack = (hitLocalX < -0.01);
          const isEyeLevel = (hitWorldZ >= headZBase + 0.05 && hitWorldZ <= headZBase + 0.12);

          if (isFront) {
            if (hitWorldZ > headZBase + 0.12) {
              ch = '^';
              color = ped.hairColor;
              cellBg = '#1e1b18';
            } else if (isEyeLevel) {
              ch = (Math.abs(hitLocalY) < 0.02) ? '.' : ':';
              color = '#2c1e13';
              cellBg = ped.skinColor;
            } else {
              ch = '_';
              color = '#5c3826';
              cellBg = ped.skinColor;
            }
          } else if (isBack) {
            ch = (hitWorldZ > headZBase + 0.10) ? '@' : '#';
            color = ped.hairColor;
            cellBg = '#1e1b18';
          } else {
            ch = (isEyeLevel) ? '(' : '|';
            color = isEyeLevel ? '#2c1e13' : ped.hairColor;
            cellBg = isEyeLevel ? ped.skinColor : '#1e1b18';
          }
        }
        //torso / jacket
        else if (bestPart === 'torso') {
          const isFront = (hitLocalX > 0.015);
          const isBack = (hitLocalX < -0.015);

          if (isFront) {
            if (Math.abs(hitLocalY) < 0.02) {
              ch = '|';
              color = ped.jacketAccentColor;
              cellBg = ped.baseBg;
            } else {
              ch = (hitWorldZ > 0.58) ? 'Y' : 'H';
              color = ped.jacketColor;
              cellBg = ped.baseBg;
            }
          } else if (isBack) {
            ch = (hitWorldZ > 0.58) ? '=' : '#';
            color = ped.jacketColor;
            cellBg = ped.baseBg;
          } else {
            ch = (hitFace === 'top') ? '=' : '|';
            color = (hitFace === 'top') ? ped.jacketAccentColor : ped.jacketColor;
            cellBg = ped.baseBg;
          }
        }
        //arms & hands
        else if (bestPart === 'arm') {
          if (hitWorldZ < 0.44) {
            ch = 'o';
            color = ped.skinColor;
            cellBg = '#1e1b18';
          } else {
            ch = '|';
            color = ped.jacketColor;
            cellBg = ped.baseBg;
          }
        }
        //legs & shoes
        else if (bestPart === 'thigh') {
          ch = (Math.abs(hitLocalX) > 0.02) ? 'I' : '|';
          color = ped.pantsColor;
          cellBg = '#14181c';
        }
        else if (bestPart === 'foot') {
          if (hitWorldZ < 0.10) {
            ch = (hitLocalX > 0.01) ? '_' : '=';
            color = ped.shoesColor;
            cellBg = '#181512';
          } else {
            ch = (Math.abs(hitLocalX) > 0.02) ? 'I' : '|';
            color = ped.pantsColor;
            cellBg = '#14181c';
          }
        }

        if (corrDistPed > 6.0) {
          drawChar(col, row, ch, color, Math.min(1.0, depthAlpha * 1.35));
        } else {
          drawOpaqueChar(col, row, ch, color, depthAlpha, cellBg);
        }
      }
    }
  }

  //3d dense steam particles
  if (config.particles && visibleDynamic.length > 0) {
    for (let i = 0; i < visibleDynamic.length; i++) {
      const p = visibleDynamic[i];
      if (p.entityType !== 'particle') continue;
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      const fwdDepth = dx * cosPlayerAngle + dy * sinPlayerAngle;
      if (fwdDepth <= 0.20 || fwdDepth > MAX_DEPTH) continue;

      const lateral = -dx * sinPlayerAngle + dy * cosPlayerAngle;
      const centerCol = Math.floor((0.5 + (lateral / (fwdDepth * halfFovTan)) * 0.5) * RENDER_COLS);
      if (centerCol < 0 || centerCol >= RENDER_COLS) continue;

      const screenH = (RENDER_ROWS * PROJECTION_SCALE) / fwdDepth;
      const centerRow = Math.floor(horizon - (p.z - player.z) * screenH);
      if (centerRow < 0 || centerRow >= RENDER_ROWS) continue;

      const age = 1.0 - (p.life / p.maxLife);
      const depthAlpha = Math.max(0.40, 1 - (fwdDepth / MAX_DEPTH));
      const fadeAlpha = (p.life / p.maxLife) * depthAlpha;

      let ch = '%';
      let color = '#f8fafc';

      if (age < 0.20) {
        ch = (p.seed % 2 < 1) ? '@' : '8';
        color = '#ffffff';
      } else if (age < 0.45) {
        ch = (p.seed % 2 < 1) ? '0' : 'o';
        color = '#f1f5f9';
      } else if (age < 0.70) {
        ch = (p.seed % 2 < 1) ? '%' : '*';
        color = '#cbd5e1';
      } else if (age < 0.88) {
        ch = '~';
        color = '#94a3b8';
      } else {
        ch = '.';
        color = '#64748b';
      }

      //render primary puff
      const pixIdx = centerCol * RENDER_ROWS + centerRow;
      if (fwdDepth < pixelDepthBuffer[pixIdx]) {
        drawChar(centerCol, centerRow, ch, color, Math.min(1.0, fadeAlpha * 1.25));
      }

      //expand puff laterally for fullness when nearby
      if (fwdDepth < 16.0 && age > 0.15 && age < 0.80) {
        const sideCol = (p.seed % 2 < 1) ? centerCol + 1 : centerCol - 1;
        if (sideCol >= 0 && sideCol < RENDER_COLS) {
          const sideIdx = sideCol * RENDER_ROWS + centerRow;
          if (fwdDepth < pixelDepthBuffer[sideIdx]) {
            drawChar(sideCol, centerRow, '~', color, fadeAlpha * 0.75);
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 14. batched 2d canvas blitter (fast draw)
  // -------------------------------------------------------------------------
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = fontStyle;
  ctx.textBaseline = 'top';

  //bg span batcher
  let lastBg = '';
  for (let r = 0; r < RENDER_ROWS; r++) {
    const py = r * CHAR_HEIGHT;
    let bgStartCol = -1;
    let currentBg = '';

    for (let c = 0; c < RENDER_COLS; c++) {
      const idx = c * RENDER_ROWS + r;
      const bg = frameBgs[idx];

      if (bg && bg !== '#000000') {
        if (bg !== currentBg) {
          if (bgStartCol !== -1) {
            if (currentBg !== lastBg) {
              ctx.fillStyle = currentBg;
              lastBg = currentBg;
            }
            ctx.fillRect(bgStartCol * CHAR_WIDTH, py, (c - bgStartCol) * CHAR_WIDTH, CHAR_HEIGHT);
          }
          bgStartCol = c;
          currentBg = bg;
        }
      } else {
        if (bgStartCol !== -1) {
          if (currentBg !== lastBg) {
            ctx.fillStyle = currentBg;
            lastBg = currentBg;
          }
          ctx.fillRect(bgStartCol * CHAR_WIDTH, py, (c - bgStartCol) * CHAR_WIDTH, CHAR_HEIGHT);
          bgStartCol = -1;
          currentBg = '';
        }
      }
    }
    if (bgStartCol !== -1) {
      if (currentBg !== lastBg) {
        ctx.fillStyle = currentBg;
        lastBg = currentBg;
      }
      ctx.fillRect(bgStartCol * CHAR_WIDTH, py, (RENDER_COLS - bgStartCol) * CHAR_WIDTH, CHAR_HEIGHT);
    }
  }

  //text run batcher
  let lastColor = '';
  let lastAlpha = -1;

  for (let r = 0; r < RENDER_ROWS; r++) {
    const py = r * CHAR_HEIGHT;
    let textStartCol = -1;
    let currentText = '';
    let currentColor = '';
    let currentAlpha = -1;

    for (let c = 0; c < RENDER_COLS; c++) {
      const idx = c * RENDER_ROWS + r;
      const code = frameCharCodes[idx];

      if (code > 32) {
        const col = frameColors[idx] || '#ffffff';
        const a = Math.round((frameAlphas[idx] || 1.0) * 20) / 20;

        if (col === currentColor && a === currentAlpha && textStartCol !== -1) {
          currentText += String.fromCharCode(code);
        } else {
          if (textStartCol !== -1) {
            if (currentAlpha !== lastAlpha) {
              ctx.globalAlpha = currentAlpha;
              lastAlpha = currentAlpha;
            }
            if (currentColor !== lastColor) {
              ctx.fillStyle = currentColor;
              lastColor = currentColor;
            }
            ctx.fillText(currentText, textStartCol * CHAR_WIDTH, py);
          }
          textStartCol = c;
          currentText = String.fromCharCode(code);
          currentColor = col;
          currentAlpha = a;
        }
      } else {
        if (textStartCol !== -1) {
          if (currentAlpha !== lastAlpha) {
            ctx.globalAlpha = currentAlpha;
            lastAlpha = currentAlpha;
          }
          if (currentColor !== lastColor) {
            ctx.fillStyle = currentColor;
            lastColor = currentColor;
          }
          ctx.fillText(currentText, textStartCol * CHAR_WIDTH, py);
          textStartCol = -1;
          currentText = '';
          currentColor = '';
          currentAlpha = -1;
        }
      }
    }
    if (textStartCol !== -1) {
      if (currentAlpha !== lastAlpha) {
        ctx.globalAlpha = currentAlpha;
        lastAlpha = currentAlpha;
      }
      if (currentColor !== lastColor) {
        ctx.fillStyle = currentColor;
        lastColor = currentColor;
      }
      ctx.fillText(currentText, textStartCol * CHAR_WIDTH, py);
    }
  }

  ctx.globalAlpha = 1.0;
}

// -------------------------------------------------------------------------
// 15. game loop, input listeners & config
// -------------------------------------------------------------------------
function applyConfig() {
  isTrafficActive = config.traffic;
  FOV = (config.cameraFov * Math.PI) / 180;
  player.baseHeight = config.playerHeight;
  if (player.isGrounded && !keys['KeyC']) {
    player.z = player.baseHeight;
  }

  const hudEl = document.getElementById('hud');
  if (hudEl) hudEl.style.display = config.showHud ? 'flex' : 'none';

  const crosshairEl = document.getElementById('crosshair');
  if (crosshairEl) crosshairEl.style.display = config.showCrosshair ? 'block' : 'none';

  syncTrafficUI();
  syncConfigUI();
  saveConfig();
}

function syncTrafficUI() {
  const statusEl = document.getElementById('hud-traffic-status');
  if (statusEl) {
    statusEl.textContent = isTrafficActive ? 'ACTIVE' : 'STOPPED';
    statusEl.style.color = isTrafficActive ? '#00f0ff' : '#ff0055';
  }
}

function syncConfigUI() {
  const trafBtn = document.getElementById('cfg-traffic-btn');
  const trafVal = document.getElementById('cfg-traffic-val');
  if (trafBtn && trafVal) {
    trafVal.textContent = config.traffic ? 'ON' : 'OFF';
    if (config.traffic) trafBtn.classList.remove('off');
    else trafBtn.classList.add('off');
  }

  const partBtn = document.getElementById('cfg-particles-btn');
  const partVal = document.getElementById('cfg-particles-val');
  if (partBtn && partVal) {
    partVal.textContent = config.particles ? 'ON' : 'OFF';
    if (config.particles) partBtn.classList.remove('off');
    else partBtn.classList.add('off');
  }

  const hudBtn = document.getElementById('cfg-hud-btn');
  const hudVal = document.getElementById('cfg-hud-val');
  if (hudBtn && hudVal) {
    hudVal.textContent = config.showHud ? 'ON' : 'OFF';
    if (config.showHud) hudBtn.classList.remove('off');
    else hudBtn.classList.add('off');
  }

  const crossBtn = document.getElementById('cfg-crosshair-btn');
  const crossVal = document.getElementById('cfg-crosshair-val');
  if (crossBtn && crossVal) {
    crossVal.textContent = config.showCrosshair ? 'ON' : 'OFF';
    if (config.showCrosshair) crossBtn.classList.remove('off');
    else crossBtn.classList.add('off');
  }

  const hSlider = document.getElementById('cfg-height-slider');
  const hVal = document.getElementById('cfg-height-val');
  if (hSlider && hVal) {
    hSlider.value = config.playerHeight;
    hVal.textContent = `${Number(config.playerHeight).toFixed(2)}m`;
  }

  const fSlider = document.getElementById('cfg-fov-slider');
  const fVal = document.getElementById('cfg-fov-val');
  if (fSlider && fVal) {
    fSlider.value = config.cameraFov;
    fVal.textContent = `${Math.round(config.cameraFov)}°`;
  }

  const sSlider = document.getElementById('cfg-sens-slider');
  const sVal = document.getElementById('cfg-sens-val');
  if (sSlider && sVal) {
    sSlider.value = config.mouseSens;
    sVal.textContent = `${Number(config.mouseSens).toFixed(1)}x`;
  }
}

function toggleConfigTraffic(e) {
  if (e) e.stopPropagation();
  config.traffic = !config.traffic;
  applyConfig();
}

function toggleConfigParticles(e) {
  if (e) e.stopPropagation();
  config.particles = !config.particles;
  applyConfig();
}

function toggleConfigHud(e) {
  if (e) e.stopPropagation();
  config.showHud = !config.showHud;
  applyConfig();
}

function toggleConfigCrosshair(e) {
  if (e) e.stopPropagation();
  config.showCrosshair = !config.showCrosshair;
  applyConfig();
}

function updateConfigHeight(val) {
  config.playerHeight = parseFloat(val);
  applyConfig();
}

function updateConfigFov(val) {
  config.cameraFov = parseFloat(val);
  applyConfig();
}

function updateConfigSens(val) {
  config.mouseSens = parseFloat(val);
  applyConfig();
}

function toggleConfigDropdown(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('ascii-config-panel');
  const symbol = document.getElementById('config-dropdown-symbol');
  if (panel && symbol) {
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
      panel.classList.remove('hidden');
      symbol.textContent = '-';
    } else {
      panel.classList.add('hidden');
      symbol.textContent = '+';
    }
  }
}

function restoreDefaultConfig(e) {
  if (e) e.stopPropagation();
  Object.assign(config, DEFAULT_CONFIG);
  applyConfig();
}

function pauseGame() {
  if (isPaused) return;
  isPaused = true;
  for (const k in keys) {
    keys[k] = false;
  }

  const overlay = document.getElementById('play-overlay');
  const startBtn = document.getElementById('start-game-btn');
  if (startBtn) startBtn.textContent = '[ CONTINUE ]';
  if (overlay) overlay.style.display = 'flex';

  const currentLock = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
  if (currentLock) {
    try {
      document.exitPointerLock();
    } catch (e) { }
  }
}

function startGame() {
  hasStarted = true;
  isPaused = false;
  applyConfig();

  const overlay = document.getElementById('play-overlay');
  if (overlay) overlay.style.display = 'none';

  try {
    canvas.focus();
    const promise = canvas.requestPointerLock();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => { });
    }
  } catch (e) { }
}

let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  updateTrafficLights(dt);
  updateVehicles(dt);
  updatePedestrians(dt);
  updateParticles(dt);
  rebuildDynamicSpatialGrid();
  updatePlayer();
  render3DWorld();

  frameCount++;
  fpsTimer += dt;
  if (fpsTimer >= 0.25) {
    const fpsEl = document.getElementById('hud-fps');
    if (fpsEl) fpsEl.textContent = Math.round(frameCount / fpsTimer);

    const posEl = document.getElementById('hud-pos');
    if (posEl) posEl.textContent = `X:${player.x.toFixed(1)} Y:${player.y.toFixed(1)}`;

    const headingDeg = Math.round((player.angle * (180 / Math.PI) + 90 + 720) % 360);
    const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const cardIdx = Math.round(headingDeg / 45) % 8;
    const padDeg = String(headingDeg).padStart(3, '0');
    const compassEl = document.getElementById('hud-compass');
    if (compassEl) compassEl.textContent = `${padDeg}° [${CARDINALS[cardIdx]}]`;

    const cullEl = document.getElementById('hud-cull');
    if (cullEl) {
      const pct = Math.round((1 - (cullVisibleCount / Math.max(1, cullTotalCount))) * 100);
      cullEl.textContent = `${cullVisibleCount}/${cullTotalCount} (-${pct}%)`;
    }

    frameCount = 0;
    fpsTimer = 0;
  }

  requestAnimationFrame(gameLoop);
}

resizeCanvas();
buildWorld();
applyConfig();
requestAnimationFrame(gameLoop);

