export const LUMINANCE_RAMP_STANDARD: string;
export const LUMINANCE_RAMP_DENSE: string;

export function parseColorRGB(colorStr?: string): [number, number, number];
export function rgbToHex(r: number, g: number, b: number): string;
export function modulateCharLuminance(char: string, lightFactor: number, ramp?: string): string;
export function blendLightColor(baseColorStr: string, lightR: number, lightG: number, lightB: number, lightIntensity: number): string;
