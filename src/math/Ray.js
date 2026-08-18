//3d ray class
import { Vector3 } from './Vector3.js';

export class Ray {
  constructor(origin = new Vector3(), direction = new Vector3(0, 0, 1)) {
    this.origin = origin;
    this.direction = direction;
  }

  set(origin, direction) {
    this.origin.copy(origin);
    this.direction.copy(direction);
    return this;
  }

  clone() {
    return new Ray(this.origin.clone(), this.direction.clone());
  }

  copy(ray) {
    this.origin.copy(ray.origin);
    this.direction.copy(ray.direction);
    return this;
  }

  at(t, target = new Vector3()) {
    return target.copy(this.direction).multiplyScalar(t).add(this.origin);
  }
}
