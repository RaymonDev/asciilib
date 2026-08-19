export interface EngineOptions {
  canvas?: HTMLCanvasElement | null;
  cols?: number;
  rows?: number;
  charWidth?: number;
  charHeight?: number;
  fontFamily?: string;
  fontSize?: number;
}

export class Engine {
  canvas: HTMLCanvasElement | null;
  cols: number;
  rows: number;
  charWidth: number;
  charHeight: number;
  fontFamily: string;
  fontSize: number;

  ctx: CanvasRenderingContext2D | null;
  isRunning: boolean;
  isPaused: boolean;
  lastTime: number;
  fps: number;
  frameCount: number;
  fpsTimer: number;

  constructor(options?: EngineOptions);

  resize(): void;
  start(updateFn: (dt: number) => void, renderFn: (ctx: CanvasRenderingContext2D | null) => void): void;
  stop(): void;
  pause(): void;
  resume(): void;
}
