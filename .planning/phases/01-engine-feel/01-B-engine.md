---
phase: 01-engine-feel
plan: B
type: execute
wave: 2
depends_on: [A]
files_modified:
  - src/engine/engine.js
  - src/engine/loop.js
  - src/main.js
  - src/game/player.js
autonomous: true
requirements: [PERF-05, PERF-06, PERF-07, PERF-08, PLAYER-03]

must_haves:
  truths:
    - "WebGLRenderer constructed with SRGBColorSpace output"
    - "devicePixelRatio capped at 2 via setPixelRatio"
    - "renderer.compile(scene, camera) called once before starting loop"
    - "Fixed-step accumulator loop runs at 1/60s step"
    - "Delta time clamped to ≤ 1/30s before being fed to accumulator"
    - "Window resize updates camera aspect and renderer size"
    - "A coloured capsule is visible on a flat ground plane"
    - "Scene has a directional light + ambient so the capsule is shaded, not flat"
  artifacts:
    - path: "src/engine/engine.js"
      provides: "Renderer, scene, camera, lights, capsule, resize handler"
      contains: "SRGBColorSpace"
    - path: "src/engine/loop.js"
      provides: "Fixed-step accumulator with delta cap"
      contains: "MAX_DELTA"
    - path: "src/main.js"
      provides: "Boot: create engine → create capsule player stub → renderer.compile → start loop"
  key_links:
    - from: "src/engine/engine.js"
      to: "THREE.WebGLRenderer"
      pattern: "outputColorSpace\\s*=\\s*THREE\\.SRGBColorSpace"
    - from: "src/engine/engine.js"
      to: "THREE.WebGLRenderer.setPixelRatio"
      pattern: "setPixelRatio\\(Math\\.min\\(window\\.devicePixelRatio,\\s*2\\)\\)"
    - from: "src/engine/loop.js"
      to: "delta clamping"
      pattern: "Math\\.min\\(.*1\\s*/\\s*30"
    - from: "src/main.js"
      to: "renderer.compile"
      pattern: "\\.compile\\("
---

<objective>
Build the engine core: WebGLRenderer with correct color space and DPR cap, PerspectiveCamera, scene + lights, fixed-step game loop with delta cap, resize handling, pre-compile, and a placeholder capsule Ninty on a flat ground. Wire it all together in `src/main.js` so `npm run dev` shows a visible orange capsule standing on green ground at 60fps.

Purpose: Deliver PERF-05/06/07/08 + PLAYER-03 as the visual substrate on which Plan C (input) and Plan D (feel) will operate. This plan does NOT move the capsule, jump, slide, or switch lanes — that is Plan D. This plan simply proves the engine is alive and correctly configured.

Output: A browser tab showing a static orange capsule on a green ground at 60fps on desktop.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@src/config.js
@src/game/world.js
@src/engine/pool.js
@src/engine/assets.js
</context>

<interfaces>
Types/constants to import from src/config.js:
- LANE_X (array of 3 lane x-positions)
- CAPSULE_HEIGHT, CAPSULE_RADIUS, CAPSULE_COLOR
- GROUND_COLOR, SKY_COLOR
- FIXED_STEP, MAX_DELTA, DPR_MAX

From src/game/world.js:
- buildFlatGround(scene) → THREE.Mesh (already exists from Plan A)
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Engine core — renderer, scene, camera, lights, resize, capsule</name>
  <files>src/engine/engine.js, src/game/player.js</files>
  <action>
1. Create `src/engine/engine.js`:
   ```js
   import * as THREE from 'three';
   import { DPR_MAX, SKY_COLOR } from '../config.js';

   /**
    * Create and configure the Three.js renderer.
    * - SRGBColorSpace (PERF-06): mandatory, otherwise colors look washed out.
    * - DPR capped at 2 (PERF-06): keeps fragment shader cost sane on high-DPI phones.
    * - antialias: true on desktop; Phase 5 may disable on mobile for perf.
    */
   export function createRenderer(canvas) {
     const renderer = new THREE.WebGLRenderer({
       canvas,
       antialias: true,
       powerPreference: 'high-performance',
     });
     renderer.outputColorSpace = THREE.SRGBColorSpace;
     renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_MAX));
     renderer.setSize(window.innerWidth, window.innerHeight, false);
     renderer.setClearColor(SKY_COLOR, 1.0);
     return renderer;
   }

   export function createScene() {
     const scene = new THREE.Scene();
     scene.background = new THREE.Color(SKY_COLOR);
     scene.fog = new THREE.Fog(SKY_COLOR, 40, 140);

     const ambient = new THREE.AmbientLight(0xffffff, 0.55);
     scene.add(ambient);

     const sun = new THREE.DirectionalLight(0xffffff, 1.4);
     sun.position.set(6, 12, 4);
     scene.add(sun);

     return scene;
   }

   export function createCamera() {
     const camera = new THREE.PerspectiveCamera(
       60,
       window.innerWidth / window.innerHeight,
       0.1,
       500
     );
     // Follow-cam offset behind and above the player.
     camera.position.set(0, 3.2, 6.5);
     camera.lookAt(0, 1.0, 0);
     return camera;
   }

   /**
    * Install a window resize handler that keeps camera aspect and renderer size in sync.
    * Called once at boot.
    */
   export function attachResize(renderer, camera) {
     const onResize = () => {
       const w = window.innerWidth;
       const h = window.innerHeight;
       camera.aspect = w / h;
       camera.updateProjectionMatrix();
       renderer.setSize(w, h, false);
       renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_MAX));
     };
     window.addEventListener('resize', onResize);
     return onResize;
   }
   ```
2. Create `src/game/player.js` as a minimal capsule stub. Plan D will extend this with FSM and feel. For now it only exposes a THREE.Mesh and a `tick(dt, input)` that does nothing yet:
   ```js
   import * as THREE from 'three';
   import {
     CAPSULE_HEIGHT, CAPSULE_RADIUS, CAPSULE_COLOR, LANE_X,
   } from '../config.js';

   /**
    * Placeholder Ninty (PLAYER-03): a coloured capsule used as development fallback
    * until the real rigged GLB lands in Phase 2. Loader code in src/engine/assets.js
    * already accepts a real GLB path; Phase 1 just doesn't call it.
    */
   export function createPlayer() {
     const geo = new THREE.CapsuleGeometry(CAPSULE_RADIUS, CAPSULE_HEIGHT - 2 * CAPSULE_RADIUS, 8, 16);
     const mat = new THREE.MeshStandardMaterial({ color: CAPSULE_COLOR, roughness: 0.55 });
     const mesh = new THREE.Mesh(geo, mat);
     mesh.position.set(LANE_X[1], CAPSULE_HEIGHT / 2, 0);

     return {
       mesh,
       // Plan D fills these in:
       lane: 1,          // 0 | 1 | 2 (center default)
       targetX: LANE_X[1],
       y: 0,
       vy: 0,
       state: 'run',     // 'run' | 'jump' | 'slide' | 'dead'
       stateTimer: 0,
       tick(dt, input) {
         // Plan D will implement lane-switch tween, jump arc, slide.
         // Phase 1 Plan B: intentionally a no-op so the capsule is visible but static.
       },
     };
   }
   ```
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const e=fs.readFileSync('src/engine/engine.js','utf8');const checks=[/SRGBColorSpace/,/setPixelRatio\\(Math\\.min\\(window\\.devicePixelRatio/,/addEventListener\\(\\s*['\\\"]resize/,/PerspectiveCamera/];for(const c of checks){if(!c.test(e)){console.error('FAIL engine.js missing:',c);process.exit(1)}}const p=fs.readFileSync('src/game/player.js','utf8');if(!/CapsuleGeometry/.test(p)){console.error('FAIL player.js missing CapsuleGeometry');process.exit(1)}console.log('OK engine.js and player.js well-formed')"</automated>
  </verify>
  <done>
- `src/engine/engine.js` exports `createRenderer`, `createScene`, `createCamera`, `attachResize`
- Renderer uses `THREE.SRGBColorSpace` and caps DPR at 2
- Resize handler updates both camera aspect and renderer size
- `src/game/player.js` exports `createPlayer()` returning `{ mesh, tick, lane, ... }` with a capsule mesh placed on lane 1 standing on y=0 ground
  </done>
</task>

<task type="auto">
  <name>Task 2: Fixed-step loop + main.js boot wiring</name>
  <files>src/engine/loop.js, src/main.js</files>
  <action>
1. Create `src/engine/loop.js` implementing the fixed-step accumulator (PERF-05):
   ```js
   import { FIXED_STEP, MAX_DELTA } from '../config.js';

   /**
    * Fixed-step game loop. Accumulates wall-clock delta and runs `tick(FIXED_STEP)` as
    * many times as needed per rAF frame, then calls `render()` once.
    *
    * Why fixed step (PERF-05):
    * - Collision detection at variable dt is the #1 source of "I clearly dodged that and
    *   still died" bugs in runners.
    * - Mobile rAF can spike from 16ms to 50ms when the user gets a notification; without
    *   an accumulator the player teleports through obstacles ("tunnel through").
    * - Delta is clamped to MAX_DELTA (1/30s) so that after a tab-backgrounding we don't
    *   execute hundreds of ticks in a row ("spiral of death").
    */
   export function startLoop(tick, render) {
     let last = performance.now() / 1000;
     let acc = 0;
     let running = true;

     const frame = (nowMs) => {
       if (!running) return;
       const now = nowMs / 1000;
       let dt = now - last;
       last = now;
       if (dt > MAX_DELTA) dt = MAX_DELTA;  // PERF-05 clamp
       acc += dt;
       // Run a bounded number of ticks per frame as an extra safety net.
       let safety = 8;
       while (acc >= FIXED_STEP && safety-- > 0) {
         tick(FIXED_STEP);
         acc -= FIXED_STEP;
       }
       render();
       requestAnimationFrame(frame);
     };
     requestAnimationFrame(frame);

     return () => { running = false; };
   }
   ```
2. Replace the stub `src/main.js` with the real boot sequence:
   ```js
   import * as THREE from 'three';
   import { createRenderer, createScene, createCamera, attachResize } from './engine/engine.js';
   import { startLoop } from './engine/loop.js';
   import { buildFlatGround } from './game/world.js';
   import { createPlayer } from './game/player.js';

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

     // PERF-06: pre-compile shaders for everything currently in the scene before the
     // first real frame. Prevents the first frame spike when a new material is first
     // seen by the renderer.
     renderer.compile(scene, camera);

     // Input module will be wired in by Plan C. For now pass an empty object.
     const input = { left: false, right: false, jumpPressed: false, slidePressed: false };

     const tick = (dt) => {
       player.tick(dt, input);
     };
     const render = () => {
       renderer.render(scene, camera);
     };

     startLoop(tick, render);

     // Expose for debugging from devtools.
     if (typeof window !== 'undefined') {
       window.__saynine = { renderer, scene, camera, player };
     }

     console.log('[saynine] engine booted');
   }

   boot();
   ```
3. Run `npm run dev` and confirm: the browser tab shows a sky-blue background, a green ground plane stretching into the distance, and an orange capsule standing in the center lane. Check devtools: no console errors. Check FPS via browser performance tools: steady 60fps on desktop.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const l=fs.readFileSync('src/engine/loop.js','utf8');if(!/FIXED_STEP/.test(l)||!/MAX_DELTA/.test(l)||!/while\\s*\\(acc/.test(l)){console.error('FAIL loop.js');process.exit(1)}const m=fs.readFileSync('src/main.js','utf8');if(!/renderer\\.compile/.test(m)||!/startLoop/.test(m)||!/createPlayer/.test(m)){console.error('FAIL main.js');process.exit(1)}console.log('OK loop and main wired')"</automated>
  </verify>
  <done>
- `src/engine/loop.js` implements fixed-step accumulator with MAX_DELTA clamp and bounded inner-loop safety counter
- `src/main.js` creates renderer + scene + camera + ground + capsule, calls `renderer.compile(scene, camera)` BEFORE starting the loop, and calls `startLoop(tick, render)`
- `npm run dev` shows orange capsule on green ground at 60fps desktop (verified manually in browser)
- No console errors at boot
  </done>
</task>

</tasks>

<success_criteria>
- Running `npm run dev` displays a static orange capsule standing on a green ground plane under a sky-blue background at 60fps on desktop.
- Renderer uses `SRGBColorSpace`, DPR capped at 2, resize handler wired, `renderer.compile()` called before first frame.
- Loop is fixed-step at 1/60s with delta clamped to 1/30s.
- No runtime errors; `window.__saynine` exposes renderer/scene/camera/player for devtools debugging.
</success_criteria>

<output>
After completion, create `.planning/phases/01-engine-feel/01-B-SUMMARY.md` listing files created, the exact PerspectiveCamera settings chosen, and any engine-side tuning decisions that may affect feel in Plan D.
</output>
