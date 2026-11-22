// Midnight Vault — all drawing. Every pixel is drawn in code: floor,
// walls, vision cones, guards, cameras, lasers, loot, the safe and the
// HUD. No image, font or sound is loaded from anywhere.
import { ALARM, CANVAS, CONE, EMP, FIELD, FONT, GUARD, PALETTE, SAFE, THIEF } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_LEVEL_DONE = 3;
export const SCREEN_WON = 4;
export const SCREEN_CAUGHT = 5;
export const SCREEN_TIMEOUT = 6;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfAngle, fill, edge) {
  const grad = ctx.createRadialGradient(x, y, 8, x, y, range);
  grad.addColorStop(0, fill);
  grad.addColorStop(1, 'rgba(255, 64, 64, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - halfAngle) * range, y + Math.sin(angle - halfAngle) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + halfAngle) * range, y + Math.sin(angle + halfAngle) * range);
  ctx.stroke();
}

function drawLoot(ctx, item, time) {
  const bob = Math.sin(time * 3 + item.x) * 2;
  const y = item.y + bob;
  ctx.save();
  ctx.translate(item.x, y);
  if (item.kind === 'gold') {
    ctx.fillStyle = PALETTE.goldDark;
    ctx.fillRect(-11, -6, 22, 12);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(-9, -8, 18, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(-7, -7, 14, 3);
  } else if (item.kind === 'gem') {
    ctx.fillStyle = PALETTE.gem;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#1e7a44';
    ctx.fillRect(-11, -7, 22, 14);
    ctx.fillStyle = PALETTE.cash;
    ctx.fillRect(-9, -5, 18, 10);
    ctx.fillStyle = '#eef1f5';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGuard(ctx, guard, time) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 4);
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 5, GUARD.radius, GUARD.radius * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(0, 0, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7ea4e0';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Visor facing the patrol direction.
  ctx.rotate(guard.angle);
  ctx.fillStyle = PALETTE.guardVisor;
  ctx.beginPath();
  ctx.arc(5, 0, 6, -1.1, 1.1);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 220, 120, ${0.5 + pulse * 0.5})`;
  ctx.fillRect(GUARD.radius - 2, -3, 10, 6);
  ctx.restore();
}

function drawThief(ctx, thief, time) {
  const bob = Math.sin(time * 6) * 1.5;
  ctx.save();
  ctx.translate(thief.x, thief.y + bob * 0.3);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 6, THIEF.radius, THIEF.radius * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(0, 0, THIEF.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.rotate(thief.angle);
  ctx.fillStyle = PALETTE.thiefTrim;
  ctx.beginPath();
  ctx.moveTo(THIEF.radius - 1, 0);
  ctx.lineTo(2, -5);
  ctx.lineTo(2, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 13, 24, 0.92)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.wallGold;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function centerText(ctx, text, x, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawHud(state, time) {
    const s = state;
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD.width, FIELD.hud);
    ctx.fillStyle = PALETTE.hudLine;
    ctx.fillRect(0, FIELD.hud - 2, FIELD.width, 2);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText('MIDNIGHT VAULT', 16, 24);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(s.level.name, 16, 46);
    // Score and timer (after a level ends the total already holds the
    // level score, so show the total alone then).
    ctx.font = `700 22px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    const shownScore = s.status === 'playing' ? s.totalScore + s.score : s.totalScore;
    ctx.fillText(`SCORE ${shownScore}`, 330, 26);
    const t = Math.max(0, Math.ceil(s.timeLeft));
    const mm = String(Math.floor(t / 60));
    const ss = String(t % 60).padStart(2, '0');
    ctx.fillStyle = t <= 20 ? PALETTE.danger : PALETTE.text;
    ctx.fillText(`${mm}:${ss}`, 330, 50);
    // Alarm meter.
    ctx.textAlign = 'left';
    ctx.font = `700 11px ${FONT}`;
    ctx.fillStyle = s.alarm >= 70 ? PALETTE.danger : PALETTE.muted;
    ctx.fillText('ALARM', 470, 16);
    ctx.fillStyle = '#0a0d18';
    roundRect(ctx, 470, 24, 170, 16, 8);
    ctx.fill();
    const alarmW = (170 * s.alarm) / 100;
    ctx.fillStyle = s.alarm >= 70 ? PALETTE.danger : s.alarm >= 40 ? '#ff9f2e' : '#2ecc71';
    if (alarmW > 0) {
      roundRect(ctx, 470, 24, Math.max(8, alarmW), 16, 8);
      ctx.fill();
    }
    ctx.strokeStyle = PALETTE.hudLine;
    ctx.lineWidth = 1;
    roundRect(ctx, 470, 24, 170, 16, 8);
    ctx.stroke();
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`${Math.round(s.alarm)}%`, 646, 32);
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(s.spottedCountdown > 0 ? `SPOTTED ${s.spottedCountdown.toFixed(1)}s` : 'HIDDEN', 470, 52);
    // Loot, keycard, EMP, exit.
    const lootTotal = s.level.loot.length;
    const lootGot = s.loot.filter((l) => l.taken).length;
    ctx.textAlign = 'right';
    ctx.font = `700 14px ${FONT}`;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`LOOT ${lootGot}/${lootTotal}`, 944, 22);
    ctx.fillStyle = s.keycard.taken ? PALETTE.keycard : PALETTE.muted;
    ctx.fillText(s.keycard.taken ? 'KEYCARD ✓' : 'KEYCARD —', 944, 42);
    ctx.fillStyle = s.empCharges > 0 ? PALETTE.text : PALETTE.muted;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(`EMP [E] ×${s.empCharges}${s.time < s.empUntil ? ' ACTIVE' : ''}`, 800, 52);
    ctx.fillStyle = s.exitOpen ? PALETTE.ok : PALETTE.danger;
    ctx.fillText(s.exitOpen ? 'EXIT OPEN' : 'EXIT LOCKED', 944, 52);
    void time;
  }

  function drawField(state, time) {
    const s = state;
    const level = s.level;
    ctx.save();
    ctx.translate(0, FIELD.hud);
    // Floor tiles.
    const tile = 48;
    for (let y = 0; y < FIELD.height; y += tile) {
      for (let x = 0; x < FIELD.width; x += tile) {
        ctx.fillStyle = ((x + y) / tile) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x, y, tile, tile);
      }
    }
    // Carpet runner down the middle hall.
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(330, 0, 280, FIELD.height);
    ctx.strokeStyle = 'rgba(201,162,39,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(336, 6, 268, FIELD.height - 12);
    // Room labels.
    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = 'rgba(238,241,245,0.28)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(level.name, 28, 44);
    // Pressure plates.
    for (const plate of level.plates) {
      const hot = (plate.flash || 0) > 0;
      ctx.fillStyle = hot ? PALETTE.plateHot : PALETTE.plate;
      ctx.fillRect(plate.x, plate.y, plate.w, plate.h);
      ctx.strokeStyle = hot ? '#ff8a96' : '#6b5578';
      ctx.lineWidth = 2;
      ctx.strokeRect(plate.x + 2, plate.y + 2, plate.w - 4, plate.h - 4);
      ctx.fillStyle = 'rgba(238,241,245,0.5)';
      ctx.font = `10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('PRESSURE', plate.x + plate.w / 2, plate.y + plate.h / 2 + 3);
    }
    // Exit door.
    const exit = level.exit;
    ctx.fillStyle = s.exitOpen ? PALETTE.exitOpen : PALETTE.exitClosed;
    ctx.fillRect(exit.x - 4, exit.y - 4, exit.w + 8, exit.h + 8);
    ctx.fillStyle = '#0b0e16';
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.fillStyle = s.exitOpen ? '#baffd6' : '#ffb3ab';
    ctx.font = `700 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2 + 5);
    if (s.exitOpen) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 5);
      ctx.strokeStyle = `rgba(46, 204, 113, ${0.4 + pulse * 0.6})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(exit.x - 10, exit.y - 10, exit.w + 20, exit.h + 20);
      ctx.fillStyle = PALETTE.ok;
      ctx.font = `700 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('▼ GETAWAY ▼', Math.max(80, Math.min(880, exit.x + exit.w / 2)), exit.y - 16);
    } else {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('crack the safe past 50%', Math.max(100, Math.min(860, exit.x + exit.w / 2)), exit.y - 16);
    }
    // Safe.
    const safe = s.safe;
    ctx.fillStyle = PALETTE.safeDark;
    ctx.fillRect(safe.x - 4, safe.y - 4, safe.w + 8, safe.h + 8);
    ctx.fillStyle = PALETTE.safe;
    ctx.fillRect(safe.x, safe.y, safe.w, safe.h);
    ctx.strokeStyle = PALETTE.wallGold;
    ctx.lineWidth = 2;
    ctx.strokeRect(safe.x, safe.y, safe.w, safe.h);
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath();
    ctx.arc(safe.x + safe.w / 2, safe.y + safe.h / 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2f3547';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(safe.x + safe.w / 2, safe.y + safe.h / 2, 13, -Math.PI / 2, -Math.PI / 2 + safe.cracked * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 11px ${FONT}`;
    ctx.fillText('SAFE', safe.x + safe.w / 2, safe.y + safe.h - 8);
    if (safe.cracked > 0 && safe.cracked < 1) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `700 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`CRACKING ${Math.round(safe.cracked * 100)}%`, Math.max(70, Math.min(890, safe.x + safe.w / 2)), safe.y - 10);
    }
    // Keycard.
    if (!s.keycard.taken) {
      const glow = 0.5 + 0.5 * Math.sin(time * 4);
      ctx.fillStyle = `rgba(77, 216, 255, ${0.25 + glow * 0.3})`;
      ctx.beginPath();
      ctx.arc(s.keycard.x, s.keycard.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.keycard;
      roundRect(ctx, s.keycard.x - 11, s.keycard.y - 7, 22, 14, 3);
      ctx.fill();
      ctx.fillStyle = '#0b0e16';
      ctx.fillRect(s.keycard.x - 7, s.keycard.y - 4, 14, 3);
    }
    // Loot.
    for (const item of s.loot) {
      if (!item.taken) drawLoot(ctx, item, time);
    }
    // Vision cones (guards red, cameras amber), drawn before walls so walls cut them.
    for (const guard of s.guards) {
      drawCone(ctx, guard.x, guard.y, guard.angle, CONE.guardRange, CONE.halfAngle, PALETTE.cone, PALETTE.coneEdge);
    }
    for (const camera of s.cameras) {
      if (s.time < s.empUntil) continue;
      drawCone(ctx, camera.x, camera.y, camera.angle, CONE.cameraRange, CONE.halfAngle, PALETTE.cameraCone, PALETTE.cameraConeEdge);
    }
    // Lasers.
    for (const laser of level.lasers) {
      const on = s.time < s.empUntil ? false : ((s.time + laser.phase) % laser.period < laser.onTime);
      ctx.strokeStyle = on ? PALETTE.laser : PALETTE.laserOff;
      ctx.lineWidth = on ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(laser.x1, laser.y1);
      ctx.lineTo(laser.x2, laser.y2);
      ctx.stroke();
      if (on) {
        ctx.fillStyle = '#ff8a96';
        ctx.beginPath();
        ctx.arc(laser.x1, laser.y1, 6, 0, Math.PI * 2);
        ctx.arc(laser.x2, laser.y2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#3a4266';
      ctx.fillRect(laser.x1 - 6, laser.y1 - 6, 12, 12);
      ctx.fillRect(laser.x2 - 6, laser.y2 - 6, 12, 12);
    }
    // Walls.
    for (const w of level.walls) {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(w.x, w.y, w.w, 4);
      ctx.fillStyle = 'rgba(201,162,39,0.5)';
      ctx.fillRect(w.x, w.y + w.h - 2, w.w, 2);
    }
    // Cameras (bodies on the wall).
    for (const camera of s.cameras) {
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.rotate(camera.angle);
      ctx.fillStyle = s.time < s.empUntil ? '#555' : '#e8b64c';
      roundRect(ctx, -4, -7, 18, 14, 4);
      ctx.fill();
      ctx.fillStyle = '#0b0e16';
      ctx.beginPath();
      ctx.arc(14, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Guards and thief.
    for (const guard of s.guards) drawGuard(ctx, guard, time);
    drawThief(ctx, s.thief, time);
    // EMP bubble.
    if (s.time < s.empUntil) {
      ctx.strokeStyle = 'rgba(77, 216, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(s.thief.x, s.thief.y, 52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = PALETTE.keycard;
      ctx.font = `700 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('EMP ACTIVE — cameras & lasers down', s.thief.x, s.thief.y - 34);
    }
    // Safe hint.
    if (!s.keycard.taken) {
      ctx.fillStyle = 'rgba(238,241,245,0.75)';
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('Find the keycard, then crack the safe', FIELD.width / 2, FIELD.height - 12);
    } else if (!s.exitOpen) {
      ctx.fillStyle = 'rgba(238,241,245,0.75)';
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('Stand by the safe to crack it — exit opens past 50%', FIELD.width / 2, FIELD.height - 12);
    }
    ctx.restore();
  }

  function drawSpotted(state) {
    if (state.spottedCountdown <= 0) return;
    const flash = 0.35 + 0.3 * Math.sin(performance.now() / 90);
    ctx.fillStyle = `rgba(255, 40, 60, ${flash * 0.35})`;
    ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
    ctx.strokeStyle = PALETTE.danger;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, CANVAS.width - 6, CANVAS.height - 6);
    centerText(ctx, `SPOTTED!  ${state.spottedCountdown.toFixed(1)}s — BREAK LINE OF SIGHT!`, CANVAS.width / 2, 108, `700 26px ${FONT}`, '#ffffff');
  }

  function draw(state, screen, best) {
    const time = state.time;
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
    const scale = Math.min(canvas.width / CANVAS.width, canvas.height / CANVAS.height);
    ctx.save();
    ctx.scale(scale, scale);
    drawField(state, time);
    drawHud(state, time);
    drawSpotted(state);
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(8, 10, 20, 0.72)';
      ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
      drawPanel(ctx, 180, 92, 600, 480);
      centerText(ctx, 'MIDNIGHT VAULT', 480, 140, `700 44px ${FONT}`, PALETTE.gold);
      centerText(ctx, '— THE MERIDIAN HEIST —', 480, 176, `700 16px ${FONT}`, PALETTE.text);
      centerText(ctx, 'Slip past the guards. Crack the safe. Get out rich.', 480, 206, `15px ${FONT}`, PALETTE.muted);
      const lines = [
        'MOVE  WASD / arrows — or click the floor to walk there',
        'STEAL  Grab loot, the keycard, then hold by the safe to crack it',
        'EXIT  opens once the safe is cracked past 50%',
        'HIDE  Stay out of red guard cones and amber camera cones',
        'DANGER  Lasers and pressure plates trip the alarm',
        'TOOL  Press E for an EMP (costs 20 pts) — kills cameras & lasers 6s',
        'CLOCK  120 seconds per level · 2 levels · break sight to cool down',
      ];
      ctx.font = `14px ${FONT}`;
      ctx.fillStyle = PALETTE.text;
      ctx.textAlign = 'left';
      lines.forEach((line, i) => ctx.fillText(line, 215, 246 + i * 28));
      centerText(ctx, '▶  PRESS SPACE OR CLICK TO START  ◀', 480, 478, `700 18px ${FONT}`, PALETTE.ok);
      if (best > 0) centerText(ctx, `Best score: ${best}`, 480, 512, `14px ${FONT}`, PALETTE.muted);
      centerText(ctx, 'No sound needed · works offline · original art, drawn in code', 480, 544, `12px ${FONT}`, PALETTE.muted);
    } else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(8, 10, 20, 0.7)';
      ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
      centerText(ctx, 'PAUSED', 480, 300, `700 44px ${FONT}`, PALETTE.text);
      centerText(ctx, 'Press P or click to keep stealing', 480, 344, `16px ${FONT}`, PALETTE.muted);
    } else if (screen === SCREEN_LEVEL_DONE) {
      ctx.fillStyle = 'rgba(8, 10, 20, 0.72)';
      ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
      drawPanel(ctx, 230, 150, 500, 360);
      centerText(ctx, 'LEVEL CLEARED!', 480, 196, `700 34px ${FONT}`, PALETTE.ok);
      centerText(ctx, `${state.level.name} — score ${state.levelScore} (bonus +${state.levelBonus})`, 480, 232, `15px ${FONT}`, PALETTE.text);
      const names = ['ROUTES — loot on the patrol routes', 'ALARM — stayed unseen', 'SAFE — cracked for loot'];
      state.sections.forEach((value, i) => {
        centerText(ctx, `${names[i]}: ${value} / 100`, 480, 276 + i * 30, `700 16px ${FONT}`, PALETTE.text);
      });
      centerText(ctx, `TOTAL ${state.totalScore}`, 480, 386, `700 22px ${FONT}`, PALETTE.gold);
      centerText(ctx, '▶  PRESS SPACE FOR THE NEXT LEVEL  ◀', 480, 436, `700 16px ${FONT}`, PALETTE.ok);
      centerText(ctx, 'The vault floor is harder: three guards, two cameras.', 480, 470, `13px ${FONT}`, PALETTE.muted);
    } else if (screen === SCREEN_WON) {
      ctx.fillStyle = 'rgba(8, 10, 20, 0.78)';
      ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
      drawPanel(ctx, 200, 130, 560, 400);
      centerText(ctx, '★ THE GETAWAY ★', 480, 182, `700 38px ${FONT}`, PALETTE.gold);
      centerText(ctx, 'Both vaults cracked. The crew is out, the loot is yours.', 480, 220, `16px ${FONT}`, PALETTE.text);
      centerText(ctx, `TOTAL SCORE  ${state.totalScore}`, 480, 272, `700 28px ${FONT}`, PALETTE.text);
      centerText(ctx, `Best score: ${Math.max(best, state.totalScore)}`, 480, 312, `15px ${FONT}`, PALETTE.muted);
      const names = ['ROUTES', 'ALARM', 'SAFE'];
      state.sections.forEach((value, i) => {
        centerText(ctx, `${names[i]} ${value} / 100`, 480, 344 + i * 26, `15px ${FONT}`, PALETTE.text);
      });
      centerText(ctx, '▶  PRESS SPACE TO STEAL AGAIN  ◀', 480, 448, `700 16px ${FONT}`, PALETTE.ok);
      centerText(ctx, 'Midnight Vault — an original heist, drawn in code', 480, 490, `12px ${FONT}`, PALETTE.muted);
    } else if (screen === SCREEN_CAUGHT) {
      ctx.fillStyle = 'rgba(40, 6, 12, 0.78)';
      ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
      drawPanel(ctx, 230, 170, 500, 320);
      centerText(ctx, 'CAUGHT!', 480, 222, `700 40px ${FONT}`, PALETTE.danger);
      centerText(ctx, state.caughtReason, 480, 262, `15px ${FONT}`, PALETTE.text);
      centerText(ctx, `Score ${state.totalScore + state.score} · ${state.level.name}`, 480, 300, `15px ${FONT}`, PALETTE.muted);
      centerText(ctx, 'Watch the cones sweep before you move.', 480, 330, `13px ${FONT}`, PALETTE.muted);
      centerText(ctx, '▶  PRESS SPACE TO TRY AGAIN  ◀', 480, 392, `700 16px ${FONT}`, PALETTE.ok);
      centerText(ctx, 'R — restart the level', 480, 428, `13px ${FONT}`, PALETTE.muted);
    } else if (screen === SCREEN_TIMEOUT) {
      ctx.fillStyle = 'rgba(8, 10, 20, 0.78)';
      ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
      drawPanel(ctx, 230, 170, 500, 320);
      centerText(ctx, "TIME'S UP!", 480, 222, `700 40px ${FONT}`, PALETTE.danger);
      centerText(ctx, 'The 120 seconds ran out before the getaway.', 480, 262, `15px ${FONT}`, PALETTE.text);
      centerText(ctx, `Score ${state.totalScore + state.score} · ${state.level.name}`, 480, 300, `15px ${FONT}`, PALETTE.muted);
      centerText(ctx, '▶  PRESS SPACE TO TRY AGAIN  ◀', 480, 392, `700 16px ${FONT}`, PALETTE.ok);
    }
    ctx.restore();
  }

  return { draw };
}
