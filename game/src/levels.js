// Midnight Vault — the two levels. Every room is drawn from these plain
// data tables, so a level is a set of walls, patrol routes, traps and loot.
// Walls are solid rectangles: they block movement and line of sight.
// Each level is scored in three sections of 100 points — guard routes,
// alarm discipline, and the safe — shown on the level-complete screen.
import { LOOT_POINTS } from './config.js';

const BORDER = [
  { x: 0, y: 0, w: 960, h: 16 },
  { x: 0, y: 584, w: 960, h: 16 },
  { x: 0, y: 0, w: 16, h: 600 },
  { x: 944, y: 0, w: 16, h: 600 },
];

/** Level 1 — "The Gallery": a museum wing. Two guards, one camera, one
 *  laser, one pressure plate. Three ways through: top corridor, bottom
 *  corridor, and the middle hall past the patrolling guard. */
export const LEVEL_1 = {
  name: 'LEVEL 1 — THE GALLERY',
  sub: 'Museum wing · two guards · one camera',
  start: { x: 62, y: 540 },
  walls: [
    ...BORDER,
    // Gallery / hall divider: gaps at the top and bottom corridors.
    { x: 300, y: 140, w: 18, h: 280 },
    // Hall / vault-room divider: one door in the middle.
    { x: 640, y: 16, w: 18, h: 180 },
    { x: 640, y: 330, w: 18, h: 254 },
    // Cover in the middle hall.
    { x: 380, y: 330, w: 180, h: 18 },
    // Crates to hide behind.
    { x: 420, y: 120, w: 70, h: 46 },
    { x: 700, y: 380, w: 80, h: 46 },
    { x: 120, y: 300, w: 70, h: 46 },
  ],
  guards: [
    {
      waypoints: [{ x: 360, y: 90 }, { x: 600, y: 90 }],
      speed: 56,
      wait: 0.9,
    },
    {
      waypoints: [{ x: 600, y: 200 }, { x: 600, y: 480 }],
      speed: 52,
      wait: 0.7,
    },
  ],
  cameras: [
    { x: 700, y: 24, baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.55 },
  ],
  lasers: [
    { x1: 560, y1: 380, x2: 560, y2: 520, period: 3.4, onTime: 2.0, phase: 0 },
  ],
  plates: [{ x: 756, y: 296, w: 52, h: 52 }],
  loot: [
    { x: 380, y: 500, kind: 'gold' },
    { x: 600, y: 460, kind: 'gold' },
    { x: 730, y: 250, kind: 'gem' },
    { x: 880, y: 300, kind: 'cash' },
  ],
  keycard: { x: 90, y: 90 },
  safe: { x: 852, y: 64, w: 76, h: 62 },
  exit: { x: 876, y: 500, w: 56, h: 56 },
};

/** Level 2 — "The Vault": a bank vault floor. Three guards, two cameras,
 *  two lasers, two pressure plates, and a central vault that must be
 *  cracked while two patrols cross in front of it. */
export const LEVEL_2 = {
  name: 'LEVEL 2 — THE VAULT',
  sub: 'Bank vault floor · three guards · two cameras',
  start: { x: 62, y: 62 },
  walls: [
    ...BORDER,
    // Upper / lower divider: gaps at the far left and far right.
    { x: 220, y: 290, w: 300, h: 18 },
    { x: 640, y: 290, w: 160, h: 18 },
    // Vault room walls: door at the bottom centre.
    { x: 380, y: 120, w: 18, h: 170 },
    { x: 562, y: 120, w: 18, h: 170 },
    { x: 380, y: 120, w: 200, h: 18 },
    // Cover and teller desks.
    { x: 120, y: 420, w: 90, h: 44 },
    { x: 700, y: 420, w: 90, h: 44 },
    { x: 700, y: 120, w: 70, h: 44 },
    { x: 120, y: 150, w: 70, h: 44 },
  ],
  guards: [
    {
      waypoints: [{ x: 240, y: 90 }, { x: 880, y: 90 }],
      speed: 64,
      wait: 0.6,
    },
    {
      waypoints: [{ x: 300, y: 380 }, { x: 300, y: 520 }],
      speed: 58,
      wait: 0.8,
    },
    {
      waypoints: [{ x: 660, y: 380 }, { x: 660, y: 520 }],
      speed: 58,
      wait: 0.8,
    },
  ],
  cameras: [
    { x: 480, y: 24, baseAngle: Math.PI / 2, sweep: 0.8, speed: 0.6 },
    { x: 936, y: 300, baseAngle: Math.PI, sweep: 0.6, speed: 0.5 },
  ],
  lasers: [
    { x1: 220, y1: 470, x2: 220, y2: 540, period: 3.0, onTime: 1.8, phase: 1.2 },
    { x1: 740, y1: 470, x2: 740, y2: 540, period: 3.0, onTime: 1.8, phase: 0 },
  ],
  plates: [
    { x: 448, y: 320, w: 52, h: 52 },
    { x: 800, y: 320, w: 52, h: 52 },
  ],
  loot: [
    { x: 160, y: 240, kind: 'gold' },
    { x: 900, y: 250, kind: 'gem' },
    { x: 480, y: 540, kind: 'gold' },
    { x: 760, y: 540, kind: 'cash' },
    { x: 200, y: 540, kind: 'gem' },
  ],
  keycard: { x: 880, y: 210 },
  safe: { x: 442, y: 180, w: 76, h: 62 },
  exit: { x: 48, y: 500, w: 56, h: 56 },
};

export const LEVELS = [LEVEL_1, LEVEL_2];

/** Points a level holds: loot plus the safe. */
export function levelTotalPoints(level) {
  let total = 0;
  for (const item of level.loot) total += LOOT_POINTS[item.kind];
  return total + 60;
}
