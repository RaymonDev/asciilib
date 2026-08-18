//first-person controller with wasd movement, jumping and 360 mouse look
import { normalizeAngle, clamp } from '../math/MathUtils.js';

export class FirstPersonController {
  constructor(camera, domElement = null, options = {}) {
    this.camera = camera;
    this.domElement = domElement;

    this.walkSpeed = options.walkSpeed || 4.5;
    this.sprintSpeed = options.sprintSpeed || 7.5;
    this.crouchSpeed = options.crouchSpeed || 2.2;
    this.jumpForce = options.jumpForce || 4.2;
    this.gravity = options.gravity || 9.8;
    this.mouseSensitivity = options.mouseSensitivity || 0.0022;

    this.vz = 0;
    this.isGrounded = true;
    this.isCrouching = false;
    this.isSprinting = false;
    this.isPointerLocked = false;

    this.keys = {};
    this.onCollision = options.onCollision || null;
    this.onPointerLockChange = options.onPointerLockChange || null;

    if (this.domElement && typeof window !== 'undefined') {
      this.attachEventListeners();
    }
  }

  attachEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    if (this.domElement) {
      this.domElement.addEventListener('click', () => {
        this.requestPointerLock();
      });
    }

    document.addEventListener('pointerlockchange', () => {
      const lockedElement = document.pointerLockElement || document.mozPointerLockElement;
      this.isPointerLocked = (lockedElement === this.domElement);
      if (this.onPointerLockChange) {
        this.onPointerLockChange(this.isPointerLocked);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      this.rotate(e.movementX, e.movementY);
    });
  }

  requestPointerLock() {
    if (this.domElement && this.domElement.requestPointerLock) {
      this.domElement.requestPointerLock();
    }
  }

  exitPointerLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  rotate(movementX, movementY) {
    this.camera.angle = normalizeAngle(this.camera.angle + movementX * this.mouseSensitivity);
    this.camera.pitch = clamp(this.camera.pitch - movementY * (this.mouseSensitivity * 0.85), -2.0, 2.0);
  }

  update(dt) {
    //crouch & sprint states
    this.isCrouching = !!(this.keys['KeyC']);
    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) && !this.isCrouching;

    //target camera height
    const targetHeight = this.isCrouching ? (this.camera.baseHeight * 0.45) : this.camera.baseHeight;

    //jump physics
    if ((this.keys['Space'] || this.keys['KeyJ']) && this.isGrounded && !this.isCrouching) {
      this.vz = this.jumpForce;
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.camera.z += this.vz * dt;
      this.vz -= this.gravity * dt;
      if (this.camera.z <= targetHeight) {
        this.camera.z = targetHeight;
        this.vz = 0;
        this.isGrounded = true;
      }
    } else {
      this.camera.z += (targetHeight - this.camera.z) * Math.min(1.0, dt * 10.0);
    }

    //movement input
    let moveForward = 0;
    let moveRight = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveForward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveForward -= 1;
    if (this.keys['KeyD']) moveRight += 1;
    if (this.keys['KeyA']) moveRight -= 1;

    //keyboard camera turning
    if (this.keys['ArrowLeft'] || this.keys['KeyQ']) {
      this.camera.angle = normalizeAngle(this.camera.angle - dt * 2.0);
    }
    if (this.keys['ArrowRight'] || this.keys['KeyE']) {
      this.camera.angle = normalizeAngle(this.camera.angle + dt * 2.0);
    }

    //calculate velocity
    const speed = (this.isSprinting ? this.sprintSpeed : (this.isCrouching ? this.crouchSpeed : this.walkSpeed)) * dt;
    const moveLen = Math.hypot(moveForward, moveRight);

    if (moveLen > 0.001) {
      const normFwd = moveForward / moveLen;
      const normRight = moveRight / moveLen;

      const cosA = Math.cos(this.camera.angle);
      const sinA = Math.sin(this.camera.angle);

      const dx = (cosA * normFwd - sinA * normRight) * speed;
      const dy = (sinA * normFwd + cosA * normRight) * speed;

      const newX = this.camera.x + dx;
      const newY = this.camera.y + dy;

      if (this.onCollision) {
        this.onCollision(this.camera.x, this.camera.y, newX, newY, this);
      } else {
        this.camera.x = newX;
        this.camera.y = newY;
      }
    }
  }
}
