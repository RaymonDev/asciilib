# 3D Primitives & Compound Hierarchies

Exact analytical geometric shapes combined with a hierarchical `CompoundEntity` graph, enabling high-performance rasterization of everything from basic bounding boxes to articulated robots and multi-part vehicles.

---

## 1. Standalone Primitives

All standalone primitives extend the base `Entity` class and implement native `.render(...)` so they can be added directly to the `Scene`:

```javascript
import {
  BoxEntity,
  CylinderEntity,
  EllipsoidEntity
} from 'asciilib-3d';
```

### BoxEntity

A 3D axis-aligned or oriented rectangular cuboid:

```javascript
const box = new BoxEntity({
  x: 10.0,
  y: 15.0,
  z: 0.5,
  sizeX: 2.0,   // Width along X
  sizeY: 1.5,   // Depth along Y
  sizeZ: 1.0,   // Height along Z
  angle: Math.PI / 4, // Rotation in radians
  char: '#',
  color: '#00f0ff',
  bg: '#082f49'
});

scene.add(box);
```

### CylinderEntity

A vertical 3D cylinder (ideal for pillars, barrels, tree trunks, and posts):

```javascript
const cylinder = new CylinderEntity({
  x: 8.0,
  y: 12.0,
  z: 0.0,
  radius: 0.4,
  height: 3.0,
  char: 'H',
  color: '#94a3b8',
  bg: '#1e293b'
});

scene.add(cylinder);
```

### EllipsoidEntity

A smooth 3D ellipsoid or sphere (ideal for foliage canopies, warning orbs, and organic shapes):

```javascript
const sphere = new EllipsoidEntity({
  x: 12.0,
  y: 12.0,
  z: 2.5,
  radXY: 1.2,   // Horizontal radius
  radZ: 1.0,    // Vertical radius
  char: '@',
  color: '#2ed573',
  bg: '#0a2e15'
});

scene.add(sphere);
```

---

## 2. Compound Entities (`CompoundEntity`)

`CompoundEntity` allows you to assemble multi-part hierarchical 3D objects containing multiple boxes, cylinders, ellipsoids, and thick line segments defined in local space:

```javascript
import { CompoundEntity } from 'asciilib-3d';

export class CyberCrateEntity extends CompoundEntity {
  constructor(options = {}) {
    super(options);
    this.type = 'crate';

    // 1. Base metal frame box
    this.addBox({
      name: 'base_frame',
      minX: -0.5, maxX: 0.5,
      minY: -0.5, maxY: 0.5,
      minZ: -0.5, maxZ: 0.5,
      char: '#',
      color: '#334155',
      bg: '#0f172a'
    });

    // 2. Center glowing power core
    this.addEllipsoid({
      name: 'energy_core',
      x: 0.0, y: 0.0, z: 0.0,
      radXY: 0.25, radZ: 0.25,
      char: '*',
      color: '#00f0ff',
      bg: '#082f49'
    });

    // 3. Diagonal corner reinforcement struts
    this.addSegment({
      name: 'strut_top',
      ax: -0.45, ay: -0.45, az: 0.45,
      bx: 0.45, by: 0.45, bz: 0.45,
      thickness: 0.04,
      char: '=',
      color: '#f8fafc',
      bg: '#1e293b'
    });
  }
}
```

### Automatic Bounds Recomputation

Whenever you call `addBox`, `addCylinder`, `addEllipsoid`, or `addSegment`, the `CompoundEntity` automatically calculates its exact 3D bounding box (`minX, minY, minZ, maxX, maxY, maxZ`) and conservative `boundingRadius` for culling and spatial hashing:

```javascript
const crate = new CyberCrateEntity({ x: 15.0, y: 20.0, z: 0.5 });
console.log(crate.boundingRadius); // Automatically computed
scene.add(crate);
```
