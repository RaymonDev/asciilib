export interface MaterialSampleContext {
  u?: number;
  v?: number;
  z?: number;
  face?: string;
  normalAngle?: number;
  dist?: number;
  [key: string]: any;
}

export interface MaterialSampleResult {
  char?: string | number;
  color?: string;
  bg?: string;
  alpha?: number;
}

export type StringOrFunction = string | number | ((ctx: MaterialSampleContext) => string | number);
export type PatternType = 'solid' | 'grid' | 'stripes' | 'checker' | 'dots';

export interface ASCIIMaterialOptions {
  name?: string;
  char?: StringOrFunction;
  color?: StringOrFunction;
  bg?: StringOrFunction;
  alpha?: number;

  pattern?: PatternType;
  patternScale?: number;
  patternChar?: string | number;
  patternColor?: string;
  patternBg?: string;

  specularChar?: string | number;
  specularColor?: string;
  roughness?: number;

  customSample?: ((ctx: MaterialSampleContext) => MaterialSampleResult) | null;
}

export class ASCIIMaterial {
  name: string;
  char: StringOrFunction;
  color: StringOrFunction;
  bg: StringOrFunction;
  alpha: number;

  pattern: PatternType;
  patternScale: number;
  patternChar: string | number;
  patternColor: string;
  patternBg: string;

  specularChar: string | number;
  specularColor: string;
  roughness: number;

  customSample: ((ctx: MaterialSampleContext) => MaterialSampleResult) | null;

  constructor(options?: ASCIIMaterialOptions);

  sample(context?: MaterialSampleContext): MaterialSampleResult;
}
