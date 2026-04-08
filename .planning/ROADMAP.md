# Roadmap: SayNine Xtreme

**Created:** 2026-04-08
**Granularity:** coarse (5 phases)
**Core Value:** A Ninty runner that visitors actually want to replay and share — everything else is polish around that one thing.
**Timeline target:** 1-2 weeks solo. Day-7 scope freeze: Phases 1-3 fit in the first 7 days; Phases 4-5 are hardening + ship and must not expand mid-sprint.

---

## Phases

- [ ] **Phase 1: Engine + Feel** — Fixed-step loop, renderer, asset pipeline, placeholder capsule Ninty responding to keys and swipes. Gates on the project's single highest-risk milestone: lane switching feels tight on a real mid-range phone.
- [ ] **Phase 2: World, Collisions & Real Ninty** — Procedural city-chunk streaming, obstacles, Linky coins, AABB collisions, game state machine, Mixamo → `ninty_player.glb` merge, animation mixer, real mascot swapped in.
- [ ] **Phase 3: HUD, Audio & Power-Up** — DOM HUD in brand voice, pause/resume/menu overlays, Howler audio with iOS unlock, Linky magnet power-up, difficulty ramp, forgiving intro, control hints, dynamic sky.
- [ ] **Phase 4: Game-Over Payload** — Game-over screen with best score, "New best!" celebration, leaderboard stub, share buttons in brand voice, optional email stub, soft CTA back to saynine.ai. One DOM overlay, one cohesive UX flow.
- [ ] **Phase 5: Harden & Ship** — Perf budget enforcement, cross-device QA, accessibility finalization, Vite production config, deployment path decision (static / subdomain / WP shortcode), game live on saynine.ai.

---

## Phase Details

### Phase 1: Engine + Feel
**Goal**: A placeholder Ninty (coloured capsule) runs forward on a flat ground, lane-switches left/right, jumps, and slides — and it feels tight on a real mid-range Android phone. No gameplay content yet; this phase exists to de-risk game feel before building anything else.

**Depends on**: Nothing (first phase)

**Why it's first**: Per ARCHITECTURE.md critical-path observation, if lane switching doesn't feel right with a capsule, no asset or level design will save it. This phase is the go/no-go for the entire project.

**Requirements**:
- Core feel: LOOP-02, LOOP-03, LOOP-04
- Player stub: PLAYER-03
- Input layer: INPUT-01, INPUT-02, INPUT-03, INPUT-04
- Engine fundamentals: PERF-05, PERF-06, PERF-07, PERF-08
- Cross-cutting perf gate: PERF-01, PERF-09
- Asset pipeline scaffolding: ASSET-03, ASSET-04, ASSET-05
- Deployment constraint baked in from day 1: DEPLOY-01, DEPLOY-02

**Success Criteria** (what must be TRUE):
  1. I can load `localhost` on my desktop and watch a coloured capsule run forward on a flat ground at a stable framerate.
  2. I can press Arrow keys OR WASD to switch lanes, Space to jump, Down/S to slide — and the capsule responds within one frame with smooth (not snappy) lane transitions (~150 ms).
  3. I can load the same URL on a real mid-range Android phone, swipe up/down/left/right on the canvas (no page scroll hijack), and the capsule responds identically — and it holds 60 fps during active swiping. **This is the project's single highest-risk gate; phase does not end until it passes.**
  4. Vite `npm run build` produces a static `/dist/` folder with relative asset paths that runs when opened from any subdirectory.
  5. `three` is pinned to an exact version in `package.json` (no caret), and the asset optimization pipeline (`gltf-transform optimize` with meshopt + KTX2) is wired up and documented in the repo, even though only placeholder geometry exists.

**Plans**: TBD
**UI hint**: yes

---

### Phase 2: World, Collisions & Real Ninty
**Goal**: The game is functionally complete as an endless runner with the real Ninty mascot (or capsule fallback): procedural city blocks stream past, three obstacle types spawn and despawn from pools, Linky coins are collectable, crashing ends the run, and the player character plays run/jump/slide/death animations.

**Depends on**: Phase 1

**Asset note**: Phase 2 can begin with the capsule from Phase 1 if the Mixamo FBX files (character + 5 animation clips) have not landed yet. The Mixamo merge into `assets/optimized/ninty_player.glb` is an explicit task in this phase, and swapping in the real mesh is deferred behind the AnimationMixer work — nothing in Phase 2 blocks on Ninty being visible.

**Requirements**:
- Game loop shell: LOOP-01, LOOP-05 (basic scaffolding; full tuning in Phase 3), LOOP-06
- World streaming: WORLD-01, WORLD-02, WORLD-03
- Obstacles: OBS-01, OBS-02, OBS-03, OBS-04, OBS-05, OBS-06
- Coins: COIN-01, COIN-02 (counter only; sound in Phase 3), COIN-03, COIN-04
- Player character: PLAYER-01, PLAYER-02, PLAYER-04
- Game state machine: STATE-01, STATE-02, STATE-03
- Real assets: ASSET-01 (already done — verify integration), ASSET-02 (Mixamo merge task)
- Cross-cutting: PERF-01, PERF-05, PERF-07, PERF-08, PERF-09

**Success Criteria** (what must be TRUE):
  1. I can start the game and watch Ninty (or a capsule, if Mixamo hasn't landed) run through a procedurally streamed sunny-city environment for at least 3 minutes without the framerate dropping or the memory growing.
  2. I can jump over traffic cones, switch lanes to dodge parked cars, and slide under overhead signs — and each obstacle type is visually distinct by *shape*, not just colour.
  3. I can run into an obstacle and the game transitions into a visible "game over" state within ~1 second (death animation plays if real Ninty is in, otherwise a state flip).
  4. I can collect Linky coins by running into them and a counter on a debug overlay increments.
  5. Once Mixamo files have landed, `assets/optimized/ninty_player.glb` exists as a single file (≤ 500 KB), contains run/jump/slide/idle/death clips, and animations cross-fade without popping when I switch states.
  6. The phase-2 mid-range Android smoke test still holds 60 fps with the full world streaming.

**Plans**: TBD
**UI hint**: yes

---

### Phase 3: HUD, Audio & Power-Up
**Goal**: The game has a real UX wrapper — a DOM HUD in SayNine brand voice, working pause/mute/menu overlays, audio with proper iOS unlock, the Linky magnet power-up, and the onboarding polish (forgiving intro, auto-ramp difficulty, inline control hints, dynamic sky) that makes a first-time player want to keep going.

**Depends on**: Phase 2

**Requirements**:
- HUD: HUD-01, HUD-02, HUD-03, HUD-04, HUD-05, HUD-06
- Onboarding polish: LOOP-05 (full difficulty curve), LOOP-06 (verified), INPUT-05, WORLD-04
- Power-up: PWR-01, PWR-02, PWR-03
- Audio: AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04
- Visual identity: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05, VIS-06
- COIN-02 sound feedback completes here
- Accessibility: A11Y-02, A11Y-03, A11Y-04 (A11Y-01 was shipped in Phase 2 with obstacle shapes)
- Cross-cutting: PERF-01, PERF-09

**Success Criteria** (what must be TRUE):
  1. I can load the game on my phone, see a "Tap to start" overlay, and the first 50 metres of the run have no obstacles so I can learn the controls.
  2. The HUD shows a brand-voice live score ("Backlinks: 142") and Linky count, a visible mute toggle (audio off by default), a visible pause button, and an active-power-up indicator — all styled in `#FF8A3B` orange over `#32373C` chrome, readable on a 320 px wide phone.
  3. I can press pause mid-run, the overlay shows, the game halts, I tap resume and keep playing — and auto-pause fires if I background the tab.
  4. When I unmute, I hear background music plus SFX on jump, slide, coin collect, crash, and magnet activate — and the unmute state persists between runs via localStorage. iOS Safari unlock works on first tap.
  5. I can collect a Linky magnet pickup and for ~5 seconds all nearby Linkys fly toward Ninty with a countdown icon visible; no second power-up type exists.
  6. Difficulty ramps smoothly over the first 90 seconds and the sky visibly cycles morning→noon→dusk over a run.
  7. If I set `prefers-reduced-motion` in my OS, HUD and overlay transitions are instant (not animated). HUD text passes WCAG AA contrast. All HUD buttons work with keyboard focus.
  8. Phase-3 mid-range Android smoke test: 60 fps sustained with audio playing, magnet active, and a busy chunk on screen.

**Plans**: TBD
**UI hint**: yes

---

### Phase 4: Game-Over Payload
**Goal**: The game-over screen — the single most important UI surface for the marketing payload — ships as one cohesive DOM overlay with score, best-score, "New best!" celebration, top-10 leaderboard, share buttons in brand voice, optional email capture, and a soft CTA back to saynine.ai. Play Again is the primary button and nothing blocks restart.

**Depends on**: Phase 3

**Architectural note**: Leaderboard and email both ship as localStorage stubs in v1 behind `LeaderboardStore` / email-submit interfaces so the v1.x real backend can swap in without touching any UI. Backend is NOT v1 work.

**Requirements**:
- Game-over overlay: GO-01, GO-02, GO-03, GO-04, GO-05, GO-06, GO-07, GO-08, GO-09
- Leaderboard: LB-01, LB-02, LB-03
- Share: SHARE-01, SHARE-02, SHARE-03, SHARE-04
- Email capture: EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04
- Cross-cutting: PERF-01, PERF-09

**Success Criteria** (what must be TRUE):
  1. When I die, I see a single overlay showing my run's score (big, celebratory), my best-ever score (loaded from localStorage), and the primary **Play Again** button is the biggest, warmest element on the screen — tapping it restarts instantly.
  2. The first time I beat my previous best, a "New best!" celebration appears and the new best is persisted to localStorage so it survives page reload.
  3. Inline on the same overlay I see the top-10 local leaderboard (with my rank shown if I'm outside the top 10), and a share row with X/Twitter, LinkedIn, copy-link — and on mobile or any browser supporting it, a single native-share button appears instead. Share text is SayNine brand voice ("I just rescued 142 Linkys for SayNine...") with a branded URL.
  4. There is an optional inline email field (single text input + dim secondary submit button, unchecked opt-in) that writes submissions to localStorage with a timestamp. Play Again never requires email. Email submit is visually distinct from Play Again — it cannot be mistaken for the primary CTA.
  5. One soft CTA link to saynine.ai appears in brand voice below the fold of the overlay — one link, no banner.
  6. The leaderboard and email stores are accessed only via `LeaderboardStore` and email interfaces; grep confirms no direct `localStorage` calls in `ui/gameover.js`.
  7. Phase-4 mid-range Android smoke test: the entire game-over overlay renders and responds without jank on a 320 px phone.

**Plans**: TBD
**UI hint**: yes

---

### Phase 5: Harden & Ship
**Goal**: The game is live at a real URL that a saynine.ai visitor can reach. Performance budgets are enforced, accessibility floor is verified on real hardware, deployment path is decided and executed, and cross-device QA passes on iOS Safari 15+, Chrome Android, desktop Chrome/Firefox/Safari.

**Depends on**: Phase 4

**Scope discipline**: This phase is "harden what passed each earlier phase gate" — no new features. Anything that emerges as a "we should also..." is logged for v1.x, not added here.

**Requirements**:
- Final perf enforcement: PERF-02, PERF-03, PERF-04 (PERF-01/05/06/07/08/09 were gated in earlier phases — verified one last time here)
- Final accessibility pass: A11Y-01 (re-verify), A11Y-02 (re-verify), A11Y-03 (re-verify), A11Y-04 (re-verify)
- Deployment: DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06
- (DEPLOY-01 and DEPLOY-02 were shipped as constraints in Phase 1; re-verified here on the final build.)

**Success Criteria** (what must be TRUE):
  1. A chosen deployment path (static upload to `saynine.ai/play/`, `play.saynine.ai` subdomain on Cloudflare Pages/Vercel/Netlify, or a WordPress shortcode iframe) is decided, documented in a Key Decision in PROJECT.md, and executed.
  2. I can visit the chosen URL from a real mid-range Android phone on 4G and the first meaningful paint arrives within 3 seconds.
  3. `npm run build` produces a `/dist/` where the initial JS bundle is ≤ 300 KB gzipped and total asset weight (JS + GLBs + textures + audio) is ≤ 2 MB, verified via a bundle-size check.
  4. The game is reachable from saynine.ai (link or embed) — a SayNine visitor with no prior knowledge can get from saynine.ai to playing Ninty in one click. If embedded via iframe, the iframe origin is a subdomain separate from saynine.ai (no CSP/cookie-scope conflicts).
  5. Full cross-device QA sweep passes: iOS Safari 15+, Chrome Android (mid-range), desktop Chrome/Firefox/Safari — all at a stable framerate, audio works, share works, leaderboard persists.
  6. Zero cookies, zero third-party fonts, no external analytics in the shipped bundle (grep confirms).

**Plans**: TBD
**UI hint**: yes

---

## Coverage

| Category | Count | Phases |
|---|---|---|
| LOOP | 6 | P1 (LOOP-02/03/04), P2 (LOOP-01/06), P3 (LOOP-05) — LOOP-06 scaffolding in P2, verified in P3 |
| WORLD | 4 | P2 (WORLD-01/02/03), P3 (WORLD-04) |
| OBS | 6 | P2 (all) |
| COIN | 4 | P2 (COIN-01/03/04), P3 (COIN-02 sound completion) |
| PLAYER | 4 | P1 (PLAYER-03), P2 (PLAYER-01/02/04) |
| PWR | 3 | P3 (all) |
| INPUT | 5 | P1 (INPUT-01/02/03/04), P3 (INPUT-05) |
| HUD | 6 | P3 (all) |
| STATE | 3 | P2 (all) |
| GO | 9 | P4 (all) |
| LB | 3 | P4 (all) |
| SHARE | 4 | P4 (all) |
| EMAIL | 4 | P4 (all) |
| AUDIO | 4 | P3 (all) |
| VIS | 6 | P3 (all) |
| PERF | 9 | P1 (PERF-05/06/07/08), P5 (PERF-02/03/04). PERF-01 + PERF-09 are cross-cutting gates on EVERY phase transition. |
| ASSET | 5 | P1 (ASSET-03/04/05), P2 (ASSET-01/02) |
| DEPLOY | 6 | P1 (DEPLOY-01/02 as constraints), P5 (DEPLOY-03/04/05/06) |
| A11Y | 4 | P2 (A11Y-01 via obstacle shapes), P3 (A11Y-02/03/04), P5 (re-verify all) |

**Total: 89 / 89 v1 requirements mapped. Zero orphans.**

Cross-cutting requirements (**PERF-01**: 60 fps on mid-range Android, and **PERF-09**: real-device smoke test gates every phase transition) are assigned as acceptance gates on Phases 1, 2, 3, 4, and 5 and count as mapped to Phase 1 (first gate) in the single-phase traceability table below. They are re-verified at every phase boundary.

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Engine + Feel | 0/? | Not started | - |
| 2. World, Collisions & Real Ninty | 0/? | Not started | - |
| 3. HUD, Audio & Power-Up | 0/? | Not started | - |
| 4. Game-Over Payload | 0/? | Not started | - |
| 5. Harden & Ship | 0/? | Not started | - |

---

*Roadmap created 2026-04-08. Coarse granularity, 5 phases, 89/89 v1 requirements mapped.*
