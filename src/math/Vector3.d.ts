export class Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x?: number, y?: number, z?: number);

  set(x: number, y: number, z: number): this;
  copy(v: Vector3): this;
  clone(): Vector3;
  add(v: Vector3): this;
  addVectors(a: Vector3, b: Vector3): this;
  sub(v: Vector3): this;
  subVectors(a: Vector3, b: Vector3): this;
  multiplyScalar(s: number): this;
  divideScalar(s: number): this;
  dot(v: Vector3): number;
  cross(v: Vector3): this;
  crossVectors(a: Vector3, b: Vector3): this;
  lengthSq(): number;
  length(): number;
  normalize(): this;
  distanceTo(v: Vector3): number;
  distanceToSquared(v: Vector3): number;
  lerp(v: Vector3, alpha: number): this;
  equals(v: Vector3): boolean;
  toArray(array?: number[], offset?: number): number[];
  fromArray(array: number[], offset?: number): this;
}
