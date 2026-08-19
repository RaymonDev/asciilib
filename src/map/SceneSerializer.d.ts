import { Scene } from '../scene/Scene.js';

export interface SerializeSceneOptions {
  stringify?: boolean;
  indent?: number;
}

export interface SerializedEntityData {
  type: string;
  x: number;
  y: number;
  z: number;
  angle: number;
  pitch: number;
  boundingRadius: number;
  isStatic: boolean;
  visible: boolean;
  char?: string | number;
  color?: string;
  bg?: string;
  parts?: any[];
  seed?: number;
  vehicleType?: string;
  mode?: string;
  [key: string]: any;
}

export interface SerializedSceneData {
  version: number;
  mapSize: number;
  ambientLight: string;
  sunDirection: { x: number; y: number; z: number };
  map: number[];
  buildingHeights: number[];
  entities: SerializedEntityData[];
}

export interface DeserializeSceneOptions {
  scene?: Scene;
  cellSize?: number;
}

export function serializeScene(scene: Scene, options?: SerializeSceneOptions): SerializedSceneData | string;
export function deserializeScene(jsonOrObject: string | SerializedSceneData, options?: DeserializeSceneOptions): Scene;
export function exportAsciiMap(scene: Scene, options?: Record<string, any>): string;
