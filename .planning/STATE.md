# STATE: SayNine Xtreme

**Last updated:** 2026-04-08

---

## Project Reference

- **Project doc:** `.planning/PROJECT.md`
- **Core value:** A Ninty runner that visitors actually want to replay and share — everything else (power-ups, leaderboard, email capture) is optional polish around that one thing.
- **Current focus:** Phase 1 — Engine + Feel. The critical-path gate for the entire project is lane-switching feeling tight on a real mid-range Android phone.

---

## Current Position

- **Milestone:** v1 (initial launch)
- **Phase:** Phase 1 — Engine + Feel
- **Plan:** (none yet — next step is `/gsd-plan-phase 1`)
- **Status:** Not started
- **Progress:** `[          ] 0/5 phases complete`

---

## Roadmap Snapshot

1. **Engine + Feel** ← current
2. World, Collisions & Real Ninty
3. HUD, Audio & Power-Up
4. Game-Over Payload
5. Harden & Ship

See `.planning/ROADMAP.md` for full phase detail.

---

## Performance Metrics

| Metric | Target | Actual |
|---|---|---|
| Phases complete | 5 | 0 |
| v1 requirements mapped | 89 | 89 |
| v1 requirements shipped | 89 | 0 |
| Initial JS bundle (gzipped) | ≤ 300 KB | — |
| Total asset weight | ≤ 2 MB | — |
| FPS on mid-range Android | ≥ 60 | — |
| First meaningful paint on 4G | ≤ 3 s | — |

---

## Accumulated Context

### Key Decisions (inherited from PROJECT.md)

- True 3D (Three.js) over 2.5D — user accepted the 1-2 week risk.
- Single power-up (Linky magnet) for v1.
- Leaderboard + email as localStorage stubs behind interfaces; real backend is v1.x.
- Deployment path decided in Phase 5.
- Sunny-city warm brand palette, not dark neon.
- Dev unblocks on placeholder capsule; real Ninty from Mixamo merge.
- Ignore existing prototype HTML files.

### Open Todos

- [ ] User is downloading Mixamo character + 5 animation FBX files. When they land in `assets/`, Phase 2 runs ASSET-02 (merge into `assets/optimized/ninty_player.glb`).
- [ ] `three` version to be pinned exactly during Phase 1 setup.

### Blockers

None currently. Asset delivery (Mixamo FBX files) is on the user's side but does NOT block Phase 1 — Phase 1 builds entirely on a placeholder capsule.

### Risks Being Watched

- **Phase 1 critical gate**: If lane switching on a real mid-range phone does not feel tight at the end of Phase 1, the project is in trouble and no asset work will save it. Do not move to Phase 2 until this passes.
- **Asset slip**: If Mixamo files slip past the start of Phase 2, Phase 2 continues on the capsule; swap happens as soon as the merged GLB exists.
- **Timeline risk**: 1-2 weeks solo for true 3D is already acknowledged as risky in PROJECT.md. Day-7 scope freeze: Phases 1-3 must fit in the first 7 days.

---

## Session Continuity

### Last Session

**2026-04-08** — Project initialized. PROJECT.md, REQUIREMENTS.md (89 v1 requirements), and research (STACK / ARCHITECTURE / PITFALLS / FEATURES) written. ROADMAP.md created with 5 coarse phases, 100% requirement coverage. STATE.md initialized pointing at Phase 1.

### Next Session

Start `/gsd-plan-phase 1` to decompose Phase 1 (Engine + Feel) into executable plans.

---

*State initialized: 2026-04-08*
