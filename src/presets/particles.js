//particle presets: sewer steam puffs, cyberpunk rain, and neon sparks

export function emitSteamPuff(particleSystem, x, y, options = {}) {
  particleSystem.emit({
    x: x + (Math.random() - 0.5) * (options.spread || 0.2),
    y: y + (Math.random() - 0.5) * (options.spread || 0.2),
    z: options.z !== undefined ? options.z : 0.05,
    vx: (Math.random() - 0.5) * 0.06,
    vy: (Math.random() - 0.5) * 0.06,
    vz: options.vz || (0.25 + Math.random() * 0.2),
    life: options.life || 2.4,
    maxLife: options.life || 2.4,
    char: options.char || '%',
    color: options.color || '#64748b'
  });
}

export function emitSparks(particleSystem, x, y, z, count = 8, options = {}) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.0;
    particleSystem.emit({
      x: x,
      y: y,
      z: z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: 0.5 + Math.random() * 0.8,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      char: '*',
      color: options.color || '#ffd700'
    });
  }
}

export function emitRainDrop(particleSystem, bounds = { minX: 0, maxX: 80, minY: 0, maxY: 80, topZ: 15.0 }) {
  particleSystem.emit({
    x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
    y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
    z: bounds.topZ,
    vx: -0.2,
    vy: 0.1,
    vz: -8.0,
    life: 2.0,
    maxLife: 2.0,
    char: '|',
    color: '#38bdf8'
  });
}
