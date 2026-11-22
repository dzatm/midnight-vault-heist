// Midnight Vault — boot and the one loop. Input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is
// there. The game moves between title, play, paused, level-done, getaway
// (won), caught and time-up screens.
//
// ?shot=start|play|alarm|end stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, CANVAS, FIELD, STEP } from './config.js';
import { createWorld, EVENT_CAUGHT, EVENT_LEVEL_DONE, EVENT_TIMEOUT, EVENT_WON } from './world.js';
import { ACTION_CONFIRM, ACTION_EMP, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_CAUGHT, SCREEN_LEVEL_DONE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TIMEOUT, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
canvas.width = CANVAS.width;
canvas.height = CANVAS.height;
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);

function toLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * CANVAS.width;
  const y = ((clientY - rect.top) / rect.height) * CANVAS.height - FIELD.hud;
  return { x: Math.max(0, Math.min(FIELD.width, x)), y: Math.max(0, Math.min(FIELD.height, y)) };
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score lasts this visit.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, toLogical);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    input.clearMoveTarget();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Grab the keycard, crack the safe, get out.');
  }

  function endRun() {
    const total = world.state.totalScore + world.state.score;
    if (total > best) {
      best = total;
      saveBest(best);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE) startGame();
      else if (screen === SCREEN_LEVEL_DONE) {
        world.nextLevel();
        input.clearMoveTarget();
        screen = SCREEN_PLAY;
        announce(`${world.state.level.name}. Keep stealing.`);
      } else if (screen === SCREEN_WON || screen === SCREEN_CAUGHT || screen === SCREEN_TIMEOUT) {
        startGame();
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    return actions;
  }

  function moveVector() {
    const keys = input.keys();
    if (keys) {
      input.clearMoveTarget();
      return keys;
    }
    const target = input.moveTarget();
    if (!target) return null;
    const dx = target.x - world.state.thief.x;
    const dy = target.y - world.state.thief.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 9) {
      input.clearMoveTarget();
      return null;
    }
    return { x: dx / dist, y: dy / dist };
  }

  function step(useEmp) {
    if (screen === SCREEN_TITLE) {
      // Attract mode: the room lives behind the title.
      world.step(STEP, null, false);
      return;
    }
    const events = world.step(STEP, moveVector(), useEmp);
    if (events & EVENT_WON) {
      endRun();
      screen = SCREEN_WON;
      announce(`Getaway! Total score ${world.state.totalScore}.`);
    } else if (events & EVENT_LEVEL_DONE) {
      screen = SCREEN_LEVEL_DONE;
      announce(`Level cleared. Score ${world.state.levelScore}.`);
    } else if (events & EVENT_CAUGHT) {
      endRun();
      screen = SCREEN_CAUGHT;
      announce(`Caught. ${world.state.caughtReason}`);
    } else if (events & EVENT_TIMEOUT) {
      endRun();
      screen = SCREEN_TIMEOUT;
      announce("Time's up.");
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    const useEmp = Boolean(actions & ACTION_EMP);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let firstStep = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(firstStep && useEmp);
        firstStep = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // R restarts the current level.
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyR' && (screen === SCREEN_PLAY || screen === SCREEN_CAUGHT || screen === SCREEN_TIMEOUT)) {
      world.startLevel(world.state.levelIndex);
      input.clearMoveTarget();
      screen = SCREEN_PLAY;
      announce('Level restarted.');
    }
  });

  // Leaving the tab pauses a running game rather than letting the clock run.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Midnight Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
