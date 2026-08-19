export class Vector2 {
  x: number;
  y: number;

  constructor(x?: number, y?: number);

  set(x: number, y: number): this;
  copy(v: Vector2): this;
  clone(): Vector2;
  add(v: Vector2): this;
  addVectors(a: Vector2, b: Vector2): this;
  sub(v: Vector2): this;
  subVectors(a: Vector2, b: Vector2): this;
  multiplyScalar(s: number): this;
  divideScalar(s: number): this;
  dot(v: Vector2): number;
  lengthSq(): number;
  length(): number;
  normalize(): this;
  distanceTo(v: Vector2): number;
  distanceToSquared(v: Vector2): number;
  equals(v: Vector2): boolean;
  toArray(array?: number[], offset?: number): number[];
  fromArray(array: number[], offset?: number): this;
}
