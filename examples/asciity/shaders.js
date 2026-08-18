//procedural ascii materials and shaders for all architectural styles & floor textures
import { isMetropolisCrosswalk, getManholeDetails, MAP_SIZE } from './cityData.js';

function getSignChar(worldHitU, worldZ, uStart, uEnd, zStart, zEnd, text) {
  if (worldHitU < uStart || worldHitU > uEnd || worldZ < zStart || worldZ > zEnd) return null;
  const uFrac = (worldHitU - uStart) / (uEnd - uStart);
  const charIdx = Math.floor(uFrac * text.length);
  const ch = text[Math.min(text.length - 1, Math.max(0, charIdx))];
  return (ch !== ' ') ? ch : null;
}

export function wallShader({ tileVal, hitU, hitWorldZ, dist, maxDepth, isFrontSouth }) {
  const depthAlpha = Math.max(0.25, 1 - (dist / maxDepth));
  const worldHitU = hitU;
  const colSlot = Math.floor(worldHitU * 4);
  const isWindowCol = (colSlot % 2 === 1);
  const worldZ = hitWorldZ;
  const floorIdx = Math.floor(worldZ * 1.5);

  let ch = ' ';
  let color = '#ffd700';
  let wallBg = isFrontSouth ? '#140c03' : '#0c0802';

  //tile 10: empire supertall
  if (tileVal === 10) {
    const sign1 = getSignChar(worldHitU % 16, worldZ, 4.0, 12.0, 3.2, 4.6, '[ EMPIRE TOWER ]');
    const sign2 = getSignChar(worldHitU % 16, worldZ, 5.0, 11.0, 43.0, 44.8, '[ CHRONOS ]');

    if (sign1) {
      ch = sign1;
      color = '#ffd700';
      wallBg = '#050f26';
    } else if (sign2) {
      ch = sign2;
      color = '#ffffff';
      wallBg = '#3b1c05';
    } else if (worldZ < 2.4) {
      if (isFrontSouth && worldHitU % 16 >= 6.5 && worldHitU % 16 <= 9.5) {
        ch = (worldZ >= 1.9) ? '=' : ((Math.floor(worldHitU * 6) % 2 === 0) ? '|' : ' ');
        color = '#ffd700';
        wallBg = '#221505';
      } else {
        ch = isWindowCol ? ':' : '#';
        color = '#8c6239';
      }
    } else if (worldZ >= 48.0) {
      ch = (colSlot % 2 === 1) ? '^' : '|';
      color = (worldZ >= 52.0) ? '#ffffff' : '#ffd700';
    } else {
      if (isWindowCol) {
        const isLit = ((colSlot * 3 + floorIdx * 7) % 5 < 3);
        ch = isLit ? ':' : '.';
        color = isLit ? '#ffeaa7' : '#2d3436';
      } else {
        ch = '|';
        color = isFrontSouth ? '#d4af37' : '#aa8c2c';
      }
      if (Math.abs(worldZ - Math.round(worldZ)) < 0.08) {
        ch = '=';
        color = isFrontSouth ? '#aa8c2c' : '#775f1a';
      }
    }
  }
  //tile 11: arasaka corporate tower
  else if (tileVal === 11) {
    wallBg = isFrontSouth ? '#030814' : '#02050d';
    const sign = getSignChar(worldHitU % 12, worldZ, 2.0, 10.0, 3.5, 5.0, '[ ARASAKA CORP ]');

    if (sign) {
      ch = sign;
      color = '#ff0055';
      wallBg = '#2e0011';
    } else if (worldZ < 2.4) {
      ch = '#';
      color = '#0369a1';
    } else if (worldZ >= 46.0) {
      ch = (colSlot % 2 === 1) ? '^' : '|';
      color = (worldZ >= 49.0) ? '#ffffff' : '#00f0ff';
    } else {
      if (isWindowCol) {
        const isLit = ((colSlot * 5 + floorIdx * 13) % 5 < 3);
        ch = isLit ? ':' : '.';
        color = isLit ? '#e0f2fe' : '#1e293b';
      } else {
        ch = '|';
        color = isFrontSouth ? '#0284c7' : '#0369a1';
      }
      if (Math.abs(worldZ - Math.round(worldZ)) < 0.07) {
        ch = '=';
        color = isFrontSouth ? '#0369a1' : '#075985';
      }
    }
  }
  //tile 12: quantum twin towers
  else if (tileVal === 12) {
    wallBg = isFrontSouth ? '#06130e' : '#040d0a';
    const sign = getSignChar(worldHitU % 16, worldZ, 2.5, 13.5, 3.2, 4.6, '[ QUANTUM LABS ]');

    if (sign) {
      ch = sign;
      color = '#6ee7b7';
      wallBg = '#062d1f';
    } else if (worldZ < 2.4) {
      ch = isWindowCol ? ':' : '|';
      color = '#047857';
    } else if (worldZ >= 42.0) {
      ch = (colSlot % 2 === 1) ? '^' : '=';
      color = '#6ee7b7';
    } else {
      if (isWindowCol) {
        const isLit = ((colSlot * 3 + floorIdx * 7) % 6 < 3);
        ch = isLit ? ':' : '.';
        color = isLit ? '#a7f3d0' : '#1e293b';
      } else {
        ch = '|';
        color = '#059669';
      }
      if (Math.abs(worldZ - Math.round(worldZ)) < 0.08) {
        ch = '=';
        color = '#047857';
      }
    }
  }
  //tile 13: metropolis hotel
  else if (tileVal === 13) {
    wallBg = isFrontSouth ? '#140f08' : '#0d0a05';
    const sign1 = getSignChar(worldHitU % 15, worldZ, 3.0, 12.0, 20.0, 21.6, '[ THE METROPOLIS ]');
    const sign2 = getSignChar(worldHitU % 15, worldZ, 3.5, 11.5, 2.8, 4.0, '[ GRAND HOTEL ]');

    if (sign1) {
      ch = sign1;
      color = '#fde047';
      wallBg = '#2b1e06';
    } else if (sign2) {
      ch = sign2;
      color = '#f59e0b';
      wallBg = '#241402';
    } else if (worldZ < 2.4) {
      ch = isWindowCol ? ':' : '|';
      color = '#d97706';
    } else {
      if (isWindowCol) {
        const isLit = ((colSlot * 7 + floorIdx * 5) % 5 < 3);
        ch = isLit ? ':' : '.';
        color = isLit ? '#fed7aa' : '#334155';
      } else {
        const isBalcony = (Math.floor(worldHitU * 2) % 3 === 0);
        ch = isBalcony ? 'H' : '|';
        color = isBalcony ? '#94a3b8' : '#78350f';
      }
      if (Math.abs(worldZ - Math.round(worldZ)) < 0.08) {
        ch = '=';
        color = '#92400e';
      }
    }
  }
  //tile 14: brutalist citadel
  else if (tileVal === 14) {
    wallBg = '#0f172a';
    const sign = getSignChar(worldHitU % 8, worldZ, 1.0, 7.0, 3.0, 4.4, '[ NET-SEC CIVIC ]');

    if (sign) {
      ch = sign;
      color = '#f97316';
      wallBg = '#2a1205';
    } else if (worldZ < 2.4) {
      ch = '#';
      color = '#475569';
    } else if (worldZ >= 24.0) {
      ch = '=';
      color = '#cbd5e1';
    } else {
      const isFin = (Math.floor(worldHitU * 4) % 2 === 0);
      ch = isFin ? '|' : ':';
      color = isFin ? '#94a3b8' : '#0284c7';
      if (Math.abs(worldZ - Math.round(worldZ)) < 0.08) {
        ch = '=';
        color = '#64748b';
      }
    }
  }
  //tile 15: cyber arcade
  else if (tileVal === 15) {
    wallBg = '#0c071a';
    const sign1 = getSignChar(worldHitU % 8, worldZ, 1.0, 7.0, 3.0, 4.6, '[ CYBER ARCADE ]');
    const sign2 = getSignChar(worldHitU % 8, worldZ, 1.5, 6.5, 13.5, 15.0, '[ VR LOUNGE ]');

    if (sign1) {
      ch = sign1;
      color = '#ec4899';
      wallBg = '#27082e';
    } else if (sign2) {
      ch = sign2;
      color = '#facc15';
      wallBg = '#261a04';
    } else if (worldZ < 2.4) {
      ch = isWindowCol ? ':' : '|';
      color = '#8b5cf6';
    } else {
      const gridPattern = (Math.floor(worldHitU * 2) + Math.floor(worldZ * 1.5)) % 3;
      ch = (gridPattern === 0) ? ':' : ((gridPattern === 1) ? '.' : '|');
      color = (gridPattern === 0) ? '#06b6d4' : ((gridPattern === 1) ? '#ec4899' : '#6366f1');
    }
  }
  //tile 16: ramen bar
  else if (tileVal === 16) {
    wallBg = '#140505';
    const sign = getSignChar(worldHitU % 16, worldZ, 4.5, 11.5, 2.6, 3.8, '[ RAMEN 24/7 ]');

    if (sign) {
      ch = sign;
      color = '#f59e0b';
      wallBg = '#2e0a0a';
    } else if (worldZ >= 5.5) {
      ch = (Math.floor(worldHitU * 4) % 3 === 0) ? 'o' : '=';
      color = '#94a3b8';
    } else if (worldZ < 2.2) {
      const isLantern = (Math.floor(worldHitU * 2) % 2 === 1 && worldZ >= 1.6);
      ch = isLantern ? '@' : '=';
      color = isLantern ? '#ef4444' : '#b45309';
    } else {
      ch = isWindowCol ? ':' : '|';
      color = isWindowCol ? '#fef08a' : '#78350f';
    }
  }
  //tile 17: clinic & tech mart
  else if (tileVal === 17) {
    wallBg = '#041715';
    const sign1 = getSignChar(worldHitU % 15, worldZ, 3.0, 12.0, 2.6, 3.8, '[ CYBERWARE CLINIC ]');
    const sign2 = getSignChar(worldHitU % 15, worldZ, 3.5, 11.5, 5.4, 6.6, '[ 24H TECH MART ]');

    if (sign1) {
      ch = sign1;
      color = '#14b8a6';
      wallBg = '#042b26';
    } else if (sign2) {
      ch = sign2;
      color = '#fde047';
      wallBg = '#292002';
    } else if (worldZ >= 6.5) {
      ch = (Math.floor(worldHitU * 3) % 2 === 0) ? 'O' : '=';
      color = '#64748b';
    } else if (worldZ < 2.4) {
      ch = isWindowCol ? ':' : '|';
      color = '#0f766e';
    } else {
      ch = isWindowCol ? ':' : '|';
      color = isWindowCol ? '#a7f3d0' : '#115e59';
    }
  }
  //tile 18: brick townhouses
  else {
    wallBg = '#140606';
    if (worldZ >= 8.2) {
      ch = (Math.floor(worldHitU * 4) % 2 === 0) ? '^' : '=';
      color = '#cbd5e1';
    } else if (worldZ < 2.2) {
      ch = (Math.floor(worldHitU * 4) % 4 === 1) ? '|' : '=';
      color = '#94a3b8';
    } else {
      if (isWindowCol) {
        const isLit = ((colSlot * 3 + floorIdx * 5) % 4 < 3);
        ch = isLit ? ':' : '.';
        color = isLit ? '#fed7aa' : '#334155';
      } else {
        const isFireEscape = (Math.floor(worldHitU * 2) % 3 === 0);
        ch = isFireEscape ? 'H' : '#';
        color = isFireEscape ? '#475569' : '#991b1b';
      }
    }
  }

  return { char: ch, color, alpha: depthAlpha, bg: wallBg };
}

export function floorShader({ floorX, floorY, corrDist, maxDepth, scene }) {
  const depthAlpha = Math.max(0.15, 1 - (corrDist / maxDepth));
  const fCellX = Math.floor(floorX);
  const fCellY = Math.floor(floorY);

  if (fCellX < 0 || fCellX >= MAP_SIZE || fCellY < 0 || fCellY >= MAP_SIZE) {
    return { char: '.', color: '#0f172a', alpha: depthAlpha, bg: '#020617' };
  }

  const map = scene ? scene.map : null;
  const tile = map ? map[fCellY * MAP_SIZE + fCellX] : (
    ((fCellY >= 0 && fCellY <= 4) || (fCellY >= 12 && fCellY <= 16) ||
     (fCellY >= 38 && fCellY <= 42) || (fCellY >= 63 && fCellY <= 67) || (fCellY >= 75 && fCellY <= 79) ||
     (fCellX >= 0 && fCellX <= 4) || (fCellX >= 12 && fCellX <= 16) ||
     (fCellX >= 38 && fCellX <= 42) || (fCellX >= 63 && fCellX <= 67) || (fCellX >= 75 && fCellX <= 79)) ? 0 : 1
  );

  //asphalt road
  if (tile === 0) {
    if (corrDist > 25.0) {
      return { char: ' ', color: '#050810', alpha: depthAlpha, bg: '#050810' };
    }

    const mh = (corrDist < 16.0) ? getManholeDetails(floorX, floorY) : null;
    if (mh) {
      return { char: mh.ch, color: mh.color, alpha: depthAlpha, bg: mh.bg };
    }

    const crosswalkInfo = isMetropolisCrosswalk(floorX, floorY);
    if (crosswalkInfo) {
      const isVertStripe = crosswalkInfo.isVert;
      if (corrDist > 14.0) {
        return { char: isVertStripe ? '|' : '=', color: '#c0c8d0', alpha: depthAlpha, bg: '#050810' };
      } else {
        const isStripe = isVertStripe
          ? ((((floorY % 0.8) + 0.8) % 0.8) < 0.46)
          : ((((floorX % 0.8) + 0.8) % 0.8) < 0.46);
        if (isStripe) {
          return { char: isVertStripe ? '|' : '=', color: '#f1f5f9', alpha: depthAlpha, bg: '#050810' };
        } else {
          return { char: ' ', color: '#050810', alpha: depthAlpha, bg: '#050810' };
        }
      }
    }

    //double yellow dividing lines
    const yellHalf = Math.max(0.15, corrDist * 0.025);
    const isEWYell = (
      (Math.abs(floorY - 2.50) < yellHalf) ||
      (Math.abs(floorY - 14.50) < yellHalf) ||
      (Math.abs(floorY - 40.50) < yellHalf) ||
      (Math.abs(floorY - 65.50) < yellHalf) ||
      (Math.abs(floorY - 77.50) < yellHalf)
    );
    const isNSYell = (
      (Math.abs(floorX - 2.50) < yellHalf) ||
      (Math.abs(floorX - 14.50) < yellHalf) ||
      (Math.abs(floorX - 40.50) < yellHalf) ||
      (Math.abs(floorX - 65.50) < yellHalf) ||
      (Math.abs(floorX - 77.50) < yellHalf)
    );

    if (isEWYell) {
      const ch = (corrDist > 10.0) ? '=' : ((Math.floor(floorX * 2.5) % 2 === 0) ? '=' : ' ');
      return { char: ch, color: '#ffd700', alpha: depthAlpha, bg: '#050810' };
    } else if (isNSYell) {
      const ch = (corrDist > 10.0) ? '|' : ((Math.floor(floorY * 2.5) % 2 === 0) ? '|' : ' ');
      return { char: ch, color: '#ffd700', alpha: depthAlpha, bg: '#050810' };
    } else {
      return { char: ' ', color: '#050810', alpha: depthAlpha, bg: '#050810' };
    }
  }

  //concrete sidewalks & curbs
  if (corrDist > 32.0) {
    return { char: '.', color: '#2d3b4b', alpha: depthAlpha, bg: '#0b0f19' };
  } else {
    const curbHalf = Math.max(0.15, corrDist * 0.02);
    const isNearRoadWest = (Math.abs(floorX - 0) < curbHalf || Math.abs(floorX - 12) < curbHalf || Math.abs(floorX - 38) < curbHalf || Math.abs(floorX - 63) < curbHalf || Math.abs(floorX - 75) < curbHalf);
    const isNearRoadEast = (Math.abs(floorX - 5) < curbHalf || Math.abs(floorX - 17) < curbHalf || Math.abs(floorX - 43) < curbHalf || Math.abs(floorX - 68) < curbHalf || Math.abs(floorX - 80) < curbHalf);
    const isNearRoadNorth = (Math.abs(floorY - 0) < curbHalf || Math.abs(floorY - 12) < curbHalf || Math.abs(floorY - 38) < curbHalf || Math.abs(floorY - 63) < curbHalf || Math.abs(floorY - 75) < curbHalf);
    const isNearRoadSouth = (Math.abs(floorY - 5) < curbHalf || Math.abs(floorY - 17) < curbHalf || Math.abs(floorY - 43) < curbHalf || Math.abs(floorY - 68) < curbHalf || Math.abs(floorY - 80) < curbHalf);

    if (isNearRoadSouth || isNearRoadNorth || isNearRoadWest || isNearRoadEast) {
      return { char: '_', color: '#94a3b8', alpha: depthAlpha, bg: '#0b0f19' };
    } else if (corrDist > 16.0) {
      return { char: '.', color: '#3b4b5b', alpha: depthAlpha, bg: '#0b0f19' };
    } else {
      const tileU = Math.floor(floorX * 0.8);
      const tileV = Math.floor(floorY * 0.8);
      const slab = (tileU + tileV) % 2;
      return { char: slab === 0 ? '.' : ',', color: slab === 0 ? '#475569' : '#334155', alpha: depthAlpha, bg: '#0b0f19' };
    }
  }
}
