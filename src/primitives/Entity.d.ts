import { Camera } from '../camera/Camera.js';
import { Blitter } from '../core/Blitter.js';
import { Scene } from '../scene/Scene.js';

export interface EntityOptions {
  id?: string;
  type?: string;
  x?: number;
  y?: number;
  z?: number;
  angle?: number;
  pitch?: number;
  boundingRadius?: number;
  isStatic?: boolean;
  visible?: boolean;
  active?: boolean;
  onUpdate?: ((dt: number, entity: Entity, scene: Scene) => void) | null;
  onRender?: ((camera: Camera, blitter: Blitter, entity: Entity, scene: Scene) => void) | null;
  customData?: Record<string, any>;
}

export class Entity {
  id: string;
  type: string;
  x: number;
  y: number;
  z: number;
  angle: number;
  pitch: number;
  boundingRadius: number;
  isStatic: boolean;
  visible: boolean;
  active: boolean;

  onUpdate: ((dt: number, entity: Entity, scene: Scene) => void) | null;
  onRender: ((camera: Camera, blitter: Blitter, entity: Entity, scene: Scene) => void) | null;
  customData: Record<string, any>;

  constructor(options?: EntityOptions);

  update(dt: number, scene?: any): void;
  render(camera: Camera, blitter: Blitter, scene: Scene, planar?: any, horizon?: number): void;
}
