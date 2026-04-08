# Architecture Research

**Domain:** Browser-based 3D endless runner (Three.js + vanilla JS, single static bundle, mobile 60fps target)
**Researched:** 2026-04-08
**Confidence:** HIGH (architectural choices are well-trodden Three.js community ground; the only MEDIUM-confidence area is exact AnimationMixer clip names which depend on artist deliverables)

---

## TL;DR

A single-developer 1–2 week endless runner should be built as **eight loosely-coupled vanilla-JS modules** sitting on **one fixed-step game loop** with **manual object pools** for world chunks/obstacles/coins. **No ECS, no XState, no physics engine, no UI framework, no event bus.** Game state is a single exported singleton object. Modules talk via direct function calls in one direction (engine → game → world/player → render); UI listens to state by polling each frame. A DOM HUD overlays a full-window canvas. Vite produces a hashed static `/dist` that drops anywhere.

The build order is **engine first, then player + input on a static scene, then world generation, then collisions, then HUD, then audio, then polish (power-up, leaderboard, share)**. Any deviation from that order creates rework.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       index.html (host page)                     │
│   ┌────────────────────────┐    ┌──────────────────────────┐     │
│   │  <canvas id="game">    │    │   DOM HUD overlay        │     │
│   │  (Three.js renders)    │    │   (score, coins, menu,   │     │
│   │                        │    │    pause, game-over)     │     │
│   └────────────────────────┘    └──────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │ reads
┌──────────────────────────────────────────────────────────────────┐
│                       UI LAYER (DOM, src/ui/)                    │
│  ┌────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ hud.js │  │ menu.js  │  │ pause.js │  │  gameover.js     │   │
│  └───┬────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│      └────────────┴─────────────┴─────────────────┘             │
│                        polls each frame                          │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │ reads (never writes)
┌──────────────────────────────────────────────────────────────────┐
│                  GAME STATE  (src/state.js — singleton)          │
│           phase | score | linkys | speed | magnetUntil           │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │ writes
┌──────────────────────────────────────────────────────────────────┐
│                       GAME LAYER (src/game/)                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────────────┐  │
│  │ player.js│→ │ world.js │→ │collision  │→ │  powerups.js   │  │
│  │  (FSM +  │  │  (chunks,│  │   .js     │  │  (magnet only) │  │
│  │  mixer)  │  │  pools)  │  │  (AABB)   │  │                │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └───────┬────────┘  │
│       └─────────────┴──────────────┴────────────────┘            │
│                              ▲                                   │
│                              │ tick(dt, input)                   │
└──────────────────────────────────────────────────────────────────┘
                              ▲
┌──────────────────────────────────────────────────────────────────┐
│                  ENGINE LAYER (src/engine/)                      │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │
│  │ loop.js │  │renderer  │  │camera  │  │loader  │  │audio   │  │
│  │ (fixed- │  │  .js     │  │  .js   │  │  .js   │  │  .js   │  │
│  │  step)  │  │          │  │        │  │ (GLB)  │  │(Howler)│  │
│  └────┬────┘  └────┬─────┘  └───┬────┘  └───┬────┘  └───┬────┘  │
│       │            │            │           │           │       │
│  ┌────┴────────────┴────────────┴───────────┴───────────┴────┐  │
│  │                       input.js                             │ │
│  │     (keyboard + pointer → normalized intents)              │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ▲
┌──────────────────────────────────────────────────────────────────┐
│                       Three.js + Howler.js                       │
└──────────────────────────────────────────────────────────────────┘
```

**The cardinal rule:** dependencies point downward only. `engine/` knows nothing about `game/`. `game/` knows nothing about `ui/`. `ui/` knows nothing about Three.js. State is the only thing UI is allowed to touch from the game layer, and it touches it read-only.

### Component Responsibilities

| Component | Owns | Forbidden From |
|-----------|------|----------------|
| `engine/loop.js` | `requestAnimationFrame`, fixed-step accumulator, calls `game.tick(dt)` then `renderer.render()` | Knowing about player, world, score, or DOM |
| `engine/renderer.js` | `THREE.WebGLRenderer`, resize handling, pixel-ratio cap | Game logic |
| `engine/camera.js` | `PerspectiveCamera`, follow-cam offset, gentle damping | Player FSM |
| `engine/loader.js` | `GLTFLoader` + KTX2/Meshopt setup, returns `Promise<{ninty, linky, props}>` | Anything dynamic |
| `engine/audio.js` | Thin Howler wrapper: `sfx.play('jump')`, `music.start()`, mute toggle | Knowing why a sound plays |
| `engine/input.js` | Raw key + pointer events → `input` object: `{left, right, up, down, jumpPressed, slidePressed}` (edge-triggered for actions, level for held) | Game logic; mapping keys to gameplay meaning lives here, but reading scene/player state does not |
| `game/player.js` | Ninty: lane index, x/y/vy, FSM (`run\|jump\|slide\|dead`), AnimationMixer, hitbox AABB | Spawning world, drawing HUD |
| `game/world.js` | Chunk spawner, obstacle/coin pools, despawn behind camera, world speed scaling | Player input, score |
| `game/collision.js` | AABB overlap helper + `checkPlayerVsWorld()` | Owning state |
| `game/powerups.js` | Magnet timer + applying magnet pull to nearby coins | Spawning coins (asks world) |
| `state.js` | The single source of truth for cross-module facts | Importing from `game/` or `engine/` (it is a leaf) |
| `ui/hud.js` | DOM nodes: score, linky count, mute, pause button | Touching Three.js, mutating game state directly (it dispatches `pause()`/`resume()` calls into a tiny `controller.js`) |
| `ui/menu.js`, `ui/gameover.js` | Show/hide overlays based on `state.phase` | Game logic |
| `main.js` | Boot sequence: load assets → build scene → wire modules → start loop | Owning gameplay |

---

## Recommended Project Structure

```
saynine-xtreme/
├── index.html                      # canvas + HUD DOM skeleton
├── vite.config.js                  # static-bundle config
├── package.json
├── public/
│   ├── models/
│   │   ├── ninty.glb               # rigged, KTX2 + meshopt compressed
│   │   ├── linky.glb               # static spinning coin
│   │   └── props/                  # cones, cars, signs
│   ├── audio/
│   │   ├── bgm.webm
│   │   ├── jump.webm
│   │   ├── coin.webm
│   │   ├── crash.webm
│   │   └── magnet.webm
│   ├── basis/                      # KTX2 transcoder WASM
│   └── (no draco unless needed)
├── src/
│   ├── main.js                     # entry: boot sequence
│   ├── config.js                   # tunables: LANE_X, GRAVITY, JUMP_V, SPEED_*, CHUNK_LEN
│   ├── state.js                    # singleton game state object
│   ├── controller.js               # phase transitions: start(), pause(), resume(), die(), restart()
│   │
│   ├── engine/
│   │   ├── loop.js                 # rAF + fixed-step accumulator
│   │   ├── renderer.js             # WebGLRenderer, resize, DPR cap
│   │   ├── camera.js               # follow cam
│   │   ├── scene.js                # THREE.Scene, lights, fog
│   │   ├── loader.js               # GLTFLoader/KTX2/Meshopt setup
│   │   ├── audio.js                # Howler wrapper (sfx + music)
│   │   ├── input.js                # keyboard + pointer → intents
│   │   └── pool.js                 # generic object pool helper
│   │
│   ├── game/
│   │   ├── player.js               # Ninty FSM + mixer + hitbox
│   │   ├── world.js                # chunk spawner, obstacle/coin pools
│   │   ├── chunks.js               # chunk templates (which obstacles where)
│   │   ├── collision.js            # AABB overlap
│   │   └── powerups.js             # magnet
│   │
│   ├── ui/
│   │   ├── hud.js                  # score, coins, mute, pause btn
│   │   ├── menu.js                 # title screen overlay
│   │   ├── pause.js                # pause overlay
│   │   ├── gameover.js             # game-over overlay + restart + share
│   │   └── styles.css              # all HUD/overlay CSS
│   │
│   └── util/
│       ├── math.js                 # damp(), clamp(), lerp(), randRange()
│       └── leaderboard.js          # localStorage stub (Phase 1)
└── dist/                           # vite build output (gitignored)
```

### Structure Rationale

- **`engine/` vs `game/` split** is the most important boundary. `engine/` could be lifted into another small Three.js game with zero gameplay leakage. This keeps game code from drowning in renderer/loader/loop boilerplate, and means a teammate can read `game/player.js` without learning `WebGLRenderer`.
- **`state.js` is a leaf** — every layer can import from it, but it imports from nothing. It cannot accidentally cause cycles.
- **`controller.js` exists specifically to give the UI a place to call.** Without it, `ui/gameover.js` would either reach into `world.js` (boundary violation) or fire DOM CustomEvents (over-engineered for one developer). A 30-line controller is the right middle ground.
- **`config.js` is tunables only** — no logic. lil-gui (dev) writes into this object live.
- **`public/` vs `src/`** — Vite copies `public/` verbatim to `dist/`, which is exactly what GLBs and audio need (hashed-via-import paths break Howler caching). Anything imported by JS lives in `src/`.

---

## Architectural Patterns

### Pattern 1: Fixed-Step Game Loop with Render Interpolation Optional

**What:** `requestAnimationFrame` provides wall-clock delta. The loop maintains an accumulator and runs `game.tick(STEP)` zero or more times per frame at a fixed step (1/60s). Rendering happens once per rAF after ticks.

**Why fixed step for this game:**
- Collision detection at variable dt is the #1 source of "I clearly dodged that and still died" bugs in runners. Fixed step makes collisions deterministic.
- Mobile rAF can spike from 16ms to 50ms when the user gets a notification; without an accumulator, the player teleports through obstacles ("tunnel through").
- It costs about 20 lines.

**When to skip:** Never. This is the right call for any action game with collisions.

**Trade-offs:**
- (+) Deterministic physics, no tunneling, reproducible feel.
- (−) Slightly more code than naive variable-step.
- (−) Render interpolation between sub-steps is technically ideal for ultra-smooth visuals; **skip it for v1**, the 60fps mobile target plus rAF cadence makes it unnecessary.

**Example:**
```js
// engine/loop.js
import * as THREE from 'three';
const STEP = 1 / 60;
const MAX_DELTA = 1 / 15;       // cap to avoid spirals after tab-resume
let acc = 0, last = 0, running = false;

export function start(tick, render) {
  running = true;
  last = performance.now() / 1000;
  const frame = (now) => {
    if (!running) return;
    const t = now / 1000;
    let dt = Math.min(t - last, MAX_DELTA);
    last = t;
    acc += dt;
    while (acc >= STEP) {
      tick(STEP);
      acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
export function stop() { running = false; }
```

`mixer.update(STEP)` is called inside `tick`, so animations stay in lockstep with movement. Howler is event-triggered and does not need to participate in the loop.

### Pattern 2: Lightweight FSM (Plain Switch, No Library)

**What:** Both the player and the game phase use plain string states with a `switch` in the tick function. Transitions are direct assignments + side effects.

**Why not XState / a class-based FSM:**
- Player has 4 states. Game has 4 states. The matrix of transitions is small enough to read at a glance. XState's runtime cost (~15KB gzipped) and conceptual overhead exceed the entire complexity of the FSM it replaces.
- A switch is the clearest possible expression of "this is what happens in state X each frame."

**Example:**
```js
// game/player.js
export function tickPlayer(dt, input) {
  switch (player.state) {
    case 'run':
      if (input.jumpPressed) enterJump();
      else if (input.slidePressed) enterSlide();
      break;
    case 'jump':
      player.vy -= GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.y <= 0) { player.y = 0; player.vy = 0; enterRun(); }
      break;
    case 'slide':
      player.slideTimer -= dt;
      if (player.slideTimer <= 0) enterRun();
      break;
    case 'dead':
      break;
  }
  // lane handling is shared across states (works in air too)
  if (input.leftPressed && player.lane > 0) player.lane--;
  if (input.rightPressed && player.lane < 2) player.lane++;
  player.x = damp(player.x, LANE_X[player.lane], 18, dt);
}
```

The same pattern in `controller.js` handles `menu → playing → paused → playing → dead → playing` transitions.

### Pattern 3: Object Pools for Anything That Spawns

**What:** Pre-allocate N obstacle and coin instances at boot. Spawning fetches an inactive one and positions it; despawning marks it inactive and hides it. Never `new` during gameplay.

**Why this is non-negotiable on mobile:**
- Mobile JS GC pauses are 30–80ms. One pause = a visible stutter. The runner spawns/despawns dozens of objects per second; without pooling that is a guaranteed jank.
- Three.js `Mesh` allocation is also non-trivial because of skeleton/material bookkeeping.

**Example:**
```js
// engine/pool.js
export function createPool(factory, size) {
  const items = Array.from({ length: size }, () => {
    const it = factory();
    it.visible = false;
    it._active = false;
    return it;
  });
  return {
    items,
    acquire() {
      for (const it of items) if (!it._active) {
        it._active = true; it.visible = true; return it;
      }
      return null; // pool exhausted — bump size in config
    },
    release(it) { it._active = false; it.visible = false; }
  };
}
```

`world.js` keeps three pools: `cones`, `cars`, `signs`, plus `linkys` (coins). InstancedMesh is an even better fit for repeated coins; use `InstancedMesh` for the coin pool specifically (one draw call for all 60 coins on screen).

### Pattern 4: Chunked Procedural World

**What:** The track is built from fixed-length chunks (e.g. 30m). Each chunk template is a list of `{lane, type, z}` placements. World maintains a sliding window of ~4 chunks ahead of the player. When the player crosses a chunk boundary, despawn the rearmost chunk and spawn one further ahead.

**Why chunks not per-obstacle spawning:**
- Easy to author difficulty: a chunk template is a tiny array, hand-written.
- Despawn logic is "if chunk.z < player.z - 20, release all its objects to pools" — one check, not N.
- Difficulty curve = pick from a weighted set of templates that gets harder over distance.

**Example:**
```js
// game/chunks.js
export const TEMPLATES = [
  { name: 'easy_cones', items: [
      { type: 'cone', lane: 0, z: 5 },
      { type: 'cone', lane: 2, z: 15 },
  ]},
  { name: 'car_jump', items: [
      { type: 'car', lane: 1, z: 10 },
      { type: 'sign', lane: 0, z: 20 },     // forces slide
  ]},
  // ... 8-12 templates total is plenty for v1
];
```

### Pattern 5: Lightweight Entity Records (NOT ECS)

**What:** Every active object on screen is a plain JS object with a `Mesh` reference and a few fields. There is no system/component registry. Game logic iterates the relevant arrays directly.

**Why explicitly NOT ECS:**
- ECS pays off when you have hundreds of entities, multiple orthogonal behaviors, and a need to compose behaviors at runtime. This game has ~20 entities, three behavior types (cone, car, sign), one player, one camera. ECS here is **pure ceremony.**
- A `for (const c of cones.items) if (c._active) { ... }` loop is faster, simpler, and debuggable.

**Anti-pattern to avoid:** Importing `bitecs`, building a Component/System layer, "future-proofing for v2." Delete that instinct.

### Pattern 6: Input as Intents, Not Events

**What:** `engine/input.js` listens to `keydown`/`keyup`/`pointerdown`/`pointerup` and translates them into a single `input` object updated each frame. It exposes both **level signals** (held) and **edge signals** (just-pressed this tick), then resets edges after each tick.

**Why:**
- Game code becomes `if (input.jumpPressed)` instead of subscribing to events. Trivially testable.
- Swipes and key presses become indistinguishable to the game layer — desktop testing of mobile flows is free.
- Edge-triggered booleans (`jumpPressed`, `slidePressed`, `leftPressed`, `rightPressed`) prevent double-jumping from a single key press.

**Example:**
```js
// engine/input.js
export const input = {
  leftPressed: false, rightPressed: false,
  jumpPressed: false, slidePressed: false,
};

const SWIPE_MIN = 30, SWIPE_MAX_MS = 500;
let sx, sy, st;

addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.key === 'ArrowLeft' || e.key === 'a') input.leftPressed = true;
  if (e.key === 'ArrowRight'|| e.key === 'd') input.rightPressed = true;
  if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === ' ') input.jumpPressed = true;
  if (e.key === 'ArrowDown' || e.key === 's') input.slidePressed = true;
});
addEventListener('pointerdown', e => { sx=e.clientX; sy=e.clientY; st=performance.now(); });
addEventListener('pointerup', e => {
  const dx=e.clientX-sx, dy=e.clientY-sy, dt=performance.now()-st;
  if (dt>SWIPE_MAX_MS) return;
  if (Math.abs(dx)<SWIPE_MIN && Math.abs(dy)<SWIPE_MIN) return;
  if (Math.abs(dx)>Math.abs(dy)) (dx>0?input.rightPressed:input.leftPressed) = true;
  else (dy>0?input.slidePressed:input.jumpPressed) = true;
});

export function clearEdges() {
  input.leftPressed = input.rightPressed = input.jumpPressed = input.slidePressed = false;
}
```

The loop calls `clearEdges()` at the end of each tick.

### Pattern 7: AnimationMixer Owned by Player

**What:** `player.js` owns the `AnimationMixer`, holds an `actions` map (`{run, jump, slide, idle, death}`), and exposes private `enterRun()`/`enterJump()`/`enterSlide()`/`enterDead()` helpers that call `crossFadeTo`. The FSM tick calls these helpers; nothing else touches the mixer.

**Why centralize:**
- Cross-fade math (durations, `clampWhenFinished`, `LoopOnce`) is fiddly. Putting it in one file means you debug it once.
- `mixer.update(dt)` is called from `tickPlayer`, with the same `dt` (`STEP`) the rest of the player uses. No drift.

**Cross-fade rules of thumb (from STACK.md):**
- Looping clips (`run`, `idle`): `crossFadeTo(other, 0.2, false)`.
- One-shot clips (`jump`, `slide`, `death`): `setLoop(LoopOnce)`, `clampWhenFinished = true`, listen for `mixer.addEventListener('finished', ...)` to return to run.
- Always `fadeOut` the previous action at the same time, or stop it explicitly after the fade.

### Pattern 8: Audio as a Thin Side-Channel

**What:** `engine/audio.js` exports `sfx(name)`, `playMusic()`, `stopMusic()`, `setMuted(bool)`. Game code calls `sfx('jump')` from inside the FSM transition. There is no audio event bus, no audio queue, no cross-cutting concern.

**Why this is loose enough:**
- Only ~5 sound triggers in the entire game (jump, coin, crash, magnet on, magnet off).
- Howler handles iOS unlock; first call is wrapped in `audio.unlock()` triggered by the menu's "Tap to start" button.
- Mute is global, set on Howler's `Howler.mute(bool)`.

```js
// engine/audio.js
import { Howl, Howler } from 'howler';
const sounds = {};
export function loadAudio() {
  sounds.jump   = new Howl({ src: ['audio/jump.webm'],   volume: 0.6 });
  sounds.coin   = new Howl({ src: ['audio/coin.webm'],   volume: 0.5 });
  sounds.crash  = new Howl({ src: ['audio/crash.webm'],  volume: 0.8 });
  sounds.magnet = new Howl({ src: ['audio/magnet.webm'], volume: 0.7 });
  sounds.bgm    = new Howl({ src: ['audio/bgm.webm'], loop: true, volume: 0.35 });
}
export const sfx = (name) => sounds[name]?.play();
export const playMusic = () => sounds.bgm.play();
export const setMuted = (m) => Howler.mute(m);
```

### Pattern 9: DOM Overlay HUD (NOT Canvas-Drawn)

**What:** The score, linky count, mute button, pause button, menu, game-over, and leaderboard live as plain HTML elements positioned over a fullscreen canvas. The canvas only draws the 3D scene.

**Why DOM beats canvas-drawn HUD here:**
- HUD updates run at DOM speed (essentially free for 4 fields).
- Buttons get free hit-testing, accessibility, focus rings, and CSS hover/active states.
- Brand styling (gradients, fonts, the orange `#FF8A3B` accents) is one CSS file vs. fighting Three.js text rendering.
- The HUD survives a canvas resize without recomputation.

**The only thing that should ever be drawn in 3D space:** in-world indicators (e.g. a "+1" floater above a collected Linky, or the magnet aura around Ninty). For v1 these are optional polish — start with DOM-only HUD.

**HUD update strategy:** `ui/hud.js` exports `updateHUD()` which reads from `state` and writes to `textContent`. `main.js` calls it from inside the loop's render step (not the tick step — render-rate updates are fine for visual-only data).

```js
// ui/hud.js
import { state } from '../state.js';
const scoreEl = document.querySelector('#score');
const linkyEl = document.querySelector('#linkys');
let lastScore = -1, lastLinkys = -1;
export function updateHUD() {
  if (state.score !== lastScore)   { scoreEl.textContent = state.score|0;  lastScore = state.score; }
  if (state.linkys !== lastLinkys) { linkyEl.textContent = state.linkys;   lastLinkys = state.linkys; }
}
```

(Skip the diff if profiling says it doesn't matter; for 60fps text updates the diff is negligible savings either way.)

### Pattern 10: Asset Preload Gate

**What:** All GLBs and all audio load before "Tap to start" is enabled. A simple progress bar in the menu overlay tracks loader promises. No streaming, no lazy loading.

**Why preload over stream:**
- Total asset budget is **<2 MB** (per STACK.md). On 4G that's 2–4 seconds. Fine to block.
- Streaming means the game has to handle "obstacle template references a model not yet loaded" — unbounded complexity for a 1–2 week project.
- Preload + progress bar is honest UX: "loading 1.2MB" feels fast; mid-game stutters from late loads feel broken.

**Implementation:** `engine/loader.js` returns `Promise.all([gltf(ninty), gltf(linky), ...gltf(props), loadAudio()])`. Progress is tracked via `THREE.LoadingManager.onProgress`.

---

## Data Flow

### Per-Frame Tick Flow

```
   requestAnimationFrame
            ↓
    loop.js: accumulate dt
            ↓
   for each fixed step:
   ┌────────────────────────────────────────┐
   │  controller.tick(STEP)                 │
   │       ↓                                │
   │  if state.phase === 'playing':         │
   │     player.tick(STEP, input)           │ ← reads input.js
   │           ↓ (writes player.x/y/state)  │
   │     world.tick(STEP, player.z)         │ ← spawns/despawns chunks
   │           ↓                            │
   │     powerups.tick(STEP)                │
   │           ↓                            │
   │     collision.check(player, world)     │ ← writes state.phase='dead' on hit
   │           ↓                            │
   │     state.score += STEP * state.speed  │
   │           ↓                            │
   │     mixer.update(STEP)                 │
   │           ↓                            │
   │     input.clearEdges()                 │
   └────────────────────────────────────────┘
            ↓
   camera.follow(player)
            ↓
   renderer.render(scene, camera)
            ↓
   ui.updateHUD()                            ← reads state, writes DOM
```

### State Mutation Flow

```
[user input]
    ↓
input.js  (sets input.jumpPressed = true)
    ↓
player.js (reads input, mutates player.state, calls sfx('jump'), enterJump())
    ↓
state.js  (player module owns its slice; controller writes phase)
    ↓
ui/*.js   (next frame: reads state, updates DOM)
```

**Forbidden flows (enforce in code review of yourself):**
- `ui/*.js` writing to `state.score` → only `controller.js` and `game/*` may write.
- `engine/*.js` importing from `game/*.js` → engine must be game-agnostic.
- `game/*.js` importing from `ui/*.js` → UI is downstream.
- Anything calling `THREE.*` outside `engine/` (except `player.js` and `world.js` which legitimately need meshes) → keep renderer setup centralized.

### Phase Transition Flow

```
[boot]
   ↓
main.js: load assets → build scene → loop.start()
   ↓
state.phase = 'menu'   (loop runs but tick is a no-op except for idle anim)
   ↓
[user taps "Start"] → controller.startGame()
   ↓
state.phase = 'playing' ; world.reset() ; player.reset() ; audio.playMusic()
   ↓
[collision] → controller.die()
   ↓
state.phase = 'dead' ; player.enterDead() ; sfx('crash') ; ui.gameover.show()
   ↓
[user taps "Restart"] → controller.startGame()    (loops back)

[any time during 'playing'] → controller.pause()
   ↓
state.phase = 'paused' ; loop keeps running but tick early-returns ; bgm.pause()
   ↓
[user taps "Resume"] → controller.resume() → state.phase = 'playing'
```

`document.visibilitychange` listener calls `controller.pause()` automatically when the tab hides.

---

## Build Order (Phase-by-Phase)

This is the dependency-correct build order. Skipping ahead creates rework. Roman numerals correspond to suggested roadmap phases.

### Phase I — Engine Skeleton (Day 1)
**Goal:** A spinning placeholder cube on a fullscreen canvas that runs at 60fps on phone.
1. Vite project, `index.html` with `<canvas>` + empty HUD nodes.
2. `engine/renderer.js` (WebGLRenderer, DPR cap to `min(devicePixelRatio, 2)`, resize handler).
3. `engine/scene.js` (scene, ambient + directional light, fog).
4. `engine/camera.js` (perspective, fixed offset).
5. `engine/loop.js` (fixed-step accumulator from Pattern 1).
6. `main.js` boots all of the above with a placeholder cube.
7. `state.js` exists with `phase: 'playing'` hardcoded.
**Done when:** cube spins on iPhone Safari at 60fps.

### Phase II — Player + Input (Day 2)
**Goal:** A placeholder cube responds to keys and swipes; lane switching, jumping, sliding feel right.
1. `engine/input.js` with keyboard + pointer (Pattern 6).
2. `config.js` with `LANE_X`, `GRAVITY`, `JUMP_V`, `SLIDE_DURATION`.
3. `game/player.js` with FSM (Pattern 2) using a placeholder cube.
4. `util/math.js` with `damp()`.
**Done when:** controls feel tight on desktop AND mobile. **This is the most important moment in the project — do not move on until lane-switching feels good. If it doesn't feel good with a cube, no asset will save it.**

### Phase III — World Generation (Day 3-4)
**Goal:** Endless ground with placeholder obstacles streaming past.
1. `engine/pool.js` (Pattern 3).
2. `game/chunks.js` with 6-8 hand-authored templates (Pattern 4).
3. `game/world.js` with chunk window, obstacle pools (cones/cars/signs as colored cubes).
4. `game/world.js` despawn behind camera, recycle to pools.
5. Linky pool as `InstancedMesh` (cheaper for high counts).
**Done when:** running forward forever, obstacles appear and disappear, no GC stutter on mobile.

### Phase IV — Collisions + Game Phases (Day 5)
**Goal:** Hitting an obstacle ends the run; coins increment a counter.
1. `game/collision.js` with `aabbOverlap()` and `checkPlayerVsWorld()`.
2. `controller.js` with `startGame() / pause() / resume() / die() / restart()`.
3. `state.js` grows `phase`, `score`, `linkys`.
4. Collision with coin → release coin to pool, `state.linkys++`, `sfx('coin')`.
5. Collision with obstacle → `controller.die()`.
**Done when:** the loop is functionally complete with cubes.

### Phase V — HUD + Menu + Game-Over Overlays (Day 6)
**Goal:** Real UX wrapping the cube game.
1. `ui/styles.css` brand-matched (`#FF8A3B`, `#32373C`, gradients).
2. `ui/menu.js` (title screen, "Tap to start", progress bar for asset load).
3. `ui/hud.js` (live score, linky count, mute, pause).
4. `ui/pause.js` (overlay with resume button).
5. `ui/gameover.js` (final score, restart, share buttons placeholder).
6. `util/leaderboard.js` localStorage stub.
**Done when:** the entire game flow is playable end-to-end with cubes.

### Phase VI — Audio (Day 7)
**Goal:** Sound effects and BGM with mute toggle.
1. `engine/audio.js` Howler wrapper (Pattern 8).
2. iOS audio unlock on first tap.
3. Wire `sfx()` calls into player FSM transitions and collision handlers.
4. BGM auto-pauses on tab hide.
**Done when:** the game has audio that doesn't break iOS Safari.

### Phase VII — Assets In (Day 8-9)
**Goal:** Replace cubes with Ninty + Linky GLBs.
1. `engine/loader.js` with GLTFLoader, KTX2Loader, MeshoptDecoder configured.
2. Run user-provided GLBs through `gltf-transform optimize`.
3. Wire Ninty mesh + AnimationMixer into `player.js` (Pattern 7). Replace cube placeholder.
4. Wire Linky GLB into the InstancedMesh coin pool (or per-instance if rotation needs differ).
5. Build a few low-poly chunk templates (city block art) and replace cube obstacles.
**Done when:** game looks like the brand brief.

### Phase VIII — Power-Up + Polish (Day 10-11)
1. `game/powerups.js` (Magnet: 5s timer, pulls Linkys within radius toward player).
2. Particle/glow shader on Ninty during magnet (or just an emissive aura plane).
3. Camera shake on crash, satisfying death animation cue.
4. Difficulty curve tuning via lil-gui.

### Phase IX — Share + Leaderboard + Email Capture (Day 12)
1. Share buttons (Twitter intent URL, LinkedIn share, copy-link).
2. Local leaderboard top-10 from localStorage.
3. Optional email field on game-over (no backend; just `mailto:` or stub).

### Phase X — Build, Embed, Ship (Day 13-14)
1. `vite.config.js` final: `build.target: 'es2020'`, manual chunk for `three`, asset hashing on, immutable cache headers.
2. Test `dist/` deploys to Cloudflare Pages → `play.saynine.ai`.
3. WordPress shortcode wrapping iframe (per STACK.md hosting decision).
4. Cross-device QA: iOS Safari 15+, Chrome Android, desktop Chrome/Firefox/Safari.

**Critical-path observations:**
- **Phase II is the make-or-break milestone.** If lane switching doesn't feel tight on day 2, the project is in trouble — fix it before doing literally anything else.
- **Phases I–VI run with placeholder cubes.** This means asset delivery slipping does NOT block the timeline. Phase VII can shift to day 10 if needed.
- **Phase X (build/embed) being day 13 is intentional** — leave a full day for cross-device debugging because mobile Safari will surprise you.

---

## Vite Configuration for Static Bundle Output

```js
// vite.config.js
import { defineConfig } from 'vite';
export default defineConfig({
  base: './',                           // RELATIVE paths — works in any host
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,               // never inline GLBs/audio
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },   // long-term cache for the big dep
        // hashed filenames are default
      }
    }
  },
  server: { host: true }                // dev on phone over LAN
});
```

`base: './'` is the single most important line for "drops into any host" — it makes every asset path relative, so the bundle works whether served from `play.saynine.ai/`, `saynine.ai/play/`, or inside a WordPress iframe.

---

## Coding Conventions (Solo-Developer Anti-Spaghetti Rules)

These are deliberately few. They are the ones that matter for a 1–2 week sprint with no code reviewer.

1. **One direction of imports.** `engine ← state`, `game ← engine, state`, `ui ← state`, `controller ← engine, game, state`, `main ← everything`. If you ever need a back-edge, it's a sign to add a controller method, not an import.
2. **Tunables in `config.js` only.** Magic numbers in game code are bugs waiting to happen. If you tweak a value twice, move it to config.
3. **No `new` during gameplay.** Pool everything that spawns. Allocations during a run = stutter on mobile.
4. **`mixer.update(STEP)` is called exactly once per tick from `player.tick`.** Not from the loop, not from anywhere else. This is the easiest "animations drift from gameplay" bug to avoid.
5. **`sfx(name)` is called from FSM transitions, not from frame logic.** A coin sound plays when the coin is collected, not every frame the coin is overlapping (which is one frame anyway, but the principle generalizes).
6. **DOM is read from `state`, never written to it.** If the HUD button needs to do something, it calls `controller.pause()`, not `state.phase = 'paused'`.
7. **`?debug` query param** enables stats.js + lil-gui. Production build strips them via dynamic import gated on the param.
8. **`document.visibilitychange` always pauses.** Wire this on day 1; debugging "phone notification killed my run" on day 12 is miserable.
9. **JSDoc the player and world public APIs.** Two function signatures per file with `@param` is enough; full TypeScript is too much ceremony for the timeline.
10. **Commit at every phase boundary.** The phase order above doubles as a commit log.

---

## Scaling Considerations

This is a marketing toy with no backend. "Scaling" here means **how many concurrent players a static asset can serve and how the architecture survives feature creep.**

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1–1k DAU | Cloudflare Pages free tier handles it. No changes. |
| 1k–100k DAU | Still no changes — it's static assets on a CDN. Watch the leaderboard storage if you wire a real backend (Phase 1 is localStorage so this is a non-issue). |
| 100k+ DAU | Real leaderboard backend = Cloudflare Workers + KV or D1, separate concern from this codebase. Game itself remains untouched. |

**When the architecture would need rework:**
- Adding multiplayer → entire networking layer needed → out of scope.
- Adding character progression / inventory / shop → state grows beyond a singleton → introduce a proper FSM file with explicit transitions.
- Adding 5+ power-ups with interactions → `powerups.js` becomes a registry; still no library.
- Targeting 200+ active entities → consider InstancedMesh more aggressively; ECS still wrong answer.

**Most likely first bottleneck:** mobile draw calls. Mitigation: merge static city geometry per chunk, use InstancedMesh for any prop with 5+ copies on screen, single directional shadow at 1024² or no real-time shadows at all (bake into the terrain texture).

**Second bottleneck:** texture memory. Mitigation: KTX2 / Basis Universal for everything (per STACK.md). Both bottlenecks are addressed by structural decisions (instancing-by-default, KTX2-by-default), not bolted on at the end.

---

## Anti-Patterns

### Anti-Pattern 1: Reaching for ECS

**What people do:** Read "endless runner" and decide to install `bitecs` or hand-roll a Component/System framework "for clean separation."
**Why it's wrong:** ECS pays for itself at hundreds of entities and orthogonal behaviors. This game has ~20 entities, three obstacle types, and one player. The framework cost is 100% of the value.
**Do this instead:** Plain object records in arrays. Iterate directly. See Pattern 5.

### Anti-Pattern 2: Variable-Step Game Loop

**What people do:** Multiply movement and physics by `dt` directly inside `requestAnimationFrame`.
**Why it's wrong:** rAF deltas are jittery on mobile (sleep/wake/notification stalls). Collision detection at variable dt produces tunneling — players will dodge perfectly and still die. Reproducing bugs is impossible.
**Do this instead:** Fixed-step accumulator (Pattern 1). 20 lines of code, one entire class of bug eliminated.

### Anti-Pattern 3: Spawning Per-Frame Without Pools

**What people do:** `new THREE.Mesh(coneGeo, coneMat)` every time a cone is needed; remove with `scene.remove()` when it goes off-screen.
**Why it's wrong:** Each spawn allocates JS objects + GPU buffers. Each despawn creates GC pressure. Mobile GC pauses produce visible stutters every few seconds.
**Do this instead:** Object pools (Pattern 3). Pre-allocate at boot, reuse forever.

### Anti-Pattern 4: Adding a Physics Engine

**What people do:** "I'll just use Rapier so collisions are robust."
**Why it's wrong:** A 3-lane runner is not a physics problem. Rapier ships ~600KB of WASM, requires syncing two scene graphs, introduces non-determinism, and produces *worse* feel because scripted movement is what makes runners feel tight. See STACK.md Q5.
**Do this instead:** AABB checks against ~10 nearby obstacles per frame. 30 lines of code (Pattern in `game/collision.js`).

### Anti-Pattern 5: Drawing the HUD on the Canvas

**What people do:** Render score and buttons via `THREE.Sprite` or canvas2d-textured planes.
**Why it's wrong:** You give up CSS, accessibility, free hit-testing, brand fonts, hover states, and crisp text at any DPR. You gain nothing because the HUD doesn't need to be in 3D space.
**Do this instead:** DOM overlay with absolute positioning (Pattern 9). The canvas is full-window beneath; the HUD is HTML on top.

### Anti-Pattern 6: Importing a State Library

**What people do:** Install Zustand "for cleanliness" or XState "for the FSM." For a project with 4 game phases and 4 player states.
**Why it's wrong:** Library overhead exceeds the entire complexity of what you're modeling. The first time you need to debug a transition, the abstraction is harder to read than `switch(state)`.
**Do this instead:** Singleton object in `state.js`, switch statements in tick functions. See Patterns 2 and 7 in STACK.md.

### Anti-Pattern 7: Coupling AnimationMixer to the Game Loop Directly

**What people do:** Call `mixer.update(dt)` from `loop.js` because "animations are an engine concern."
**Why it's wrong:** The mixer needs to update with the same dt the player FSM uses. Putting it in the loop means the loop has to know about the player. Worse, if you ever pause the player but not the engine, animations keep playing while the game doesn't.
**Do this instead:** `player.tick(dt)` calls `this.mixer.update(dt)` itself. The mixer is a private detail of the player module.

### Anti-Pattern 8: Loading Assets Lazily for "Faster First Paint"

**What people do:** Show the menu instantly, then stream assets in the background, then handle "mid-game asset not ready yet" with placeholders.
**Why it's wrong:** Adds significant complexity for a 2MB total asset budget. A 2-second progress bar feels honest; a stutter at second 15 feels broken. The "first paint" gain is measured in hundreds of ms; the engineering cost is measured in days.
**Do this instead:** Preload everything before the menu becomes interactive. Show a progress bar (Phase V).

### Anti-Pattern 9: WebGPURenderer in 2026

**What people do:** "WebGPU is the future, let's start there."
**Why it's wrong:** Mobile Safari WebGPU support is incomplete in 2026, mobile Chrome support has gaps, and the visual win for low-poly cartoon rendering is zero. A non-trivial fraction of saynine.ai visitors would see a black canvas.
**Do this instead:** `WebGLRenderer`. WebGPU is a v3+ consideration.

### Anti-Pattern 10: Single-File Everything

**What people do:** Put the entire game in `main.js` "to avoid module boilerplate."
**Why it's wrong:** Day 1 fine, day 8 unmaintainable. By the time you need to find the lane-switch tween, it's lost in 2000 lines of mixed concerns.
**Do this instead:** The 8-module structure above. Each file fits in 200 lines. The whole codebase fits in your head.

---

## Integration Points

### External Services (v1)

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Cloudflare Pages | git push deploy from main branch | Auto-builds via Vite, serves `dist/`. Free. |
| saynine.ai (WordPress) | Iframe shortcode `[saynine-runner]` → `<iframe src="https://play.saynine.ai/">` | Per STACK.md hosting recommendation. Single-domain UX without WP fighting Vite's hashed filenames. |
| Twitter / LinkedIn share | Intent URLs (`https://twitter.com/intent/tweet?text=...`) | No SDK needed. Two `<a>` tags. |
| localStorage | Direct API in `util/leaderboard.js` | Stub for v1 leaderboard; key `saynine-xtreme-scores`. |

### External Services (v2, out of scope but architecture supports)

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Real leaderboard backend | Cloudflare Worker + KV/D1, called from `util/leaderboard.js` | Replace localStorage funcs with `fetch`; nothing else changes. |
| Email capture | Same Worker or third-party form endpoint | Optional field on game-over screen, never blocks play. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `loop.js` ↔ `controller.js` | `loop.start(controller.tick, render)` | Loop knows nothing about phases or player. |
| `controller.js` ↔ `game/*` | Direct function calls (`player.tick`, `world.tick`, `collision.check`) | Sequential each tick, deterministic order. |
| `game/*` ↔ `state.js` | Direct read/write of singleton fields | Game owns state mutation. |
| `ui/*` ↔ `state.js` | Read-only via polling each render | UI never writes state. |
| `ui/*` ↔ `controller.js` | UI calls `controller.startGame()` etc. | The only way for UI to affect game. |
| `game/*` ↔ `engine/audio.js` | Direct `sfx('jump')` calls in FSM transitions | Tight enough; audio is a side-channel. |
| `engine/input.js` ↔ `game/*` | Game reads `input` object each tick; loop calls `clearEdges()` after | Edge-vs-level distinction lives in input.js. |

---

## Sources

- **Three.js manual — animation system** — `https://threejs.org/manual/#en/animation-system` (HIGH, AnimationMixer pitfalls)
- **Three.js examples — InstancedMesh** — `https://threejs.org/examples/?q=instanc` (HIGH, the right pattern for coin pools)
- **Glenn Fiedler — Fix Your Timestep** — `https://gafferongames.com/post/fix_your_timestep/` (HIGH, the canonical reference for fixed-step game loops; the architecture in Pattern 1 is the "free physics delta time" variant from this article)
- **MDN Pointer Events** — `https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events` (HIGH)
- **MDN Page Visibility API** — `https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API` (HIGH, for auto-pause)
- **Howler.js docs — mobile/iOS gotchas** — `https://github.com/goldfire/howler.js#mobilechrome-playback` (HIGH)
- **Vite — static deploy guide** — `https://vitejs.dev/guide/static-deploy.html` (HIGH)
- **STACK.md** (this project) — for stack-level decisions referenced throughout
- **PROJECT.md** (this project) — for constraints, brand, timeline

**Confidence notes:**
- HIGH on the architectural shape, module boundaries, fixed-step loop, pooling, FSM-without-libraries, AABB-without-physics, and DOM-HUD recommendations. These are stable Three.js community consensus that has not shifted in years.
- MEDIUM on exact AnimationMixer clip naming and cross-fade durations — these depend on the artist's GLB export; values in this doc are starting points to refine in Phase VII.
- HIGH on the build order — the dependency graph is forced by the data flow, not a stylistic choice.

---

*Architecture research for: SayNine Xtreme — browser-based 3D endless runner*
*Researched: 2026-04-08*
