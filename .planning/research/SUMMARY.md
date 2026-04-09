# Project Research Summary

**Project:** SayNine Xtreme
**Domain:** Browser-based true-3D endless runner embedded as a marketing/engagement toy on saynine.ai
**Researched:** 2026-04-08
**Confidence:** HIGH overall (stack and architecture are well-trodden Three.js community ground; MEDIUM on exact pinned versions and on final asset weights until artist delivers)
**Source files:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md (all in `.planning/research/`)

---

## Executive Summary

SayNine Xtreme is a Subway-Surfers-style 3-lane endless runner rendered in true 3D with Three.js, shipped as a dependency-free static bundle and embedded on saynine.ai via an iframe subdomain. It is a **marketing toy, not a game** — every design decision is judged against "does this increase the chance a visitor plays 30+ seconds, replays once, and leaves with a positive brand impression?" The genre has 10+ years of converged conventions, so table-stakes features and technical patterns are well-known; the risk is not "what to build" but "ship it in 1–2 weeks, solo, with assets that still need optimization, on mobile Safari."

The recommended approach is ruthlessly minimal: **Three.js + Vite + Howler + vanilla JS**, no React/R3F, no physics engine, no state library, no UI framework, hand-rolled AABB collisions, fixed-step loop, DOM HUD over fullscreen canvas, object pools for everything that spawns, and iframe-on-subdomain for embedding. Eight loosely-coupled modules in an `engine/ | game/ | ui/` split with a single `state.js` singleton. The build order is dependency-correct: **engine skeleton → player FSM on placeholder cube → world chunks → collisions → UI → audio → real GLB assets → power-up → share/leaderboard → embed/ship**, with placeholder cubes covering the first ~6 phases so asset delivery is never a critical-path blocker.

The highest-impact risks are (1) the asset pipeline — the delivered `ninty.glb` is a 132 MB marketing render with no animations and must be replaced by a Mixamo character + 5 animations the user is preparing now; (2) mobile Safari quirks (audio unlock, viewport, touch gestures, CSP) that can only be caught by real-device testing at every phase boundary; (3) solo-sprint scope creep that will kill v1 if the out-of-scope list is re-litigated after day 7.

---

## Stack Decision (One-Liner)

**Build with:** `three` (pinned exact, ~0.171), `vite` 6.x, `howler` 2.2.x, vanilla ES2020 JS, plain HTML/CSS HUD, `gltf-transform` + `gltfpack` for offline asset optimization, `stats.js` + `lil-gui` dev-only.

**Do NOT use:** React / R3F, Babylon, PlayCanvas, Unity/Godot WebGL, cannon-es / rapier3d, Hammer.js, Zustand / XState / Redux, GSAP / TWEEN.js, Webpack, TypeScript (optional skip for timeline), WebGPURenderer, post-processing, FBXLoader at runtime, `mesh.clone()` on skinned meshes, `^`/`~` semver ranges on three.

---

## Key Findings

### Stack (from STACK.md)

- Three.js pinned exact (no `^`). `WebGLRenderer` only. `outputColorSpace = SRGBColorSpace` explicitly.
- Vite 6.x, `base: './'` — makes the `/dist` bundle embeddable on any host.
- Asset pipeline is Meshopt + KTX2, not Draco. KTX2 is the biggest single mobile-GPU memory win.
- Howler.js for audio; first sound from a real `pointerdown` handler (iOS unlock).
- No physics engine — 3-lane state + 1D gravity is a state machine.
- Hand-rolled Pointer Events swipe (Hammer.js unmaintained since 2017).
- Plain module singleton for state (XState runtime > the FSM it replaces).
- Hosting: Cloudflare Pages → `play.saynine.ai` → iframe shortcode on saynine.ai.

**Performance budget:** <300 KB gzipped JS, <2 MB total assets, <100 draw calls, <150k on-screen tris (Ninty ≤15k, Linky ≤2k), single 1024² shadow or baked, no post-processing, <3 s TTI on 4G mid-range Android.

### Features (from FEATURES.md)

Marketing-toy framing. Every feature scored against instant-play + replay + shareability.

**Table stakes (all in v1):** 3-lane run/jump/slide/lane-switch · hand-authored chunks · Linky pickup w/ SFX + pop · forgiving hitboxes ~70% · live score HUD · pause + visibilitychange auto-pause · mute toggle (audio OFF by default) · crash anim (~0.6–1s) → game-over overlay · one-tap restart · best-score localStorage · "New best!" · share (Twitter/LinkedIn/copy-link/navigator.share) · leaderboard top-10 localStorage stub · optional email capture (never a gate) · sunny-city brand palette · mobile+desktop parity · auto-ramping difficulty · auto-detect device preset · color-blind-safe shapes · prefers-reduced-motion on HUD.

**Differentiators (v1):** Linky magnet · brand-voice score labels ("Backlinks: 142") · soft CTA · brand-voice share text · "Made by SayNine" corner · inline control hints · forgiving 50m intro.

**Anti-features (NO):** email wall · autoplay audio · pre-roll · character select · extra power-ups · currency/shop · daily missions · difficulty selector · graphics settings UI · keybind remap · volume slider · ads · accounts · multiplayer · replay · post-processing · forced fullscreen · camera shake · branding overlays · second-chance video · newsletter popovers.

### Architecture (from ARCHITECTURE.md)

**8 loosely-coupled vanilla-JS modules** on **one fixed-step game loop** with **manual object pools**. Dependencies point downward only: `engine/ → game/ → ui/`, with `state.js` as a leaf every layer imports from. No ECS, no event bus.

```
src/
├── main.js · config.js · state.js · controller.js
├── engine/  (loop, renderer, scene, camera, loader, audio, input, pool)
├── game/    (player, world, chunks, collision, powerups)
├── ui/      (hud, menu, pause, gameover, styles.css)
└── util/    (math, leaderboard)
```

**Key patterns:** fixed-step 1/60 with MAX_DELTA=1/15 · plain-switch FSM for player + game · object pools · chunked procedural world · edge-triggered input intents · AnimationMixer owned only by player.js · DOM HUD over canvas · asset preload gate (no streaming).

### Top 10 Critical Pitfalls (phase-mapped)

1. **132 MB ninty.glb is a marketing render** — source-only, never load at runtime (Phase 1 triage)
2. **Delta-time spike on tab resume** — `Math.min(dt, 1/30)` + visibilitychange pause (Phase 2)
3. **Color space wrong** — `renderer.outputColorSpace = SRGBColorSpace` (Phase 2)
4. **AABB tunneling + lane-switch ghost hits** — swept AABB + discrete-lane collision (Phase 3+5)
5. **iOS audio doesn't unlock** — Howler from real `pointerdown` (Phase 7)
6. **iOS gesture hijack** — `touch-action: none` + `overscroll-behavior: none` + `100dvh` + Pointer Events (Phase 1+3)
7. **AnimationMixer footguns** — cross-fade, one-shots, SkeletonUtils.clone, root-motion strip (Phase 8)
8. **Shader compile hitch** — `renderer.compile()` during loading screen (Phase 8)
9. **three bumped silently via ^** — pin exact + commit lockfile (Phase 1)
10. **Mobile testing deferred** — real-device gate EVERY phase boundary + day-7 scope freeze

### Consolidated Performance Budget

| Budget | Target |
|---|---|
| Initial JS gzipped | < 300 KB |
| Total assets | < 2 MB |
| Ninty GLB | < 2 MB, ≤ 15k tris |
| Linky GLB | < 500 KB (already 212 KB ✓) |
| Draw calls | < 100 |
| On-screen triangles | < 150k |
| Textures | ≤ 2048², KTX2 |
| Lights | 1 dir + 1 ambient |
| Shadows | Single 1024² dir OR baked |
| Post-processing | NONE |
| devicePixelRatio | min(dpr, 2) |
| Time to first interactive | < 3 s on 4G mid-range Android |

---

## Asset Situation

**ninty.glb (delivered):** 132 MB, marketing render, ~97k tris, no animations. Source-only — not a runtime deliverable. User chose Mixamo fallback: character + 5 clips (run, jump, slide, idle, death) being prepared. Target: <2 MB after `gltf-transform optimize`.

**linky.glb (delivered):** 212 KB, already optimized, game-ready. Loads via `InstancedMesh` for the coin pool.

**Roadmap implication:** Mixamo integration is a Phase 2 task in our coarse 5-phase roadmap (Phase 8 in the suggested fine-grained order). All earlier phases use placeholder capsules so asset delivery is never the critical path.

---

## Open Questions / Risks

1. Mixamo character identity vs Ninty brand fidelity (elephant mascot is unusual in Mixamo)
2. Deployment target decision (decided in Phase 5)
3. Exact npm versions (verify at install)
4. Email capture backend (v1.x, deferred)
5. Leaderboard display name (anonymous in v1 stub)
6. Share-card image generation (deferred to v1.x)
7. navigator.share desktop matrix (verify at Phase 4)
8. Twitter/X share intent URL format (verify at Phase 4)
9. saynine.ai cookie banner + CSP (Phase 5 coordination)
10. "Made by SayNine" wording (needs user approval)
11. Brand-voice copy for labels + CTAs + toasts (needs sign-off before Phase 3/4)
12. Is "sunny city" literal, or could it be saynine.ai-themed (search-lanes, backlink bridges)?

---

*Research synthesized: 2026-04-08. Ready for requirements and roadmap: yes.*
*Overall confidence: HIGH.*
