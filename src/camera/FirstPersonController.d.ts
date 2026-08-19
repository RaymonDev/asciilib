import { Camera } from './Camera.js';

export interface FirstPersonControllerOptions {
  walkSpeed?: number;
  sprintSpeed?: number;
  crouchSpeed?: number;
  jumpForce?: number;
  gravity?: number;
  mouseSensitivity?: number;
  onCollision?: ((newX: number, newY: number, radius: number) => boolean) | null;
  onPointerLockChange?: ((isLocked: boolean) => void) | null;
}

export class FirstPersonController {
  camera: Camera;
  domElement: HTMLElement | null;
  walkSpeed: number;
  sprintSpeed: number;
  crouchSpeed: number;
  jumpForce: number;
  gravity: number;
  mouseSensitivity: number;

  vz: number;
  isGrounded: boolean;
  isCrouching: boolean;
  isSprinting: boolean;
  isPointerLocked: boolean;
  keys: Record<string, boolean>;

  onCollision: ((newX: number, newY: number, radius: number) => boolean) | null;
  onPointerLockChange: ((isLocked: boolean) => void) | null;

  constructor(camera: Camera, domElement?: HTMLElement | null, options?: FirstPersonControllerOptions);

  attachEventListeners(): void;
  requestPointerLock(): void;
  exitPointerLock(): void;
  rotate(movementX: number, movementY: number): void;
  update(dt: number): void;
}
