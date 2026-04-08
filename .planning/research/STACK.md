# Stack Research

**Domain:** Browser-based 3D endless runner game (Three.js, static bundle, saynine.ai embed)
**Researched:** 2026-04-08
**Confidence:** MEDIUM-HIGH overall (HIGH on architecture choices, MEDIUM on exact pinned versions — live registry verification was not available in this session; pin to current `latest` at `npm install` time and re-verify before shipping)

---

## TL;DR — Ship This

```
three@^0.171.0           (Three.js — rendering core)
vite@^6.0.0              (bundler + dev server)
howler@^2.2.4            (audio)
three/examples/jsm/...   (GLTFLoader, DRACOLoader, KTX2Loader, AnimationMixer, already shipped with three)
```

- **No React, no R3F, no Babylon, no PlayCanvas, no Unity WebGL.**
- **No physics engine.** Hand-rolled AABB + vertical-velocity is the correct choice for a 3-lane runner.
- **Plain JS module state, no Zustand / XState.**
- **Hand-rolled pointer events for swipe, no Hammer.js.**
- **Deploy as a static bundle** to Cloudflare Pages (or Netlify) and embed on saynine.ai via subdomain or `<iframe>`. WordPress-hosted static upload also works.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Three.js** | `^0.171.0` (HIGH: Three is the right choice; MEDIUM on exact number — pin to current `latest` at install time; r165+ is stable and post-WebGPU-renderer split) | WebGL rendering, scene graph, GLTF loading, skeletal animation, cameras, lights | De-facto standard for non-engine 3D on the web. Battles every other option on bundle size, docs, Stack Overflow coverage, and examples. The `/examples/jsm/` tree ships GLTFLoader, DRACOLoader, KTX2Loader, MeshoptDecoder, AnimationMixer — everything this game needs is in-repo. |
| **Vite** | `^6.0.0` (HIGH: Vite is the right choice; MEDIUM on exact major — 5.x and 6.x are both fine) | Dev server (HMR over native ESM) + production bundler (Rollup under the hood) | Instant cold start, HMR that survives the Three.js scene (scenes can be hot-reloaded with a little care), zero-config TS, Rollup output is tree-shaken and hashes assets. `build.target: 'es2020'` produces a single-folder static bundle you can drop anywhere — exactly the deployment constraint. |
| **Vanilla JS (ES modules)** | ES2020+ | Game logic, state, input, HUD | Bundle size is the single biggest mobile-perf lever. Three.js itself is ~600 KB gzipped; adding a framework on top is pure overhead for a single-canvas game with no routing and no component tree. |
| **HTML + CSS (no UI framework)** | — | HUD, menus, game-over screen, share buttons | HUD is 4–6 DOM nodes. A framework here is strictly negative: larger bundle, slower first paint, more moving parts during the 1–2 week timeline. |

**Note on Three.js versioning:** Three.js does not follow semver. Every release is a minor bump (`0.x.0`) and breaking changes appear in normal releases. **Pin exact version** (`"three": "0.171.0"`, not `"^0.171.0"`) and upgrade deliberately. Check the [migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide) before bumping.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Howler.js** | `^2.2.4` (HIGH) | Audio playback — background music + SFX (jump, coin, crash, magnet) | Use for all audio in v1. Cross-browser iOS audio-unlock, sprite support, pooling, mute/volume, auto-suspend on page hide — all battle-tested. Saves ~2–3 days of Web-Audio debugging. Bundle: ~8 KB gzipped. |
| **GLTFLoader** (from `three/examples/jsm/loaders/GLTFLoader.js`) | ships with three | Load Ninty and Linky GLB models + animations | Default and correct. No alternative is faster or smaller for this use case. |
| **DRACOLoader** (from `three/examples/jsm/loaders/DRACOLoader.js`) | ships with three | Decode Draco-compressed mesh geometry inside GLBs | Use **only if** artist-exported GLBs exceed ~1 MB. Draco compresses geometry 5–10×. Decoder WASM is ~200 KB, loaded from a CDN or `/draco/` folder. Worth it for city-block chunks; overkill for the player model. |
| **MeshoptDecoder** (from `three/examples/jsm/libs/meshopt_decoder.module.js`) | ships with three | Decode Meshopt-compressed GLBs (`EXT_meshopt_compression`) | **Preferred over Draco in 2026** for endless-runner terrain: decode is ~10× faster than Draco on mobile and the decoder is ~25 KB (vs. Draco's ~200 KB WASM). Asks the artist for an extra export step via `gltfpack`. |
| **KTX2Loader** (from `three/examples/jsm/loaders/KTX2Loader.js`) + **BasisTextureLoader** | ships with three | Load GPU-compressed textures (Basis Universal / KTX2) | **Strongly recommended for mobile.** A 1024×1024 PNG is ~2 MB in VRAM; the same texture as KTX2 is ~350 KB and decodes directly to GPU-native format (ASTC on mobile, BC7 on desktop). Biggest single mobile-GPU memory win available. Use `gltf-transform` to convert PNG→KTX2. |
| **stats.js** (dev only) | `^0.17.0` | FPS + ms/frame + memory overlay during dev | Drop behind a `?debug` query flag. Essential for hitting the 60fps-mobile target. Strip from production bundle. |
| **lil-gui** (dev only, optional) | `^0.20.0` | Tweak spawn rates, speeds, camera offsets live | Cuts tuning cycles by ~5× during the playfeel phase. Strip from production. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vite** | Dev server + build | Config: `build.target: 'es2020'`, `build.assetsInlineLimit: 0` (don't inline GLBs), `build.rollupOptions.output.manualChunks` to split three into its own chunk for long-term caching. |
| **gltf-transform** (CLI) | Offline GLB optimization | Pipeline: `gltf-transform optimize in.glb out.glb --texture-compress ktx2 --compress meshopt`. Run once per asset delivery. Typically shrinks GLBs 3–8×. |
| **gltfpack** (CLI, from meshoptimizer) | Alt. GLB optimizer with Meshopt compression | Simpler than gltf-transform for pure meshopt: `gltfpack -i in.glb -o out.glb -cc`. |
| **Prettier** | Formatting | Keep the bar low — no ESLint ceremony for a 1–2 week sprint unless the team already uses it. |
| **stats.js + lil-gui** | Live tuning | See above. |

---

## Installation

```bash
# Core
npm install three howler

# Dev
npm install -D vite

# Optional (only once GLB assets arrive)
npm install -D @gltf-transform/cli
# or
npm install -D gltfpack
```

Project layout:

```
/src
  main.js               # entry: scene, renderer, loop
  game/
    world.js            # chunk spawner, obstacles, coins
    player.js           # Ninty state machine + AnimationMixer
    input.js            # keyboard + touch/swipe
    audio.js            # Howler wrappers
    collision.js        # AABB checks
    state.js            # plain module singleton
  ui/
    hud.js              # score, coins, pause button (DOM)
    gameover.js         # DOM overlay
/public
  models/ninty.glb      # KTX2 + meshopt compressed
  models/linky.glb
  audio/*.webm
  draco/                # only if Draco used
index.html
vite.config.js
```

---

## Answers to the 10 Specific Questions

### 1. Three.js version

**Recommendation:** Pin to the current `latest` stable on npm (`0.17x.x` as of early 2026; HIGH confidence on "use current stable", MEDIUM on exact number — verify with `npm view three version` before install).

**API warnings:**
- Three.js has **no semver**. Any minor release can break. Pin exact (no `^`).
- `WebGLRenderer` remains the stable renderer. `WebGPURenderer` exists in `three/webgpu` but is still evolving in 2026 — **do not use it for v1**. Mobile Safari WebGPU support is incomplete; shipping a game to "all visitors" on WebGPU is unnecessary risk for zero visual win in a low-poly cartoon runner.
- Lighting changed to physically-correct by default around r155. Don't copy tutorials older than that without updating light intensities.
- `sRGBEncoding` / `outputEncoding` were replaced by `outputColorSpace = SRGBColorSpace`. Old examples will look washed out if copy-pasted verbatim.
- `THREE.Clock.getDelta()` is still the right tick source; cap delta at `min(delta, 1/30)` to avoid tunnel-through on tab-resume.

**Confidence:** HIGH on the "use stable three, pin exact, avoid WebGPURenderer" guidance. MEDIUM on precise r-number.

### 2. Bundler — Vite vs alternatives

**Recommendation:** **Vite 6.x**. HIGH confidence.

**Why Vite specifically for this case:**
- **Native ESM dev server** — cold start under 1s, HMR under 100ms. Matters when iterating on game feel dozens of times per hour.
- **Rollup production build** — tree-shakes `three/examples/jsm/*` so you only ship the loaders you import.
- **Static output** — `npm run build` → `/dist` with hashed JS/CSS/assets → drag-and-drop to Cloudflare/Netlify/WP `/wp-content/play/`. No server, no SSR, no Node runtime, perfect fit for "embeddable anywhere."
- **Zero config for GLB/GLTF** — just `import ninty from './ninty.glb?url'` and Vite copies + hashes it.
- **Public folder** for Draco/Basis decoder WASM files that need stable URLs.

**Alternatives considered:**

| Alternative | Verdict | Why not |
|-------------|---------|---------|
| Webpack 5 | Rejected | 10–30× slower dev cycle, much more config, no dev-server advantage. Legacy choice in 2026. |
| Parcel 2 | Rejected | Fine for generic sites, smaller Three.js community, fewer GLB/WASM recipes, occasional issues with worker imports for decoders. |
| esbuild (standalone) | Rejected | Very fast but no dev server with HMR, no static plugin ecosystem. Vite wraps esbuild for the parts where esbuild wins (transforms) and Rollup where Rollup wins (bundling). |
| Bun bundler | Rejected for v1 | Promising but less proven for Three.js + WASM decoder edge cases; 1–2 week timeline is not the place to find out. Consider for v2. |
| No bundler (raw ESM + importmap) | Rejected | Works for demos but loses hashing, minification, and tree-shaking. Ships extra ~300 KB to mobile. |

### 3. GLB/GLTF loading — faster alternatives? Draco? Meshopt?

**Recommendation:** `GLTFLoader` from `three/examples/jsm` **is** the right loader. Compression is where the real decision lives.

**Compression decision tree:**

1. **Uncompressed GLB < 500 KB total?** Ship as-is. Don't bother.
2. **Between 500 KB and 2 MB?** Use **Meshopt** (`EXT_meshopt_compression`). Decoder is 25 KB, decode is near-instant on mobile, no WASM warmup. **This is the 2026 default.**
3. **Over 2 MB, or geometry-dominated (city chunks with thousands of verts)?** Draco + Meshopt hybrid — Draco for the heavy meshes, Meshopt for the rest. Load `DRACOLoader` with `setDecoderPath('/draco/')` and host the WASM locally to avoid cross-origin stalls.
4. **Textures in any case:** convert to **KTX2 / Basis Universal** via `gltf-transform` or `gltfpack`. Biggest single perf win on mobile GPUs — saves VRAM, uploads faster, fewer jank frames during loading.

**Do not use:**
- `three/examples/jsm/loaders/FBXLoader` — FBX is bloated and slow to parse at runtime. Convert to GLB offline.
- `OBJLoader` — no animations, no materials, no scene graph. Wrong format for a rigged character.

**Confidence:** HIGH. This is consensus Three.js community practice in 2026 and earlier.

### 4. Skeletal animation — AnimationMixer pitfalls

**Recommendation:** `AnimationMixer` + one `AnimationAction` per clip, cross-faded via `action.crossFadeTo(other, duration, warp=false)`.

**Pitfalls (all real, all common):**

1. **Clip names matter.** The GLB must export clips named exactly `run`, `jump`, `slide`, `idle`, `death` (or document whatever the artist exports). Don't rely on indices — artists reorder clips between iterations.
2. **Root motion.** If the artist bakes forward motion into the `run` clip, Ninty will drift out of its lane. **Strip root motion at export** OR subtract root-bone delta in the update loop. Ask the artist to export in-place.
3. **Cross-fade + different durations.** `crossFadeTo` without `warp=true` will play both clips at their native speed during the fade, which looks fine for run↔idle but wrong for run→jump (jump is shorter). Use `warp=true` when the cross-faded clips should finish together, or use `fadeIn`/`fadeOut` on two separate actions.
4. **One-shot clips (`jump`, `slide`, `death`).** Set `action.setLoop(LoopOnce)` and `action.clampWhenFinished = true`. Listen for `mixer.addEventListener('finished', ...)` to return to `run`.
5. **Clip weight math must sum.** During cross-fade both actions are playing with weights summing to 1.0. If you forget to stop the outgoing action after fade, you pay perf on every tick for an invisible clip.
6. **`mixer.update(delta)` uses the *same* delta you feed the game loop.** Don't double-scale it with your game speed or animations drift out of sync with movement.
7. **Cache the mixer per cloned mesh.** If you clone Ninty (you won't in a single-player runner, but worth knowing), use `SkeletonUtils.clone` from `three/examples/jsm/utils/SkeletonUtils.js`, not `mesh.clone()` — the latter shares the skeleton and breaks animation.

**Confidence:** HIGH.

### 5. Physics — do we need cannon-es / rapier?

**Recommendation:** **No physics engine. Hand-rolled AABB + vertical velocity.** HIGH confidence.

**Reasoning:**
- A 3-lane runner has **discrete horizontal state** (lane 0/1/2), **scripted horizontal transitions** (tween over 0.15s), and **1D vertical state** (y-velocity + gravity). That is not a physics problem; it's a state machine plus one `v += g*dt; y += v*dt`.
- Collision is **AABB vs AABB**, checked only against obstacles within ~20m ahead of the player (≤10 checks per frame). You write this in ~30 lines.
- Adding **cannon-es** (~150 KB) or **rapier3d-compat** (~600 KB WASM) means: extra bundle, WASM init time on mobile, an entire second scene graph to sync to Three.js transforms, integration bugs, and physics-authored jitter you'll fight for days. Subway Surfers clones that use a physics engine consistently feel *worse*, not better, because scripted movement is what makes the controls feel tight.
- Rapier is the right choice for a game where objects bounce, stack, or collide with each other physically. This game has none of those.

**When you would use Rapier:** If v2 adds ragdoll death, destructible obstacles, or physics-based power-ups. Not v1.

**Implementation sketch:**
```js
// state
player.lane = 1;         // 0, 1, 2
player.x = 0;            // tweened toward laneX[lane]
player.y = 0;
player.vy = 0;
player.state = 'run';    // run|jump|slide|dead

// update
if (input.left && player.lane > 0) player.lane--;
if (input.right && player.lane < 2) player.lane++;
player.x = damp(player.x, LANE_X[player.lane], 18, dt);

if (input.jump && player.state === 'run') { player.vy = 9; player.state = 'jump'; }
player.vy -= 24 * dt;
player.y = Math.max(0, player.y + player.vy * dt);
if (player.y === 0 && player.state === 'jump') player.state = 'run';

// collision
for (const ob of obstaclesNear(player.z)) {
  if (aabbOverlap(player.box, ob.box)) gameOver();
}
```

### 6. Audio — Howler.js vs Web Audio vs THREE.Audio

**Recommendation:** **Howler.js**. HIGH confidence.

| Option | Verdict | Why |
|--------|---------|-----|
| **Howler.js** | ✅ Use | Solves iOS audio-unlock, handles page-hide/resume, sprite sheets for SFX, pooling (multiple simultaneous coin pings), per-sound and global mute/volume, ~8 KB gzipped. Matches the HUD mute toggle requirement with one API call. |
| Raw Web Audio API | ❌ Skip | Powerful but you'd reimplement every Howler feature. iOS unlock alone (touch-to-unlock the AudioContext) is 30+ lines of defensive code. Not worth it for 5 sounds. |
| `THREE.Audio` / `THREE.PositionalAudio` | ❌ Skip | Wraps Web Audio but tied to the scene graph. Positional audio is valuable for first-person games; for a fixed-camera runner it adds nothing and still leaves you to solve iOS unlock. |

**Implementation notes:**
- Background music: `{ src: ['bgm.webm', 'bgm.mp3'], loop: true, volume: 0.4, autoplay: false }`. Start on first user gesture (lane change or tap).
- SFX: one Howl per sound, or a single sprite-sheet Howl. Sprite sheet is slightly faster to load but sprites are annoying to author for 4 sounds — use individual Howls.
- Formats: ship `.webm` (Opus) primary, `.mp3` fallback. Skip `.ogg`. iOS Safari 15+ handles webm/opus in 2026.
- Preload everything before showing "Tap to start."

### 7. State management

**Recommendation:** **Plain JS module exporting a singleton object.** HIGH confidence.

```js
// state.js
export const game = {
  phase: 'menu',         // menu|playing|paused|dead
  score: 0,
  linkys: 0,
  speed: 8,
  magnetUntil: 0,
};

export function reset() { /* ... */ }
```

**Why not Zustand / XState:**
- **Zustand** is 1.2 KB and genuinely pleasant, but its value (reactive subscriptions across many React components) evaporates when there are zero components. You'd be importing a library to get `obj.foo = bar` with extra steps.
- **XState** is the right tool *if* you want formal state-chart guarantees for the player FSM. For a 4-state player (`run|jump|slide|dead`) and 4-state game (`menu|playing|paused|dead`), an FSM in 40 lines is clearer than the XState config. The XState runtime is ~15 KB gzipped.
- **Redux / MobX** — obviously no.

**When to revisit:** If state grows past ~15 fields with cross-field invariants, extract a tiny FSM helper. Still no library.

### 8. Mobile input — Hammer.js vs native touch

**Recommendation:** **Hand-rolled Pointer Events with a swipe threshold.** HIGH confidence.

```js
// input.js
let sx=0, sy=0, st=0;
const MIN_DIST = 30, MAX_TIME = 500;
addEventListener('pointerdown', e => { sx=e.clientX; sy=e.clientY; st=performance.now(); });
addEventListener('pointerup', e => {
  const dx = e.clientX - sx, dy = e.clientY - sy, dt = performance.now() - st;
  if (dt > MAX_TIME) return;
  if (Math.abs(dx) < MIN_DIST && Math.abs(dy) < MIN_DIST) return;
  if (Math.abs(dx) > Math.abs(dy)) dx > 0 ? swipeRight() : swipeLeft();
  else dy > 0 ? swipeDown() : swipeUp();
});
```

**Why not Hammer.js:**
- Hammer.js is ~7 KB but **unmaintained since 2017**. `touchAction: 'none'` CSS is now the standard way to disable browser scroll gestures, not Hammer's recognizers.
- Pointer Events are supported everywhere (iOS Safari 13+, all modern Android). They unify mouse/touch/pen, so the same code handles desktop drag-to-test and mobile swipes.
- A swipe recogniser is ~15 lines. Importing a dead library for 15 lines is strictly worse.

**Gotchas:**
- Set `touch-action: none` on the canvas in CSS — otherwise iOS Safari will scroll/zoom the page when the player swipes.
- Add `preventDefault()` in `pointerdown` on the canvas to kill 300ms tap delay leftovers.
- Keyboard: listen on `window` not `canvas` (canvas doesn't take keyboard focus unless tabindex is set). Handle `keydown` with `e.repeat` guard.

### 9. Hosting

**Recommendation ranking:**

| Host | Verdict | Why |
|------|---------|-----|
| **Cloudflare Pages** | ✅ **Top pick** | Free tier is generous, global CDN, zero config for static sites, automatic Brotli, HTTP/3, instant cache invalidation on deploy. GLBs and KTX2 files cache at the edge worldwide. Easy `play.saynine.ai` subdomain via Cloudflare DNS. |
| **Netlify** | ✅ Fine | Equally easy, slightly smaller free tier, same DX. Pick if the team already uses Netlify. |
| **Vercel** | ✅ Fine but overkill | Built for Next.js edge functions. For a pure static bundle you pay nothing for features you won't use. No downside, just no upside over Cloudflare. |
| **Static upload to WordPress (`saynine.ai/play/`)** | ⚠️ Works, not ideal | If saynine.ai is WordPress, uploading `/dist` to `/wp-content/uploads/play/` or a plugin-managed folder works. Downsides: slower CDN, harder cache-busting (WP caching plugins fight Vite's hashed filenames), deploy is FTP/SFTP rather than git push. **Choose this only if SayNine's ops team insists on a single domain with no subdomain.** |
| **WordPress shortcode wrapping an `<iframe>`** | ✅ Best compromise | Host the game on Cloudflare Pages at `play.saynine.ai`, embed via a simple `[saynine-runner]` shortcode that outputs `<iframe src="https://play.saynine.ai/" ...>`. Gets CDN + single-domain UX + simple content authoring. |

**Recommended path:** Cloudflare Pages → `play.saynine.ai` → embed on saynine.ai with an iframe shortcode. HIGH confidence.

**CORS / headers notes:**
- No backend in v1, so no CORS to configure.
- Add `Cache-Control: public, max-age=31536000, immutable` on hashed assets (Vite output does this naming automatically; Cloudflare respects it).
- `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` **only** needed if you use `SharedArrayBuffer` (you don't) or multithreaded WASM (you don't). Skip.

### 10. What to EXPLICITLY NOT use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **React Three Fiber (R3F)** | Adds React (~45 KB) + R3F (~25 KB) for zero architectural benefit in a single-canvas game. The whole value prop of R3F is "declarative scene graph wired to React state" — this game has no React components and no reactive UI. You'd also pay for the reconciler on every frame. | Plain Three.js imperative API. |
| **Babylon.js** | Excellent engine, but 1.5–2 MB gzipped core vs Three's ~600 KB, and the community/tutorial surface area for endless-runner patterns is much smaller. Great for PBR-heavy product viewers, not the right call for a low-poly cartoony runner on mobile. | Three.js. |
| **PlayCanvas** | Hosted editor + runtime is genuinely good for 3D web games, but: (a) embeds their runtime (~400 KB) + scene format, (b) the editor is a workflow lock-in that fights your "single static bundle embedded on WordPress" goal, (c) the team already committed to Three.js in project constraints. | Three.js + Vite. |
| **Unity WebGL** | 5–15 MB initial download, 3–10s startup time on mobile, battery-hostile, fights iOS Safari on memory limits. Completely wrong for a "grab attention in 5 seconds" marketing embed. | Three.js. |
| **Godot HTML5 export** | Smaller than Unity but still 5+ MB, slow startup, Godot 4 web export has known iOS Safari audio and threading issues in 2026. | Three.js. |
| **cannon-es / rapier3d** | See Q5 — overkill for a 3-lane runner, costs bundle size and integration time. | Hand-rolled AABB. |
| **Hammer.js** | Unmaintained since 2017; Pointer Events make it obsolete. | Native Pointer Events. |
| **Zustand / XState / Redux** | Zero React components → zero reason for a state lib. | Plain JS module singleton. |
| **jQuery, Lodash (full)** | No DOM-wrangling or data-munging needs that modern JS can't cover. | Native JS. |
| **Webpack** | Slower dev cycle than Vite for 2026; config burden is real. | Vite. |
| **FBXLoader at runtime** | Huge and slow parse. | Convert FBX→GLB with `gltf-transform` offline; load GLB. |
| **TWEEN.js (the old one)** | Unmaintained `@tweenjs/tween.js` has a successor but even that is ~5 KB for 3 tweens. | Hand-rolled `damp()` (exponential smoothing) — 4 lines. |
| **THREE.EffectComposer + post-processing stack** | Bloom, SSAO, DOF, motion blur all *tank* mobile GPUs. Project explicitly forbids expensive post-processing. | Ship with clean forward rendering, tone-mapping set to `NoToneMapping` or `ACESFilmicToneMapping`, and fog. Fog alone gives the "endless runner" atmosphere for free. |
| **WebGPURenderer** (three/webgpu) | Still evolving in 2026, mobile Safari support incomplete, no visual win for low-poly cartoon style. | `WebGLRenderer`. |
| **GSAP** | Great library, but 30+ KB for tweens the game only needs for lane-switching and HUD pops. | Native `damp()` + CSS transitions for HUD. |
| **TypeScript** (optional avoid for timeline) | Not *wrong*, but adds ceremony under a 1-2 week deadline. TS is worth it if the team is fast in TS; otherwise stay vanilla and ship. | Vanilla JS + JSDoc type hints where they help. |

---

## Performance Budget (mobile target: 60 fps on mid-range Android)

| Budget | Target | Notes |
|--------|--------|-------|
| Initial JS (gzipped) | < 300 KB | Three.js is ~200 KB gzipped; game code should be well under 100 KB. |
| Initial assets (GLBs + audio) | < 2 MB total | Enforces KTX2 textures + meshopt geometry. |
| Draw calls per frame | < 100 | Merge static city chunks, instance repeated props (cones, Linkys) via `InstancedMesh`. |
| Triangles on screen | < 150k | Ninty ≤15k, Linky ≤2k, terrain chunks ≤30k each × ~3 visible. |
| Textures | ≤ 2048×2048, all KTX2 | Per project constraint. |
| Lights | 1 directional + 1 ambient | No point/spot lights with shadows on mobile. |
| Shadows | Single directional shadow map, 1024², pcfsoft off | Or bake shadows into the terrain texture and ship zero real-time shadows. |
| Post-processing | None | Fog + tone mapping only. |
| Time to first interactive frame | < 3 s on 4G mid-range Android | Enforces asset budget and preloader UX. |

---

## Alternatives Considered (summary)

| Recommended | Alternative | When Alternative Wins |
|-------------|-------------|------------------------|
| Three.js + vanilla | R3F + React | If the team's only 3D experience is via R3F and timeline allows, and bundle size is less critical. Not this project. |
| Vite | Webpack | Existing Webpack config you can't abandon. Not this project. |
| Hand-rolled AABB | Rapier | Physics-driven gameplay (ragdoll, destructibles, stacking). v2 only. |
| Howler.js | Raw Web Audio | Audio-heavy game with procedural synthesis or 3D positional audio. Not this project. |
| Plain module state | XState | Formal FSM for complex multi-actor workflows. Not a 4-state runner. |
| Pointer Events | Hammer.js | Never in 2026. |
| Cloudflare Pages | WordPress static upload | Ops team mandates single-domain hosting with no subdomain and iframe is off the table. |
| WebGLRenderer | WebGPURenderer | Custom compute shaders or 1M-vert scenes. Not this project. |
| Meshopt | Draco | Geometry so heavy Draco's extra compression pays for its 200 KB decoder. Unlikely here. |
| KTX2/Basis | Raw PNG/JPG | Assets are tiny and VRAM isn't the bottleneck. Not on mobile. |

---

## Version Compatibility Notes

| Package | Compatibility | Notes |
|---------|---------------|-------|
| `three@0.17x` + `three/examples/jsm/*` | Must match the same version | `jsm` examples are not published separately; always import from `three/examples/jsm/...` of the installed three. |
| `three` + `vite` | Any combo fine | Vite handles Three's ESM imports natively. |
| `DRACOLoader` decoder WASM | Version must match loader | Copy from `node_modules/three/examples/jsm/libs/draco/` to `/public/draco/` on build, or load from Google's CDN `https://www.gstatic.com/draco/versioned/decoders/1.5.x/`. Pin the decoder version. |
| `KTX2Loader` + `BasisTranscoder` | Version coupling | Same: copy `three/examples/jsm/libs/basis/` to `/public/basis/`. |
| `howler@2.2.x` | Works everywhere | No peer deps. |
| iOS Safari 15+ | WebGL2, Pointer Events, Opus audio, KTX2 (ASTC) | All required features present. iOS 14 and below: not supported — project targets 15+. |

---

## Sources

- **Three.js official docs** — `https://threejs.org/docs/` (HIGH, canonical for API)
- **Three.js migration guide** — `https://github.com/mrdoob/three.js/wiki/Migration-Guide` (HIGH, check before upgrading)
- **Three.js manual: loading 3D models** — `https://threejs.org/manual/#en/load-gltf` (HIGH)
- **gltf-transform docs** — `https://gltf-transform.dev/` (HIGH, canonical for GLB optimization)
- **meshoptimizer / gltfpack** — `https://github.com/zeux/meshoptimizer` (HIGH, canonical for Meshopt)
- **Vite docs** — `https://vitejs.dev/` (HIGH)
- **Howler.js** — `https://howlerjs.com/` (HIGH)
- **MDN Pointer Events** — `https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events` (HIGH)
- **Basis Universal / KTX2** — `https://github.com/BinomialLLC/basis_universal` (HIGH)
- **Cloudflare Pages docs** — `https://developers.cloudflare.com/pages/` (HIGH)

**Verification status:** Live `npm view` / WebFetch / WebSearch were not available in this research session. Exact version numbers should be re-verified with `npm view three version`, `npm view vite version`, `npm view howler version` before `package.json` is committed. All architectural recommendations (what to use, what not to use, why) are HIGH confidence based on stable, long-standing Three.js ecosystem consensus that has not shifted in the 12 months before the research date.

---

*Stack research for: Three.js 3D endless runner embedded on saynine.ai*
*Researched: 2026-04-08*
