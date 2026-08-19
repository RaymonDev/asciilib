//light color blending and ascii character luminance modulation utilities

export const LUMINANCE_RAMP_STANDARD = ' .:-=+*#%@';
export const LUMINANCE_RAMP_DENSE = ' .`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

//parse hex or rgb string into normalized [r, g, b] floats (0.0 to 1.0)
export function parseColorRGB(colorStr) {
  if (!colorStr) return [1.0, 1.0, 1.0];
  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const num = parseInt(hex, 16);
    return [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255
    ];
  }
  return [1.0, 1.0, 1.0];
}

//convert normalized [r, g, b] to hex string #rrggbb
export function rgbToHex(r, g, b) {
  const ir = Math.max(0, Math.min(255, Math.round(r * 255)));
  const ig = Math.max(0, Math.min(255, Math.round(g * 255)));
  const ib = Math.max(0, Math.min(255, Math.round(b * 255)));
  return `#${((1 << 24) + (ir << 16) + (ig << 8) + ib).toString(16).slice(1)}`;
}

//modulate ascii character based on light factor (0.0 to 2.0+)
export function modulateCharLuminance(char, lightFactor, ramp = LUMINANCE_RAMP_STANDARD) {
  if (lightFactor <= 0.05) return ' ';
  if (lightFactor >= 1.0 && char && char !== ' ') return char;

  const rampLen = ramp.length;
  //map original char to ramp index if possible, otherwise use light factor directly
  let baseIdx = ramp.indexOf(char);
  if (baseIdx === -1) baseIdx = Math.floor(rampLen * 0.75);

  const targetIdx = Math.max(0, Math.min(rampLen - 1, Math.round(baseIdx * lightFactor)));
  return ramp[targetIdx];
}

//blend base color with dynamic light contribution
export function blendLightColor(baseColorStr, lightR, lightG, lightB, lightIntensity) {
  const [br, bg, bb] = parseColorRGB(baseColorStr);
  const factor = Math.min(2.0, lightIntensity);

  const outR = Math.min(1.0, br * (0.3 + 0.7 * factor * lightR));
  const outG = Math.min(1.0, bg * (0.3 + 0.7 * factor * lightG));
  const outB = Math.min(1.0, bb * (0.3 + 0.7 * factor * lightB));

  return rgbToHex(outR, outG, outB);
}
