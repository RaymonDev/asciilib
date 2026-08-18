//roads, asphalt, crosswalks, and underground utility shaders
import { ASCIIBrush } from '../materials/ASCIIBrush.js';

export function createRoadFloorShader(options = {}) {
  const asphaltColor = options.asphaltColor || '#050810';
  const asphaltBg = options.asphaltBg || '#050810';
  const curbColor = options.curbColor || '#475569';
  const curbBg = options.curbBg || '#0f172a';
  const sidewalkColor = options.sidewalkColor || '#64748b';
  const sidewalkBg = options.sidewalkBg || '#1e293b';

  return function proceduralFloorShader(context = {}) {
    const floorX = context.floorX || 0;
    const floorY = context.floorY || 0;
    const d = context.corrDist !== undefined ? context.corrDist : (context.dist || 1.0);
    const mDepth = context.maxDepth || 60.0;
    const depthAlpha = Math.max(0.35, 1 - (d / mDepth));

    let tile = context.mapTile;
    if (tile === undefined && context.scene && context.scene.map) {
      const tx = Math.floor(floorX);
      const ty = Math.floor(floorY);
      if (tx >= 0 && tx < context.scene.mapSize && ty >= 0 && ty < context.scene.mapSize) {
        tile = context.scene.map[ty * context.scene.mapSize + tx];
      }
    }
    if (tile === undefined) tile = 0;

    if (tile === 0) {
      const u = ((floorX % 1.0) + 1.0) % 1.0;
      const v = ((floorY % 1.0) + 1.0) % 1.0;

      //yellow center divider line
      if (Math.abs(u - 0.5) < 0.04 || Math.abs(v - 0.5) < 0.04) {
        return {
          char: '=',
          color: '#ffd700',
          alpha: depthAlpha,
          bg: asphaltBg
        };
      }

      //asphalt surface texture
      const noise = (Math.floor(floorX * 8) + Math.floor(floorY * 8)) % 3;
      const ch = noise === 0 ? '.' : ' ';
      return {
        char: ch,
        color: asphaltColor,
        alpha: depthAlpha,
        bg: asphaltBg
      };
    }

    //sidewalk / curb
    return {
      char: '.',
      color: sidewalkColor,
      alpha: depthAlpha,
      bg: sidewalkBg
    };
  };
}
