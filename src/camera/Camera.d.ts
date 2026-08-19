export interface CameraOptions {
  x?: number;
  y?: number;
  z?: number;
  baseHeight?: number;
  angle?: number;
  pitch?: number;
  fov?: number;
  projectionScale?: number;
  near?: number;
  far?: number;
}

export interface PlanarVectors {
  cosAngle: number;
  sinAngle: number;
  halfFovTan: number;
  planeX: number;
  planeY: number;
}

export interface CameraRay {
  cameraX: number;
  rayDirX: number;
  rayDirY: number;
  rayLen: number;
  cosAngle: number;
  sinAngle: number;
  cosOffset: number;
}

export interface FrustumAABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class Camera {
  x: number;
  y: number;
  z: number;
  baseHeight: number;
  angle: number;
  pitch: number;
  fov: number;
  projectionScale: number;
  near: number;
  far: number;

  constructor(options?: CameraOptions);

  getPlanarVectors(): PlanarVectors;
  getRay(col: number, renderCols: number, vectors?: PlanarVectors | null): CameraRay;
  getFrustumAABB(maxDepth?: number, padding?: number): FrustumAABB;
}
