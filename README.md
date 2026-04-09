# SayNine Xtreme

A Three.js endless runner for **saynine.ai**. Ninty runs through a sunny 3D city dodging obstacles and collecting Linky mascots.

> v0 — Phase 1 (Engine + Feel). Placeholder capsule runs forward, switches lanes, jumps, and slides. Real assets land in Phase 2.

## Requirements

- Node.js 20+
- npm 10+

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server on `localhost` **and** the LAN (for real-device testing). |
| `npm run build` | Produce a static `dist/` bundle. Uses `base: './'` so it runs from any subdirectory / host path. |
| `npm run preview` | Preview the built bundle locally. |
| `npm run optimize-glb <in> <out>` | Run a GLB through `gltf-transform optimize` (meshopt geometry + webp textures). |

## Three.js version pin

`three` is pinned to an **exact** version in `package.json` — no caret, no tilde. This is deliberate.

> Three.js does not follow semver. Minor releases regularly introduce breaking changes (including silent ones affecting skinned-mesh animation, color space, and shaders). Upgrading must be a deliberate act, not a passive `npm update`.

To upgrade:

1. Read the [migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide).
2. Bump the exact version in `package.json`.
3. `npm install` → `npm run dev` → verify Phase 1 smoke test still passes on real hardware.
4. Commit.

## Asset pipeline

Raw source GLBs / FBXs / Blender files are **git-ignored**. Only `assets/optimized/*.glb` is committed to keep the repo small and the runtime bundle lean.

```sh
npm run optimize-glb assets/raw/ninty.glb assets/optimized/ninty_player.glb
```

This wraps `gltf-transform optimize` with:

- **meshopt** geometry compression
- **webp** texture compression

For Phase 2 real assets we may switch textures to **KTX2 / Basis** for bigger VRAM savings on mobile — see `tools/optimize-glb.mjs`.

## Project structure

```
src/
├── main.js              # entry — wires engine + input + player
├── config.js            # all tunable constants
├── engine/
│   ├── engine.js        # renderer, scene, camera, fixed-step loop   (Plan B)
│   ├── loop.js          # rAF + accumulator                          (Plan B)
│   ├── pool.js          # generic object pool                        (Plan A, used P2)
│   └── assets.js        # GLB loader + SkeletonUtils.clone pattern   (Plan A, used P2)
├── game/
│   ├── player.js        # Player entity + FSM                        (Plan D)
│   └── world.js         # flat ground (P1) → chunk streaming (P2)
├── input/
│   ├── keyboard.js      # Arrow + WASD → semantic actions            (Plan C)
│   ├── touch.js         # Pointer Events swipe detector              (Plan C)
│   └── input.js         # aggregator                                 (Plan C)
├── state/state.js       # game phase FSM
└── ui/hud.js            # HUD stub (P1) → real HUD (P3)
```

## Testing on a real device

Phase 1 success depends on this working on a real mid-range Android phone — it's the project's single highest-risk gate.

1. Run `npm run dev`.
2. Vite prints two URLs: `Local: http://localhost:5173/` and `Network: http://<lan-ip>:5173/`.
3. Make sure your phone is on the same Wi-Fi as this machine.
4. Open the `Network:` URL on the phone.
5. Phase 1 acceptance:
   - Swipe up → jump
   - Swipe down → slide
   - Swipe left / right → lane switch
   - Page must **not** scroll during any swipe
   - Framerate holds 60 fps during active swiping

## Planning & docs

See `.planning/`:

- `PROJECT.md` — project context, constraints, decisions
- `REQUIREMENTS.md` — 89 v1 requirements
- `ROADMAP.md` — 5 phases, dependencies, success criteria
- `research/STACK.md` — authoritative technical stack
- `research/ARCHITECTURE.md` — 8-module layout, game loop, patterns
- `research/PITFALLS.md` — 25 critical pitfalls with phase mapping
