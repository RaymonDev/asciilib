export interface RayHit {
  hit: boolean;
  t: number;
  hitX?: number;
  hitY?: number;
  hitZ?: number;
  hitFace?: string;
  normalAngle?: number;
}

export function intersectRayAABB(
  origX: number, origY: number, origZ: number,
  dirX: number, dirY: number, dirZ: number,
  minX: number, maxX: number,
  minY: number, maxY: number,
  minZ: number, maxZ: number
): RayHit;

export function intersectRayCylinder(
  origX: number, origY: number, origZ: number,
  dirX: number, dirY: number, dirZ: number,
  cylX: number, cylY: number,
  radius: number,
  minZ: number, maxZ: number
): RayHit;

export function intersectRayEllipsoid(
  origX: number, origY: number, origZ: number,
  dirX: number, dirY: number, dirZ: number,
  ellX: number, ellY: number, ellZ: number,
  radXY: number, radZ: number
): RayHit;

export function intersectRaySegmentDistance(
  origX: number, origY: number, origZ: number,
  dirX: number, dirY: number, dirZ: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  thicknessSq: number
): RayHit;
