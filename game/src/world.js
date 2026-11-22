// Midnight Vault — the simulation. Pure logic, no DOM: the same code runs
// in the browser and in a headless Node test. One fixed step (1/60 s)
// advances guards, cameras, lasers, the alarm, the safe and the thief.
import { ALARM, CONE, EMP, FIELD, GUARD, LEVEL_TIME, LOOT_POINTS, SAFE, STEP, THIEF } from './config.js';
import { LEVELS, levelTotalPoints } from './levels.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_KEYCARD = 2;
export const EVENT_SAFE_TICK = 4;
export const EVENT_EMP = 8;
export const EVENT_CAUGHT = 16;
export const EVENT_LEVEL_DONE = 32;
export const EVENT_WON = 64;
export const EVENT_TIMEOUT = 128;

export const STEP_SECONDS = STEP;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** True when the segment is blocked by any wall (sampled). */
export function lineBlocked(x1, y1, x2, y2, walls) {
  const steps = 14;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    for (const w of walls) {
      if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return true;
    }
  }
  return false;
}

/** Distance from a point to a segment. */
export function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
}

function moveCircle(state, x, y, dx, dy) {
  const r = THIEF.radius;
  let nx = x + dx;
  for (const w of state.level.walls) {
    if (circleHitsRect(nx, y, r, w)) {
      nx = dx > 0 ? w.x - r : w.x + w.w + r;
    }
  }
  let ny = y + dy;
  for (const w of state.level.walls) {
    if (circleHitsRect(nx, ny, r, w)) {
      ny = dy > 0 ? w.y - r : w.y + w.h + r;
    }
  }
  return { x: clamp(nx, r, FIELD.width - r), y: clamp(ny, r, FIELD.height - r) };
}

export function createWorld() {
  const state = {
    levelIndex: 0,
    level: LEVELS[0],
    thief: { x: 0, y: 0, angle: 0 },
    guards: [],
    cameras: [],
    loot: [],
    keycard: null,
    safe: null,
    exitOpen: false,
    score: 0,
    totalScore: 0,
    timeLeft: LEVEL_TIME,
    time: 0,
    alarm: 0,
    peakAlarm: 0,
    spottedCountdown: 0,
    empCharges: EMP.chargesPerLevel,
    empUntil: -1,
    status: 'playing',
    caughtReason: '',
    levelScore: 0,
    levelBonus: 0,
    lootPoints: 0,
    safePoints: 0,
    sections: [0, 0, 0],
    plateFlash: 0,
    laserFlash: 0,
  };

  function startLevel(index) {
    const level = LEVELS[index];
    state.levelIndex = index;
    state.level = level;
    state.thief = { x: level.start.x, y: level.start.y, angle: -Math.PI / 2 };
    state.guards = level.guards.map((g) => ({
      x: g.waypoints[0].x,
      y: g.waypoints[0].y,
      waypoints: g.waypoints,
      speed: g.speed,
      wait: g.wait,
      target: 1,
      waiting: 0,
      angle: 0,
    }));
    state.cameras = level.cameras.map((c) => ({ ...c, angle: c.baseAngle }));
    state.loot = level.loot.map((l) => ({ ...l, taken: false }));
    state.keycard = { ...level.keycard, taken: false };
    state.safe = { ...level.safe, cracked: 0 };
    state.exitOpen = false;
    state.score = 0;
    state.timeLeft = LEVEL_TIME;
    state.time = 0;
    state.alarm = 0;
    state.peakAlarm = 0;
    state.spottedCountdown = 0;
    state.empCharges = EMP.chargesPerLevel;
    state.empUntil = -1;
    state.status = 'playing';
    state.caughtReason = '';
    state.levelScore = 0;
    state.levelBonus = 0;
    state.lootPoints = 0;
    state.safePoints = 0;
    state.sections = [0, 0, 0];
    state.plateFlash = 0;
    state.laserFlash = 0;
    for (const p of state.level.plates) p.cool = 0;
    for (const l of state.level.lasers) l.tripped = 0;
  }

  function reset() {
    state.totalScore = 0;
    startLevel(0);
  }

  function guardSees(guard) {
    const dx = state.thief.x - guard.x;
    const dy = state.thief.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE.guardRange) return false;
    if (angleDiff(Math.atan2(dy, dx), guard.angle) > CONE.halfAngle) return false;
    return !lineBlocked(guard.x, guard.y, state.thief.x, state.thief.y, state.level.walls);
  }

  function cameraSees(camera) {
    if (state.time < state.empUntil) return false;
    const dx = state.thief.x - camera.x;
    const dy = state.thief.y - camera.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE.cameraRange) return false;
    if (angleDiff(Math.atan2(dy, dx), camera.angle) > CONE.halfAngle) return false;
    return !lineBlocked(camera.x, camera.y, state.thief.x, state.thief.y, state.level.walls);
  }

  function laserOn(laser) {
    if (state.time < state.empUntil) return false;
    return (state.time + laser.phase) % laser.period < laser.onTime;
  }

  function finishLevel() {
    const lootTotal = state.level.loot.reduce((s, l) => s + LOOT_POINTS[l.kind], 0);
    state.sections = [
      Math.round((100 * state.lootPoints) / Math.max(1, lootTotal)),
      Math.round(100 - state.peakAlarm),
      Math.round((100 * state.safePoints) / SAFE.points),
    ];
    state.levelBonus = Math.round(state.timeLeft) * 2 + 50;
    state.levelScore = state.score + state.levelBonus;
    state.totalScore += state.levelScore;
    if (state.levelIndex + 1 >= LEVELS.length) {
      state.status = 'won';
      return EVENT_WON;
    }
    state.status = 'levelDone';
    return EVENT_LEVEL_DONE;
  }

  function caught(reason) {
    state.status = 'caught';
    state.caughtReason = reason;
    return EVENT_CAUGHT;
  }

  /** Advance one fixed step. `move` is a normalised {x,y} vector or null. */
  function step(dt, move, useEmp) {
    if (state.status !== 'playing') return EVENT_NONE;
    let events = EVENT_NONE;
    state.time += dt;
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.status = 'timeout';
      return EVENT_TIMEOUT;
    }
    if (state.plateFlash > 0) state.plateFlash -= dt;
    if (state.laserFlash > 0) state.laserFlash -= dt;

    if (useEmp && state.empCharges > 0 && state.time >= state.empUntil) {
      state.empCharges -= 1;
      state.empUntil = state.time + EMP.disableSeconds;
      state.score = Math.max(0, state.score - EMP.cost);
      events |= EVENT_EMP;
    }

    // Thief movement + wall collision.
    if (move) {
      const next = moveCircle(state, state.thief.x, state.thief.y, move.x * THIEF.speed * dt, move.y * THIEF.speed * dt);
      if (Math.hypot(move.x, move.y) > 0.01) state.thief.angle = Math.atan2(move.y, move.x);
      state.thief.x = next.x;
      state.thief.y = next.y;
    }

    // Guards patrol their routes, pausing at each waypoint.
    for (const guard of state.guards) {
      const target = guard.waypoints[guard.target];
      if (guard.waiting > 0) {
        guard.waiting -= dt;
        continue;
      }
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const dist = Math.hypot(dx, dy);
      const stepLen = guard.speed * dt;
      if (dist <= stepLen) {
        guard.x = target.x;
        guard.y = target.y;
        guard.waiting = guard.wait;
        guard.target = guard.target + 1 >= guard.waypoints.length ? 0 : guard.target + 1;
      } else {
        guard.x += (dx / dist) * stepLen;
        guard.y += (dy / dist) * stepLen;
        guard.angle = Math.atan2(dy, dx);
      }
    }

    // Cameras sweep.
    for (const camera of state.cameras) {
      camera.angle = camera.baseAngle + Math.sin(state.time * camera.speed) * camera.sweep;
    }

    // Detection: guards and cameras.
    let seen = false;
    let seenByCamera = false;
    for (const guard of state.guards) {
      if (Math.hypot(state.thief.x - guard.x, state.thief.y - guard.y) < GUARD.closeRange) {
        return caught('A guard grabbed you at close range.');
      }
      if (guardSees(guard)) seen = true;
    }
    for (const camera of state.cameras) {
      if (cameraSees(camera)) {
        seen = true;
        seenByCamera = true;
      }
    }
    if (seen) {
      state.alarm += (seenByCamera ? ALARM.cameraRisePerSecond : ALARM.risePerSecond) * dt;
    } else {
      state.alarm -= ALARM.decayPerSecond * dt;
    }
    state.alarm = clamp(state.alarm, 0, 100);
    state.peakAlarm = Math.max(state.peakAlarm, state.alarm);

    if (state.alarm >= ALARM.spottedAt && state.spottedCountdown <= 0) {
      state.spottedCountdown = ALARM.countdownSeconds;
    }
    if (state.spottedCountdown > 0) {
      if (!seen) {
        state.spottedCountdown = 0;
        state.alarm = 60;
      } else {
        state.spottedCountdown -= dt;
        if (state.spottedCountdown <= 0) {
          return caught('Spotted — the alarm countdown ran out.');
        }
      }
    }

    // Lasers: crossing a live beam trips the alarm hard (75%), but it is
    // not an instant full alarm: one more exposure still spots the thief.
    for (const laser of state.level.lasers) {
      if (laser.tripped > 0) laser.tripped -= dt;
      if (laserOn(laser) && laser.tripped <= 0) {
        const d = pointSegmentDistance(state.thief.x, state.thief.y, laser.x1, laser.y1, laser.x2, laser.y2);
        if (d < THIEF.radius + 2) {
          laser.tripped = 2;
          state.laserFlash = 0.8;
          state.alarm = Math.max(state.alarm, 75);
        }
      }
    }

    // Pressure plates.
    for (const plate of state.level.plates) {
      if (plate.cool > 0) plate.cool -= dt;
      if (
        plate.cool <= 0 &&
        state.thief.x > plate.x - 6 && state.thief.x < plate.x + plate.w + 6 &&
        state.thief.y > plate.y - 6 && state.thief.y < plate.y + plate.h + 6
      ) {
        plate.cool = 3;
        plate.flash = 0.8;
        state.plateFlash = 0.8;
        state.alarm = clamp(state.alarm + ALARM.plateHit, 0, 100);
        if (state.alarm >= ALARM.spottedAt && state.spottedCountdown <= 0) {
          state.spottedCountdown = ALARM.countdownSeconds;
        }
      }
      if (plate.flash > 0) plate.flash -= dt;
    }

    // Keycard.
    if (!state.keycard.taken && Math.hypot(state.thief.x - state.keycard.x, state.thief.y - state.keycard.y) < 26) {
      state.keycard.taken = true;
      events |= EVENT_KEYCARD;
    }

    // Loot.
    for (const item of state.loot) {
      if (!item.taken && Math.hypot(state.thief.x - item.x, state.thief.y - item.y) < 26) {
        item.taken = true;
        const pts = LOOT_POINTS[item.kind];
        state.score += pts;
        state.lootPoints += pts;
        events |= EVENT_LOOT;
      }
    }

    // Safe: stand close with the keycard to crack it. Every quarter cracked
    // pays 15 points; the exit opens once half the safe is cracked.
    const safe = state.safe;
    const nearSafe =
      state.thief.x > safe.x - 34 && state.thief.x < safe.x + safe.w + 34 &&
      state.thief.y > safe.y - 34 && state.thief.y < safe.y + safe.h + 34;
    if (nearSafe && state.keycard.taken && safe.cracked < 1) {
      const before = Math.floor(safe.cracked * 4);
      safe.cracked = Math.min(1, safe.cracked + dt / SAFE.crackSeconds);
      const after = Math.floor(safe.cracked * 4);
      if (after > before) {
        state.score += 15;
        state.safePoints += 15;
        events |= EVENT_SAFE_TICK;
      }
      if (!state.exitOpen && safe.cracked >= SAFE.openAt) state.exitOpen = true;
    }

    // Exit.
    const exit = state.level.exit;
    if (
      state.exitOpen &&
      state.thief.x > exit.x && state.thief.x < exit.x + exit.w &&
      state.thief.y > exit.y && state.thief.y < exit.y + exit.h
    ) {
      return finishLevel();
    }

    return events;
  }

  function nextLevel() {
    startLevel(state.levelIndex + 1);
  }

  reset();

  return {
    state,
    reset,
    startLevel,
    nextLevel,
    step,
    laserOn,
    guardSees,
    cameraSees,
    levelTotalPoints: () => levelTotalPoints(state.level),
  };
}
