//procedural pattern synthesis and procedural ascii brushes for surfaces, roads, and facades

export class ASCIIBrush {
  //brick masonry pattern with staggered rows
  static sampleBrick(u, v, options = {}) {
    const scaleU = options.scaleU || 4.0;
    const scaleV = options.scaleV || 2.0;
    const colSlot = Math.floor(u * scaleU);
    const rowSlot = Math.floor(v * scaleV);
    const isMortarV = (Math.abs(v * scaleV - Math.round(v * scaleV)) < 0.08);
    const isMortarU = ((colSlot + (rowSlot % 2) * 0.5) % 1.0 < 0.12);

    if (isMortarV || isMortarU) {
      return {
        char: isMortarV ? '=' : '|',
        color: options.mortarColor || '#475569',
        bg: options.mortarBg || '#0f172a'
      };
    }
    return {
      char: options.brickChar || '#',
      color: options.brickColor || '#b91c1c',
      bg: options.brickBg || '#140606'
    };
  }

  //skyscraper window grid with lit / unlit office randomization
  static sampleWindowGrid(u, v, options = {}) {
    const colSlot = Math.floor(u * (options.colScale || 4.0));
    const floorIdx = Math.floor(v * (options.floorScale || 1.5));
    const isWindowCol = (colSlot % 2 === 1);
    const isFloorSeam = (Math.abs(v * (options.floorScale || 1.5) - Math.round(v * (options.floorScale || 1.5))) < 0.08);

    if (isFloorSeam) {
      return {
        char: '=',
        color: options.spandrelColor || '#64748b',
        bg: options.spandrelBg || '#0f172a'
      };
    }

    if (isWindowCol) {
      const isLit = ((colSlot * 3 + floorIdx * 7) % 5 < (options.litThreshold || 3));
      return {
        char: isLit ? ':' : '.',
        color: isLit ? (options.litColor || '#ffeaa7') : (options.unlitColor || '#1e293b'),
        bg: options.windowBg || '#020617'
      };
    }

    return {
      char: '|',
      color: options.pillarColor || '#94a3b8',
      bg: options.pillarBg || '#0f172a'
    };
  }

  //zebra crosswalk stripes
  static sampleZebra(coord, isVertical = true, options = {}) {
    const period = options.period || 0.8;
    const stripeWidth = options.stripeWidth || 0.46;
    const isStripe = ((((coord % period) + period) % period) < stripeWidth);

    if (isStripe) {
      return {
        char: isVertical ? '|' : '=',
        color: options.stripeColor || '#f1f5f9',
        bg: options.asphaltBg || '#050810'
      };
    }

    return {
      char: ' ',
      color: options.asphaltColor || '#050810',
      bg: options.asphaltBg || '#050810'
    };
  }

  //checkerboard pattern
  static sampleCheckerboard(u, v, scale = 2.0, options = {}) {
    const isEven = (Math.floor(u * scale) + Math.floor(v * scale)) % 2 === 0;
    return {
      char: isEven ? (options.charA || '#') : (options.charB || ':'),
      color: isEven ? (options.colorA || '#0f172a') : (options.colorB || '#ffffff'),
      bg: isEven ? (options.bgA || '#1e293b') : (options.bgB || '#94a3b8')
    };
  }

  //manhole iron waffle traction pattern
  static sampleManhole(dx, dy, radius = 0.28) {
    const distSq = dx * dx + dy * dy;
    if (distSq > radius * radius) return null;
    const d = Math.sqrt(distSq);

    if (d > radius * 0.75) {
      return {
        char: (Math.abs(dx) > Math.abs(dy)) ? '|' : '=',
        color: '#64748b',
        bg: '#1e293b'
      };
    } else if (d > radius * 0.35) {
      const pat = (Math.floor(dx * 20.0) + Math.floor(dy * 20.0)) % 2;
      return {
        char: pat === 0 ? '#' : '%',
        color: '#475569',
        bg: '#0f172a'
      };
    } else {
      return {
        char: '*',
        color: '#94a3b8',
        bg: '#0f172a'
      };
    }
  }

  //neon signage character sampler
  static sampleSign(u, v, uStart, uEnd, vStart, vEnd, text, options = {}) {
    if (u < uStart || u > uEnd || v < vStart || v > vEnd) return null;
    const uFrac = (u - uStart) / (uEnd - uStart);
    const charIdx = Math.floor(uFrac * text.length);
    const ch = text[Math.min(text.length - 1, Math.max(0, charIdx))];
    if (ch === ' ') return null;

    return {
      char: ch,
      color: options.color || '#00f0ff',
      bg: options.bg || '#05182e'
    };
  }
}
