//base 3d entity class
export class Entity {
  constructor(options = {}) {
    this.id = options.id || ('entity_' + Math.random().toString(36).substr(2, 9));
    this.type = options.type || 'generic';
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.z = options.z || 0;
    this.angle = options.angle || 0; //yaw in radians
    this.pitch = options.pitch || 0;
    this.boundingRadius = options.boundingRadius || 0.5;
    this.isStatic = options.isStatic || false;
    this.visible = options.visible !== false;
    this.active = options.active !== false;

    this.onUpdate = options.onUpdate || null;
    this.onRender = options.onRender || null;
    this.customData = options.customData || {};
  }

  update(dt, scene) {
    if (this.onUpdate) {
      this.onUpdate(dt, this, scene);
    }
  }

  render(camera, blitter, scene) {
    if (this.onRender) {
      this.onRender(camera, blitter, this, scene);
    }
  }
}
