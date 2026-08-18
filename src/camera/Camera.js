//planar perspective camera and ray generation
export class Camera {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.z = options.z || 1.0;
    this.baseHeight = options.baseHeight || 1.0;
    this.angle = options.angle || 0; //yaw in radians
    this.pitch = options.pitch || 0; //vertical tilt in radians
    this.fov = options.fov || 75;
    this.projectionScale = options.projectionScale || 0.65;
    this.near = options.near || 0.1;
    this.far = options.far || 32.0;
  }

  getPlanarVectors() {
    const cosAngle = Math.cos(this.angle);
    const sinAngle = Math.sin(this.angle);
    const halfFovTan = Math.tan((this.fov * Math.PI) / 360);
    const planeX = -sinAngle * halfFovTan;
    const planeY = cosAngle * halfFovTan;

    return {
      cosAngle,
      sinAngle,
      halfFovTan,
      planeX,
      planeY
    };
  }

  getRay(col, renderCols, vectors = null) {
    const v = vectors || this.getPlanarVectors();
    const cameraX = (2 * (col + 0.5) / renderCols) - 1;
    const rayDirX = v.cosAngle + v.planeX * cameraX;
    const rayDirY = v.sinAngle + v.planeY * cameraX;
    const rayLen = Math.hypot(rayDirX, rayDirY);

    return {
      cameraX,
      rayDirX,
      rayDirY,
      rayLen,
      cosAngle: rayDirX / rayLen,
      sinAngle: rayDirY / rayLen,
      cosOffset: 1.0 / rayLen
    };
  }

  getFrustumAABB(maxDepth = this.far, padding = 2.5) {
    const v = this.getPlanarVectors();
    const p1x = this.x;
    const p1y = this.y;
    const p2x = this.x + (v.cosAngle - v.planeX) * maxDepth;
    const p2y = this.y + (v.sinAngle - v.planeY) * maxDepth;
    const p3x = this.x + (v.cosAngle + v.planeX) * maxDepth;
    const p3y = this.y + (v.sinAngle + v.planeY) * maxDepth;

    return {
      minX: Math.min(p1x, Math.min(p2x, p3x)) - padding,
      maxX: Math.max(p1x, Math.max(p2x, p3x)) + padding,
      minY: Math.min(p1y, Math.min(p2y, p3y)) - padding,
      maxY: Math.max(p1y, Math.max(p2y, p3y)) + padding
    };
  }
}
