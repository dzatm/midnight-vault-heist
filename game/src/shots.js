// Midnight Vault — the screenshot scenes behind ?shot=start|play|alarm|end.
// Each one plays the real rules forward from a fresh world, steered by an
// autopilot that reads cones, lasers and plates before it moves, so every
// frame is what a real game looks like and the same seed always gives the
// same frame. The alarm scene steers into a cone on purpose, to show the
// alarm meter and the spotted countdown.
import { CONE, GUARD, STEP, THIEF } from './config.js';
import { lineBlocked, pointSegmentDistance } from './world.js';
import { SCREEN_CAUGHT, SCREEN_LEVEL_DONE, SCREEN_PLAY, SCREEN_WON } from './render.js';

const SAMPLE = STEP;
const DIRS = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 0.707, y: 0.707 }, { x: -0.707, y: 0.707 }, { x: 0.707, y: -0.707 },
  { x: -0.707, y: -0.707 }, { x: 0, y: 0 },
];

function hitsWall(state, x, y) {
  for (const w of state.level.walls) {
    const nx = Math.max(w.x, Math.min(x, w.x + w.w));
    const ny = Math.max(w.y, Math.min(y, w.y + w.h));
    if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < THIEF.radius * THIEF.radius) return true;
  }
  return false;
}

function coneDanger(state, x, y) {
  // 1 when standing in a guard or camera cone, 0.6 near a guard, else 0.
  for (const guard of state.guards) {
    const dx = x - guard.x;
    const dy = y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < GUARD.closeRange + 12) return 1;
    if (dist < CONE.guardRange) {
      let d = Math.atan2(dy, dx) - guard.angle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < CONE.halfAngle && !lineBlocked(guard.x, guard.y, x, y, state.level.walls)) return 1;
    }
  }
  for (const camera of state.cameras) {
    if (state.time >= state.empUntil) {
      const dx = x - camera.x;
      const dy = y - camera.y;
      const dist = Math.hypot(dx, dy);
      if (dist < CONE.cameraRange) {
        let d = Math.atan2(dy, dx) - camera.angle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        if (Math.abs(d) < CONE.halfAngle && !lineBlocked(camera.x, camera.y, x, y, state.level.walls)) return 1;
      }
    }
  }
  for (const laser of state.level.lasers) {
    // The beam blinks: it is dangerous only while it is on, so the thief
    // may time the blink to cross — but the path planner (cellDanger)
    // still prefers to route around the line's ends.
    const on = state.time < state.empUntil ? false : (state.time + laser.phase) % laser.period < laser.onTime;
    if (on && pointSegmentDistance(x, y, laser.x1, laser.y1, laser.x2, laser.y2) < THIEF.radius + 4) return 1;
  }
  for (const plate of state.level.plates) {
    if (x > plate.x - 4 && x < plate.x + plate.w + 4 && y > plate.y - 4 && y < plate.y + plate.h + 4) return 0.8;
  }
  return 0;
}

/** True when (x, y) is inside a guard or camera vision cone (not lasers/plates). */
function inVisionCone(state, x, y) {
  for (const guard of state.guards) {
    const dx = x - guard.x;
    const dy = y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < CONE.guardRange) {
      let d = Math.atan2(dy, dx) - guard.angle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < CONE.halfAngle && !lineBlocked(guard.x, guard.y, x, y, state.level.walls)) return true;
    }
  }
  for (const camera of state.cameras) {
    if (state.time >= state.empUntil) {
      const dx = x - camera.x;
      const dy = y - camera.y;
      const dist = Math.hypot(dx, dy);
      if (dist < CONE.cameraRange) {
        let d = Math.atan2(dy, dx) - camera.angle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        if (Math.abs(d) < CONE.halfAngle && !lineBlocked(camera.x, camera.y, x, y, state.level.walls)) return true;
      }
    }
  }
  return false;
}

/** Current objective: loot, then the keycard, then the safe, then the exit. */
function objective(state) {
  if (!state.keycard.taken) {
    const near = state.loot.find((l) => !l.taken && Math.hypot(l.x - state.thief.x, l.y - state.thief.y) < 130);
    if (near) return { x: near.x, y: near.y };
    return { x: state.keycard.x, y: state.keycard.y };
  }
  const loot = state.loot.find((l) => !l.taken);
  if (loot && state.safe.cracked < 0.5) return { x: loot.x, y: loot.y };
  if (state.safe.cracked < 1) {
    return { x: state.safe.x + state.safe.w / 2, y: state.safe.y + state.safe.h + 30 };
  }
  if (state.exitOpen) return { x: state.level.exit.x + 28, y: state.level.exit.y + 28 };
  return { x: state.safe.x + state.safe.w / 2, y: state.safe.y + state.safe.h + 30 };
}

/** Pick the safest step toward the objective, or hold still if all are bad. */
export function autopilot(world, reckless) {
  const state = world.state;
  const target = reckless
    ? (() => {
        const g = state.guards[0];
        return { x: g.x + Math.cos(g.angle) * 80, y: g.y + Math.sin(g.angle) * 80 };
      })()
    : objective(state);
  if (reckless) return greedyStep(state, target, true);
  // Caught in a guard or camera cone and the alarm is already rising
  // (a cone swept onto us while we waited): run away from the nearest
  // threat instead of pressing on toward the objective.
  if (state.alarm > 20 && inVisionCone(state, state.thief.x, state.thief.y)) {
    let threat = null;
    let threatDist = Infinity;
    for (const guard of state.guards) {
      const d = Math.hypot(state.thief.x - guard.x, state.thief.y - guard.y);
      if (d < threatDist) {
        threatDist = d;
        threat = guard;
      }
    }
    for (const camera of state.cameras) {
      const d = Math.hypot(state.thief.x - camera.x, state.thief.y - camera.y);
      if (d < threatDist) {
        threatDist = d;
        threat = camera;
      }
    }
    if (threat) {
      const dx = state.thief.x - threat.x;
      const dy = state.thief.y - threat.y;
      const len = Math.hypot(dx, dy) || 1;
      return greedyStep(state, { x: state.thief.x + (dx / len) * 140, y: state.thief.y + (dy / len) * 140 }, false);
    }
  }
  const targetKey = `${state.levelIndex}:${Math.round(target.x)},${Math.round(target.y)}`;
  cachedStep += 1;
  if (!cachedPath || cachedTarget !== targetKey || cachedStep % 15 === 0) {
    cachedPath = findPath(state, state.thief, target);
    cachedTarget = targetKey;
  }
  if (cachedPath && cachedPath.length > 1) {
    let next = cachedPath[1];
    if (Math.hypot(next.x - state.thief.x, next.y - state.thief.y) < 14) {
      cachedPath.shift();
      next = cachedPath[1] ?? cachedPath[0];
    }
    // The next step is dangerous right now (a guard turned toward it):
    // wait where we are instead of walking into the cone.
    if (coneDanger(state, next.x, next.y) > 0 && coneDanger(state, state.thief.x, state.thief.y) === 0) {
      return { x: 0, y: 0 };
    }
    const dx = next.x - state.thief.x;
    const dy = next.y - state.thief.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }
  // No path (target inside a wall margin): step greedily at the target.
  return greedyStep(state, target);
}

function greedyStep(state, target, ignoreDanger) {
  const dx = target.x - state.thief.x;
  const dy = target.y - state.thief.y;
  const dist = Math.hypot(dx, dy) || 1;
  // Short lookahead (0.12 s) so the thief can close the last few pixels
  // onto a pickup, plus the exact desired direction as a candidate.
  const dirs = [...DIRS, { x: dx / dist, y: dy / dist }];
  let best = DIRS[DIRS.length - 1];
  let bestCost = Infinity;
  for (const dir of dirs) {
    const nx = state.thief.x + dir.x * THIEF.speed * 0.12;
    const ny = state.thief.y + dir.y * THIEF.speed * 0.12;
    if (hitsWall(state, nx, ny)) continue;
    const danger = ignoreDanger ? 0 : coneDanger(state, nx, ny);
    const d = Math.hypot(target.x - nx, target.y - ny);
    const cost = d + danger * 900 + (dir.x === 0 && dir.y === 0 ? 30 : 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = dir;
    }
  }
  return best;
}

// --- Grid pathfinding: the autopilot plans a route around walls and
// around danger, instead of walking straight at its target and getting
// stuck in a guard's corridor. ---
const CELL = 32;
const COLS = 30;
const ROWS = 19;

function cellBlocked(state, cx, cy) {
  return hitsWall(state, cx * CELL + CELL / 2, cy * CELL + CELL / 2);
}

function cellDanger(state, cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  const now = coneDanger(state, x, y);
  if (now > 0) return now;
  // A laser line is always risky to plan across (it blinks): the path
  // prefers to route around its ends, while the thief may still time a
  // crossing when the beam is off.
  for (const laser of state.level.lasers) {
    if (pointSegmentDistance(x, y, laser.x1, laser.y1, laser.x2, laser.y2) < THIEF.radius + 4) return 0.9;
  }
  // A guard's whole patrol line is risky: it will be there soon, so the
  // path prefers to cross it far from where the guard is now.
  for (const guard of state.guards) {
    for (let i = 0; i < guard.waypoints.length; i += 1) {
      const a = guard.waypoints[i];
      const b = guard.waypoints[(i + 1) % guard.waypoints.length];
      if (pointSegmentDistance(x, y, a.x, a.y, b.x, b.y) < 42) return 0.5;
    }
  }
  return 0;
}

function findPath(state, from, to) {
  const sx = Math.max(0, Math.min(COLS - 1, Math.floor(from.x / CELL)));
  const sy = Math.max(0, Math.min(ROWS - 1, Math.floor(from.y / CELL)));
  const tx = Math.max(0, Math.min(COLS - 1, Math.floor(to.x / CELL)));
  const ty = Math.max(0, Math.min(ROWS - 1, Math.floor(to.y / CELL)));
  const key = (x, y) => y * COLS + x;
  const open = [{ x: sx, y: sy, g: 0, f: 0, parent: null }];
  const best = new Map([[key(sx, sy), 0]]);
  const closed = new Set();
  while (open.length > 0) {
    let bi = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i].f < open[bi].f) bi = i;
    const node = open.splice(bi, 1)[0];
    if (node.x === tx && node.y === ty) {
      const path = [];
      let cur = node;
      while (cur) {
        path.unshift({ x: cur.x * CELL + CELL / 2, y: cur.y * CELL + CELL / 2 });
        cur = cur.parent;
      }
      return path;
    }
    closed.add(key(node.x, node.y));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = node.x + dx;
      const ny = node.y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (closed.has(key(nx, ny))) continue;
      if (cellBlocked(state, nx, ny)) continue;
      const danger = cellDanger(state, nx, ny);
      const stepCost = (dx !== 0 && dy !== 0 ? 1.4 : 1) + danger * 25;
      const g = node.g + stepCost;
      if (best.has(key(nx, ny)) && best.get(key(nx, ny)) <= g) continue;
      best.set(key(nx, ny), g);
      const h = Math.hypot(tx - nx, ty - ny);
      open.push({ x: nx, y: ny, g, f: g + h, parent: node });
    }
  }
  return null;
}

let cachedPath = null;
let cachedTarget = '';
let cachedStep = 0;

function runFor(world, seconds, reckless) {
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const events = world.step(SAMPLE, autopilot(world, reckless), false);
    if (world.state.status !== 'playing') return events;
  }
  return 0;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: mid-room, cones sweeping, loot and alarm visible. play: 24 s of
 * real play. alarm: walked into a cone on purpose. end: played through
 * both levels to the getaway.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'alarm') {
    runFor(world, 4, false);
    runFor(world, 3.5, true);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'play') {
    runFor(world, 16, false);
    const s = world.state;
    return { screen: s.status === 'levelDone' ? SCREEN_LEVEL_DONE : s.status === 'won' ? SCREEN_WON : SCREEN_PLAY, best: s.totalScore + s.score };
  }
  if (name === 'end') {
    for (let i = 0; i < 60 * 400; i += 1) {
      world.step(SAMPLE, autopilot(world, false), false);
      if (world.state.status === 'levelDone') world.nextLevel();
      if (world.state.status === 'won' || world.state.status === 'caught' || world.state.status === 'timeout') break;
    }
    const s = world.state;
    return { screen: s.status === 'won' ? SCREEN_WON : SCREEN_CAUGHT, best: s.totalScore };
  }
  // start (default)
  runFor(world, 5, false);
  return { screen: SCREEN_PLAY, best: 0 };
}
