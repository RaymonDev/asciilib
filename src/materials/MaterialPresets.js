//curated palette of ready-to-use ascii materials for urban environments, vehicles, and architecture
import { ASCIIMaterial } from './ASCIIMaterial.js';
import { ASCIIBrush } from './ASCIIBrush.js';

export const MaterialPresets = {
  //glass & transparents
  GLASS_BLUE: new ASCIIMaterial({
    name: 'glass_blue',
    char: ':',
    color: '#38bdf8',
    bg: '#0c4a6e',
    alpha: 0.85
  }),
  GLASS_CYAN: new ASCIIMaterial({
    name: 'glass_cyan',
    char: '/',
    color: '#7dd3fc',
    bg: '#082f49',
    alpha: 0.85
  }),
  GLASS_DARK: new ASCIIMaterial({
    name: 'glass_dark',
    char: ':',
    color: '#64748b',
    bg: '#0f172a',
    alpha: 0.90
  }),

  //metals & chrome
  CHROME: new ASCIIMaterial({
    name: 'chrome',
    char: '=',
    color: '#f8fafc',
    bg: '#334155',
    specularChar: '*',
    specularColor: '#ffffff'
  }),
  STEEL: new ASCIIMaterial({
    name: 'steel',
    char: '#',
    color: '#94a3b8',
    bg: '#1e293b'
  }),
  DARK_IRON: new ASCIIMaterial({
    name: 'dark_iron',
    char: '#',
    color: '#475569',
    bg: '#0f172a'
  }),
  GOLD: new ASCIIMaterial({
    name: 'gold',
    char: '|',
    color: '#ffd700',
    bg: '#451a03'
  }),

  //urban surfaces
  ASPHALT: new ASCIIMaterial({
    name: 'asphalt',
    char: ' ',
    color: '#050810',
    bg: '#050810'
  }),
  CONCRETE_SLAB: new ASCIIMaterial({
    name: 'concrete_slab',
    char: '.',
    color: '#475569',
    bg: '#0b0f19'
  }),
  CURB_STONE: new ASCIIMaterial({
    name: 'curb_stone',
    char: '_',
    color: '#94a3b8',
    bg: '#0b0f19'
  }),
  ROAD_YELLOW_LINE: new ASCIIMaterial({
    name: 'road_yellow_line',
    char: '=',
    color: '#ffd700',
    bg: '#050810'
  }),
  CROSSWALK_WHITE: new ASCIIMaterial({
    name: 'crosswalk_white',
    char: '|',
    color: '#f1f5f9',
    bg: '#050810'
  }),

  //masonry & facades
  BRICK_RED: new ASCIIMaterial({
    name: 'brick_red',
    char: '#',
    color: '#b91c1c',
    bg: '#140606',
    customSample: (ctx) => ASCIIBrush.sampleBrick(ctx.u, ctx.z, { brickColor: '#b91c1c', brickBg: '#140606' })
  }),
  BRICK_BROWN: new ASCIIMaterial({
    name: 'brick_brown',
    char: '#',
    color: '#78350f',
    bg: '#1c0d02',
    customSample: (ctx) => ASCIIBrush.sampleBrick(ctx.u, ctx.z, { brickColor: '#78350f', brickBg: '#1c0d02' })
  }),
  BRUTALIST_CONCRETE: new ASCIIMaterial({
    name: 'brutalist_concrete',
    char: '#',
    color: '#64748b',
    bg: '#0f172a'
  }),

  //nature & foliage
  LEAVES_LUSH: new ASCIIMaterial({
    name: 'leaves_lush',
    char: '@',
    color: '#2ed573',
    bg: '#0a2e15'
  }),
  LEAVES_FOREST: new ASCIIMaterial({
    name: 'leaves_forest',
    char: '%',
    color: '#1fb559',
    bg: '#071f0e'
  }),
  BARK_OAK: new ASCIIMaterial({
    name: 'bark_oak',
    char: '#',
    color: '#744729',
    bg: '#2a1808'
  }),

  //neon & emissive
  NEON_CYAN: new ASCIIMaterial({
    name: 'neon_cyan',
    char: '#',
    color: '#00f0ff',
    bg: '#042b3d'
  }),
  NEON_PINK: new ASCIIMaterial({
    name: 'neon_pink',
    char: '#',
    color: '#ff0055',
    bg: '#3b0213'
  }),
  NEON_YELLOW: new ASCIIMaterial({
    name: 'neon_yellow',
    char: '#',
    color: '#fde047',
    bg: '#2e1c02'
  }),
  NEON_GREEN: new ASCIIMaterial({
    name: 'neon_green',
    char: '#',
    color: '#00ff88',
    bg: '#022c19'
  }),

  //traffic light signals
  SIGNAL_RED_ACTIVE: new ASCIIMaterial({ name: 'signal_red_active', char: '*', color: '#ff0033', bg: '#450a0a' }),
  SIGNAL_RED_OFF: new ASCIIMaterial({ name: 'signal_red_off', char: 'O', color: '#7f1d1d', bg: '#18181b' }),
  SIGNAL_YELLOW_ACTIVE: new ASCIIMaterial({ name: 'signal_yellow_active', char: '*', color: '#ffcc00', bg: '#451a03' }),
  SIGNAL_YELLOW_OFF: new ASCIIMaterial({ name: 'signal_yellow_off', char: 'O', color: '#78350f', bg: '#18181b' }),
  SIGNAL_GREEN_ACTIVE: new ASCIIMaterial({ name: 'signal_green_active', char: '*', color: '#00ff88', bg: '#064e3b' }),
  SIGNAL_GREEN_OFF: new ASCIIMaterial({ name: 'signal_green_off', char: 'O', color: '#064e3b', bg: '#18181b' })
};
