//zero-dependency 2d ascii map parser and procedural layout loader
import { Scene } from '../scene/Scene.js';
import { createTree, createStreetLamp, createTrafficLight } from '../presets/streetFurniture.js';
import { createTaxi, createCyberCoupe, createCityBus } from '../presets/vehicles.js';
import { createPedestrian } from '../presets/pedestrians.js';
import { createSurveillanceDrone } from '../presets/drone.js';
import { BoxEntity } from '../primitives/BoxEntity.js';

export const DEFAULT_MAP_LEGEND = {
  '#': { tile: 10, name: 'building' },
  'B': { tile: 10, height: 8.0, name: 'skyscraper' },
  'H': { tile: 10, height: 12.0, name: 'tower' },
  '.': { tile: 0, height: 0.0, name: 'road' },
  ' ': { tile: 0, height: 0.0, name: 'empty' },
  '=': { tile: 1, height: 0.0, name: 'sidewalk' },
  'T': {
    tile: 1,
    height: 0.0,
    entity: (x, y, z) => createTree({ x, y, z: z || 0.0 })
  },
  'L': {
    tile: 1,
    height: 0.0,
    entity: (x, y, z) => createStreetLamp({ x, y, z: z || 0.0 })
  },
  'S': {
    tile: 1,
    height: 0.0,
    entity: (x, y, z) => createTrafficLight({ x, y, z: z || 0.0 })
  },
  'C': {
    tile: 0,
    height: 0.0,
    entity: (x, y, z) => createTaxi({ x, y, z: z || 0.0 })
  },
  'V': {
    tile: 0,
    height: 0.0,
    entity: (x, y, z) => createCyberCoupe({ x, y, z: z || 0.0 })
  },
  'U': {
    tile: 0,
    height: 0.0,
    entity: (x, y, z) => createCityBus({ x, y, z: z || 0.0 })
  },
  'P': {
    tile: 1,
    height: 0.0,
    entity: (x, y, z) => createPedestrian({ x, y, z: z || 0.0 })
  },
  'D': {
    tile: 0,
    height: 0.0,
    entity: (x, y, z) => createSurveillanceDrone({ x, y, z: (z || 0.0) + 4.5 })
  },
  '@': {
    tile: 0,
    height: 0.0,
    isSpawn: true
  }
};

export function parseAsciiMap(asciiString, options = {}) {
  if (typeof asciiString !== 'string') {
    throw new Error('[asciilib] parseAsciiMap: expected a valid ASCII string.');
  }

  const rawLines = asciiString.split(/\r?\n/);
  //remove leading and trailing empty lines
  while (rawLines.length > 0 && rawLines[0].trim() === '') rawLines.shift();
  while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') rawLines.pop();

  if (rawLines.length === 0) {
    throw new Error('[asciilib] parseAsciiMap: ASCII map string is empty.');
  }

  const height = rawLines.length;
  let width = 0;
  for (let i = 0; i < rawLines.length; i++) {
    if (rawLines[i].length > width) width = rawLines[i].length;
  }

  const mapSize = Math.max(width, height);
  const cellScale = options.cellScale || 1.0;
  const defaultBuildingHeight = options.defaultBuildingHeight || 6.0;
  const customLegend = options.legend || {};
  const legend = { ...DEFAULT_MAP_LEGEND, ...customLegend };

  const map = new Uint8Array(mapSize * mapSize);
  const buildingHeights = new Float32Array(mapSize * mapSize);
  const entities = [];
  const spawnPoints = [];

  for (let row = 0; row < height; row++) {
    const line = rawLines[row];
    for (let col = 0; col < width; col++) {
      const ch = col < line.length ? line[col] : ' ';
      const def = legend[ch] || legend[' '] || { tile: 0, height: 0 };

      const cellX = col * cellScale;
      const cellY = row * cellScale;
      const centerX = cellX + cellScale * 0.5;
      const centerY = cellY + cellScale * 0.5;
      const baseZ = options.baseZ || 0.0;

      const idx = row * mapSize + col;

      //tile assignment
      if (def.tile !== undefined) {
        map[idx] = def.tile;
      }

      //building height assignment
      if (def.height !== undefined && def.height > 0) {
        buildingHeights[idx] = def.height;
      } else if (def.tile >= 10) {
        buildingHeights[idx] = defaultBuildingHeight;
      }

      //spawn points
      if (def.isSpawn) {
        spawnPoints.push({
          x: centerX,
          y: centerY,
          z: baseZ + 1.0,
          angle: def.angle || 0,
          char: ch
        });
      }

      //entity instantiation
      if (typeof def.entity === 'function') {
        const ent = def.entity(centerX, centerY, baseZ, { col, row, ch });
        if (ent) {
          entities.push(ent);
        }
      } else if (def.entity && typeof def.entity === 'object') {
        //box entity shortcut
        const box = new BoxEntity({
          x: centerX,
          y: centerY,
          z: baseZ,
          ...def.entity
        });
        entities.push(box);
      }
    }
  }

  const scene = options.scene || new Scene({
    mapSize,
    map,
    buildingHeights,
    cellSize: options.cellSize || 8.0,
    ambientLight: options.ambientLight || '#ffffff',
    sunDirection: options.sunDirection || { x: 0.6, y: -0.3, z: 0.7 }
  });

  if (options.scene) {
    scene.mapSize = mapSize;
    scene.map = map;
    scene.buildingHeights = buildingHeights;
  }

  for (let i = 0; i < entities.length; i++) {
    scene.add(entities[i]);
  }

  return {
    scene,
    width,
    height,
    mapSize,
    map,
    buildingHeights,
    entities,
    spawnPoints,
    defaultSpawn: spawnPoints.length > 0 ? spawnPoints[0] : { x: width * 0.5, y: height * 0.5, z: 1.0, angle: 0 }
  };
}
