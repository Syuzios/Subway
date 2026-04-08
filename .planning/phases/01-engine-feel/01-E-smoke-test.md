---
phase: 01-engine-feel
plan: E
type: execute
wave: 4
depends_on: [D]
files_modified:
  - .planning/phases/01-engine-feel/SMOKE-TEST.md
  - .planning/PROJECT.md
  - README.md
autonomous: false
requirements: [PERF-01, PERF-09]

must_haves:
  truths:
    - "Desktop smoke test checklist executed and all items pass"
    - "Real mid-range Android device smoke test executed"
    - "60fps holds on real device during active swipe spam"
    - "Swipes do NOT scroll the page on the phone"
    - "Lane switch FEELS tight on the phone (subjective go/no-go call)"
    - "dist build tested by opening from a subdirectory via python -m http.server"
    - "Key Decision logged in PROJECT.md either passing the gate or listing fix-it work"
  artifacts:
    - path: ".planning/phases/01-engine-feel/SMOKE-TEST.md"
      provides: "Record of the desktop + mobile smoke test with pass/fail per item"
    - path: ".planning/PROJECT.md"
      provides: "Updated Key Decisions table entry for lane-switch real-device gate"
  key_links:
    - from: "README.md"
      to: "Real-device test procedure"
      pattern: "Network:|lan-ip|5173"
---

<objective>
Gate Phase 1. Run the full desktop smoke test, then the real-device mobile smoke test on a mid-range Android phone. Record results in `SMOKE-TEST.md`. Log the outcome in PROJECT.md as a Key Decision. If the lane-switch feel gate fails on a real phone, produce a prioritized fix-it list and do NOT close Phase 1.

Purpose: Enforce PERF-01 (≥60fps mid-range Android) and PERF-09 (real-device smoke test gates every phase transition). This is the project's single highest-risk milestone per ARCHITECTURE.md.

Output: SMOKE-TEST.md record with pass/fail per checklist item, a devtools performance capture reference, and a Key Decision entry in PROJECT.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/research/PITFALLS.md
@README.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run desktop smoke test + create SMOKE-TEST.md</name>
  <files>.planning/phases/01-engine-feel/SMOKE-TEST.md</files>
  <action>
1. Start the dev server: `npm run dev`. Note the Network IP Vite prints — you will need it for Task 2.
2. Open `http://localhost:5173/` in desktop Chrome. Verify each item in the desktop checklist below and record pass/fail with notes.
3. Open Chrome DevTools → Performance tab → record ~10 seconds while spamming lane switches and jumps. Save the trace or a screenshot of the FPS graph into the phase directory.
4. Build the static bundle and test it runs from a subdirectory:
   ```sh
   npm run build
   cd dist && python -m http.server 8080
   ```
   Open `http://localhost:8080/` in a new browser tab. Confirm the capsule appears, input works, and no 404s appear in devtools Network. If there are 404s the `base: './'` config is broken — go fix Plan A's `vite.config.js`.
5. Create `.planning/phases/01-engine-feel/SMOKE-TEST.md` with the following structure and fill in results:

```md
# Phase 1 Smoke Test

**Date:** YYYY-MM-DD
**Tester:** <name>
**Build:** <git SHA or "dev">

## Desktop (Chrome)

| # | Check | Pass/Fail | Notes |
|---|---|---|---|
| D1 | `npm run dev` starts on localhost without errors | | |
| D2 | Orange capsule visible on green ground with sky background | | |
| D3 | Steady 60fps per devtools Performance recording during 10s of input | | |
| D4 | Arrow keys switch lanes, ~150ms smooth tween (not a snap) | | |
| D5 | WASD switches lanes identically | | |
| D6 | Space triggers jump arc, lands cleanly, ~800ms total air time | | |
| D7 | Down/S triggers slide, capsule squashes, ~600ms | | |
| D8 | Holding a direction key does NOT skip multiple lanes | | |
| D9 | No double jump (pressing jump while airborne is ignored) | | |
| D10 | No console errors or warnings at boot | | |
| D11 | Window resize keeps camera and renderer in sync | | |

## Desktop (built dist)

| # | Check | Pass/Fail | Notes |
|---|---|---|---|
| B1 | `npm run build` succeeds with no warnings > info | | |
| B2 | `python -m http.server 8080` serving dist/ loads correctly at localhost:8080 | | |
| B3 | No 404s in devtools Network tab (confirms `base: './'` is working) | | |
| B4 | Capsule + input work identically on built bundle | | |

## Mobile (mid-range Android) — CRITICAL GATE

| # | Check | Pass/Fail | Notes |
|---|---|---|---|
| M1 | Device model + Android version | - | record exact |
| M2 | `http://<lan-ip>:5173/` loads on phone over Wi-Fi | | |
| M3 | Capsule renders at full screen, no layout glitch | | |
| M4 | Swipe up → jump (and NO page scroll) | | |
| M5 | Swipe down → slide (and NO page scroll) | | |
| M6 | Swipe left → left lane (and NO page scroll / zoom) | | |
| M7 | Swipe right → right lane (and NO page scroll / zoom) | | |
| M8 | Sustained 60fps during 10s of rapid swipe spam (devtools remote / stats overlay) | | |
| M9 | **Subjective: lane switch FEELS tight — not floaty, not snappy.** Go/no-go. | | |
| M10 | No visible jank on jump landing or slide transition | | |
| M11 | Orientation lock / rotation doesn't crash the canvas | | |

## Verdict

- **Overall:** PASS / FAIL / PASS WITH FIXES
- **If FAIL or FIXES:** list concrete fix tasks below.

## Fix list (if any)

1. …
```
  </action>
  <verify>
    <automated>test -f .planning/phases/01-engine-feel/SMOKE-TEST.md && grep -q 'CRITICAL GATE' .planning/phases/01-engine-feel/SMOKE-TEST.md && echo "OK SMOKE-TEST.md created"</automated>
  </verify>
  <done>
- `SMOKE-TEST.md` exists with the desktop + built-dist + mobile sections
- Desktop and built-dist checks all recorded pass/fail
- Mobile section filled after Task 2
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Real-device Android smoke test — CRITICAL PHASE 1 GATE</name>
  <what-built>
Phase 1 ships a coloured-capsule Ninty running forward on a flat ground. Desktop feel is tuned in Plan D (lane tween ~150ms, jump ~800ms, slide ~600ms). The engine uses fixed-step accumulator, SRGBColorSpace, DPR cap 2, pre-compiled shaders, and a hand-rolled Pointer Events swipe detector on a `touch-action: none` canvas.

This checkpoint is the project's single highest-risk milestone. Per ARCHITECTURE.md: if lane switching doesn't feel right on a real mid-range phone with a capsule, no asset or level design will save it.
  </what-built>
  <how-to-verify>
1. Ensure your phone and laptop are on the same Wi-Fi network. The phone should be a mid-range Android (Pixel 5 / Galaxy A52 / equivalent). If only a high-end device is available, note that in SMOKE-TEST.md and call out that a mid-range retest is still owed before Phase 2 ends.
2. On your dev machine run `npm run dev`. Vite will print two lines like:
   ```
     Local:   http://localhost:5173/
     Network: http://192.168.x.x:5173/
   ```
3. Open the Network URL on your phone's Chrome browser.
4. Orient the phone in landscape (or portrait — both should render, document which you tested).
5. Run through items M2–M11 in SMOKE-TEST.md. For each, type "P" for pass or "F" for fail with a note.
6. **Subjective call (M9):** Put the phone down, pick it up, and try to quickly dodge a mental obstacle by swiping left. Does it feel like the capsule moved WHEN you swiped, or is there perceptible lag? Is the tween smooth or does it snap? This is a go/no-go judgement; trust your gut.
7. For frame rate (M8): either use Chrome remote debugging (chrome://inspect on the dev machine) to attach DevTools Performance to the phone, OR add `?stats` support in a future iteration. For now, a visual check of "no stutter during 10s of swipe spam" is acceptable if DevTools remote is too fiddly — note the method used.
8. Record all results in `.planning/phases/01-engine-feel/SMOKE-TEST.md` mobile section.
9. Fill in the Verdict section:
   - **PASS**: every item P, subjective lane-switch feels tight. Phase 1 closes. Move to Task 3.
   - **FAIL**: any M-item F. Phase 1 does NOT close. List concrete fix tasks in the Fix list section — Plan D may need follow-up work (tune LANE_DAMP_LAMBDA, MIN_DIST, MAX_TIME, camera offset). Return to Plan D, iterate, retest.
   - **PASS WITH FIXES**: non-critical items F (e.g., orientation rotation glitch, minor jank on landing). Phase 1 closes conditionally, fixes logged into ROADMAP/STATE for Phase 2 start.
  </how-to-verify>
  <resume-signal>Type "approved" with the verdict (PASS / FAIL / PASS WITH FIXES) and paste the mobile section of SMOKE-TEST.md, or describe issues and request fixes.</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Log Key Decision in PROJECT.md and update README test procedure</name>
  <files>.planning/PROJECT.md, README.md</files>
  <action>
1. Read `.planning/PROJECT.md` and find the "Key Decisions" table.
2. Append a new row documenting the Phase 1 gate outcome based on the SMOKE-TEST.md verdict:
   - If PASS: add row "Phase 1 lane-switch real-device gate | Capsule feel validated on <device> at 60fps; project is go for Phase 2 | ✓ PASS (YYYY-MM-DD)"
   - If PASS WITH FIXES: same as PASS but list the logged fixes and reference them in STATE.md
   - If FAIL: do not write PASS. Instead update the Progress section and list the blocking issues. Do not proceed to close this plan.
3. Also update the pre-existing "True 3D (Three.js) over 2.5D pseudo-3D" row Outcome column from "— Pending" to either "✓ Validated (lane-switch gate passed Phase 1)" or leave pending if gate did not pass.
4. In `README.md`, expand the "Testing on a real device" section with a sentence confirming Phase 1 smoke test procedure is documented at `.planning/phases/01-engine-feel/SMOKE-TEST.md` and that this same procedure is the template for PERF-09 gates at every future phase transition.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const p=fs.readFileSync('.planning/PROJECT.md','utf8');if(!/Phase 1 lane-switch|lane-switch real-device gate/.test(p)){console.error('FAIL: PROJECT.md missing Phase 1 gate Key Decision');process.exit(1)}const r=fs.readFileSync('README.md','utf8');if(!/SMOKE-TEST/.test(r)){console.error('FAIL: README.md missing smoke-test pointer');process.exit(1)}console.log('OK PROJECT.md and README.md updated')"</automated>
  </verify>
  <done>
- PROJECT.md Key Decisions table has the Phase 1 gate row with actual outcome
- README.md references SMOKE-TEST.md and notes the procedure is the PERF-09 template for future phases
- Phase 1 is formally closed (or explicitly NOT closed with a fix list) in the project record
  </done>
</task>

</tasks>

<success_criteria>
- `SMOKE-TEST.md` filled out fully with desktop + built-dist + mobile results.
- Real-device mobile gate (Task 2) explicitly passed or explicitly failed with a fix list. A silent skip is NOT an acceptable outcome.
- PROJECT.md Key Decisions updated with the gate outcome and date.
- README.md documents the smoke-test procedure so future phases can reuse it.
- If the gate passed: Phase 1 is closed and the project is go for Phase 2.
- If the gate failed: Phase 1 stays open, fix tasks are listed, Plan D iteration continues.
</success_criteria>

<output>
After completion, create `.planning/phases/01-engine-feel/01-E-SUMMARY.md` with: final verdict (PASS / FAIL / PASS WITH FIXES), device tested, measured / observed framerate, subjective lane-switch feel notes, and any open fix items pushed to Phase 2 start.
</output>
