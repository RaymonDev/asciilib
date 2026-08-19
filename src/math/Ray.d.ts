import { Vector3 } from './Vector3.js';

export class Ray {
  origin: Vector3;
  direction: Vector3;

  constructor(origin?: Vector3, direction?: Vector3);

  set(origin: Vector3, direction: Vector3): this;
  copy(ray: Ray): this;
  clone(): Ray;
  at(t: number, target?: Vector3): Vector3;
  recast(t: number): this;
  distanceToPoint(point: Vector3): number;
  distanceSqToPoint(point: Vector3): number;
}
