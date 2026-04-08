---
phase: 01-engine-feel
plan: 00
type: overview
wave: 0
depends_on: []
files_modified: []
autonomous: true
requirements: [LOOP-02, LOOP-03, LOOP-04, PLAYER-03, INPUT-01, INPUT-02, INPUT-03, INPUT-04, PERF-05, PERF-06, PERF-07, PERF-08, PERF-01, PERF-09, ASSET-03, ASSET-04, ASSET-05, DEPLOY-01, DEPLOY-02]
---

<objective>
Phase 1: Engine + Feel — overview and plan index.

Goal: A placeholder Ninty (coloured capsule) runs forward on a flat ground, lane-switches left/right, jumps, and slides — and it feels tight on a real mid-range Android phone.

This is the project's single highest-risk gate per ARCHITECTURE.md. Phase does not close until lane-switching feels tight on a real mid-range Android phone (PERF-09 real-device smoke test).
</objective>

<plan_index>

| Plan | File | Wave | Depends On | Requirements |
|------|------|------|------------|--------------|
| A | 01-A-scaffold.md | 1 | - | ASSET-03, ASSET-04, ASSET-05, DEPLOY-01, DEPLOY-02 |
| B | 01-B-engine.md | 2 | A | PERF-05, PERF-06, PERF-07, PERF-08, PLAYER-03 |
| C | 01-C-input.md | 2 | A | INPUT-01, INPUT-02, INPUT-03, INPUT-04 |
| D | 01-D-player-feel.md | 3 | B, C | LOOP-02, LOOP-03, LOOP-04 |
| E | 01-E-smoke-test.md | 4 | D | PERF-01, PERF-09 |

**Wave structure:**
- Wave 1: Plan A (scaffold) — foundation
- Wave 2: Plan B (engine) and Plan C (input) — can run in parallel, different file sets
- Wave 3: Plan D (player feel) — depends on engine + input being wired
- Wave 4: Plan E (smoke test + docs) — verification gate

Plan B and Plan C touch disjoint files (`src/engine/*` vs `src/input/*`) and can run in parallel after scaffold lands.

</plan_index>

<phase_acceptance_criteria>
Phase 1 is NOT complete until ALL of these are TRUE:

1. `npm run dev` loads localhost and shows a coloured capsule running forward on a flat ground at 60fps on desktop.
2. Arrow keys OR WASD switch lanes, Space jumps, Down/S slides — capsule responds within one frame with smooth transitions (~150ms lane switch, ~800ms jump arc, ~600ms slide).
3. On a real mid-range Android phone, swiping up/down/left/right on the canvas triggers the same behaviors without page scroll, and framerate holds 60fps during active swiping. **CRITICAL GATE — phase does not close until this passes.**
4. `npm run build` produces a `/dist/` folder with relative asset paths; `dist/index.html` opens and runs from any subdirectory (verified with `python -m http.server`).
5. `three` pinned to EXACT version in package.json (no caret), `gltf-transform` CLI wired into package.json scripts, README documents both and the "why" (Three.js non-semver).
</phase_acceptance_criteria>

<must_haves>
  truths:
    - "Coloured capsule visible on flat ground running forward at 60fps desktop"
    - "Arrow keys AND WASD both switch lanes (center/left/right)"
    - "Space key triggers jump arc ~800ms"
    - "Down/S key triggers slide ~600ms"
    - "Lane switch tweens smoothly over ~150ms (not a snap)"
    - "Swipe gestures on mobile canvas do NOT scroll the page"
    - "Swipe up/down/left/right on phone triggers same actions as keyboard"
    - "60fps holds on mid-range Android during active swipe spam"
    - "npm run build produces static dist/ with relative paths, runnable from subdirectory"
    - "three is pinned exact (no caret) in package.json"
    - "gltf-transform is wired into npm scripts and documented in README"
  artifacts:
    - path: "package.json"
      provides: "Exact-pinned three, vite, gltf-transform scripts"
      contains: "\"three\": \"0."
    - path: "vite.config.js"
      provides: "Static bundle config with base: './'"
      contains: "base: './'"
    - path: "index.html"
      provides: "Canvas + touch-action:none + HUD overlay div"
    - path: "src/main.js"
      provides: "Boot sequence wiring engine + input + player"
    - path: "src/engine/engine.js"
      provides: "Renderer, scene, camera, lights, SRGBColorSpace, DPR cap"
    - path: "src/engine/loop.js"
      provides: "Fixed-step accumulator with delta cap 1/30s"
    - path: "src/engine/pool.js"
      provides: "Generic object Pool class (scaffold for P2)"
    - path: "src/engine/assets.js"
      provides: "GLB loader scaffold using SkeletonUtils.clone pattern"
    - path: "src/input/keyboard.js"
      provides: "Arrow + WASD keyboard semantic action emitter"
    - path: "src/input/touch.js"
      provides: "Pointer Events swipe detector, hand-rolled ~15 lines"
    - path: "src/input/input.js"
      provides: "Aggregated Input module emitting semantic actions only"
    - path: "src/game/player.js"
      provides: "Player entity + FSM (running/jumping/sliding/dead)"
    - path: "src/state/state.js"
      provides: "Game phase FSM scaffold (MENU/PLAYING/PAUSED/GAME_OVER)"
    - path: "src/config.js"
      provides: "Tunable constants (lane width, jump velocity, timings)"
    - path: "README.md"
      provides: "Setup + dev + build + gltf-transform docs + three pin rationale"
  key_links:
    - from: "src/engine/loop.js"
      to: "game.tick(dt)"
      via: "fixed-step accumulator calling game tick"
      pattern: "while.*acc.*STEP"
    - from: "src/input/input.js"
      to: "src/game/player.js"
      via: "Player reads semantic actions from Input module, never raw events"
      pattern: "input\\.(left|right|jump|slide)"
    - from: "index.html canvas"
      to: "src/input/touch.js"
      via: "touch-action: none CSS + Pointer Events on canvas"
      pattern: "touch-action:\\s*none"
    - from: "src/engine/engine.js"
      to: "THREE.WebGLRenderer"
      via: "outputColorSpace = SRGBColorSpace, setPixelRatio cap 2, renderer.compile pre-warm"
      pattern: "SRGBColorSpace|setPixelRatio|renderer\\.compile"
</must_haves>

<execution_notes>
- Each sub-plan (A-E) is independently executable as a prompt.
- Plans B and C can run in parallel (Wave 2) because file sets are disjoint.
- Plan E is a gated verification plan — it MUST include a real-device mobile test. Do not close Phase 1 without it.
- No feature creep: Phase 1 is engine + feel ONLY. Obstacles, chunks, coins, HUD, audio, real Ninty mesh all belong to later phases.
</execution_notes>
