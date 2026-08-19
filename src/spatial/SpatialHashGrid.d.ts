export interface SpatialEntity {
  x: number;
  y: number;
  boundingRadius?: number;
  [key: string]: any;
}

export class SpatialHashGrid<T extends SpatialEntity = SpatialEntity> {
  cellSize: number;
  grid: Map<string, Set<T>>;

  constructor(cellSize?: number);

  key(cellX: number, cellY: number): string;
  insert(entity: T): void;
  remove(entity: T): void;
  update(entity: T): void;
  clear(): void;
  queryAABB(minX: number, minY: number, maxX: number, maxY: number, out?: T[]): T[];
  queryRadius(centerX: number, centerY: number, radius: number, out?: T[]): T[];
}
