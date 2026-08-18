//architectural facade shaders, setback generators, and signage presets
import { ASCIIBrush } from '../materials/ASCIIBrush.js';

export function createSkyscraperShader(options = {}) {
  const litColor = options.litColor || '#ffeaa7';
  const unlitColor = options.unlitColor || '#1e293b';
  const pillarColor = options.pillarColor || '#94a3b8';
  const spandrelColor = options.spandrelColor || '#64748b';
  const signText = options.signText || null;
  const signColor = options.signColor || '#00f0ff';

  return function customSkyscraperShader(context = {}) {
    const hitU = context.hitU !== undefined ? context.hitU : 0;
    const hitWorldZ = context.hitWorldZ !== undefined ? context.hitWorldZ : 0;
    const dist = context.dist !== undefined ? context.dist : (context.corrDist || 1.0);
    const maxDepth = context.maxDepth || 60.0;
    const isFrontSouth = context.isFrontSouth || false;
    const depthAlpha = Math.max(0.25, 1 - (dist / maxDepth));

    if (signText && hitWorldZ >= 3.2 && hitWorldZ <= 4.6) {
      const sign = ASCIIBrush.sampleSign(hitU % 16, hitWorldZ, 3.0, 13.0, 3.2, 4.6, signText, { color: signColor });
      if (sign) {
        return { char: sign.char, color: sign.color, alpha: depthAlpha, bg: sign.bg };
      }
    }

    const sampled = ASCIIBrush.sampleWindowGrid(hitU, hitWorldZ, {
      litColor,
      unlitColor,
      pillarColor: isFrontSouth ? pillarColor : '#475569',
      spandrelColor
    });

    return {
      char: sampled.char,
      color: sampled.color,
      alpha: depthAlpha,
      bg: isFrontSouth ? '#140c03' : '#0c0802'
    };
  };
}
