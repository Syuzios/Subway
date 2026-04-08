---
phase: 01-engine-feel
plan: A
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - vite.config.js
  - index.html
  - .gitignore
  - README.md
  - src/main.js
  - src/config.js
  - src/state/state.js
  - src/ui/hud.js
  - src/engine/pool.js
  - src/engine/assets.js
  - src/game/world.js
  - tools/optimize-glb.mjs
autonomous: true
requirements: [ASSET-03, ASSET-04, ASSET-05, DEPLOY-01, DEPLOY-02, PERF-07, PERF-08]

must_haves:
  truths:
    - "npm install succeeds with three pinned to exact version (no caret)"
    - "npm run dev starts Vite dev server on localhost without errors"
    - "npm run build produces dist/ with relative asset paths"
    - "npm run optimize-glb is wired and documented in README"
    - ".gitignore excludes raw assets/ *.glb but commits assets/optimized/"
    - "README documents three pin rationale (non-semver) and gltf-transform usage"
    - "index.html has canvas + HUD overlay div + touch-action:none CSS"
    - "Project module skeleton exists (engine/, game/, input/, state/, ui/)"
  artifacts:
    - path: "package.json"
      contains: "\"three\": \"0."
    - path: "vite.config.js"
      contains: "base: './'"
    - path: "index.html"
      contains: "touch-action"
    - path: "README.md"
      contains: "gltf-transform"
    - path: "src/engine/pool.js"
      provides: "Generic Pool class scaffolded (used in Phase 2)"
    - path: "src/engine/assets.js"
      provides: "GLB loader scaffold using SkeletonUtils.clone pattern"
    - path: "tools/optimize-glb.mjs"
      provides: "gltf-transform wrapper script"
  key_links:
    - from: "package.json scripts"
      to: "tools/optimize-glb.mjs"
      pattern: "optimize-glb"
    - from: "index.html"
      to: "src/main.js"
      pattern: "src/main\\.js"
---

<objective>
Establish the full project scaffold: Vite project, exact-pinned Three.js, module directory skeleton, `index.html` with canvas + HUD overlay, gltf-transform tooling wired into scripts, README with setup + build + three-pin rationale.

Purpose: Unblock every subsequent Phase 1 plan. Bake in DEPLOY-01/02 constraints from day 1. Scaffold empty modules (pool, assets, state, hud, world stub) so later plans drop code into existing files instead of creating the structure.

Output: A runnable `npm run dev` showing a blank page (or a solid-color canvas), a passing `npm run build`, and a documented asset-optimization pipeline.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Initialize Vite project, pin three exact, wire gltf-transform</name>
  <files>package.json, package-lock.json, vite.config.js, .gitignore, tools/optimize-glb.mjs</files>
  <action>
1. Run `npm init -y` in the project root (C:\Users\ASUS\Desktop\subway) if package.json does not already exist. If it does, edit in place.
2. Resolve the exact current stable version of `three` via `npm view three version` and record it. Install it EXACTLY (no caret): `npm install three@<version> --save-exact`. Three.js does NOT follow semver (per STACK.md / ASSET-05); the save-exact flag is mandatory.
3. Install Vite as a dev dependency: `npm install -D vite`.
4. Install gltf-transform CLI as a dev dependency: `npm install -D @gltf-transform/cli`.
5. Edit package.json to set:
   - `"type": "module"`
   - `"scripts"`:
     - `"dev": "vite"`
     - `"build": "vite build"`
     - `"preview": "vite preview"`
     - `"optimize-glb": "node tools/optimize-glb.mjs"`
6. Create `vite.config.js` at project root with:
   ```js
   import { defineConfig } from 'vite';
   export default defineConfig({
     base: './',
     build: {
       target: 'es2020',
       assetsInlineLimit: 0,
       outDir: 'dist',
     },
     server: {
       host: true, // expose on LAN for mobile device testing
     },
   });
   ```
   The `base: './'` is REQUIRED by DEPLOY-02. `host: true` is required so Plan E can reach the dev server from a real Android phone on the same Wi-Fi.
7. Create/update `.gitignore` to include: `node_modules/`, `dist/`, `assets/*.glb`, `assets/*.fbx`, `!assets/optimized/`, `.DS_Store`, `*.log`.
8. Create `tools/optimize-glb.mjs` as a minimal wrapper:
   ```js
   #!/usr/bin/env node
   // Thin wrapper documenting the canonical optimize pipeline.
   // Usage: node tools/optimize-glb.mjs <input.glb> <output.glb>
   // Under the hood this calls gltf-transform optimize with meshopt compression
   // and KTX2 texture encoding, per STACK.md guidance.
   import { spawnSync } from 'node:child_process';
   const [,, input, output] = process.argv;
   if (!input || !output) {
     console.error('Usage: node tools/optimize-glb.mjs <input.glb> <output.glb>');
     process.exit(1);
   }
   const result = spawnSync('npx', [
     'gltf-transform', 'optimize', input, output,
     '--texture-compress', 'webp',
     '--compress', 'meshopt',
   ], { stdio: 'inherit', shell: true });
   process.exit(result.status ?? 1);
   ```
   Note: use `webp` for texture compression in the wrapper (more compatible than KTX2 for initial wiring; can be upgraded to ktx2 in Phase 2 when real assets arrive). Document in README that the flag is tunable.
9. Verify `package.json` "three" field has NO caret, e.g. `"three": "0.171.0"` not `"^0.171.0"`.
  </action>
  <verify>
    <automated>node -e "const p=require('./package.json'); const v=p.dependencies.three; if(!v||v.startsWith('^')||v.startsWith('~')){console.error('FAIL: three not exact-pinned:',v);process.exit(1)} console.log('OK three pinned:',v)"</automated>
  </verify>
  <done>
- `package.json` has `three` pinned EXACT (no caret/tilde)
- `npm run dev` starts Vite without errors (will serve blank page — OK)
- `npm run build` produces `dist/` folder
- `npm run optimize-glb` prints usage when called with no args
- `.gitignore` excludes raw glbs but allows `assets/optimized/`
  </done>
</task>

<task type="auto">
  <name>Task 2: Create index.html, module skeleton, stub files, config, README</name>
  <files>index.html, src/main.js, src/config.js, src/state/state.js, src/ui/hud.js, src/engine/pool.js, src/engine/assets.js, src/game/world.js, README.md</files>
  <action>
1. Create `index.html` at project root (Vite default location):
   ```html
   <!doctype html>
   <html lang="en">
   <head>
     <meta charset="utf-8" />
     <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
     <title>SayNine Xtreme</title>
     <style>
       html, body { margin: 0; padding: 0; height: 100%; background: #0e0f11; overflow: hidden; }
       body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #fff; }
       #game {
         display: block;
         width: 100vw;
         height: 100vh;
         touch-action: none;           /* critical: prevents page scroll on swipe (INPUT-03) */
         -webkit-tap-highlight-color: transparent;
         outline: none;
       }
       #hud {
         position: fixed;
         inset: 0;
         pointer-events: none;          /* HUD lets input through by default; individual controls re-enable */
       }
     </style>
   </head>
   <body>
     <canvas id="game" tabindex="0"></canvas>
     <div id="hud"></div>
     <script type="module" src="/src/main.js"></script>
   </body>
   </html>
   ```
   `touch-action: none` on the canvas is mandatory per PITFALLS.md and INPUT-03.
2. Create `src/main.js` as a minimal stub that logs a boot message and will be expanded by Plan B:
   ```js
   // Boot entrypoint. Plan A ships this as a stub; Plan B wires engine; Plan D wires player.
   console.log('[saynine] booting...');
   ```
3. Create `src/config.js` with all tunable constants for Phase 1:
   ```js
   // All tunable constants live here. No logic, no side-effects.
   // Referenced by engine, player, and input layers. Keep this file lean.
   export const LANE_WIDTH = 2.0;          // world units between lanes
   export const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH]; // left, center, right
   export const LANE_SWITCH_MS = 150;      // LOOP-02 ~150ms smooth tween
   export const JUMP_AIR_MS = 800;         // LOOP-03 ~800ms total air time
   export const JUMP_PEAK_Y = 1.8;         // peak jump height in world units
   export const SLIDE_MS = 600;            // LOOP-04 ~600ms slide duration
   export const PLAYER_RUN_SPEED = 12;     // world units / second forward
   export const CAPSULE_HEIGHT = 1.6;
   export const CAPSULE_RADIUS = 0.35;
   export const CAPSULE_COLOR = 0xff8a3b;  // brand orange (PROJECT.md VIS-01)
   export const GROUND_COLOR = 0x2e7d4f;   // placeholder sunny-city grass
   export const SKY_COLOR = 0x87ceeb;      // placeholder sky blue
   // Loop / engine
   export const FIXED_STEP = 1 / 60;
   export const MAX_DELTA = 1 / 30;        // PERF-05 delta clamp
   export const DPR_MAX = 2;               // PERF-06 devicePixelRatio cap
   ```
4. Create `src/state/state.js` with scaffold game phase FSM:
   ```js
   // Singleton game state. UI reads it; game layer writes it. Leaf module — imports nothing.
   export const PHASES = Object.freeze({
     MENU: 'menu',
     PLAYING: 'playing',
     PAUSED: 'paused',
     GAME_OVER: 'game_over',
   });
   export const state = {
     phase: PHASES.PLAYING, // Phase 1 boots straight into PLAYING; menu lands in Phase 3
     score: 0,
     linkys: 0,
   };
   export function setPhase(next) { state.phase = next; }
   ```
5. Create `src/ui/hud.js` as an empty stub (real HUD is Phase 3):
   ```js
   // HUD stub. Phase 3 will populate this with brand-voice score overlay.
   export function initHUD() { /* intentionally empty in Phase 1 */ }
   ```
6. Create `src/engine/pool.js` — scaffold generic object Pool class for PERF-08 (not used until Phase 2 but the class must exist):
   ```js
   // Generic object pool. Zero allocations per frame during gameplay (PERF-08).
   // Used in Phase 2 for obstacles / coins / chunks; scaffolded here so the pattern is baked in.
   export class Pool {
     constructor(factory, reset, initial = 0) {
       this._factory = factory;
       this._reset = reset;
       this._free = [];
       this._live = new Set();
       for (let i = 0; i < initial; i++) this._free.push(factory());
     }
     acquire() {
       const obj = this._free.pop() ?? this._factory();
       this._live.add(obj);
       return obj;
     }
     release(obj) {
       if (!this._live.delete(obj)) return;
       this._reset(obj);
       this._free.push(obj);
     }
     get liveCount() { return this._live.size; }
     get freeCount() { return this._free.length; }
   }
   ```
7. Create `src/engine/assets.js` — GLB loader scaffold with SkeletonUtils.clone pattern baked in (PERF-07):
   ```js
   // GLB loader scaffold. Phase 1 ships with a capsule placeholder and does not load any GLB.
   // PERF-07: any skinned mesh cloning MUST use SkeletonUtils.clone, never object3d.clone.
   // Phase 2 will replace this with real GLTFLoader + KTX2 + meshopt.
   import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
   import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

   const loader = new GLTFLoader();

   export function loadGLB(url) {
     return new Promise((resolve, reject) => {
       loader.load(url, (gltf) => resolve(gltf), undefined, reject);
     });
   }

   // Use this for any skinned-mesh cloning. Do NOT use object3d.clone() — breaks skeleton.
   export function cloneSkinned(object3d) {
     return skeletonClone(object3d);
   }
   ```
8. Create `src/game/world.js` as a stub (real chunk streaming is Phase 2):
   ```js
   // World stub. Phase 2 implements chunk streaming, obstacles, coins, pools.
   import * as THREE from 'three';
   import { GROUND_COLOR } from '../config.js';

   /**
    * Build a static flat ground plane for Phase 1.
    * Plan B uses this to give the capsule something to stand on.
    */
   export function buildFlatGround(scene) {
     const geo = new THREE.PlaneGeometry(24, 2000, 1, 1);
     const mat = new THREE.MeshStandardMaterial({ color: GROUND_COLOR });
     const mesh = new THREE.Mesh(geo, mat);
     mesh.rotation.x = -Math.PI / 2;
     mesh.position.z = -900; // extend forward so capsule "runs" into it
     scene.add(mesh);
     return mesh;
   }
   ```
9. Create `README.md`:
   ```md
   # SayNine Xtreme

   A Three.js endless runner for saynine.ai. Ninty runs through a sunny 3D city dodging obstacles and collecting Linky mascots.

   ## Requirements

   - Node.js 20+
   - npm 10+

   ## Scripts

   | Command | Description |
   |---|---|
   | `npm run dev` | Start Vite dev server. Use `--host` output IP to test on a phone on the same Wi-Fi. |
   | `npm run build` | Produce a static `dist/` bundle. Uses `base: './'` so it runs from any subdirectory. |
   | `npm run preview` | Preview the built bundle locally. |
   | `npm run optimize-glb <in> <out>` | Run a GLB through `gltf-transform optimize` (meshopt geometry + webp textures). |

   ## Three.js version pin

   `three` is pinned to an EXACT version in `package.json` (no caret, no tilde). This is intentional.

   > Three.js does not follow semver. Every release is a minor bump and breaking changes (including silent ones that affect skinned-mesh animation) appear in normal releases. Upgrading must be a deliberate act with a manual check of the [migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide).

   To upgrade: read the migration guide, bump the exact version in `package.json`, run smoke tests, commit.

   ## Asset pipeline

   Raw source GLBs / FBXs are git-ignored. Only `assets/optimized/*.glb` is committed. Use:

   ```sh
   npm run optimize-glb assets/raw/ninty.glb assets/optimized/ninty.glb
   ```

   This wraps `gltf-transform optimize` with meshopt geometry compression and webp texture compression. For Phase 2 real assets we may switch texture compression to KTX2/Basis for VRAM savings (see `tools/optimize-glb.mjs`).

   ## Project structure

   ```
   src/
     main.js              # entry — wires engine + input + player
     config.js            # tunable constants
     engine/              # renderer, loop, pool, assets loader
     game/                # player, world
     input/               # keyboard, touch, input aggregator
     state/               # game phase FSM
     ui/                  # HUD (scaffolded in P1, real in P3)
   ```

   ## Testing on a real device

   1. `npm run dev`
   2. Note the `Network: http://<lan-ip>:5173/` URL that Vite prints.
   3. Open that URL on your phone (same Wi-Fi).
   4. Phase 1 acceptance: swipe up/down/left/right on the canvas triggers jump/slide/lane-switch without scrolling the page, and the framerate holds 60fps.
   ```
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5 && test -f dist/index.html && node -e "const fs=require('fs');const html=fs.readFileSync('dist/index.html','utf8');if(!html.match(/\\.\\//)){console.error('FAIL: dist/index.html missing relative paths');process.exit(1)}console.log('OK dist builds with relative paths')"</automated>
  </verify>
  <done>
- `index.html` has canvas#game with `touch-action: none` CSS
- All module skeleton files exist (src/main.js, src/config.js, src/state/state.js, src/engine/pool.js, src/engine/assets.js, src/game/world.js, src/ui/hud.js)
- `npm run build` succeeds and `dist/index.html` has relative asset paths (uses `./assets/...` not `/assets/...`)
- `README.md` documents dev, build, gltf-transform, three pin rationale, and real-device testing steps
  </done>
</task>

</tasks>

<success_criteria>
- `npm install` runs clean with three pinned exact (no caret)
- `npm run dev` starts Vite on localhost with LAN host exposed
- `npm run build` produces `dist/` with relative asset paths (opens from any subdirectory)
- `npm run optimize-glb` wired and documented
- Module skeleton exists — all Phase 1 source files are in place as stubs ready for Plans B/C/D to fill in
- `.gitignore` excludes raw assets but allows `assets/optimized/`
- README covers setup, scripts, three-pin rationale, asset pipeline, real-device mobile testing
</success_criteria>

<output>
After completion, create `.planning/phases/01-engine-feel/01-A-SUMMARY.md` describing: version of three pinned, exact files created, any deviations from the plan.
