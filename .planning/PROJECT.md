# SayNine Xtreme

## What This Is

A web-based true-3D endless runner game embedded on saynine.ai as a user-engagement feature. Players control Ninty (SayNine's elephant mascot) running through a sunny 3D city, dodging obstacles and collecting Linky mascots as coins. The game is playable on desktop and mobile, lives on a standalone subpage of saynine.ai, and is built to keep visitors on the site longer and create a shareable, brand-positive interaction.

## Core Value

**A Ninty runner that visitors actually want to replay and share — everything else (power-ups, leaderboard, email capture) is optional polish around that one thing.**

If the core loop (run, dodge, collect, score, restart) doesn't feel satisfying within 10 seconds of loading, nothing else matters.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

**Core game loop**
- [ ] Ninty runs forward automatically through a 3D sunny-city environment
- [ ] 3-lane system with left/right lane switching
- [ ] Jump and slide mechanics
- [ ] Procedurally generated infinite track (city blocks, streets, buildings)
- [ ] Obstacles: traffic cones (jump), parked cars/trucks (switch lane), overhead signs/scaffolding (slide)
- [ ] Linky coins scattered along track — collect for score
- [ ] Collision detection → game over
- [ ] Score display (distance + Linky count) and game-over screen with restart

**Controls**
- [ ] Desktop keyboard controls (arrow keys / WASD, space for jump, down for slide)
- [ ] Mobile swipe controls (swipe up/down/left/right)
- [ ] Pause/resume (visibility change + explicit pause button)

**Power-up**
- [ ] Linky magnet — pulls all nearby Linkys toward Ninty for ~5 seconds (v1 ships with exactly one power-up)

**Audio**
- [ ] Background music track (muted by default with a toggle)
- [ ] SFX: jump, coin collect, crash, power-up activate

**Visual identity (saynine.ai brand-matched)**
- [ ] Primary `#FF8A3B` orange for UI accents and highlights
- [ ] Dark surface `#32373C` for HUD chrome
- [ ] Accent gradients (orange→red, cyan→purple) for UI flourishes and power-up effects
- [ ] Cartoony low-poly sunny-city aesthetic — NOT dark neon, NOT photo-realistic
- [ ] Responsive canvas — works 320px to 4K

**Engagement layer**
- [ ] Global leaderboard (top 10 scores) — stub with localStorage in Phase 1, real backend in later phase
- [ ] Share score (Twitter / LinkedIn / copy-link)
- [ ] Optional email capture on game-over screen ("save your score, get SayNine updates")

**Assets pipeline**
- [ ] Load Ninty GLB (rigged, with run/jump/slide/idle/death animations)
- [ ] Load Linky GLB (static, spinning)
- [ ] Placeholder fallback cubes so development isn't blocked if assets slip

**Deployment** (final phase)
- [ ] Decision between: static upload to `saynine.ai/play/`, subdomain `play.saynine.ai` on Vercel/Netlify, or WordPress shortcode
- [ ] Integration into the saynine.ai site

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- **Multiple playable characters** — v1 is Ninty only; character shop adds UI/state complexity not justified for a site-engagement toy
- **Additional power-ups (shield, speed boost, jetpack, score 2x)** — scope control; the magnet is the most satisfying and the one most tied to Linky branding
- **Character shop / upgrades / progression** — deferred; requires currency economy, save state, backend
- **Daily missions, achievements, streaks** — progression features belong in a v2 retention phase, not v1
- **In-app purchases / monetization** — SayNine isn't a game studio; this is a marketing asset, not a revenue product
- **Multiplayer / real-time competitive** — massive scope, no justification for an engagement toy
- **Ad integration** — would undermine the brand-positive goal
- **2D side-scroller or 2.5D pseudo-3D fallback** — explicitly rejected despite lower risk; user chose true 3D and accepted the timeline risk in discovery
- **Photo-realistic rendering** — cartoony low-poly keeps the SayNine brand friendly and mobile-performant
- **Email capture as a gate** — email is optional on game over, never a blocker to play
- **Dark neon aesthetic from the old prototype** — explicit decision to match current saynine.ai warm/sunny palette instead

## Context

**Why this exists**
SayNine (saynine.ai) is a marketing/SEO agency with a warm, playful brand voice ("Non-shitty backlinks"). They already have two mascots used across the site and marketing materials: **Ninty** (an elephant) and **Linky** (a chain link). The team wants a site-engagement experience that keeps visitors around longer and creates a shareable moment that reinforces brand personality. A Subway-Surfers-style runner is an obvious fit: instantly recognizable format, broadly appealing, and the mechanics map cleanly to the existing mascots (player = Ninty, collectibles = Linky).

**Visual identity (fetched from saynine.ai)**
- Primary: `#FF8A3B` orange
- Dark charcoal: `#32373C`
- Accent gradient A: `linear-gradient(135deg, #FF6900 0%, #CF2E2E 100%)` (orange→red)
- Accent gradient B: `linear-gradient(135deg, #0693E3 0%, #9B51E0 100%)` (cyan→purple)
- Backgrounds: white `#FFFFFF` and light gray `#F5F5F5`
- Aesthetic: modern, tech-forward SaaS, playful-but-professional, warm and approachable. NOT the dark cyberpunk vibe a typical endless runner defaults to.

**Prior prototype (ignored per user instruction)**
Three iteration files (`index (14).html`, `index (15).html`, `index (16).html`) exist in the working directory from an earlier prototype called "SayNine Xtreme" — a single-file 2.5D canvas endless runner with a dark-neon palette. User has explicitly directed that these be ignored; v1 starts fresh with true 3D and the correct brand palette.

**Runtime environment**
- Target: modern browsers on desktop and mobile (iOS Safari 15+, Chrome/Edge 100+, Firefox 100+)
- Must hit 60fps on mid-range phones and not kill battery
- Must load fast enough that visitors don't bounce before play (<3s initial meaningful render target)

**Audience**
Site visitors to saynine.ai. Anonymous, drive-by play. Players will not install anything, log in, or create accounts. The engagement bar is extremely low — if it doesn't grab attention in 5 seconds the visitor is gone.

## Constraints

- **Tech stack**: Three.js for 3D rendering, vanilla JavaScript, Vite for bundling — no heavier frameworks (React/Vue/etc.) since output must be a small static bundle embeddable anywhere on the SayNine site.
- **Timeline**: 1-2 weeks to playable. Acknowledged-risky for true 3D with custom assets. User has accepted this tradeoff over a 2.5D path that would ship in ~1 week with lower risk.
- **Mobile performance**: Must maintain 60fps on mid-range Android devices. Constrains poly counts (Ninty ≤15k tris, Linky ≤2k tris, world chunks kept light), texture sizes (≤2048×2048), and forbids expensive post-processing (no screen-space effects, no raytracing).
- **Brand**: Must match current saynine.ai palette and vibe — warm, sunny, playful. Rules out the dark-neon look of the old prototype.
- **Assets**: Dependent on user providing rigged Ninty and Linky GLB files. Development must remain unblocked with placeholder cubes if asset delivery slips.
- **Deployment**: Final integration target is undecided (static upload / subdomain / WP shortcode). Output must therefore be a dependency-free static bundle that works in any of those contexts.
- **Backend**: Leaderboard + email capture backend is deferred. Phase 1 uses localStorage stub. Real backend is a later phase and must not block shipping a playable v1.
- **Privacy**: Email capture is optional, no tracking pixels, no third-party analytics in v1 unless SayNine already uses one and wants it wired in.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| True 3D (Three.js) over 2.5D pseudo-3D | User wants authentic Subway-Surfers feel and accepted the 1-2 week risk | — Pending |
| Single power-up (Linky magnet) for v1 | Scope control under tight timeline; magnet is the most satisfying and the most brand-tied | — Pending |
| Leaderboard deferred (localStorage stub in Phase 1) | Backend coordination would block shipping; can be added without rework | — Pending |
| Deployment target decided in final phase | All three options (static upload / subdomain / WP shortcode) remain viable with a static bundle; delay until integration is the actual bottleneck | — Pending |
| Sunny-city setting, warm brand palette | Matches current saynine.ai identity; differentiates from the dark prototype | — Pending |
| User provides rigged GLB assets; dev uses placeholder cubes until they land | Prevents asset delivery from becoming a critical-path blocker | — Pending |
| Ignore existing prototype HTML files | User explicit instruction; fresh start in true 3D with correct palette | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after initialization*
