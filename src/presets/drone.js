//surveillance drone prefab, cctv tracking, and autonomous 45-degree overhead companion escort
import { CompoundEntity } from '../primitives/CompoundEntity.js';
import { SpotLight } from '../lighting/SpotLight.js';

export class DroneEntity extends CompoundEntity {
  constructor(options = {}) {
    super(options);
    this.type = 'drone';
    this.entityType = 'drone';

    this.mode = options.mode || 'patrol';
    this.patrolCenter = options.patrolCenter || { x: this.x, y: this.y, z: this.z || 4.8 };
    this.patrolRadius = options.patrolRadius || 4.5;
    this.patrolSpeed = options.patrolSpeed || 0.45;
    this.patrolAngle = options.patrolAngle || 0.0;

    this.companionTarget = options.companionTarget || null;
    this.companionDist = options.companionDist || 2.4;
    this.companionHeight = options.companionHeight || 2.4;
    this.companionElevationAngle = Math.PI / 4; //45 degrees diagonal elevation behind head

    this.propellerAngle = 0.0;
    this.propellerSpeed = options.propellerSpeed || 65.0; //high-speed rotor spinning
    this.hoverBobTimer = Math.random() * Math.PI * 2;
    this.velX = 0.0;
    this.velY = 0.0;
    this.velZ = 0.0;

    //downward searchlight spotlight
    this.light = new SpotLight({
      x: this.x,
      y: this.y,
      z: this.z,
      color: options.lightColor || '#00f0ff',
      radius: options.lightRadius !== undefined ? options.lightRadius : 14.0,
      intensity: options.lightIntensity !== undefined ? options.lightIntensity : 1.3,
      angle: options.lightAngle !== undefined ? options.lightAngle : Math.PI / 4,
      direction: { x: 0, y: 0, z: -1 }
    });

    this.buildGeometry(options);
  }

  buildGeometry(options = {}) {
    //1. compact grey box chassis
    this.addBox({
      name: 'chassis',
      minX: -0.14, maxX: 0.14,
      minY: -0.10, maxY: 0.10,
      minZ: -0.03, maxZ: 0.04,
      char: '#',
      color: options.chassisColor || '#94a3b8',
      bg: options.chassisBg || '#1e293b'
    });

    //2. left & right lateral support arms
    this.addSegment({
      name: 'arm_left',
      ax: 0.0, ay: 0.10, az: 0.01,
      bx: 0.0, by: 0.32, bz: 0.03,
      thickness: 0.02,
      char: '=',
      color: '#cbd5e1',
      bg: '#0f172a'
    });
    this.addSegment({
      name: 'arm_right',
      ax: 0.0, ay: -0.10, az: 0.01,
      bx: 0.0, by: -0.32, bz: 0.03,
      thickness: 0.02,
      char: '=',
      color: '#cbd5e1',
      bg: '#0f172a'
    });

    //rotor motor hubs
    this.addCylinder({
      name: 'motor_hub_l',
      x: 0.0, y: 0.32,
      radius: 0.035,
      minZ: 0.01, maxZ: 0.06,
      char: '|',
      color: '#475569',
      bg: '#020617'
    });
    this.addCylinder({
      name: 'motor_hub_r',
      x: 0.0, y: -0.32,
      radius: 0.035,
      minZ: 0.01, maxZ: 0.06,
      char: '|',
      color: '#475569',
      bg: '#020617'
    });

    //3. dual spinning propeller blades
    this.addSegment({
      name: 'blade_l1',
      ax: -0.16, ay: 0.32, az: 0.06,
      bx: 0.16, by: 0.32, bz: 0.06,
      thickness: 0.015,
      char: '*',
      color: '#38bdf8',
      bg: '#082f49'
    });
    this.addSegment({
      name: 'blade_l2',
      ax: 0.0, ay: 0.16, az: 0.06,
      bx: 0.0, by: 0.48, bz: 0.06,
      thickness: 0.015,
      char: '+',
      color: '#e0f2fe',
      bg: '#0c4a6e'
    });

    this.addSegment({
      name: 'blade_r1',
      ax: -0.16, ay: -0.32, az: 0.06,
      bx: 0.16, by: -0.32, bz: 0.06,
      thickness: 0.015,
      char: '*',
      color: '#38bdf8',
      bg: '#082f49'
    });
    this.addSegment({
      name: 'blade_r2',
      ax: 0.0, ay: -0.48, az: 0.06,
      bx: 0.0, by: -0.16, bz: 0.06,
      thickness: 0.015,
      char: '+',
      color: '#e0f2fe',
      bg: '#0c4a6e'
    });

    //4. hanging cctv camera underneath
    this.addSegment({
      name: 'cctv_bracket',
      ax: 0.03, ay: 0.0, az: -0.03,
      bx: 0.03, by: 0.0, bz: -0.08,
      thickness: 0.02,
      char: '|',
      color: '#475569',
      bg: '#020617'
    });
    this.addBox({
      name: 'cctv_housing',
      minX: -0.03, maxX: 0.09,
      minY: -0.04, maxY: 0.04,
      minZ: -0.14, maxZ: -0.08,
      char: '#',
      color: '#f8fafc',
      bg: '#0f172a'
    });
    this.addCylinder({
      name: 'cctv_lens',
      x: 0.09, y: 0.0,
      radius: 0.025,
      minZ: -0.13, maxZ: -0.09,
      char: 'O',
      color: '#00f0ff',
      bg: '#082f49'
    });
    this.addEllipsoid({
      name: 'cctv_rec_led',
      x: 0.07, y: 0.03, z: -0.10,
      radXY: 0.015, radZ: 0.015,
      char: '*',
      color: '#ef4444',
      bg: '#450a0a'
    });
  }

  setMode(mode, target = null) {
    this.mode = mode;
    if (target) {
      this.companionTarget = target;
      this.escortHeading = (target.angle !== undefined ? target.angle : 0.0);
      this.lastTargetX = target.x;
      this.lastTargetY = target.y;
    }
  }

  toggleCompanion(target = null) {
    if (this.mode === 'companion') {
      this.mode = 'patrol';
    } else {
      this.mode = 'companion';
      if (target) {
        this.companionTarget = target;
        this.escortHeading = (target.angle !== undefined ? target.angle : 0.0);
        this.lastTargetX = target.x;
        this.lastTargetY = target.y;
      }
    }
    return this.mode;
  }

  update(dt, now = performance.now()) {
    this.hoverBobTimer += dt * 2.2;
    const hoverBob = Math.sin(this.hoverBobTimer) * 0.08;

    if (this.mode === 'companion' && this.companionTarget) {
      const target = this.companionTarget;
      const targetZ = target.z !== undefined ? target.z : 1.0;

      //track player movement velocity / heading
      if (this.lastTargetX === undefined) this.lastTargetX = target.x;
      if (this.lastTargetY === undefined) this.lastTargetY = target.y;
      if (this.escortHeading === undefined) this.escortHeading = (target.angle !== undefined ? target.angle : 0.0);

      const moveDx = target.x - this.lastTargetX;
      const moveDy = target.y - this.lastTargetY;
      const moveDist = Math.hypot(moveDx, moveDy);
      this.lastTargetX = target.x;
      this.lastTargetY = target.y;

      //distance from drone to player
      const dxToPlayer = target.x - this.x;
      const dyToPlayer = target.y - this.y;
      const distToPlayer = Math.hypot(dxToPlayer, dyToPlayer);

      //if player is actively moving, update escort heading towards movement direction
      if (moveDist > 0.001) {
        const moveHeading = Math.atan2(moveDy, moveDx);
        let diff = moveHeading - this.escortHeading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.escortHeading += diff * Math.min(1.0, dt * 4.0);

        //if player walks directly towards the drone, sweep drone behind the player's movement path
        const playerDirToDrone = Math.atan2(this.y - target.y, this.x - target.x);
        let walkAngleDiff = Math.abs(playerDirToDrone - moveHeading);
        while (walkAngleDiff > Math.PI) walkAngleDiff = Math.abs(walkAngleDiff - Math.PI * 2);
        if (walkAngleDiff < Math.PI / 2.5) {
          this.escortHeading = moveHeading;
        }
      }

      //45 degrees diagonal elevation directly behind the escort heading
      const rearCos = Math.cos(this.escortHeading);
      const rearSin = Math.sin(this.escortHeading);

      //position: behind player by companionDist, elevated by companionHeight
      const desiredX = target.x - rearCos * this.companionDist;
      const desiredY = target.y - rearSin * this.companionDist;
      const desiredZ = targetZ + this.companionHeight + hoverBob;

      //if drone is close to player during approach, accelerate smoothly
      let speedMult = 1.0;
      if (distToPlayer < this.companionDist * 0.75) {
        speedMult = 1.6;
      }

      const followRate = Math.min(1.0, dt * 3.2 * speedMult);
      this.x += (desiredX - this.x) * followRate;
      this.y += (desiredY - this.y) * followRate;
      this.z += (desiredZ - this.z) * followRate;

      //aim drone & cctv camera directly at the player (surveillance tracking)
      const aimAngle = Math.atan2(target.y - this.y, target.x - this.x);
      let angleDiff = aimAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.angle += angleDiff * Math.min(1.0, dt * 7.5);
    } else {
      //patrol mode: orbit designated plaza center
      this.patrolAngle += dt * this.patrolSpeed;
      const desiredX = this.patrolCenter.x + Math.cos(this.patrolAngle) * this.patrolRadius;
      const desiredY = this.patrolCenter.y + Math.sin(this.patrolAngle) * this.patrolRadius;
      const desiredZ = (this.patrolCenter.z || 4.8) + hoverBob * 2.0;

      const followRate = Math.min(1.0, dt * 2.5);
      this.x += (desiredX - this.x) * followRate;
      this.y += (desiredY - this.y) * followRate;
      this.z += (desiredZ - this.z) * followRate;
      this.angle = this.patrolAngle + Math.PI / 2;
    }

    //sync spotlight position with drone body
    if (this.light) {
      this.light.setPosition(this.x, this.y, this.z);
    }

    //spin dual counter-rotating propellers at high speed
    this.propellerAngle += dt * this.propellerSpeed;
    const cosProp = Math.cos(this.propellerAngle);
    const sinProp = Math.sin(this.propellerAngle);
    const rRad = 0.16;
    const hubY = 0.32;

    const bL1 = this.getPart('blade_l1');
    const bL2 = this.getPart('blade_l2');
    const bR1 = this.getPart('blade_r1');
    const bR2 = this.getPart('blade_r2');

    if (bL1 && bL2 && bR1 && bR2) {
      //left rotor
      bL1.ax = -cosProp * rRad;
      bL1.ay = hubY - sinProp * rRad;
      bL1.bx = cosProp * rRad;
      bL1.by = hubY + sinProp * rRad;

      bL2.ax = sinProp * rRad;
      bL2.ay = hubY - cosProp * rRad;
      bL2.bx = -sinProp * rRad;
      bL2.by = hubY + cosProp * rRad;

      //right rotor (counter-rotating)
      bR1.ax = -cosProp * rRad;
      bR1.ay = -hubY + sinProp * rRad;
      bR1.bx = cosProp * rRad;
      bR1.by = -hubY - sinProp * rRad;

      bR2.ax = -sinProp * rRad;
      bR2.ay = -hubY - cosProp * rRad;
      bR2.bx = sinProp * rRad;
      bR2.by = -hubY + cosProp * rRad;
    }

    //blink cctv red recording led
    const cctvLed = this.getPart('cctv_rec_led');
    if (cctvLed) {
      const isBlink = Math.sin(now * 0.008) > 0;
      cctvLed.color = isBlink ? '#ef4444' : '#450a0a';
    }
  }
}

export function createSurveillanceDrone(options = {}) {
  return new DroneEntity({
    x: options.x || 20.0,
    y: options.y || 24.4,
    z: options.z || 4.8,
    angle: options.angle || 0.0,
    mode: options.mode || 'patrol',
    patrolCenter: options.patrolCenter || { x: options.x || 20.0, y: options.y || 20.0, z: options.z || 4.8 },
    patrolRadius: options.patrolRadius || 4.5,
    patrolSpeed: options.patrolSpeed || 0.45,
    companionDist: options.companionDist || 2.4,
    companionHeight: options.companionHeight || 2.4,
    ...options
  });
}
