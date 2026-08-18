//scene container managing entities, map data, spatial grids, and particles
import { SpatialHashGrid } from '../spatial/SpatialHashGrid.js';
import { ParticleSystem } from '../particles/ParticleSystem.js';

export class Scene {
  constructor(options = {}) {
    this.mapSize = options.mapSize || 80;
    this.map = options.map || new Uint8Array(this.mapSize * this.mapSize);
    this.buildingHeights = options.buildingHeights || new Float32Array(this.mapSize * this.mapSize);

    this.entities = [];
    this.staticGrid = new SpatialHashGrid(options.cellSize || 8.0, this.mapSize);
    this.dynamicGrid = new SpatialHashGrid(options.cellSize || 8.0, this.mapSize);
    this.particleSystem = new ParticleSystem(options.particleOptions || {});

    this.ambientLight = options.ambientLight || '#ffffff';
    this.sunDirection = options.sunDirection || { x: 0.6, y: -0.3, z: 0.7 };
  }

  add(entity) {
    this.entities.push(entity);
    if (entity.isStatic) {
      this.staticGrid.insert(entity, entity.boundingRadius);
    } else {
      this.dynamicGrid.insert(entity, entity.boundingRadius);
    }
    return entity;
  }

  remove(entity) {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) {
      this.entities.splice(idx, 1);
    }
    return entity;
  }

  rebuildStaticGrid() {
    this.staticGrid.clear();
    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      if (ent.isStatic && ent.active) {
        this.staticGrid.insert(ent, ent.boundingRadius);
      }
    }
  }

  rebuildDynamicGrid() {
    this.dynamicGrid.clear();
    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      if (!ent.isStatic && ent.active) {
        this.dynamicGrid.insert(ent, ent.boundingRadius);
      }
    }

    //insert active particles
    const particles = this.particleSystem.particles;
    for (let i = 0; i < particles.length; i++) {
      this.dynamicGrid.insert(particles[i], 0.3);
    }
  }

  update(dt) {
    //update all dynamic entities
    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      if (!ent.isStatic && ent.active) {
        ent.update(dt, this);
      }
    }

    //update particles
    this.particleSystem.update(dt);

    //rebuild dynamic spatial hash grid
    this.rebuildDynamicGrid();
  }

  queryFrustum(camera, outStatic = [], outDynamic = []) {
    const frustum = camera.getFrustumAABB();
    this.staticGrid.queryAABB(frustum.minX, frustum.minY, frustum.maxX, frustum.maxY, outStatic);
    this.dynamicGrid.queryAABB(frustum.minX, frustum.minY, frustum.maxX, frustum.maxY, outDynamic);
    return {
      staticEntities: outStatic,
      dynamicEntities: outDynamic
    };
  }

  renderEntities(camera, blitter) {
    const frustum = camera.getFrustumAABB();
    const staticEntities = [];
    const dynamicEntities = [];
    this.staticGrid.queryAABB(frustum.minX, frustum.minY, frustum.maxX, frustum.maxY, staticEntities);
    this.dynamicGrid.queryAABB(frustum.minX, frustum.minY, frustum.maxX, frustum.maxY, dynamicEntities);

    const planar = camera.getPlanarVectors();
    const horizon = Math.floor(blitter.rows * 0.5 + camera.pitch * blitter.rows * 0.75);

    //render static entities
    for (let i = 0; i < staticEntities.length; i++) {
      const ent = staticEntities[i];
      if (ent.render) ent.render(camera, blitter, this, planar, horizon);
    }

    //render dynamic entities
    for (let i = 0; i < dynamicEntities.length; i++) {
      const ent = dynamicEntities[i];
      if (ent.render) ent.render(camera, blitter, this, planar, horizon);
    }

    //render particle system
    this.particleSystem.render(camera, blitter, planar, horizon);
  }

  clear() {
    this.entities.length = 0;
    this.staticGrid.clear();
    this.dynamicGrid.clear();
    this.particleSystem.clear();
  }
}
