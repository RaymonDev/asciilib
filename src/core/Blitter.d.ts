export class Blitter {
  cols: number;
  rows: number;
  charWidth: number;
  charHeight: number;
  totalPixels: number;

  frameCharCodes: Uint16Array;
  frameColors: string[];
  frameBgs: string[];
  frameAlphas: Float32Array;
  pixelDepthBuffer: Float32Array;

  constructor(cols?: number, rows?: number, charWidth?: number, charHeight?: number);

  resize(cols: number, rows: number, charWidth?: number, charHeight?: number): void;
  clear(defaultBg?: string, maxDepth?: number): void;
  drawChar(col: number, row: number, ch: string | number, color: string, alpha?: number): void;
  drawOpaqueChar(col: number, row: number, ch: string | number, color: string, alpha?: number, bg?: string): void;
  setDepth(col: number, row: number, depth: number): void;
  getDepth(col: number, row: number): number;
  setChar(col: number, row: number, ch: string | number, color: string, bg?: string, alpha?: number): void;
  renderToCanvas(ctx: CanvasRenderingContext2D, canvasWidth?: number, canvasHeight?: number, fontStyle?: string): void;
  blit(ctx: CanvasRenderingContext2D, canvasWidth?: number, canvasHeight?: number, fontStyle?: string): void;
}
