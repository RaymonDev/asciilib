//game loop, timing, canvas resize and engine lifecycle
export class Engine {
  constructor(options = {}) {
    this.canvas = options.canvas || null;
    this.cols = options.cols || 160;
    this.rows = options.rows || 90;
    this.charWidth = options.charWidth || 7;
    this.charHeight = options.charHeight || 10;
    this.fontFamily = options.fontFamily || '"Cascadia Code", "Fira Code", monospace';
    this.fontSize = options.fontSize || 10;

    this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: false }) : null;
    this.isRunning = false;
    this.isPaused = false;
    this.lastTime = 0;
    this.fps = 60;
    this.frameCount = 0;
    this.fpsTimer = 0;

    this.updateCallback = null;
    this.renderCallback = null;
    this.animationFrameId = null;

    if (this.canvas) {
      this.resize();
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = this.cols * this.charWidth;
    this.canvas.height = this.rows * this.charHeight;
  }

  start(updateFn, renderFn) {
    this.updateCallback = updateFn;
    this.renderCallback = renderFn;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    const loop = (now) => {
      if (!this.isRunning) return;

      const currentTime = now || (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
      this.lastTime = currentTime;

      if (!this.isPaused && this.updateCallback) {
        this.updateCallback(dt);
      }

      if (this.renderCallback) {
        this.renderCallback(this.ctx);
      }

      this.frameCount++;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 0.25) {
        this.fps = Math.round(this.frameCount / this.fpsTimer);
        this.frameCount = 0;
        this.fpsTimer = 0;
      }

      if (typeof requestAnimationFrame !== 'undefined') {
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(loop);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
