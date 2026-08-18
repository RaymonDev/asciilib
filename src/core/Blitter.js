//high-performance framebuffer and batched 2d canvas blitter
export class Blitter {
  constructor(cols = 160, rows = 90, charWidth = 7, charHeight = 10) {
    this.cols = cols;
    this.rows = rows;
    this.charWidth = charWidth;
    this.charHeight = charHeight;
    this.totalPixels = cols * rows;

    this.frameCharCodes = new Uint16Array(this.totalPixels);
    this.frameColors = new Array(this.totalPixels);
    this.frameBgs = new Array(this.totalPixels);
    this.frameAlphas = new Float32Array(this.totalPixels);
    this.pixelDepthBuffer = new Float32Array(this.totalPixels);

    this.clear();
  }

  resize(cols, rows, charWidth = this.charWidth, charHeight = this.charHeight) {
    this.cols = cols;
    this.rows = rows;
    this.charWidth = charWidth;
    this.charHeight = charHeight;
    this.totalPixels = cols * rows;

    this.frameCharCodes = new Uint16Array(this.totalPixels);
    this.frameColors = new Array(this.totalPixels);
    this.frameBgs = new Array(this.totalPixels);
    this.frameAlphas = new Float32Array(this.totalPixels);
    this.pixelDepthBuffer = new Float32Array(this.totalPixels);

    this.clear();
  }

  clear(defaultBg = '#000000', maxDepth = 32.0) {
    this.frameCharCodes.fill(32); //space
    this.frameColors.fill('');
    this.frameBgs.fill(defaultBg);
    this.frameAlphas.fill(1.0);
    this.pixelDepthBuffer.fill(maxDepth);
  }

  drawChar(col, row, ch, color, alpha = 1.0) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    const idx = col * this.rows + row;
    this.frameCharCodes[idx] = typeof ch === 'number' ? ch : ch.charCodeAt(0);
    this.frameColors[idx] = color;
    this.frameAlphas[idx] = alpha;
  }

  drawOpaqueChar(col, row, ch, color, alpha = 1.0, bg = '#000000') {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    const idx = col * this.rows + row;
    this.frameCharCodes[idx] = typeof ch === 'number' ? ch : ch.charCodeAt(0);
    this.frameColors[idx] = color;
    this.frameAlphas[idx] = alpha;
    this.frameBgs[idx] = bg;
  }

  setDepth(col, row, depth) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.pixelDepthBuffer[col * this.rows + row] = depth;
  }

  getDepth(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return Infinity;
    return this.pixelDepthBuffer[col * this.rows + row];
  }

  blit(ctx, canvasWidth = this.cols * this.charWidth, canvasHeight = this.rows * this.charHeight, fontStyle = '900 10px monospace') {
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.font = fontStyle || '900 10px monospace';
    ctx.textBaseline = 'top';

    //1. horizontal background span batcher
    let lastBg = '';
    for (let r = 0; r < this.rows; r++) {
      const py = r * this.charHeight;
      let bgStartCol = -1;
      let currentBg = '';

      for (let c = 0; c < this.cols; c++) {
        const idx = c * this.rows + r;
        const bg = this.frameBgs[idx];

        if (bg && bg !== '#000000') {
          if (bg !== currentBg) {
            if (bgStartCol !== -1) {
              if (currentBg !== lastBg) {
                ctx.fillStyle = currentBg;
                lastBg = currentBg;
              }
              ctx.fillRect(bgStartCol * this.charWidth, py, (c - bgStartCol) * this.charWidth, this.charHeight);
            }
            bgStartCol = c;
            currentBg = bg;
          }
        } else {
          if (bgStartCol !== -1) {
            if (currentBg !== lastBg) {
              ctx.fillStyle = currentBg;
              lastBg = currentBg;
            }
            ctx.fillRect(bgStartCol * this.charWidth, py, (c - bgStartCol) * this.charWidth, this.charHeight);
            bgStartCol = -1;
            currentBg = '';
          }
        }
      }
      if (bgStartCol !== -1) {
        if (currentBg !== lastBg) {
          ctx.fillStyle = currentBg;
          lastBg = currentBg;
        }
        ctx.fillRect(bgStartCol * this.charWidth, py, (this.cols - bgStartCol) * this.charWidth, this.charHeight);
      }
    }

    //2. horizontal contiguous text run batcher
    let lastColor = '';
    let lastAlpha = -1;

    for (let r = 0; r < this.rows; r++) {
      const py = r * this.charHeight;
      let textStartCol = -1;
      let currentText = '';
      let currentColor = '';
      let currentAlpha = -1;

      for (let c = 0; c < this.cols; c++) {
        const idx = c * this.rows + r;
        const code = this.frameCharCodes[idx];

        if (code > 32) {
          const col = this.frameColors[idx] || '#ffffff';
          const a = Math.round((this.frameAlphas[idx] || 1.0) * 20) / 20;

          if (col === currentColor && a === currentAlpha && textStartCol !== -1) {
            currentText += String.fromCharCode(code);
          } else {
            if (textStartCol !== -1) {
              if (currentAlpha !== lastAlpha) {
                ctx.globalAlpha = currentAlpha;
                lastAlpha = currentAlpha;
              }
              if (currentColor !== lastColor) {
                ctx.fillStyle = currentColor;
                lastColor = currentColor;
              }
              ctx.fillText(currentText, textStartCol * this.charWidth, py);
            }
            textStartCol = c;
            currentText = String.fromCharCode(code);
            currentColor = col;
            currentAlpha = a;
          }
        } else {
          if (textStartCol !== -1) {
            if (currentAlpha !== lastAlpha) {
              ctx.globalAlpha = currentAlpha;
              lastAlpha = currentAlpha;
            }
            if (currentColor !== lastColor) {
              ctx.fillStyle = currentColor;
              lastColor = currentColor;
            }
            ctx.fillText(currentText, textStartCol * this.charWidth, py);
            textStartCol = -1;
            currentText = '';
            currentColor = '';
            currentAlpha = -1;
          }
        }
      }
      if (textStartCol !== -1) {
        if (currentAlpha !== lastAlpha) {
          ctx.globalAlpha = currentAlpha;
          lastAlpha = currentAlpha;
        }
        if (currentColor !== lastColor) {
          ctx.fillStyle = currentColor;
          lastColor = currentColor;
        }
        ctx.fillText(currentText, textStartCol * this.charWidth, py);
      }
    }

    ctx.globalAlpha = 1.0;
  }

  renderToCanvas(ctx, canvasWidth = this.cols * this.charWidth, canvasHeight = this.rows * this.charHeight, fontStyle = '900 10px monospace') {
    return this.blit(ctx, canvasWidth, canvasHeight, fontStyle);
  }
}
