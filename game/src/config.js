// Midnight Vault — every tuning number and colour in one place.
// The playfield is a fixed 960x600 logical area with a 64px HUD bar on top;
// the renderer scales the 960x664 canvas to the window, so no rule below
// depends on the screen size. No sound: the game is fully playable silent.
export const FIELD = { width: 960, height: 600, hud: 64 };
export const CANVAS = { width: 960, height: 664 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Seconds of play per level. */
export const LEVEL_TIME = 120;

export const THIEF = { radius: 13, speed: 168 };

export const GUARD = { radius: 14, closeRange: 30 };

/** Vision cone: how far a guard or camera sees, and its half-angle. */
export const CONE = { guardRange: 178, cameraRange: 205, halfAngle: 0.55 };

/** Alarm 0..100. Rises fast while seen, decays while hidden. */
export const ALARM = {
  risePerSecond: 70,
  cameraRisePerSecond: 60,
  decayPerSecond: 26,
  plateHit: 45,
  spottedAt: 100,
  /** Seconds the thief has to break line of sight once fully spotted. */
  countdownSeconds: 3,
};

/** EMP tool: one per level, costs score, kills cameras and lasers. */
export const EMP = { chargesPerLevel: 1, cost: 20, disableSeconds: 6 };

/** Safe cracking: hold near the safe with the keycard. */
export const SAFE = { points: 60, crackSeconds: 6, openAt: 0.5 };

export const LOOT_POINTS = { gold: 10, gem: 15, cash: 10 };

/** Level-end section scores (each 0..100): routes / alarm / safe. */
export const SECTION = { routes: 0, alarm: 1, safe: 2 };

export const PALETTE = {
  backdrop: '#0b0e16',
  hud: '#12162a',
  hudLine: '#2a3352',
  floorA: '#1d2338',
  floorB: '#181d2e',
  carpet: '#232a4a',
  wall: '#3a4266',
  wallTop: '#5a6494',
  wallGold: '#c9a227',
  cover: '#2c3352',
  text: '#eef1f5',
  muted: '#9aa3c0',
  gold: '#f2c94c',
  goldDark: '#b8860b',
  gem: '#4dd8ff',
  cash: '#5fd68a',
  thief: '#14141c',
  thiefTrim: '#f2c94c',
  guard: '#2b4a7a',
  guardVisor: '#dfe8ff',
  cone: 'rgba(255, 64, 64, 0.20)',
  coneEdge: 'rgba(255, 90, 90, 0.55)',
  cameraCone: 'rgba(255, 170, 40, 0.18)',
  cameraConeEdge: 'rgba(255, 180, 60, 0.5)',
  laser: '#ff2e4d',
  laserOff: 'rgba(255, 46, 77, 0.18)',
  plate: '#3d2b4d',
  plateHot: '#ff2e4d',
  exitClosed: '#c0392b',
  exitOpen: '#2ecc71',
  safe: '#4a5268',
  safeDark: '#2f3547',
  keycard: '#4dd8ff',
  danger: '#ff4757',
  ok: '#2ecc71',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best total score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-vault.best';
