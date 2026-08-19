//zero-dependency json & ascii scene serializer and deserializer
import { Scene } from '../scene/Scene.js';
import { BoxEntity } from '../primitives/BoxEntity.js';
import { CylinderEntity } from '../primitives/CylinderEntity.js';
import { EllipsoidEntity } from '../primitives/EllipsoidEntity.js';
import { CompoundEntity } from '../primitives/CompoundEntity.js';
import { TreeEntity, StreetLampEntity, TrafficLightEntity } from '../presets/streetFurniture.js';
import { VehicleEntity } from '../presets/vehicles.js';
import { PedestrianEntity } from '../presets/pedestrians.js';
import { DroneEntity } from '../presets/drone.js';

export function serializeScene(scene, options = {}) {
  if (!scene) throw new Error('[asciilib] serializeScene: scene parameter is required.');

  const serializedEntities = [];
  for (let i = 0; i < scene.entities.length; i++) {
    const ent = scene.entities[i];
    const item = {
      type: ent.type || ent.entityType || 'generic',
      x: Number(ent.x.toFixed(3)),
      y: Number(ent.y.toFixed(3)),
      z: Number((ent.z || 0).toFixed(3)),
      angle: Number((ent.angle || 0).toFixed(3)),
      pitch: Number((ent.pitch || 0).toFixed(3)),
      boundingRadius: ent.boundingRadius,
      isStatic: ent.isStatic,
      visible: ent.visible
    };

    if (ent.char !== undefined) item.char = ent.char;
    if (ent.color !== undefined) item.color = ent.color;
    if (ent.bg !== undefined) item.bg = ent.bg;
    if (ent.parts && Array.isArray(ent.parts)) item.parts = ent.parts;
    if (ent.seed !== undefined) item.seed = ent.seed;
    if (ent.vehicleType !== undefined) item.vehicleType = ent.vehicleType;
    if (ent.mode !== undefined) item.mode = ent.mode;

    serializedEntities.push(item);
  }

  const data = {
    version: 1,
    mapSize: scene.mapSize,
    ambientLight: scene.ambientLight,
    sunDirection: scene.sunDirection,
    map: Array.from(scene.map),
    buildingHeights: Array.from(scene.buildingHeights),
    entities: serializedEntities
  };

  return options.stringify ? JSON.stringify(data, null, options.indent || 2) : data;
}

export function deserializeScene(jsonOrObject, options = {}) {
  const data = typeof jsonOrObject === 'string' ? JSON.parse(jsonOrObject) : jsonOrObject;
  if (!data || typeof data !== 'object') {
    throw new Error('[asciilib] deserializeScene: invalid scene data.');
  }

  const mapSize = data.mapSize || 40;
  const map = new Uint8Array(mapSize * mapSize);
  const buildingHeights = new Float32Array(mapSize * mapSize);

  if (Array.isArray(data.map)) {
    for (let i = 0; i < Math.min(map.length, data.map.length); i++) {
      map[i] = data.map[i];
    }
  }

  if (Array.isArray(data.buildingHeights)) {
    for (let i = 0; i < Math.min(buildingHeights.length, data.buildingHeights.length); i++) {
      buildingHeights[i] = data.buildingHeights[i];
    }
  }

  const scene = options.scene || new Scene({
    mapSize,
    map,
    buildingHeights,
    cellSize: options.cellSize || 8.0,
    ambientLight: data.ambientLight || '#ffffff',
    sunDirection: data.sunDirection || { x: 0.6, y: -0.3, z: 0.7 }
  });

  if (options.scene) {
    scene.mapSize = mapSize;
    scene.map = map;
    scene.buildingHeights = buildingHeights;
  }

  //restore entities
  if (Array.isArray(data.entities)) {
    for (let i = 0; i < data.entities.length; i++) {
      const eData = data.entities[i];
      let entity = null;

      switch (eData.type) {
        case 'box':
          entity = new BoxEntity(eData);
          break;
        case 'cylinder':
          entity = new CylinderEntity(eData);
          break;
        case 'ellipsoid':
          entity = new EllipsoidEntity(eData);
          break;
        case 'compound':
          entity = new CompoundEntity(eData);
          break;
        case 'tree':
          entity = new TreeEntity(eData);
          break;
        case 'lamp':
          entity = new StreetLampEntity(eData);
          break;
        case 'trafficLight':
          entity = new TrafficLightEntity(eData);
          break;
        case 'taxi':
        case 'coupe':
        case 'bus':
        case 'vehicle':
          entity = new VehicleEntity(eData);
          break;
        case 'pedestrian':
          entity = new PedestrianEntity(eData);
          break;
        case 'drone':
          entity = new DroneEntity(eData);
          break;
        default:
          entity = new BoxEntity(eData);
      }

      if (entity) {
        scene.add(entity);
      }
    }
  }

  return scene;
}

export function exportAsciiMap(scene, options = {}) {
  if (!scene || !scene.map) {
    throw new Error('[asciilib] exportAsciiMap: valid scene required.');
  }

  const mapSize = scene.mapSize;
  const grid = [];
  for (let r = 0; r < mapSize; r++) {
    grid[r] = new Array(mapSize).fill('.');
  }

  //1. map tiles
  for (let r = 0; r < mapSize; r++) {
    for (let c = 0; c < mapSize; c++) {
      const tile = scene.map[r * mapSize + c];
      if (tile >= 10) {
        grid[r][c] = '#';
      } else if (tile === 1) {
        grid[r][c] = '=';
      } else {
        grid[r][c] = '.';
      }
    }
  }

  //2. overlay static entities
  for (let i = 0; i < scene.entities.length; i++) {
    const ent = scene.entities[i];
    const col = Math.floor(ent.x);
    const row = Math.floor(ent.y);
    if (col >= 0 && col < mapSize && row >= 0 && row < mapSize) {
      if (ent.type === 'tree') grid[row][col] = 'T';
      else if (ent.type === 'lamp') grid[row][col] = 'L';
      else if (ent.type === 'trafficLight') grid[row][col] = 'S';
      else if (ent.type === 'drone') grid[row][col] = 'D';
      else if (ent.type === 'pedestrian') grid[row][col] = 'P';
      else if (ent.type === 'taxi' || ent.type === 'coupe' || ent.type === 'vehicle') grid[row][col] = 'C';
    }
  }

  return grid.map(rowArr => rowArr.join('')).join('\n');
}
