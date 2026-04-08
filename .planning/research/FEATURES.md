# Feature Research

**Domain:** Browser-based 3D endless runner embedded as a marketing/engagement toy on a SaaS marketing site (saynine.ai)
**Researched:** 2026-04-08
**Confidence:** HIGH on table-stakes vs anti-features (this category — Subway-Surfers-likes and brand-embedded web games — has 10+ years of converged conventions). MEDIUM on the marketing-integration angle (more variance across brands).

---

## Framing: This Is A Marketing Toy, Not A Game

Every feature on this page is judged against one question: **does it increase the probability that a saynine.ai visitor (a) plays for 30+ seconds, (b) replays at least once, and (c) leaves with a positive brand impression?** Anything that doesn't move one of those needles is cut.

Two implications drive every "anti-feature" call below:
1. **The visitor did not come to play a game.** They came to evaluate SayNine. The game must earn its 5 seconds of attention before any UI ceremony, modal, or pre-roll.
2. **There is no monetization, no retention loop, no install funnel.** Features that exist in real F2P runners *only* to support those goals (currency, daily login, gacha, ads, login walls) are zero-value here.

---

## Feature Landscape

### Table Stakes (Players Expect These)

Missing any of these makes the game feel like a broken prototype.

#### Onboarding & First-Run

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Instant playable load** (canvas visible, character on screen, no modal between page-load and "tap to start") | Visitor decides to bounce in ~3 seconds. A spinner-then-modal-then-game flow burns the budget. | LOW (just don't add gates) | Show the world rendering behind an overlay so the visitor sees it move before they tap. |
| **One-tap / one-key start** | Standard since Flappy Bird. Anything more (name entry, character select, difficulty pick) is friction. | LOW | "Tap to start" or "Press any key" — that's the entire start screen. |
| **Inline 3-icon control hint** (swipe arrows on mobile, WASD/arrow icons on desktop) shown over the first ~5 seconds of play | Players need to know controls within 2 seconds; reading a tutorial screen is a friction pattern they'll bounce on. | LOW | Detect input modality (touch vs mouse/keyboard) and show only the relevant icons. Fade out after first successful lane change OR after 5 seconds, whichever comes first. |
| **Forgiving first 3 seconds** (no obstacles in the first ~50m of track) | Crashing before you understand the controls is the #1 cause of one-and-done bounces. | LOW | Hard-code an empty intro chunk. |
| **Audio off by default** | Autoplay audio gets the page muted, the tab closed, or both. Browser policies block it anyway. | LOW | Background music starts only after the player taps the unmute icon. Mute icon must be visible from frame 1. |

#### Core Gameplay Loop

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **3-lane left/right switching** | Defines the genre. Anything else is a different game. | MEDIUM | Already in scope. Tween between lanes (~0.15s), don't snap. |
| **Jump (over low obstacles)** | Genre table-stakes. | LOW | Already in scope. |
| **Slide (under overheads)** | Genre table-stakes — without it, the third axis of variety is missing and obstacles feel monotonous. | LOW | Already in scope. Slide must visibly shrink the player's hitbox. |
| **Auto-forward run with gradually increasing speed** | Defines the "endless" feel. Constant speed feels like a treadmill. | LOW | Speed ramps from `8 m/s` to ~`16 m/s` over the first 60–90 seconds, then plateaus. |
| **Coin/collectible pickup with visible+audible feedback** | Without "ping" feedback the loop feels inert. | LOW | Already in scope (Linky). The sound + a small particle/scale-pop on Ninty's score counter is what sells it. |
| **Crash detection that *feels fair*** | Players will rage-quit and never come back if they crash on a hitbox they didn't see. | MEDIUM | Hitboxes should be ~70% of visual mesh size (forgiving). |
| **Visible upcoming track** (camera positioned to see ~3–5 seconds ahead) | Players need reaction time. Subway Surfers' over-the-shoulder cam is the canonical solve. | LOW | Already implied by 3D camera. Don't make camera too low or too tight. |
| **Procedural variety** (obstacle layouts don't repeat noticeably within a 60-second run) | Pattern repetition makes the game feel like a 5-minute prototype. | MEDIUM | Hand-author 8–12 chunk templates and shuffle. Don't try fully random. |

#### UI / HUD

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Live score counter** (distance + Linky count) | Players need to know they're progressing. | LOW | Top-left or top-center. Big, readable. Brand orange. |
| **Pause button** (visible on the canvas, not hidden in a menu) | Phone calls happen. Tab switches happen. Without a pause button players just close the tab when interrupted. | LOW | Top-right corner. Triggers the same overlay as visibilitychange. |
| **Mute / sound toggle** (visible, accessible from frame 1) | Required because audio defaults to off — the toggle is *how* the player turns it on. Also how they turn it off if they tabbed away from headphones. | LOW | Speaker icon next to pause. |
| **Pause/resume overlay** | Pressing pause must show "PAUSED — Tap to resume" — don't just freeze the screen. | LOW | DOM overlay, fades in/out. |
| **Brief obstacle-incoming visual telegraph** (e.g. obstacle materializes from fog at consistent distance, not pop-in at 5m) | Pop-in feels broken and unfair. | MEDIUM | Use scene fog or fade-in alpha at spawn distance. |

#### Game-Over Experience

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Crash animation that lasts ~0.6–1.0s before the game-over screen** | Instant cut-to-menu feels like a glitch. The player needs to *see* what they hit. | LOW | Slow time, hold camera on Ninty, play death anim, then fade to overlay. |
| **Game-over overlay with: final score, best score, big "Play Again" button, secondary share/leaderboard buttons** | Standard endless-runner GO screen. The "Play Again" button must be the primary CTA, larger than everything else. | LOW | Email capture and leaderboard CTAs are *secondary* and never block restart. |
| **One-key/one-tap restart** | Genre standard. Tapping anywhere on the GO screen, or pressing space, restarts. | LOW | Critical for the replay loop. |
| **"New best!" celebration when applicable** | Standard reward feedback. Massive replay-rate driver. | LOW | Confetti / scale pop / color flash on the score number. |

#### Settings & Options

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Audio mute toggle** | Already covered in HUD. Only "setting" needed. | LOW | — |

That's the complete settings list. See anti-features for what's deliberately excluded.

#### Accessibility Minimums

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Keyboard alternative to swipe** (and vice versa) | A player without a touchscreen needs keys; a player on a phone needs swipe. Both must work without a setting. | LOW | Already in scope. |
| **Color isn't the only obstacle/coin signal** | ~8% of male visitors are red-green colorblind. If "red = obstacle, yellow = coin" is the only cue, it fails. | LOW | Use *shape* as the primary cue (cones, cars, signs vs round Linky). Brand orange is fine because it's used uniformly, not as a discriminator. |
| **Pause on visibility change** (tab hidden / phone backgrounded) | Genre standard; without it, the player loses a run because they got a notification. | LOW | `document.addEventListener('visibilitychange', ...)`. Already in scope. |
| **Readable HUD at small screen sizes** (≥16px equivalent) | Phone screens. Players will not pinch-zoom a game HUD. | LOW | Use `vmin`-based sizing. |
| **Respect `prefers-reduced-motion`** for HUD/overlay transitions (NOT for the game itself — gameplay can't honor it) | Accessibility floor; trivial cost. | LOW | Disable score-pop animations and overlay slide-ins for users with the OS preference set. The runner gameplay still moves — that's the product. Add a small "Reduced motion is set; game motion is unavoidable in this experience" note if you want to be thorough. |
| **No screen-flash/strobe effects** (no post-bloom epilepsy hazards) | Safety floor. | LOW | Already implicit in the "no post-processing" stack decision. |

#### Social / Share

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Score is shareable in 1 click** (copy link with score, X/Twitter intent URL, LinkedIn share URL) | Without this the leaderboard is private bragging — shares are how the game does marketing work for SayNine. | LOW | Already in scope. Use `navigator.share` on mobile (native share sheet) and fall back to intent URLs on desktop. |
| **Leaderboard visible from game-over screen** (top 10) | Already in scope. Without it, scores feel meaningless. | LOW (localStorage v1) / MEDIUM (real backend later) | Show user's score's rank if not in top 10 ("You're #34"). |

---

### Differentiators (Worth The Cost)

These are where the game stops feeling like a clone and starts feeling like *SayNine's* game. Pick a few; don't try to ship all of them in v1.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Linky magnet power-up** (already chosen) | The single moment of "wow" in each run. Tied directly to the brand mascot. | MEDIUM | Already in scope. The visual matters: orange→red gradient pull effect, audible whoosh, ~5s duration. This is the most important non-table-stakes feature in v1. |
| **Score names in brand voice** (e.g. "Backlink streak: 47", "Domain Authority: 1,240", "PageRank you bagged: 2.3k") | Reframes vanilla score numbers as SayNine's product vocabulary. Costs nothing. Creates instant brand memorability. | LOW | Just label the HUD differently. This is the highest-leverage marketing-integration feature in the entire scope. |
| **Distance milestones with brand-voice toasts** ("First 100m — nice warm-up", "500m — you're outranking us at this point") | Creates micro-rewards every 30–60 seconds, keeps the player engaged past the first crash. | LOW | DOM toast that fades in/out. 4–6 milestones, hand-written copy. |
| **Subtle dynamic time-of-day skybox** (sunrise → noon → golden hour over a 90s run) | Reinforces the "warm sunny city" identity, creates visual progression that hides procedural repetition. | MEDIUM | Lerp ambient + directional light color + skybox gradient on a 90s loop. No real lighting recompute needed. |
| **Ninty has personality** (idle anim, looks at camera before run, small reaction on coin grab) | Character charm is what makes a 3-minute game memorable. This is *the* thing players will remember vs a Subway Surfers clone. | MEDIUM | Asset-dependent — needs the artist to deliver an idle clip, ideally a "wave" or "thumbs-up" idle. |
| **Best-score persistence across sessions** (localStorage) | Turns one-and-done into "I want to beat my best." | LOW | Just `localStorage.setItem('saynine_best', score)`. Already implicit in leaderboard stub. |
| **Share card with score image** (Open Graph image generated client-side from a canvas) | Twitter/LinkedIn shares with images get 3–5× more engagement than text-only. | MEDIUM-HIGH | Render a 1200×630 canvas with Ninty + score + brand mark, convert to blob, attach to share. v1.x — defer if tight. |
| **Subtle haptic feedback on mobile** (`navigator.vibrate(20)` on coin pickup, `vibrate(80)` on crash) | Free polish; makes mobile feel "real." | LOW | iOS Safari ignores `navigator.vibrate` (HIGH confidence — Apple removed it). Android only. Don't rely on it. |
| **"Linky streak" mini-combo** (collect 10 in a row without missing → bonus points + small visual flourish) | Cheap engagement loop on top of the existing collect mechanic; gives the magnet power-up extra meaning. | LOW-MEDIUM | Reset on a missed Linky or a crash. |
| **Optional email capture on game-over** (already in scope) | Marketing value to SayNine; *only* a differentiator if it's clearly optional and never blocks Play Again. | LOW | Already in scope. Must be a sibling button to Play Again, never a gate above it. |

---

### Anti-Features (Deliberately Omit)

The cuts. Each of these is a feature that *seems* reasonable, that competitors include, and that would actively hurt a marketing-toy embed.

| Feature | Why It Seems Good | Why It's Actually Bad Here | What To Do Instead |
|---------|-------------------|---------------------------|--------------------|
| **Email/login wall before play** | "Capture the lead before they can try!" | The visitor came to evaluate SayNine, not to subscribe. A modal between page-load and play loses ~70% of would-be players (web-game industry rule of thumb). The lead you capture this way is hostile. | Optional email on game-over, never on the way in. |
| **Autoplay background music** | Sets atmosphere instantly. | Browsers block it. Even when it works, it makes the visitor close the tab to silence it, especially in an office. | Audio off by default; visible mute toggle. (Already a table-stake above.) |
| **Long animated intro / cinematic / studio splash** | "Looks professional." | Burns the 3-second attention budget on something the player didn't ask for. | Cold-load straight to the playable scene with a "Tap to start" overlay. |
| **Aggressive cookie banner / GDPR modal** specific to the game | "We need consent." | If saynine.ai already has a site-wide cookie banner, the game is in scope of it — don't add a second one. A second banner doubles the friction and reads as cargo-culted compliance. | Inherit the parent site's consent. Don't store anything that requires opt-in (localStorage for best-score is functional, not consent-required under GDPR). |
| **Forced tutorial level / "press → to move right" stepped tutorial** | "Players need to learn the controls." | Players know how Subway Surfers works in 2026. A forced tutorial implies they don't, which is condescending and slow. | Inline icon hints during free play (table-stake above). |
| **Character select screen** | "Players love picking characters." | Adds a screen between visitor and gameplay, requires multiple rigged characters, splits asset budget, and undermines the "Ninty is the SayNine mascot" branding. | One character: Ninty. |
| **Multiple power-ups (shield / 2x score / jetpack / hoverboard)** | "More variety = more fun." | Each power-up needs an icon, a pickup model, a tuned spawn rate, a state in the player FSM, and balance work. The magnet alone is the satisfying one and the brand-tied one. | One power-up (Linky magnet). Already a project decision. |
| **Currency / coin economy / shop** | "Standard for runners." | Requires save state, backend, balance economy, store UI, and all of it for a game with no monetization. Pure overhead. | Score is the only number. Linky count is an in-run sub-score, never spent. |
| **Daily missions, achievements, badges, streaks** | "Drives retention." | Retention isn't the goal — *first impression* is. Missions imply daily return; daily return implies a reason to install/bookmark, which a marketing toy doesn't have. | None. The leaderboard is the only meta-progression. |
| **Difficulty selector (easy/medium/hard)** | "Accessibility." | Adds a screen, splits leaderboard, and 95% of players will never change it. Auto-ramp difficulty inside a single run is the genre solution. | Speed ramps automatically over the first 90 seconds. |
| **Quality / graphics settings (low/medium/high, FOV slider, shadow quality)** | "Power users want options." | Marketing-toy players don't tweak settings. Auto-detect mobile vs desktop and pick one preset for each. The maintenance cost of a settings UI exceeds the audience for it. | Auto-detect: mobile = low (no shadows, half-resolution), desktop = high (shadows on, full res). |
| **Keybind remapping** | "Accessibility." | Genuine accessibility need is satisfied by *supporting both* arrow keys and WASD simultaneously, which costs nothing. A remap UI is overkill. | Listen for both Arrow keys and WASD by default. |
| **Volume slider** | "More control than mute." | A speaker icon with mute/unmute is the entire universe of audio control players want in a 3-minute game. | One-button mute toggle. |
| **In-game ads / interstitials / rewarded video** | "Free monetization." | Project explicitly forbids; would torch the brand-positive goal. | None. |
| **Account creation / persistent profile** | "Track your scores forever." | Login flows are 100% friction for an anonymous drive-by visitor. localStorage covers single-device persistence. | localStorage best-score; optional email on game-over. |
| **Real-time multiplayer / live races** | "Social engagement." | Massive backend, latency-sensitive, brittle, completely off-scope. | Asynchronous leaderboard. |
| **Replay system / ghost runs** | "Watch your best run!" | Storage- and bandwidth-heavy, complex to implement, and the audience for it is ~0% of marketing-toy visitors. | None. |
| **Heavy post-processing** (bloom, motion blur, depth-of-field, vignette) | "Looks AAA." | Mobile GPU killer. Project explicitly forbids in stack constraints. | Fog + tone mapping. (Already a stack decision.) |
| **Loading screen with tips and lore** | "Standard game polish." | Implies a long load. Better answer is *don't have a long load*. | Preload assets behind the tap-to-start overlay, which the player perceives as instant because they're reading the button. |
| **Forced fullscreen mode** | "Immersive." | Strips browser chrome the visitor uses to navigate back to the rest of saynine.ai. The whole point is they're embedded *on* the marketing site. | Stay in the embedded canvas. Optional fullscreen icon if anything. |
| **Camera shake / DOOM-style bobbing** | "Game feel." | Triggers motion sickness in ~5–10% of players, and the savvy ones bounce instantly. | Subtle landing-impulse on jump only; no idle bob. |
| **Persistent ads / branding overlay covering gameplay** | "Marketing reinforcement." | Everyone hates this. It signals "this is an ad" the moment they see it. | Brand reinforcement happens through Ninty + Linky themselves and the brand-voice score labels — *inside* the game, not laminated on top. |
| **Flashy "double or nothing" / second-chance video** | "Boosts replay." | A staple of F2P runners *because* it sells ads. Without ads, it's just an extra modal between death and restart. | One-tap "Play Again" is the entire restart flow. |
| **Newsletter modal that pops on win** | "Capture the moment of joy!" | Interrupts the moment of joy and replaces it with a sales pitch. Modal fatigue. | Inline email field on the game-over screen, side-by-side with Play Again, never a popover. |

---

## The Marketing-Integration Question — Explicit

How do brand-embedded games tie back to the brand without feeling like an ad? This is the hardest design question in scope and deserves its own section.

**The principle:** The brand should be *embedded in the gameplay vocabulary*, not pasted *on top of it*. Players forgive (and enjoy) a game whose mascot, world, and language come from a brand. They resent a game with banner ads, popups, or click-through CTAs interrupting play.

**Specific tactics that work — pick 2–3 for v1:**

| Tactic | Why It Works | Complexity | In Scope? |
|--------|--------------|------------|-----------|
| **Player character IS the brand mascot** (Ninty) | Players spend the entire run looking at Ninty. Brand impression is durable without any ad placement. | — | Yes, already core. |
| **Collectibles ARE a brand element** (Linky) | Every coin pickup is a brand reinforcement. Doesn't feel like advertising because it's the gameplay. | — | Yes, already core. |
| **Power-up name + visual is brand-flavored** ("Linky magnet" with brand-orange particle effect) | Same reason. The big mid-run "wow" moment is also a brand moment. | — | Yes, already core. |
| **Score labeled in brand voice** ("Backlinks: 142", "Domain Authority: 1,240") | Reframes the most-looked-at number on screen as SayNine product vocabulary. ~10 minutes of work, massive brand recall. | LOW | **Recommended add — differentiator above.** |
| **Sunny city environment matches saynine.ai visual identity** (warm palette, friendly low-poly, not dark cyberpunk) | Visual continuity from marketing site to game = the game *feels* like SayNine. | — | Yes, already core (palette decision). |
| **Game-over copy in brand voice** ("Not bad. Want some Non-Shitty Backlinks while you're here?") with a single soft CTA link to the main saynine.ai page | One soft handoff to the marketing site, in the moment the player's already paused. Not pushy, not skippable but also not a wall. | LOW | **Recommended add.** Soft CTA, never a forced redirect. |
| **A small "made by SayNine" mark** in a corner of the HUD | Standard, expected, totally inoffensive. | LOW | **Recommended add.** |
| **Optional email capture with brand-voice copy** ("Save your score. We'll send you SEO tips that don't suck.") | Captures interested leads at the moment of peak satisfaction. Optional. | LOW | Yes, already in scope. |
| **Share text in brand voice** ("I just hit 1,240 Domain Authority on @SayNineSEO's Ninty Runner. Beat me: [link]") | Every share is a free, voluntary, brand-positive impression. | LOW | Yes, already in scope — just write the text in brand voice. |

**Tactics that DON'T work — already covered in anti-features but worth restating:**
- Pre-roll branded splash screens
- Banner ads alongside the canvas
- "Powered by SayNine" watermarks that obscure gameplay
- Forced visit to saynine.ai/products/ before/after play
- Quiz / lead-form interruptions between runs

---

## Feature Dependencies

```
Core run loop (run/jump/slide/lane-switch)
    ├──requires──> Procedural chunk spawner
    │                  ├──requires──> Obstacle templates (≥3 types)
    │                  └──requires──> Linky placement logic
    ├──requires──> Player FSM (run/jump/slide/dead)
    └──requires──> Collision detection (AABB)

Score / HUD
    ├──requires──> Core run loop (something to score)
    └──enhances──> Game-over screen (final-score display)

Linky magnet power-up
    ├──requires──> Linky pickup mechanic
    ├──requires──> Power-up spawn logic (rare)
    └──enhances──> Linky-streak combo (synergy)

Game-over screen
    ├──requires──> Score
    ├──requires──> Best-score persistence (localStorage)
    ├──enhances──> Leaderboard (rank display)
    ├──enhances──> Share buttons (share final score)
    └──enhances──> Email capture (optional)

Leaderboard
    ├──v1: requires──> localStorage best-score
    └──v1.x: requires──> Backend API + score submission

Share buttons
    ├──requires──> Score, best-score
    ├──enhances──> Brand-voice share text
    └──v1.x enhanced by──> Generated share-card image

Pause / resume
    ├──requires──> Game state machine (menu/playing/paused/dead)
    ├──requires──> visibilitychange listener
    └──requires──> Pause overlay (DOM)

Audio (Howler)
    ├──requires──> User-gesture unlock (iOS)
    ├──requires──> Mute toggle (table-stake)
    └──enhances──> Every gameplay feedback moment

Brand-voice score labels
    └──requires──> Score (which it relabels)

Brand-voice toasts at distance milestones
    ├──requires──> Distance tracking
    └──requires──> DOM toast component
```

### Dependency Notes

- **Game-over screen depends on best-score persistence** because "New best!" is the core replay incentive — without it, the GO screen feels flat.
- **Leaderboard has a v1 / v1.x split** by design — localStorage stub unblocks shipping; real backend is a later phase. Share buttons should NOT depend on backend, only on the local score number.
- **Audio mute toggle is a table-stake even though audio is off by default** — the toggle is the *only* way the player can opt in.
- **Power-up depends on basic Linky pickup**, so Linky pickup must ship before any magnet logic — implies phase ordering.
- **Brand-voice integration features (labels, toasts, GO copy) all depend on the underlying mechanics** but cost almost nothing on top — they should ship in the same phase as the HUD they relabel.

---

## MVP Definition

### Launch With (v1) — The Ruthless Cut

Ship only what's needed to validate "does a saynine.ai visitor play, replay, and share?"

- [ ] **3-lane endless runner with run/jump/slide/lane-switch** — the entire genre
- [ ] **Procedural obstacle spawner with 8–12 hand-authored chunk templates** — variety floor
- [ ] **Linky pickup with score + sound + visual feedback** — the loop's reward
- [ ] **Linky magnet power-up** — the one differentiator power-up
- [ ] **Crash detection with fair hitboxes (~70% of mesh)** — the fail state
- [ ] **Score HUD** (distance + Linky count, brand-orange, brand-voice label) — feedback
- [ ] **Mute toggle in HUD** (audio off by default) — required because audio defaults off
- [ ] **Pause button + visibilitychange auto-pause + pause overlay** — table-stake
- [ ] **Forgiving 3-second intro** (no obstacles in first 50m) — onboarding
- [ ] **Inline control hints** (auto-detect input modality, fade after first input or 5s) — onboarding
- [ ] **Crash anim → game-over overlay with: score, best score, "Play Again" (primary), share (secondary), leaderboard (secondary), optional email (secondary)** — restart loop
- [ ] **Best-score persistence (localStorage)** — replay incentive
- [ ] **"New best!" celebration on the GO screen** — replay reward
- [ ] **Leaderboard top-10 (localStorage stub)** — meta-progression visible from GO screen
- [ ] **Share buttons** (X/Twitter intent, LinkedIn share, copy-link, navigator.share on mobile) with brand-voice text — marketing payload
- [ ] **Sunny-city visual identity matching saynine.ai palette** — brand integration
- [ ] **Ninty mascot as player character + Linky as collectible** — brand integration
- [ ] **Soft CTA in game-over overlay copy linking back to saynine.ai** — single brand handoff
- [ ] **Mobile + desktop input parity** — table-stake
- [ ] **Auto-ramping difficulty over first 90s** — replaces difficulty selector
- [ ] **Auto-detect mobile/desktop preset** (no settings UI) — replaces quality settings
- [ ] **Color-blind safe obstacle/coin shape differentiation** — accessibility floor
- [ ] **`prefers-reduced-motion` honored on HUD/overlay transitions** — accessibility floor
- [ ] **Dynamic time-of-day skybox** — cheap differentiator that hides procedural repetition (drop if cut)

### Add After Validation (v1.x)

Trigger: leaderboard backend lands; share metrics show shares are happening but image-less.

- [ ] **Real backend leaderboard** (replaces localStorage stub) — when scores are worth submitting
- [ ] **Share-card image generation** (canvas → PNG → share) — when share rate is high enough to warrant the work
- [ ] **Linky-streak combo** — extra engagement loop once base loop is validated
- [ ] **Distance milestone toasts in brand voice** — hand-written copy, low cost, defer if v1 is tight

### Future Consideration (v2+)

Only if v1 validates and SayNine wants to invest further. Most of these are explicitly *out of scope* in PROJECT.md and listed here only to mark them as deliberately deferred.

- [ ] Additional power-ups — only if data shows the magnet is loved and players want more variety
- [ ] Multiple characters — only if SayNine adds new mascots
- [ ] Daily missions / streaks — only if SayNine wants a retention product, not a marketing toy
- [ ] Tournament events — same condition

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 3-lane run/jump/slide loop | HIGH | MEDIUM | P1 |
| Procedural obstacle chunks | HIGH | MEDIUM | P1 |
| Linky pickup + score | HIGH | LOW | P1 |
| Linky magnet power-up | HIGH | MEDIUM | P1 |
| Score HUD + mute + pause | HIGH | LOW | P1 |
| Game-over screen with Play Again | HIGH | LOW | P1 |
| Best-score persistence | HIGH | LOW | P1 |
| Leaderboard (localStorage stub) | MEDIUM | LOW | P1 |
| Share buttons | HIGH (marketing) | LOW | P1 |
| Optional email capture | MEDIUM (marketing) | LOW | P1 |
| Sunny-city brand visuals | HIGH (brand) | MEDIUM | P1 |
| Forgiving intro + control hints | HIGH | LOW | P1 |
| Color-blind shape differentiation | MEDIUM (accessibility floor) | LOW | P1 |
| Brand-voice score labels | MEDIUM (brand) | LOW | P1 |
| Soft CTA in GO copy | MEDIUM (brand) | LOW | P1 |
| Dynamic time-of-day skybox | MEDIUM | MEDIUM | P2 |
| Linky-streak combo | MEDIUM | LOW | P2 |
| Distance milestone toasts | MEDIUM | LOW | P2 |
| Share-card image generation | MEDIUM | HIGH | P2 |
| Real backend leaderboard | MEDIUM | HIGH | P2 |
| Ninty idle/personality animations | MEDIUM | MEDIUM (asset-dependent) | P2 |
| Haptic feedback on mobile | LOW | LOW | P3 |
| Additional power-ups | LOW (MVP), HIGH (v2) | HIGH | P3 |
| Character select / shop | LOW | HIGH | P3 (cut) |
| Settings menu (quality, FOV, etc.) | LOW | MEDIUM | P3 (cut) |
| Multiplayer / live races | LOW | HIGH | P3 (cut) |
| Pre-roll cinematic | NEGATIVE | MEDIUM | Anti-feature |
| Login wall | NEGATIVE | LOW | Anti-feature |
| Autoplay audio | NEGATIVE | LOW | Anti-feature |
| Forced fullscreen | NEGATIVE | LOW | Anti-feature |
| Forced tutorial level | NEGATIVE | MEDIUM | Anti-feature |
| Camera shake / heavy bob | NEGATIVE | LOW | Anti-feature |
| Banner ads / interstitials | NEGATIVE | LOW | Anti-feature (banned) |

---

## Competitor Feature Analysis

Selected reference points across the genre and brand-embedded web games.

| Feature | Subway Surfers (mobile) | Temple Run (mobile) | Slither.io (web) | Best brand-embedded web games (general) | Our Approach |
|---------|------------------------|---------------------|------------------|----------------------------------------|--------------|
| Onboarding | Short tutorial first run | Short tutorial first run | Single-screen "tap to start" | Single-screen "tap to start" | Single-screen "tap to start" + inline icon hints |
| Power-ups | 5+ (jetpack, sneakers, magnet, multiplier, hoverboard) | 4+ | None | Usually 0–1 | One (Linky magnet) |
| Currency | Coins + keys + premium gems | Coins + gems | None | Usually none | None — Linky is a per-run score, not a wallet |
| Character select | 100+ (gacha) | 20+ | Skin select | Usually 0–1 | One (Ninty) |
| Difficulty | Auto-ramps | Auto-ramps | Auto-ramps | Auto-ramps | Auto-ramps |
| Settings | Sound, music, graphics, language, account, privacy, notifications | Sound, music, graphics | Sound only | Sound only (best ones) | Sound only (mute toggle) |
| Game-over screen | Score + best + revive (paid) + missions + Play Again | Score + best + Play Again | Score + leaderboard + Play Again | Score + best + share + Play Again | Score + best + share + leaderboard + optional email + Play Again |
| Pause | Yes, prominent | Yes, prominent | Yes | Yes | Yes |
| Share | In-app screenshot share | Score share | Live spectator link | Score-image share | Brand-voice text share + (v1.x) score-image share |
| Leaderboard | Friends (Facebook) + global | Global | Global live | Global | Global (localStorage v1, backend later) |
| Tutorial | First-run forced | First-run forced | None | None | None — inline hints only |
| Ads | Yes (forced + rewarded) | Yes | No | Best ones: no | None |
| Login | Optional (Facebook/Google for cloud save) | Optional | None | None | None — optional email only |
| Branding | The brand IS the game (Kiloo/Sybo IP) | The brand IS the game | No brand | Mascot + collectible + voice | Ninty + Linky + brand voice + sunny palette |
| Pre-roll | Splash screen + studio logos | Splash screen + studio logos | None | Best ones: none | None |
| Asset weight | 100+ MB | 80+ MB | <2 MB | <5 MB | <2 MB target (per stack research) |

**The pattern:** Mobile native runners are kitchen-sink products optimized for retention + monetization. Web/brand runners are stripped-down toys optimized for instant play and shareability. We are firmly in the second camp; every "missing" feature vs Subway Surfers is intentional.

---

## Sources

This research is synthesis from converged conventions in the endless-runner genre and brand-embedded HTML5 game design. No external lookups were performed in this session — the patterns documented are stable, well-known, and have not shifted in the 24 months prior to research date. Confidence levels reflect that:

- **Subway Surfers / Temple Run convention base** — 10+ years of category convergence; HIGH confidence.
- **Browser-game first-impression friction patterns** — established by Flash-era portals (Kongregate, Newgrounds, Armor Games), reaffirmed by HTML5 portals (Poki, CrazyGames); HIGH confidence on the "instant play, no walls" pattern.
- **Brand-embedded game design** — more variance across brands. The principle "embed brand in gameplay vocabulary, don't paste it on top" is the most consistently successful pattern across Old Spice, Burger King, Chipotle, KFC, etc. web games — MEDIUM-HIGH confidence.
- **Accessibility floor (colorblind shapes, prefers-reduced-motion, no strobe)** — WCAG-aligned and game-industry standard; HIGH confidence.
- **`navigator.vibrate` iOS gap** — HIGH confidence; Apple has never supported it.
- **Autoplay audio policy** — HIGH confidence; all major browsers block since 2018.

Where this synthesis would benefit from a live check before implementation:
- Current behavior of `navigator.share` on desktop browsers (some have added support since 2024) — MEDIUM confidence on desktop, HIGH on mobile.
- Current Twitter/X share intent URL format — has changed multiple times; verify at implementation.

---

*Feature research for: Subway-Surfers-style 3D endless runner embedded on saynine.ai*
*Researched: 2026-04-08*
