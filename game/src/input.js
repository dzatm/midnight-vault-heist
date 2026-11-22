// Midnight Vault — keyboard and pointer input. Held keys give a steering
// vector; one-shot presses (confirm, pause, EMP) are queued as flags and
// taken once by the loop, so a press between two frames is never lost.
// Pointer: click / drag on the floor sets a move target for the thief.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_EMP = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const EMP_KEYS = new Set(['KeyE']);

export function createInput(target, toLogical) {
  const held = { up: false, down: false, left: false, right: false };
  let actions = 0;
  let moveTarget = null;
  let pointerDown = false;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (EMP_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_EMP;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
    else if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
  });
  // A key released while the tab is hidden never sends keyup.
  window.addEventListener('blur', () => {
    held.up = held.down = held.left = held.right = false;
    pointerDown = false;
  });

  target.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    moveTarget = toLogical(event.clientX, event.clientY);
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointermove', (event) => {
    if (pointerDown) moveTarget = toLogical(event.clientX, event.clientY);
  });
  window.addEventListener('pointerup', () => {
    pointerDown = false;
  });

  return {
    /** Normalised steering vector from held keys, or null. */
    keys() {
      const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (x === 0 && y === 0) return null;
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    /** Click-to-move target in logical coordinates, or null. */
    moveTarget() {
      return moveTarget;
    },
    clearMoveTarget() {
      moveTarget = null;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
