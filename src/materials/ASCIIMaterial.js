//declarative ascii material definition with procedural patterns and surface styling
export class ASCIIMaterial {
  constructor(options = {}) {
    this.name = options.name || 'default_material';
    this.char = options.char || '#';
    this.color = options.color || '#ffffff';
    this.bg = options.bg || '#000000';
    this.alpha = options.alpha !== undefined ? options.alpha : 1.0;

    this.pattern = options.pattern || 'solid';
    this.patternScale = options.patternScale || 1.0;
    this.patternChar = options.patternChar || '.';
    this.patternColor = options.patternColor || this.color;
    this.patternBg = options.patternBg || this.bg;

    this.specularChar = options.specularChar || '*';
    this.specularColor = options.specularColor || '#ffffff';
    this.roughness = options.roughness !== undefined ? options.roughness : 0.5;

    this.customSample = options.customSample || null;
  }

  sample(context = {}) {
    if (this.customSample) {
      return this.customSample(context);
    }

    const u = context.u !== undefined ? context.u : 0;
    const v = context.v !== undefined ? context.v : 0;
    const z = context.z !== undefined ? context.z : 0;
    const face = context.face || 'side';

    let ch = typeof this.char === 'function' ? this.char(context) : this.char;
    let color = typeof this.color === 'function' ? this.color(context) : this.color;
    let bg = typeof this.bg === 'function' ? this.bg(context) : this.bg;
    let alpha = this.alpha;

    if (this.pattern === 'grid') {
      const isGridLine = (Math.floor(u * this.patternScale) % 2 === 0 || Math.floor(v * this.patternScale) % 2 === 0);
      if (isGridLine) {
        ch = this.patternChar;
        color = this.patternColor;
        bg = this.patternBg;
      }
    } else if (this.pattern === 'stripes') {
      const isStripe = (Math.floor(v * this.patternScale) % 2 === 0);
      if (isStripe) {
        ch = this.patternChar;
        color = this.patternColor;
        bg = this.patternBg;
      }
    } else if (this.pattern === 'checker') {
      const isWhite = (Math.floor(u * this.patternScale) + Math.floor(v * this.patternScale)) % 2 === 0;
      if (isWhite) {
        ch = this.patternChar;
        color = this.patternColor;
        bg = this.patternBg;
      }
    } else if (this.pattern === 'dots') {
      const isDot = (Math.floor(u * this.patternScale) % 3 === 0 && Math.floor(v * this.patternScale) % 3 === 0);
      if (isDot) {
        ch = this.patternChar;
        color = this.patternColor;
        bg = this.patternBg;
      }
    }

    return {
      char: ch,
      color: color,
      bg: bg,
      alpha: alpha
    };
  }
}
