import { Scene } from '../scene/Scene.js';
import { Entity } from '../primitives/Entity.js';

export interface MapLegendItem {
  tile?: number;
  height?: number;
  name?: string;
  isSpawn?: boolean;
  angle?: number;
  entity?: ((x: number, y: number, z: number, context: { col: number; row: number; ch: string }) => Entity | null) | Record<string, any>;
}

export type MapLegend = Record<string, MapLegendItem>;

export interface ParseAsciiMapOptions {
  cellScale?: number;
  defaultBuildingHeight?: number;
  baseZ?: number;
  legend?: MapLegend;
  scene?: Scene;
  cellSize?: number;
  ambientLight?: string;
  sunDirection?: { x: number; y: number; z: number };
}

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
  angle: number;
  char: string;
}

export interface ParseAsciiMapResult {
  scene: Scene;
  width: number;
  height: number;
  mapSize: number;
  map: Uint8Array;
  buildingHeights: Float32Array;
  entities: Entity[];
  spawnPoints: SpawnPoint[];
  defaultSpawn: SpawnPoint;
}

export const DEFAULT_MAP_LEGEND: MapLegend;

export function parseAsciiMap(asciiString: string, options?: ParseAsciiMapOptions): ParseAsciiMapResult;
