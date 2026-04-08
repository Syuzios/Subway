---
phase: 01-engine-feel
plan: D
type: execute
wave: 3
depends_on: [B, C]
files_modified:
  - src/game/player.js
  - src/util/math.js
  - src/main.js
autonomous: true
requirements: [LOOP-02, LOOP-03, LOOP-04]

must_haves:
  truths:
    - "Pressing left (arrow/A/swipe-left) from center moves capsule to left lane over ~150ms"
    - "Pressing right (arrow/D/swipe-right) from center moves capsule to right lane over ~150ms"
    - "Pressing left again from left lane is a no-op (cannot go past lane 0)"
    - "Pressing jump (space/arrow-up/W/swipe-up) while running triggers an arc reaching peak ~1.8 units at mid-air, total air time ~800ms, then lands"
    - "Pressing slide (down/S/swipe-down) while running triggers slide state lasting ~600ms, capsule visibly lowered during slide"
    - "Jump while jumping is a no-op (no double jump)"
    - "Slide while sliding is a no-op"
    - "Capsule cannot jump while sliding and vice versa"
    - "Lane switch tween is smooth (exponential damp or eased lerp), not a hard snap"
    - "endFrame() called after each tick so edge-triggered actions only fire once per press"
    - "Capsule moves forward continuously at PLAYER_RUN_SPEED"
    - "Camera follows the capsule's z-position so it always appears in frame"
  artifacts:
    - path: "src/util/math.js"
      provides: "damp(), clamp(), lerp() helpers"
      contains: "export function damp"
    - path: "src/game/player.js"
      provides: "Player FSM (run/jump/slide/dead) with lane tween, jump arc, slide timer"
      contains: "state === 'jump'"
    - path: "src/main.js"
      provides: "Wires initInput + endFrame + camera follow into the loop"
      contains: "initInput"
  key_links:
    - from: "src/main.js"
      to: "src/input/input.js"
      pattern: "from\\s+['\\\"]\\./input/input\\.js['\\\"]"
    - from: "src/game/player.js"
      to: "input.leftPressed / input.rightPressed / input.jumpPressed / input.slidePressed"
      pattern: "(jumpPressed|slidePressed|leftPressed|rightPressed)"
    - from: "src/main.js"
      to: "endFrame()"
      pattern: "endFrame\\("
---

<objective>
Make the capsule FEEL good. Implement the Player state machine (running / jumping / sliding / dead stub) with lane-switch tween (~150ms), jump arc (~800ms air time, ~1.8 units peak), and slide (~600ms with visible capsule squash). Wire input into main.js and add a camera follow so the capsule stays in view while running forward. Call endFrame() after each tick.

Purpose: Deliver LOOP-02, LOOP-03, LOOP-04 as tight, responsive game feel. This is the Phase 1 heart. Plan E will verify it on a real phone.

Output: A browser session where you can press keys or swipe on the canvas and watch the capsule lane-switch, jump, and slide smoothly. Camera stays behind the player as the world rolls past.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@src/config.js
@src/game/player.js
@src/engine/engine.js
@src/engine/loop.js
@src/input/input.js
@src/main.js
</context>

<interfaces>
From `src/config.js`:
- LANE_X = [-2, 0, 2]
- LANE_SWITCH_MS = 150
- JUMP_AIR_MS = 800, JUMP_PEAK_Y = 1.8
- SLIDE_MS = 600
- PLAYER_RUN_SPEED = 12
- CAPSULE_HEIGHT, CAPSULE_RADIUS

From `src/input/input.js`:
- `input` object with `leftPressed`, `rightPressed`, `jumpPressed`, `slidePressed`
- `initInput(canvas)`
- `endFrame()` — MUST be called after each tick

Player tick contract (implemented here):
- `player.tick(dt)` reads the shared `input` object and updates `player.mesh.position` / `player.mesh.scale.y` / `player.state` / `player.lane`

Jump arc math:
- Total air time T = JUMP_AIR_MS / 1000 = 0.8s
- Peak height H = 1.8
- Use projectile motion solved for constant gravity:
    g = 8 * H / (T * T)     → g ≈ 22.5 u/s²
    v0 = g * T / 2          → v0 ≈ 9.0 u/s
- Land when y <= 0 AND state === 'jump' → reset to 'run'
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Math helpers + Player FSM (lane tween, jump arc, slide)</name>
  <files>src/util/math.js, src/game/player.js</files>
  <action>
1. Create `src/util/math.js`:
   ```js
   /**
    * Math helpers used across engine and game. Keep these dependency-free.
    */
   export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
   export const lerp = (a, b, t) => a + (b - a) * t;

   /**
    * Frame-rate-independent exponential damping toward a target.
    * `lambda` is how fast (higher = snappier). `lambda = 18` with dt=1/60
    * converges most of the way in ~150ms — exactly our LANE_SWITCH_MS target.
    *
    * Reference: Robert Penner / Freya Holmer ("Damp" lecture).
    */
   export const damp = (current, target, lambda, dt) =>
     lerp(current, target, 1 - Math.exp(-lambda * dt));
   ```
2. Rewrite `src/game/player.js` to implement the full FSM. This replaces the Plan B stub:
   ```js
   import * as THREE from 'three';
   import {
     CAPSULE_HEIGHT, CAPSULE_RADIUS, CAPSULE_COLOR, LANE_X,
     JUMP_AIR_MS, JUMP_PEAK_Y, SLIDE_MS, PLAYER_RUN_SPEED,
   } from '../config.js';
   import { damp, clamp } from '../util/math.js';

   // Jump physics: given total air time T and peak height H with gravity g constant:
   //   H = g*T^2 / 8   → g = 8H / T^2
   //   v0 = g*T / 2
   const T = JUMP_AIR_MS / 1000;        // 0.8s
   const H = JUMP_PEAK_Y;                // 1.8
   const GRAVITY = 8 * H / (T * T);      // ~22.5 u/s^2
   const JUMP_V0 = GRAVITY * T / 2;      // ~9.0 u/s
   const LANE_DAMP_LAMBDA = 18;          // ~150ms to near-target with dt=1/60

   export function createPlayer() {
     const geo = new THREE.CapsuleGeometry(
       CAPSULE_RADIUS,
       CAPSULE_HEIGHT - 2 * CAPSULE_RADIUS,
       8, 16
     );
     const mat = new THREE.MeshStandardMaterial({ color: CAPSULE_COLOR, roughness: 0.55 });
     const mesh = new THREE.Mesh(geo, mat);
     const standingY = CAPSULE_HEIGHT / 2;
     mesh.position.set(LANE_X[1], standingY, 0);

     const p = {
       mesh,
       lane: 1,            // 0 | 1 | 2
       targetX: LANE_X[1],
       y: 0,               // height above ground (added to standingY for mesh)
       vy: 0,
       zSpeed: PLAYER_RUN_SPEED,
       state: 'run',       // 'run' | 'jump' | 'slide' | 'dead'
       slideTimer: 0,
       tick(dt, input) {
         // -----------------------------
         // Lane switching (LOOP-02) — edge-triggered, no lane change while dead.
         // Allowed during run/jump/slide so air-lane-switch feels responsive.
         // -----------------------------
         if (p.state !== 'dead') {
           if (input.leftPressed && p.lane > 0) {
             p.lane -= 1;
             p.targetX = LANE_X[p.lane];
           }
           if (input.rightPressed && p.lane < 2) {
             p.lane += 1;
             p.targetX = LANE_X[p.lane];
           }
         }
         // Smoothly damp x toward targetX (~150ms to converge).
         mesh.position.x = damp(mesh.position.x, p.targetX, LANE_DAMP_LAMBDA, dt);

         // -----------------------------
         // Jump (LOOP-03) — only from 'run' state. No double-jump. No jump during slide.
         // -----------------------------
         if (input.jumpPressed && p.state === 'run') {
           p.state = 'jump';
           p.vy = JUMP_V0;
         }

         // -----------------------------
         // Slide (LOOP-04) — only from 'run' state. ~600ms duration.
         // -----------------------------
         if (input.slidePressed && p.state === 'run') {
           p.state = 'slide';
           p.slideTimer = SLIDE_MS / 1000;
         }

         // -----------------------------
         // State updates
         // -----------------------------
         if (p.state === 'jump') {
           p.vy -= GRAVITY * dt;
           p.y += p.vy * dt;
           if (p.y <= 0) {
             p.y = 0;
             p.vy = 0;
             p.state = 'run';
           }
         } else if (p.state === 'slide') {
           p.slideTimer -= dt;
           if (p.slideTimer <= 0) {
             p.slideTimer = 0;
             p.state = 'run';
           }
         }

         // -----------------------------
         // Apply visual transform
         // -----------------------------
         // y: ground-anchor + physics y.
         mesh.position.y = standingY + p.y;

         // Slide scale: squash to ~50% height so the capsule visibly ducks.
         const targetScaleY = p.state === 'slide' ? 0.5 : 1.0;
         mesh.scale.y = damp(mesh.scale.y, targetScaleY, 24, dt);
         // Lower mesh when squashed so bottom stays on ground.
         if (p.state === 'slide') {
           mesh.position.y = standingY * 0.5 + p.y;
         }

         // Forward motion — capsule always runs in -z.
         mesh.position.z -= p.zSpeed * dt;
       },
     };
     return p;
   }
   ```
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const m=fs.readFileSync('src/util/math.js','utf8');if(!/export\\s+const\\s+damp/.test(m)){console.error('FAIL math.js damp');process.exit(1)}const p=fs.readFileSync('src/game/player.js','utf8');const req=[/GRAVITY/,/JUMP_V0/,/leftPressed/,/rightPressed/,/jumpPressed/,/slidePressed/,/state\\s*===\\s*'run'/,/state\\s*===\\s*'jump'/,/state\\s*===\\s*'slide'/,/damp\\(/];for(const r of req){if(!r.test(p)){console.error('FAIL player.js',r);process.exit(1)}}console.log('OK player + math')"</automated>
  </verify>
  <done>
- `src/util/math.js` exports `damp`, `lerp`, `clamp`
- `src/game/player.js` implements FSM with lane switching, jump arc (v0/gravity derived from JUMP_AIR_MS and JUMP_PEAK_Y), slide timer, squash scale
- Jump gated to 'run' state only (no double jump, no jump-from-slide)
- Lane switches work mid-air and mid-slide
- Capsule moves forward continuously in -z
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire input into main.js, call endFrame, add camera follow</name>
  <files>src/main.js</files>
  <action>
Rewrite `src/main.js` to wire input, call `endFrame()` after each tick, and follow the camera to the player's z-position so the capsule stays visible as it runs forward:
```js
import * as THREE from 'three';
import { createRenderer, createScene, createCamera, attachResize } from './engine/engine.js';
import { startLoop } from './engine/loop.js';
import { buildFlatGround } from './game/world.js';
import { createPlayer } from './game/player.js';
import { initInput, input, endFrame } from './input/input.js';
import { damp } from './util/math.js';

function boot() {
  const canvas = document.getElementById('game');
  if (!canvas) throw new Error('[saynine] #game canvas not found');

  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();
  attachResize(renderer, camera);

  buildFlatGround(scene);

  const player = createPlayer();
  scene.add(player.mesh);

  // Cache initial camera offset relative to player for follow-cam.
  const camOffset = new THREE.Vector3().copy(camera.position); // (0, 3.2, 6.5)

  // Input — game code ONLY reads the shared `input` object from input.js.
  initInput(canvas);

  // PERF-06 pre-compile before first frame.
  renderer.compile(scene, camera);

  const tick = (dt) => {
    player.tick(dt, input);
    endFrame();  // clear edge-triggered flags after each tick (INPUT-04 contract)
  };

  const render = () => {
    // Follow-cam: camera.z tracks player.z + offset.z, with gentle damping on x.
    const targetX = player.mesh.position.x * 0.35; // slight lateral follow on lane change
    camera.position.x = damp(camera.position.x, targetX, 8, 1 / 60);
    camera.position.y = camOffset.y;
    camera.position.z = player.mesh.position.z + camOffset.z;
    camera.lookAt(
      player.mesh.position.x * 0.5,
      1.0,
      player.mesh.position.z - 4
    );
    renderer.render(scene, camera);
  };

  startLoop(tick, render);

  if (typeof window !== 'undefined') {
    window.__saynine = { renderer, scene, camera, player, input };
  }
  console.log('[saynine] boot complete — player feel ready');
}

boot();
```

After writing, run `npm run dev` and manually verify on desktop:
- Orange capsule runs forward (scenery rolls past; use the fog to confirm depth).
- Left arrow / A → moves to left lane smoothly over ~150ms.
- Right arrow / D → moves to right lane smoothly over ~150ms.
- Space / Up / W → jump arc, lands cleanly after ~800ms.
- Down / S → slide, capsule squashes to ~50% for ~600ms then returns.
- Holding left does NOT skip through lanes — only one step per press.
- Mouse drag on the canvas (simulating touch) triggers the matching action.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const m=fs.readFileSync('src/main.js','utf8');const req=[/initInput/,/endFrame\\(\\)/,/player\\.tick/,/camera\\.lookAt/,/buildFlatGround/];for(const r of req){if(!r.test(m)){console.error('FAIL main.js',r);process.exit(1)}}const g=fs.readFileSync('src/game/player.js','utf8');if(/window\\.addEventListener/.test(g)){console.error('FAIL: player.js touches raw events (INPUT-04 violation)');process.exit(1)}console.log('OK main.js wired, player.js respects input abstraction')"</automated>
  </verify>
  <done>
- `src/main.js` calls `initInput(canvas)` once at boot
- `tick()` calls `player.tick(dt, input)` then `endFrame()`
- Camera follows player z continuously with a subtle x-damping for lane-change feel
- Desktop manual test passes all 7 checks above
- `grep -r "addEventListener" src/game/` returns zero matches (INPUT-04 abstraction preserved)
  </done>
</task>

</tasks>

<success_criteria>
- All three feel targets visibly met on desktop: ~150ms lane tween, ~800ms jump arc peaking at ~1.8 units, ~600ms slide squash.
- Edge-triggered actions (press once, act once) work correctly — no lane-skipping on held keys.
- Lane switching is allowed mid-jump and mid-slide (feels more responsive; matches Subway Surfers convention).
- No raw event handlers in `src/game/` — grep confirms INPUT-04 is honored.
- Camera follows the running capsule without drift or jitter.
</success_criteria>

<output>
After completion, create `.planning/phases/01-engine-feel/01-D-SUMMARY.md` with: measured feel values from manual desktop testing (how did 150ms feel? too fast? too slow?), any config tuning applied, and open questions for the Plan E real-device test.
</output>
