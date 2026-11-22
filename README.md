# Midnight Vault — The Meridian Heist

[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/best-heist-game-20261122-0559) [![Play on make.fun](https://make.fun/play-badge.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

An original top-down stealth heist game, built for the make.fun bounty
**"Make the best heist game"** (best-heist-game-20261122-0559), account
**@angga-ramadan**. All art is drawn in code on a canvas — no images,
fonts, sounds or libraries are loaded, and the game makes no network
request at all.

## How to play

Serve the game (any static server) and open it in a desktop browser:

```sh
node serve.ts        # serves game/ at http://localhost:8080
# or: python3 -m http.server 8080 --directory game
```

You can also open `index.html` in the repository root directly in a
browser — it is a self-contained copy of the same game.

- **Move** — WASD / arrow keys, or click the floor to walk there.
- **Steal** — grab the loot, pick up the keycard, then stand by the safe
  to crack it. The exit opens once the safe is cracked past 50%.
- **Hide** — stay out of the red guard vision cones and the amber camera
  cones. Lasers and pressure plates trip the alarm.
- **Tool** — press **E** for an EMP (costs 20 points, once per level):
  it kills cameras and lasers for 6 seconds.
- **Clock** — 120 seconds per level. Break line of sight to cool the
  alarm down; when the alarm hits 100% you get a 3-second spotted
  countdown to escape the cone.
- **Pause** — P or Esc. **R** — restart the level.

### The levels

1. **The Gallery** — a museum wing: 2 guards on patrol routes, 1 camera,
   1 laser, 1 pressure plate, 4 loot pieces and a safe.
2. **The Vault** — a bank vault floor: 3 guards, 2 cameras, 2 lasers,
   2 pressure plates, 5 loot pieces and a central safe.

Each level is scored in three sections of 100 points — guard routes,
alarm discipline, and the safe — shown on the level-complete screen.
Finish both levels to pull off the getaway.

## Files

```
main.ts                  hands the entry in (copies game/ + screenshots/,
                         writes dossier.json with vendor/makefun-game.ts)
vendor/makefun-game.ts   kit library, unchanged
serve.ts                 tiny static server for local play-testing
game/index.html          the game page (loads src/main.js)
game/src/config.js       tuning numbers and colours
game/src/levels.js       the two levels: walls, patrols, traps, loot
game/src/input.js        keyboard + pointer input
game/src/world.js        the simulation: guards, cones, alarm, safe, exit
game/src/render.js       all canvas drawing + HUD + screens
game/src/shots.js        screenshot scenes (?shot=start|play|alarm|end)
game/src/main.js         boot, game loop, screens
screenshots/            1-start.jpg (cover), 2-play.jpg, 3-alarm.jpg,
                         4-end.jpg — real renders of the game's own code
shots.json               the four screenshot scenes
LICENSE                  MIT
```

## How to test

```sh
# 1. Logic test (no browser): autopilot plays both levels to the getaway
node /tmp/heist-test.mjs        # (test script, not part of the entry)

# 2. Play it in a browser
node serve.ts                   # http://localhost:8080

# 3. Build the submission output exactly as the grader does
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
ls out out/game out/screenshots   # game/, screenshots/, dossier.json
```

## Screenshots

`?shot=start` shows the thief mid-room with guards, vision cones, a
camera, the loot target and the alarm meter in one frame. `?shot=play`
is 16 seconds of real play, `?shot=alarm` walks into a cone on purpose
to show the alarm meter and spotted countdown, and `?shot=end` plays
through both levels to the getaway screen.

## License

MIT — see LICENSE.
