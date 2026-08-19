import { MaterialSampleResult } from './ASCIIMaterial.js';

export interface BrickBrushOptions {
  scaleU?: number;
  scaleV?: number;
  mortarColor?: string;
  mortarBg?: string;
  brickChar?: string | number;
  brickColor?: string;
  brickBg?: string;
}

export interface WindowGridOptions {
  colScale?: number;
  floorScale?: number;
  spandrelColor?: string;
  spandrelBg?: string;
  litThreshold?: number;
  litColor?: string;
  unlitColor?: string;
  windowBg?: string;
  pillarColor?: string;
  pillarBg?: string;
}

export interface ZebraBrushOptions {
  period?: number;
  stripeRatio?: number;
  stripeColor?: string;
  stripeBg?: string;
  roadColor?: string;
  roadBg?: string;
}

export interface ManholeBrushOptions {
  innerChar?: string | number;
  rimChar?: string | number;
  ironColor?: string;
  ironBg?: string;
}

export interface SignBrushOptions {
  signBg?: string;
  frameColor?: string;
  textColor?: string;
}

export class ASCIIBrush {
  static sampleBrick(u: number, v: number, options?: BrickBrushOptions): MaterialSampleResult;
  static sampleWindowGrid(u: number, v: number, options?: WindowGridOptions): MaterialSampleResult;
  static sampleZebra(coord: number, isVertical?: boolean, options?: ZebraBrushOptions): MaterialSampleResult;
  static sampleManhole(localX: number, localY: number, radius?: number, options?: ManholeBrushOptions): MaterialSampleResult | null;
  static sampleSign(
    u: number, v: number,
    signMinU: number, signMaxU: number,
    signMinV: number, signMaxV: number,
    text: string, options?: SignBrushOptions
  ): MaterialSampleResult | null;
}
