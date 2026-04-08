# Requirements: SayNine Xtreme

**Defined:** 2026-04-08
**Core Value:** A Ninty runner that visitors actually want to replay and share — everything else (power-ups, leaderboard, email capture) is optional polish around that one thing.

---

## Notation

- `⭐` marks requirements added based on research beyond what PROJECT.md originally listed. Each is flagged for your review during requirements approval — see the **"Cheap Table-Stakes Additions"** section for the rationale on each.
- Requirements are grouped by category and ID'd `[CAT]-NN` for traceability.

---

## v1 Requirements

### Game Loop (LOOP)

- [ ] **LOOP-01**: Ninty runs forward continuously on a 3-lane track in a sunny-city environment.
- [ ] **LOOP-02**: Player can switch to left / center / right lane with smooth lane-change animation (~150 ms).
- [ ] **LOOP-03**: Player can jump (arc physics, ~800 ms air time) to clear short obstacles.
- [ ] **LOOP-04**: Player can slide (duck under low obstacles for ~600 ms) to pass overhead signs.
- [ ] **LOOP-05**: Difficulty auto-ramps over the first 90 seconds of a run (speed + obstacle density increase).  ⭐
- [ ] **LOOP-06**: First 50 metres of every run are obstacle-free ("forgiving intro") so new players see mechanics before dying.  ⭐

### World (WORLD)

- [ ] **WORLD-01**: Procedurally generated infinite track composed of ≥8 hand-authored chunk templates with randomized connection.
- [ ] **WORLD-02**: Chunks recycle via object pool — no runtime allocation during gameplay.
- [ ] **WORLD-03**: Sunny-city environment: buildings, crosswalks, lamp posts, traffic, matching saynine.ai warm palette (`#FF8A3B` orange, `#32373C` dark, white/light-grey bg).
- [ ] **WORLD-04**: Dynamic time-of-day skybox (morning → noon → dusk cycle tied to distance) to hide chunk repetition.  ⭐

### Obstacles (OBS)

- [ ] **OBS-01**: Traffic cones — short obstacle, must be jumped over.
- [ ] **OBS-02**: Parked cars / trucks — tall obstacle blocking one lane, must switch lane.
- [ ] **OBS-03**: Overhead signs / scaffolding — high obstacle, must be slid under.
- [ ] **OBS-04**: Obstacles spawn from the pool and despawn once behind the camera; no GC during play.
- [ ] **OBS-05**: Hitboxes are ~70% of visual mesh size (forgiving, not pixel-perfect).
- [ ] **OBS-06**: Obstacles visually differentiate by shape, not just colour, so colour-blind players can read them.  ⭐

### Collectibles (COIN)

- [ ] **COIN-01**: Linky mascots spawn along the track in collectible clusters (straight lines, arcs, lane-shifts).
- [ ] **COIN-02**: Collecting a Linky plays a sound, adds to run score, shows floating `+1` feedback.
- [ ] **COIN-03**: Linky coins are rendered via `InstancedMesh` — hundreds on screen without draw-call explosion.
- [ ] **COIN-04**: Missed Linkys do not spawn back — they're despawned once behind the camera.

### Player Character (PLAYER)

- [ ] **PLAYER-01**: Ninty player character with embedded animations: `run` (loop), `jump`, `slide`, `idle`, `death`.
- [ ] **PLAYER-02**: AnimationMixer cross-fades between states on state transitions (no hard pops).
- [ ] **PLAYER-03**: Player character is loadable from `assets/optimized/ninty_player.glb`; if missing, a coloured capsule is used as a development fallback so Phase 1 is not blocked.
- [ ] **PLAYER-04**: Character is recolorable / uses SayNine-orange accents.

### Power-Up (PWR)

- [ ] **PWR-01**: Linky magnet power-up — when collected, pulls all in-range Linky coins toward Ninty for ~5 seconds.
- [ ] **PWR-02**: Active power-up shows an on-screen icon with a countdown.
- [ ] **PWR-03**: Only **one** power-up type ships in v1 (the magnet). Any addition requires an explicit scope change.

### Input (INPUT)

- [ ] **INPUT-01**: Desktop keyboard — both **Arrow keys** AND **WASD** supported simultaneously. Space = jump, Down/S = slide.
- [ ] **INPUT-02**: Mobile swipe — up = jump, down = slide, left/right = lane switch.
- [ ] **INPUT-03**: Touch interaction uses Pointer Events with `touch-action: none` CSS to prevent scroll-hijack.
- [ ] **INPUT-04**: Input layer is abstracted — game code never touches raw events.
- [ ] **INPUT-05**: Auto-detect modality (mobile vs desktop) and show matching inline control hints on first load; hints fade after first input or after 5 seconds.  ⭐

### HUD (HUD)

- [ ] **HUD-01**: Score display with brand-voice label ("Backlinks: 142" not "Score: 142"). Rendered as DOM overlay, not on the canvas.  ⭐
- [ ] **HUD-02**: Linky count display during the run.
- [ ] **HUD-03**: Pause button (visible, always reachable) + `visibilitychange` auto-pause when tab is backgrounded.
- [ ] **HUD-04**: Mute toggle (audio off by default, toggle visible at all times).
- [ ] **HUD-05**: Active power-up indicator with countdown.
- [ ] **HUD-06**: HUD honors `prefers-reduced-motion` — no motion on HUD transitions for players who opt out.  ⭐

### Game State (STATE)

- [ ] **STATE-01**: Four game phases: `MENU`, `PLAYING`, `PAUSED`, `GAME_OVER`. Transitions via explicit state machine.
- [ ] **STATE-02**: Player states: `running`, `jumping`, `sliding`, `dead`. Transitions via player FSM.
- [ ] **STATE-03**: Crash detection → play death animation → transition to `GAME_OVER` within 1 second.

### Game-Over Screen (GO)

This is the single most important UI surface — all marketing payload lives here.

- [ ] **GO-01**: Displays current-run score (big, celebratory).
- [ ] **GO-02**: Displays best-ever score persisted in localStorage.  ⭐
- [ ] **GO-03**: Shows "New best!" celebration when the current run beats the previous best.  ⭐
- [ ] **GO-04**: **Play Again** is the primary button (biggest, warmest colour).
- [ ] **GO-05**: Share buttons (secondary row): X/Twitter intent URL, LinkedIn share URL, copy-link, and `navigator.share` on supported browsers.
- [ ] **GO-06**: Share text uses SayNine brand voice (not "I scored 142 points" — something like "I just rescued 142 Linkys for SayNine. Your turn: [link]").  ⭐
- [ ] **GO-07**: Leaderboard widget (top 10) shown inline on the GO screen.
- [ ] **GO-08**: Optional email capture field — inline (NOT a popover, NOT a required field, NOT a blocker to Play Again). Unchecked opt-in.
- [ ] **GO-09**: Soft CTA copy linking back to saynine.ai (one link, in the brand voice — not a banner).  ⭐

### Leaderboard (LB)

- [ ] **LB-01**: Top 10 scores displayed, most recent first on ties.
- [ ] **LB-02**: v1 stub — reads/writes from `localStorage`. No backend call. Scores are device-local.
- [ ] **LB-03**: Data access is abstracted behind a `LeaderboardStore` interface so the v1.x real backend can swap in without touching UI.

### Share (SHARE)

- [ ] **SHARE-01**: Twitter/X share uses the current intent URL format verified at implementation.
- [ ] **SHARE-02**: LinkedIn share URL populated with score + link.
- [ ] **SHARE-03**: Copy-link puts a branded URL (`play.saynine.ai/?s=142`) on the clipboard.
- [ ] **SHARE-04**: On mobile (or any browser supporting `navigator.share`), a native share sheet is used instead of the buttons.

### Email Capture (EMAIL)

- [ ] **EMAIL-01**: Single text field + submit on the GO screen. No other form fields. Unchecked opt-in if a checkbox is shown.
- [ ] **EMAIL-02**: v1 stub — writes the submission to `localStorage` with a timestamp. No backend call in v1. SayNine marketing can export via devtools until the real backend lands.
- [ ] **EMAIL-03**: Submit is optional; Play Again never requires it.
- [ ] **EMAIL-04**: Submit button is dim secondary style so it can't be mistaken for Play Again.

### Audio (AUDIO)

- [ ] **AUDIO-01**: Background music track, muted by default, unlocks on first user gesture per iOS/Android requirements.
- [ ] **AUDIO-02**: SFX: jump, slide, Linky collect, crash, power-up activate, countdown tick.
- [ ] **AUDIO-03**: All audio routed through Howler.js (handles iOS unlock, page-visibility suspend, format fallback).
- [ ] **AUDIO-04**: Mute persisted in localStorage between runs.

### Visual Identity (VIS)

- [ ] **VIS-01**: Primary `#FF8A3B` orange used for Ninty highlights, UI buttons, score label.
- [ ] **VIS-02**: Dark surface `#32373C` used for HUD chrome and modal backgrounds.
- [ ] **VIS-03**: Accent gradient A (orange→red) for UI flourishes.
- [ ] **VIS-04**: Accent gradient B (cyan→purple) for power-up visual effects.
- [ ] **VIS-05**: Cartoony low-poly aesthetic — no realistic rendering, no dark-neon prototype palette.
- [ ] **VIS-06**: Font stack matches saynine.ai (system sans-serif, no custom web font to avoid extra HTTP hop).

### Performance (PERF)

Acceptance gates copied from STACK.md + PITFALLS.md.

- [ ] **PERF-01**: ≥ 60 FPS on mid-range Android (e.g. Pixel 5, Galaxy A52) during active gameplay.
- [ ] **PERF-02**: Initial JS bundle ≤ 300 KB gzipped.
- [ ] **PERF-03**: Total asset weight (JS + GLBs + textures + audio) ≤ 2 MB.
- [ ] **PERF-04**: First meaningful paint ≤ 3 seconds on 4G.
- [ ] **PERF-05**: `requestAnimationFrame` with fixed-step physics accumulator; delta time clamped to ≤ 1/30 s to prevent tunneling after tab switch.
- [ ] **PERF-06**: Three.js renderer uses `SRGBColorSpace`, pre-compiled shaders (`renderer.compile`), and device pixel ratio capped at 2.
- [ ] **PERF-07**: All skinned meshes clone via `SkeletonUtils.clone`, never `object3d.clone`.
- [ ] **PERF-08**: Object pools for obstacles, coins, and chunks. Zero `new` calls per frame during gameplay.
- [ ] **PERF-09**: Real-device mobile smoke test gates every phase transition. Not a Phase 5 activity.

### Assets (ASSET)

- [ ] **ASSET-01**: `linky.glb` optimized to `assets/optimized/linky.glb` (≤ 250 KB) — **done** (212 KB).
- [ ] **ASSET-02**: Ninty player sourced from Mixamo (character + 5 animation FBXs user is preparing) and merged into `assets/optimized/ninty_player.glb` (≤ 500 KB target).
- [ ] **ASSET-03**: All GLBs processed through `gltf-transform optimize` (meshopt compression + KTX2/webp textures).
- [ ] **ASSET-04**: No uncompressed source GLBs in git. Raw assets are git-ignored; only optimized versions are committed.
- [ ] **ASSET-05**: `three` pinned to an exact version (no caret range) — Three.js does not follow semver and minor releases silently break skinned meshes.

### Deployment (DEPLOY)

- [ ] **DEPLOY-01**: Output is a static bundle (HTML + JS + assets), no server-side requirements.
- [ ] **DEPLOY-02**: `vite.config.js` uses `base: './'` so asset paths are relative and the bundle drops into any host path.
- [ ] **DEPLOY-03**: Final integration path chosen in Phase 5 from: (a) static upload to `saynine.ai/play/`, (b) `play.saynine.ai` subdomain via Cloudflare Pages / Vercel / Netlify, (c) WordPress shortcode / iframe embed.
- [ ] **DEPLOY-04**: Game is live and reachable from saynine.ai (link or embed) before v1 is considered shipped.
- [ ] **DEPLOY-05**: Zero cookies, zero third-party fonts, no external analytics in v1 (unless SayNine explicitly requests tying in to existing analytics).
- [ ] **DEPLOY-06**: If embedded via iframe, iframe origin is a subdomain separate from saynine.ai to sidestep parent-site CSP and cookie-scope issues.

### Accessibility (A11Y)

Minimum accessibility floor from FEATURES.md.

- [ ] **A11Y-01**: Colour-blind-safe shapes — obstacles and coins distinguishable without colour.  ⭐
- [ ] **A11Y-02**: `prefers-reduced-motion` honored on HUD/overlay transitions.  ⭐
- [ ] **A11Y-03**: All HUD text meets WCAG AA contrast against its background.
- [ ] **A11Y-04**: HUD buttons have accessible names and work with keyboard focus.

---

## Cheap Table-Stakes Additions (flagged ⭐)

Per your scope policy ("include it in v1 if it's cheap"), the following were added during research and each needs an implicit nod from you during requirements approval. If you veto any, tell me and I'll move them to **v2** or **Out of Scope**:

| ID | Addition | Cost | Why it matters |
|---|---|---|---|
| LOOP-05 | Auto-ramping difficulty over first 90 s | LOW | Replaces difficulty selector (which is an anti-feature). Makes runs feel fair at any skill level. |
| LOOP-06 | Forgiving 3-sec / 50m obstacle-free intro | LOW | Lets new players see run/jump/slide work before dying. Single biggest first-impression win. |
| WORLD-04 | Time-of-day skybox cycle | MED | Hides procedural repetition. Cheap if we use Three.js's built-in `Sky` or a gradient. Drop if time is tight in Phase 3. |
| OBS-06 | Colour-blind safe shape differentiation | LOW | Accessibility floor. Free if designed in from the start. |
| INPUT-05 | Inline control hints with auto-detect fade | LOW | Replaces forced tutorial (anti-feature). Tells player what to do without a modal. |
| HUD-01 | Brand-voice score label ("Backlinks") | LOW | Single highest-value brand-integration tactic per the research. |
| HUD-06 | Reduced-motion support | LOW | Accessibility floor. Free if HUD animations use a single toggle. |
| GO-02 | Best-score persistence | LOW | Replay driver. Cheap localStorage. |
| GO-03 | "New best!" celebration | LOW | Free payoff that makes replays feel meaningful. |
| GO-06 | Brand-voice share text | LOW | Low cost, high brand reinforcement. |
| GO-09 | Soft CTA back to saynine.ai | LOW | The single brand handoff. Everything else in the game is earned. |
| A11Y-01 | Colour-blind-safe shapes | LOW | Accessibility floor. |
| A11Y-02 | `prefers-reduced-motion` | LOW | Accessibility floor. |

**Net effect on v1 scope:** +13 requirements, all rated LOW or LOW-MED complexity, none requiring new infrastructure. Estimated impact on timeline: **~0.5-1 day** spread across phases. The alternative (omit these) risks a game that ships on time but feels unfinished in ways visitors will notice.

---

## v2 Requirements (deferred)

Tracked but **not** in the current roadmap. Moving any of these back to v1 requires a scope change.

### Backend

- **LB-backend**: Real leaderboard backend (Supabase/Firebase/SayNine API) replacing the localStorage stub.
- **EMAIL-backend**: Real email capture backend connected to SayNine's marketing system.

### Engagement

- **SHARE-IMG**: Share-card image generation (canvas → PNG → share).
- **COIN-COMBO**: Linky-streak combo scoring.
- **TOAST**: Distance milestone toasts in brand voice.
- **NINTY-IDLE**: Ninty idle / personality animations (taunt on game-over, fist-pump on new best).

### Deferred gameplay

- **PWR-extra**: Additional power-ups (shield, 2× score, jetpack) — only after v1 validates that players want more variety.
- **HAPTIC**: Haptic feedback on mobile (jump, slide, crash via `navigator.vibrate`, with iOS graceful degradation).

---

## Out of Scope

The 23 anti-features from FEATURES.md, codified here to prevent scope creep. **Do not add these to v1 without an explicit scope change.**

| Feature | Why excluded |
|---|---|
| Email / login wall before play | Kills ~70% of would-be players before the loop can hook them. |
| Autoplay background music | Browsers block it; even when it works it drives tab-closes. |
| Long intro cinematic / studio splash | Burns the 3-second attention budget. Cold-load to playable scene. |
| Game-specific cookie / GDPR modal on top of saynine.ai's banner | Doubles friction; localStorage best-score is consent-exempt as "functional". |
| Forced tutorial level | Players already know how Subway Surfers works. Inline hints instead. |
| Character select screen | One character: Ninty. |
| Additional power-ups (shield, 2×, jetpack, hoverboard) | Scope control; magnet is the satisfying + brand-tied one. |
| Currency / coin economy / shop | Requires save state + backend + balance economy for zero monetization. |
| Daily missions / achievements / streaks | Retention product features; SayNine Xtreme is a first-impression product. |
| Difficulty selector | Replaced by auto-ramp. |
| Quality / graphics settings UI | Auto-detect mobile vs desktop. |
| Keybind remap UI | Supporting Arrow keys + WASD simultaneously covers the accessibility need. |
| Volume slider | Single mute button. |
| In-game ads / interstitials / rewarded video | Brand-positive goal. |
| Account creation / persistent profile | 100% friction. localStorage + optional email covers it. |
| Real-time multiplayer / live races | Massive scope, zero justification. |
| Replay system / ghost runs | Audience ~0%. |
| Heavy post-processing (bloom, motion blur, DOF) | Mobile GPU killer; forbidden by stack constraints. |
| Loading screen with tips | Don't have a long load. Preload behind tap-to-start. |
| Forced fullscreen | Visitor is embedded on the marketing site; strips browser chrome they need. |
| Camera shake / heavy bob | Motion sickness; 5-10% of players bounce. |
| Persistent ads / branding overlay on gameplay | Everyone hates it. Brand lives in mascots + voice, not laminated on top. |
| "Double or nothing" / second-chance video | F2P pattern; without ads, just an extra modal between death and restart. |
| Newsletter modal popover on win | Interrupts the moment of joy. Inline email field instead. |
| Photo-realistic rendering | Scope + perf; cartoony low-poly is the explicit aesthetic. |
| 2D / 2.5D fallback | User chose true 3D; explicit decision in PROJECT.md. |
| Multiple characters | One character: Ninty. |
| TypeScript | Vanilla JS per STACK.md — skill-set + timeline. |

---
## Traceability

All 89 v1 requirements mapped to exactly one phase. See `.planning/ROADMAP.md` for phase details.

| Requirement | Phase | Status |
|---|---|---|
| LOOP-01 | Phase 2 | Pending |
| LOOP-02 | Phase 1 | Pending |
| LOOP-03 | Phase 1 | Pending |
| LOOP-04 | Phase 1 | Pending |
| LOOP-05 | Phase 3 | Pending |
| LOOP-06 | Phase 2 | Pending |
| WORLD-01 | Phase 2 | Pending |
| WORLD-02 | Phase 2 | Pending |
| WORLD-03 | Phase 2 | Pending |
| WORLD-04 | Phase 3 | Pending |
| OBS-01 | Phase 2 | Pending |
| OBS-02 | Phase 2 | Pending |
| OBS-03 | Phase 2 | Pending |
| OBS-04 | Phase 2 | Pending |
| OBS-05 | Phase 2 | Pending |
| OBS-06 | Phase 2 | Pending |
| COIN-01 | Phase 2 | Pending |
| COIN-02 | Phase 3 | Pending |
| COIN-03 | Phase 2 | Pending |
| COIN-04 | Phase 2 | Pending |
| PLAYER-01 | Phase 2 | Pending |
| PLAYER-02 | Phase 2 | Pending |
| PLAYER-03 | Phase 1 | Pending |
| PLAYER-04 | Phase 2 | Pending |
| PWR-01 | Phase 3 | Pending |
| PWR-02 | Phase 3 | Pending |
| PWR-03 | Phase 3 | Pending |
| INPUT-01 | Phase 1 | Pending |
| INPUT-02 | Phase 1 | Pending |
| INPUT-03 | Phase 1 | Pending |
| INPUT-04 | Phase 1 | Pending |
| INPUT-05 | Phase 3 | Pending |
| HUD-01 | Phase 3 | Pending |
| HUD-02 | Phase 3 | Pending |
| HUD-03 | Phase 3 | Pending |
| HUD-04 | Phase 3 | Pending |
| HUD-05 | Phase 3 | Pending |
| HUD-06 | Phase 3 | Pending |
| STATE-01 | Phase 2 | Pending |
| STATE-02 | Phase 2 | Pending |
| STATE-03 | Phase 2 | Pending |
| GO-01 | Phase 4 | Pending |
| GO-02 | Phase 4 | Pending |
| GO-03 | Phase 4 | Pending |
| GO-04 | Phase 4 | Pending |
| GO-05 | Phase 4 | Pending |
| GO-06 | Phase 4 | Pending |
| GO-07 | Phase 4 | Pending |
| GO-08 | Phase 4 | Pending |
| GO-09 | Phase 4 | Pending |
| LB-01 | Phase 4 | Pending |
| LB-02 | Phase 4 | Pending |
| LB-03 | Phase 4 | Pending |
| SHARE-01 | Phase 4 | Pending |
| SHARE-02 | Phase 4 | Pending |
| SHARE-03 | Phase 4 | Pending |
| SHARE-04 | Phase 4 | Pending |
| EMAIL-01 | Phase 4 | Pending |
| EMAIL-02 | Phase 4 | Pending |
| EMAIL-03 | Phase 4 | Pending |
| EMAIL-04 | Phase 4 | Pending |
| AUDIO-01 | Phase 3 | Pending |
| AUDIO-02 | Phase 3 | Pending |
| AUDIO-03 | Phase 3 | Pending |
| AUDIO-04 | Phase 3 | Pending |
| VIS-01 | Phase 3 | Pending |
| VIS-02 | Phase 3 | Pending |
| VIS-03 | Phase 3 | Pending |
| VIS-04 | Phase 3 | Pending |
| VIS-05 | Phase 3 | Pending |
| VIS-06 | Phase 3 | Pending |
| PERF-01 | Phase 1 (cross-cutting — gated in all phases) | Pending |
| PERF-02 | Phase 5 | Pending |
| PERF-03 | Phase 5 | Pending |
| PERF-04 | Phase 5 | Pending |
| PERF-05 | Phase 1 | Pending |
| PERF-06 | Phase 1 | Pending |
| PERF-07 | Phase 1 | Pending |
| PERF-08 | Phase 1 | Pending |
| PERF-09 | Phase 1 (cross-cutting — gated in all phases) | Pending |
| ASSET-01 | Phase 2 | Done (212 KB, pre-roadmap) |
| ASSET-02 | Phase 2 | Pending (Mixamo merge) |
| ASSET-03 | Phase 1 | Pending |
| ASSET-04 | Phase 1 | Pending |
| ASSET-05 | Phase 1 | Pending |
| DEPLOY-01 | Phase 1 | Pending (baked in as constraint) |
| DEPLOY-02 | Phase 1 | Pending (baked in as constraint) |
| DEPLOY-03 | Phase 5 | Pending |
| DEPLOY-04 | Phase 5 | Pending |
| DEPLOY-05 | Phase 5 | Pending |
| DEPLOY-06 | Phase 5 | Pending |
| A11Y-01 | Phase 2 | Pending |
| A11Y-02 | Phase 3 | Pending |
| A11Y-03 | Phase 3 | Pending |
| A11Y-04 | Phase 3 | Pending |

**Coverage (post-roadmap):**
- v1 requirements total: **89**
- Mapped to phases: **89**
- Unmapped: **0** ✓

**Cross-cutting notes:**
- **PERF-01** (60 fps on mid-range Android) and **PERF-09** (real-device mobile smoke test) are formally owned by Phase 1 for counting purposes, but gate **every** phase transition (1→2, 2→3, 3→4, 4→5, and final). They are baked into each phase's success criteria.
- **DEPLOY-01/02** (static bundle + relative paths) are owned by Phase 1 as design constraints enforced from day 1, then re-verified in Phase 5 during the production build.

---

*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 — traceability populated from ROADMAP.md*
