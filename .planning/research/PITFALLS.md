# Pitfalls Research

**Domain:** Browser-based 3D endless runner (Three.js, mobile-first, marketing-embed) — solo 1-2 week sprint
**Researched:** 2026-04-08
**Confidence:** HIGH on Three.js / mobile / iOS Safari pitfalls (these are stable, well-documented, and have not shifted in years). MEDIUM on the specific 138 MB Ninty.glb response (depends on what's *inside* it — see Pitfall 1).

This list is deliberately Three.js-flavored and brutal. Generic "write clean code" advice has been omitted. Every entry has a detection signal, a concrete prevention, and a phase mapping. Phase numbers are placeholders and will be reconciled by the orchestrator against the final roadmap; the *ordering* and *which-phase-owns-it* logic should hold regardless of renumbering.

Phase shorthand used below:
- **P0 — Setup & Asset Triage** (Vite scaffold, asset pipeline, placeholder cubes)
- **P1 — Core Loop Vertical Slice** (renderer, fixed-time loop, 3-lane player, collision, one obstacle type)
- **P2 — World & Animation** (procedural chunks, GLB import, AnimationMixer, all obstacle types)
- **P3 — Polish & Game Feel** (HUD, audio, magnet power-up, juice)
- **P4 — Mobile Hardening** (real-device testing, perf budget enforcement, input tuning)
- **P5 — Embed & Deploy** (Cloudflare/iframe/WP integration on saynine.ai, CSP, GDPR, share)

Mobile hardening (P4) is deliberately *not* the last phase. Deferring real-device testing to the end is itself one of the largest pitfalls in this list — see Pitfall 25.

---

## Critical Pitfalls

### Pitfall 1: The 138 MB Ninty.glb is shipped (or naively decimated)

**What goes wrong:**
A 138 MB GLB is roughly 150–250× larger than the entire mobile asset budget for the whole game (target: <2 MB total assets, see STACK.md). Loading it on a mid-range phone over 4G takes 30–90 seconds, blows past iOS Safari's per-tab memory ceiling on upload, and the textures alone will exceed VRAM on a Pixel 5a or iPhone SE. The visitor bounces before the loading bar finishes. Even on desktop fiber, first-frame-to-interactive blows past the 3 s budget.

**Why it happens:**
Artist exports from Blender/Maya with: (a) 4K or 8K PBR textures (albedo + normal + roughness + metalness + AO + emissive) as embedded uncompressed PNGs, (b) full subdivision-surface geometry (often 200k–1M tris), (c) every animation clip from the rig library including unused ones, (d) no texture compression, (e) Y-up vs Z-up confusion sometimes adds an extra root transform. 138 MB is the textbook signature of "embedded PNGs + un-decimated mesh."

**How to avoid — concrete pipeline for this exact file:**

1. **Inspect first, decide second.** Run `gltf-transform inspect Ninty.glb` to get the size breakdown (mesh vs textures vs animations). 95% chance the answer is "textures are 130 of the 138 MB."
2. **Reject the file as a runtime asset.** It is a *source asset*. Treat it like a `.psd`, not like a deliverable.
3. **Run the optimization pipeline offline once:**
   ```
   gltf-transform optimize Ninty.glb Ninty.opt.glb \
     --texture-compress ktx2 \
     --texture-size 1024 \
     --compress meshopt \
     --simplify 0.5 \
     --prune \
     --weld
   ```
   Target: under 2 MB. Realistic: 800 KB–1.5 MB for a 15k-tri rigged character with 1024² KTX2 textures.
4. **If `--simplify 0.5` destroys the silhouette**, ask the artist for a re-export at ≤15k tris (project constraint) rather than auto-decimating. Decimation of organic characters often wrecks the rig weights.
5. **Keep only the animation clips you ship**: `idle`, `run`, `jump`, `slide`, `death`. Strip everything else with `gltf-transform`'s `--keep-animations`-style filter (or manually in Blender). Each unused clip is dead weight in every download.
6. **Document the optimized filename in the repo** (`assets/source/Ninty.glb` ignored by git via `.gitignore`, `public/models/ninty.glb` is the optimized one that ships). Source is never loaded at runtime.
7. **If after all this it's still over 3 MB**, the model itself is too heavy and needs an artist re-export. There is no JS-side fix.

**Warning signs:**
- Network tab shows the GLB request as the longest bar by 10×
- `gltf-transform inspect` shows any single texture > 500 KB
- Triangle count > 25k for the player mesh
- Any embedded texture is PNG/JPG rather than KTX2 in production
- iOS Safari tab crashes during load on a real iPhone SE / iPhone 12 mini

**Phase to address:** **P0**. Asset triage is part of project setup, not "polish later." If this isn't fixed in P0, every subsequent phase is built on a broken foundation. Placeholder cubes are the development asset until the optimized GLB exists.

---

### Pitfall 2: Uncompressed PNG textures inside an otherwise-fine GLB

**What goes wrong:**
A GLB looks reasonable on disk (say, 4 MB) because PNGs are zlib-compressed inside the container, but on upload to GPU each texture is decompressed to raw RGBA — a 1024×1024 PNG becomes ~4 MB of VRAM, a 2048² texture becomes ~16 MB. Three or four such textures and you've exhausted the VRAM budget on a mid-range Android, causing texture thrashing, page-long upload stalls, and the dreaded WebGL context loss.

**Why it happens:**
Disk size != VRAM size. Developers see "4 MB GLB, fine" and miss that it expands 10× on the GPU. Three.js does not warn about this.

**How to avoid:**
- Convert every texture to KTX2 / Basis Universal via `gltf-transform optimize --texture-compress ktx2`. KTX2 transcodes to GPU-native compressed formats (ASTC on iOS/Android, BC7 on desktop) and stays compressed in VRAM — typically 4–8× smaller than RGBA.
- Wire `KTX2Loader` into `GLTFLoader` with `loader.setKTX2Loader(ktx2Loader.detectSupport(renderer))` *before* loading any model. Forgetting `detectSupport` is a common bug — the loader silently falls back to uncompressed.
- Copy the basis transcoder WASM/JS from `node_modules/three/examples/jsm/libs/basis/` to `/public/basis/` and `ktx2Loader.setTranscoderPath('/basis/')`.

**Warning signs:**
- `renderer.info.memory.textures` (in stats overlay) > 50 MB
- Visible "texture pop" 1–2 seconds after the loading bar completes (uploads finishing on first render frame)
- Spector.js shows textures with `gl.RGBA` format instead of a compressed format like `COMPRESSED_RGBA_ASTC_4x4_KHR`

**Phase to address:** **P0** (set up the loader correctly) and **P2** (verify when real assets land).

---

### Pitfall 3: Shader compilation hitch on first obstacle / first power-up

**What goes wrong:**
Three.js compiles shaders lazily — the *first time* a material with a unique combination of features (skinning + fog + shadow + alpha test, etc.) is rendered, the GPU stalls 50–500 ms compiling the program. On mobile this is much worse: 200 ms–2 seconds. Players experience this as a freeze the first time they jump (skinned animation shader), the first time they collect a Linky (instanced material), and the first time the magnet activates (emissive shader). It looks like the game is broken.

**Why it happens:**
Shaders are compiled on first draw, and `WebGLRenderer` makes no attempt to compile them eagerly unless told to.

**How to avoid:**
- Call `renderer.compile(scene, camera)` after the scene is fully populated *but before the player presses Start*. This forces synchronous compilation of every material currently in the scene during the loading screen, where a hitch is invisible.
- Even better: spawn one of every obstacle type, one Linky, and the magnet effect off-screen during the warm-up frame, then `renderer.compile(scene, camera)`, then despawn them. This pre-compiles every shader the player will ever see.
- Use `renderer.compileAsync(scene, camera)` (Three r152+) if available — it spreads compilation across multiple frames so the loading spinner stays animated.
- Avoid creating new materials at runtime. Reuse one material per obstacle type. `material.clone()` for color variants compiles a new shader program.

**Warning signs:**
- Frame time spike (visible in stats.js) the *first* time a new entity type appears, never again afterward
- `renderer.info.programs.length` increases mid-game
- Players report "first jump feels laggy then it's fine"

**Phase to address:** **P4 (Mobile Hardening)** primarily; the warm-up step should be added in **P3** when the loading screen is built.

---

### Pitfall 4: Color space migration not done — sunny city looks washed-out and grey

**What goes wrong:**
Three.js r152+ defaults output to linear color space unless you explicitly set sRGB. Tutorials and Stack Overflow code older than mid-2023 use `renderer.outputEncoding = THREE.sRGBEncoding`, which is removed. The result: textures painted in sRGB (every artist export) get rendered as if they were linear, producing a grey, milky, "indie game from 2014" look. The brand colors `#FF8A3B` and the orange→red gradient look brown.

**Why it happens:**
Quiet API change in r155 (physically-correct lighting became default) and r152 (`outputEncoding` → `outputColorSpace`). Most copy-pasted scaffold code is from before the change.

**How to avoid:**
- `renderer.outputColorSpace = THREE.SRGBColorSpace` (this is now the default in recent r1xx, but set it explicitly for documentation).
- Texture loading: any texture used as a color map (`map`, `emissiveMap`) must have `texture.colorSpace = THREE.SRGBColorSpace`. Normal maps, roughness, metalness, AO must remain `THREE.NoColorSpace` (i.e. linear) — setting them to sRGB will produce wrong lighting. `GLTFLoader` handles this automatically; manual texture loads do not.
- HUD CSS colors are independent of the WebGL color space — but verify the WebGL canvas next to a DOM element with the same hex value: they should look identical. If the canvas color looks dimmer/oranger, the color space is wrong.

**Warning signs:**
- Brand orange in-canvas looks brown or muted compared to the same hex on the surrounding HUD
- Lighting looks "flat and washed out" no matter how many lights you add
- Normal maps look inverted or have weird highlights (you set the normal map to sRGB by accident)

**Phase to address:** **P1** — set on day one in the renderer init. Cheap to set, expensive to debug later.

---

### Pitfall 5: Delta-time spikes after tab switch destroy the player

**What goes wrong:**
Player switches tabs for 30 seconds. On return, `requestAnimationFrame` fires and `clock.getDelta()` returns ~30 seconds. The next physics tick advances the player 30 seconds × ~8 m/s = 240 meters forward, *through* every obstacle in the chunk buffer. Player is dead before they see the screen. Or, in physics-style code, the player tunnels through the ground and falls forever. Or the AnimationMixer plays 30 seconds of the run cycle at once and goes out of sync.

**Why it happens:**
Browsers throttle `rAF` to 0–1 Hz on hidden tabs (and stop it entirely on iOS Safari). The first frame after resume reflects the entire elapsed wall-clock time as a single delta.

**How to avoid:**
- **Cap the delta** every frame: `const dt = Math.min(clock.getDelta(), 1/30)`. This is the single line that prevents 90% of resume bugs.
- **Pause on visibility change**: `document.addEventListener('visibilitychange', () => { if (document.hidden) game.pause(); })`. Combine with the explicit pause button. On resume, do *not* auto-unpause — show "Tap to resume" so the player isn't ambushed.
- **Reset the clock on resume**: `clock.getDelta()` once and discard before the first real tick to flush stale time.
- For deterministic physics (collision), use a **fixed timestep accumulator**: `accum += dt; while (accum >= STEP) { stepPhysics(STEP); accum -= STEP; }`. STEP = 1/60. This decouples simulation from frame rate and is what eliminates "feels different on different devices."

**Warning signs:**
- Player dies the moment they tab back in
- Run animation skips 1–2 seconds visibly on resume
- Game speed feels different on a 120Hz display vs a 60Hz display (frame-time-dependent physics, not delta-time-dependent)
- Anything in the game uses `+= constant` instead of `+= constant * dt`

**Phase to address:** **P1** — fixed timestep + delta cap belongs in the very first frame of the game loop. Adding it later means re-tuning every speed/gravity constant.

---

### Pitfall 6: AnimationMixer cross-fade warps the run cycle into a slow-motion zombie shuffle

**What goes wrong:**
Cross-fading from `idle` (3s clip) to `run` (1s clip) with `crossFadeTo(runAction, 0.3, true)` — note the `warp=true` — causes Three.js to time-warp both clips so they "finish together" during the fade. For a tiny moment `run` plays at 1/3 speed and looks broken. Cross-fading without `warp` and without zeroing weights properly leaves both actions playing forever, costing perf and producing skeletal pose-blending artifacts on the elbows and knees.

**Why it happens:**
`warp` is a footgun — the Three.js docs explain it but most tutorials don't, and "warp them so they line up" sounds correct until you see what it does to a 1s vs 3s clip pair.

**How to avoid:**
- Use `crossFadeTo(action, 0.2, false)` for clips of similar length (idle ↔ run).
- For one-shot transitions (run → jump), do not cross-fade at all. Use `runAction.fadeOut(0.1); jumpAction.reset().fadeIn(0.1).play()`.
- Always set one-shots to `setLoop(LoopOnce)` and `clampWhenFinished = true`, then listen for the `finished` event on the mixer to fade back to run.
- Stop, don't just fade: after a fade-out, call `action.stop()` or `setEffectiveWeight(0)` so the mixer doesn't keep evaluating the dead clip.

**Warning signs:**
- Mid-jump the model briefly snaps back to the run pose
- Skeleton "vibrates" on shoulder/hip during transitions
- `mixer._actions.length` grows over time (memory leak symptom)
- Run cycle visibly slows down for 0.3 seconds at the start of every game

**Phase to address:** **P2** — when the real GLB and AnimationMixer wiring lands.

---

### Pitfall 7: Root motion in the run clip drifts Ninty out of his lane

**What goes wrong:**
Artist exports the run animation with the root bone moving forward (so the character "actually runs" in the preview). At runtime, the AnimationMixer applies that root translation to the model on top of the game-driven `player.x/z` movement. Ninty drifts diagonally across the screen, leaves his lane, and walks into walls. Or the artist exports in-place but with a slight rotational drift, and Ninty slowly rotates 180° over 30 seconds.

**Why it happens:**
"Root motion" is an animation industry standard for cinematics. For game characters with code-driven movement, you want the *opposite* — in-place animation. The artist defaults differ from the engineer's needs.

**How to avoid:**
- Tell the artist explicitly: **"All locomotion clips must be in-place (root bone stationary)."** Document this in the asset spec.
- If the artist can't re-export in time, strip root motion at load: after loading, find the root bone (`mesh.skeleton.bones[0]`) and zero its position track in each clip:
  ```js
  for (const clip of gltf.animations) {
    clip.tracks = clip.tracks.filter(t => !t.name.endsWith('Hips.position'));
  }
  ```
  (Adjust the bone name to whatever the rig uses — `Hips`, `Root`, `Armature`, etc.)
- Alternatively use `THREE.AnimationUtils.makeClipAdditive(clip)` for additive blending, but for a runner just stripping the position track is simpler.

**Warning signs:**
- Ninty visibly slides sideways during the run cycle even when not switching lanes
- The model's world position diverges from `player.x` over time
- Lane snap happens but the model "lags" behind

**Phase to address:** **P2** — first thing to verify when the rigged GLB loads.

---

### Pitfall 8: `mesh.clone()` shares the skeleton — animations on copies break

**What goes wrong:**
You decide to clone Ninty for a "ghost replay" or to clone Linky to spawn many of them. `mesh.clone()` returns a new Object3D but the skeleton, bones, and skinned-mesh bind matrices are *shared by reference*. Animating one clone animates all of them, or worse, produces a frozen T-pose because the bind state is wrong.

**Why it happens:**
`Object3D.clone()` is shallow for skeletal data. This is a 10-year-old Three.js gotcha that catches everyone exactly once.

**How to avoid:**
- For skinned meshes, **always** use `SkeletonUtils.clone(mesh)` from `three/examples/jsm/utils/SkeletonUtils.js`. This deep-clones the skeleton and rewires bone references.
- For Linky (static, non-skinned, just spinning), `mesh.clone()` is fine — but better, use `THREE.InstancedMesh` for hundreds of Linkys at once. One draw call, one geometry, one material, per-instance matrix. Massive perf win.
- Single-player Ninty does not need cloning — keep one instance.

**Warning signs:**
- Cloned skinned mesh appears in T-pose or with limbs at the origin
- Animating one clone animates the others
- `console.log(mesh.skeleton === clone.skeleton)` returns `true`

**Phase to address:** **P2**. For Linky in particular, use `InstancedMesh` from the start of P2, not `mesh.clone()` in a loop.

---

### Pitfall 9: One-shot animations silently loop because `setLoop` was forgotten

**What goes wrong:**
Jump animation plays, lands, then plays again. And again. Ninty appears to be jumping rope while running. Or the death animation loops, so the game-over screen has Ninty repeatedly dying behind it.

**Why it happens:**
`AnimationAction` defaults to `LoopRepeat`. There is no warning when you `play()` a clip that should be one-shot.

**How to avoid:**
- For every action that is logically one-shot, after creating it:
  ```js
  action.setLoop(THREE.LoopOnce);
  action.clampWhenFinished = true;
  ```
  `clampWhenFinished` holds the last frame instead of snapping back to bind pose.
- Listen for completion:
  ```js
  mixer.addEventListener('finished', e => {
    if (e.action === jumpAction) returnToRun();
  });
  ```
- Centralize action setup in one function so this is impossible to forget per-clip.

**Warning signs:**
- Jump or slide visibly repeats
- Death pose snaps to T-pose
- The mixer fires `finished` events you never registered for

**Phase to address:** **P2**.

---

### Pitfall 10: AABB collision tunneling at high speed (and after speed-ramp)

**What goes wrong:**
At base speed (8 m/s) and 60 fps, the player moves 0.13 m per frame — fine. After 90 seconds the speed has ramped to 16 m/s and the player moves 0.27 m per frame. A traffic cone is ~0.5 m deep. On a 30 fps moment (frame drop, mid-range Android), the player moves 0.53 m and the cone sits *between* the previous and current positions — AABB check at the new position misses it. Player passes through the obstacle and dies later for no visible reason, or doesn't die at all and the run feels broken.

**Why it happens:**
Discrete collision detection assumes the player's box and the obstacle's box overlap *at the sample point*. Fast-moving thin objects violate this. This is the "bullet through paper" problem.

**How to avoid:**
- **Swept AABB**: instead of checking the player's box against obstacles at the new position, check the *swept volume* from previous to current position. For a forward-only runner this simplifies dramatically: extend the player's z-min back to the previous z position. ~5 extra lines.
- **Or**, **substep collision**: if the per-frame z-delta exceeds half the smallest obstacle depth, run collision in 2 substeps. This is automatic if you're already using a fixed-timestep accumulator (see Pitfall 5).
- **Cap obstacle depth**: don't ship obstacles thinner than 0.5 m in the z direction. Simple authoring constraint.
- **Cap max speed**: the speed ramp should plateau at a value where `max_speed / 60 < min_obstacle_depth / 2`. Document the math so designers don't crank speed without re-checking.

**Warning signs:**
- Players report "I didn't hit anything but I died" or "I clearly hit that and I didn't die"
- Death rate drops as the game speeds up (should be the opposite)
- Frame-rate-dependent collision behavior on different devices

**Phase to address:** **P1** — get the AABB right with sweep from the start. Retrofitting after the speed ramp lands is painful.

---

### Pitfall 11: Lane switch mid-collision creates ghost hits and false negatives

**What goes wrong:**
Player swipes left into a clear lane just as a parked car approaches in the current lane. The lane switch is a 0.15s tween. During those 0.15 seconds the player's x position is *between* lanes, so the AABB overlaps both the original-lane car (the one they're escaping) and any obstacle in the destination lane edge. The player dies *while* successfully dodging. Felt as the most unfair death in the game.

**Why it happens:**
Continuous x-position vs lane-locked obstacle authoring. The authoring assumption (one obstacle per lane) is violated by the in-between state.

**How to avoid:**
- **Shrink the player's collision box on the x-axis** to ~60% of the lane width. The visual mesh stays full size; only the collider is narrow. This buys forgiveness frames during transitions.
- **OR** treat lane transitions as instantaneous for collision purposes: collision uses `player.lane` (discrete int) not `player.x` (continuous float). The visual tween is purely cosmetic. This is the Subway Surfers approach.
- **OR** add a brief invulnerability frame (≤80 ms) at the start of every lane switch. Cheap and feels generous.
- Pick one approach, document it, never mix.

**Warning signs:**
- Players say "I dodged that!"
- Death heatmap (if you log) shows clusters at lane-transition x-values
- Two adjacent obstacles in different lanes always kill the player even with a clean swipe

**Phase to address:** **P1** — the discrete-lane collision approach is a foundational decision and must land with the player FSM.

---

### Pitfall 12: iOS audio doesn't unlock — game ships silent on iPhone

**What goes wrong:**
You ship the game, test it on desktop, it works. Visitor opens it on iPhone Safari, hits Start, plays the entire run with no music and no SFX. iOS Safari requires a user-gesture-driven `AudioContext.resume()` *before* any sound will play, and it has to be on the *first* touch event, in the same call stack.

**Why it happens:**
Apple's autoplay policy. Howler.js handles this automatically *if* you let it — but if you autoplay music on page load, or trigger sound from a `setTimeout`, iOS rejects it silently.

**How to avoid:**
- Use Howler.js (it has built-in iOS unlock logic — see STACK.md).
- Never call `Howler.mute(false)` or `sound.play()` from a `setTimeout`, `requestAnimationFrame`, or `Promise.then` *before* the user has tapped at least once. The unlock must happen synchronously inside a real user-gesture handler.
- The "Tap to start" button is doing double duty — it's the audio unlock. Make sure the very first thing it does is `Howler.ctx.resume()` or play a 1-sample silent buffer.
- Test on a *real iPhone*, not desktop Safari. Desktop Safari does not have the same restriction and will fool you.

**Warning signs:**
- Sound works on desktop, missing on iPhone
- `Howler.ctx.state === 'suspended'` after the first tap
- Console warning "The AudioContext was not allowed to start"

**Phase to address:** **P3** when audio is wired in, verified in **P4** on real iOS hardware.

---

### Pitfall 13: Background music gap on loop — you hear "click... click... click"

**What goes wrong:**
Howler's `loop: true` plays a clip end-to-start, but most music exports have 5–50 ms of digital silence at the start or end of the file (DAW export padding). The loop point is audible as a tiny pause that becomes maddening over a 90-second run. Or the music is an MP3, which has an unavoidable encoder delay at the start (~50 ms) — MP3 *cannot* loop seamlessly.

**Why it happens:**
MP3 format limitation + DAW export defaults.

**How to avoid:**
- Ship background music as **`.webm` (Opus) primary**, MP3 only as a fallback. Opus handles seamless looping. iOS Safari 15+ supports Opus.
- Strip leading/trailing silence in Audacity or `ffmpeg` before export.
- Or fade-in/fade-out the loop manually with `Howler.on('end', ...)` and a tiny crossfade — but this is overkill if you just use Opus.

**Warning signs:**
- Audible click/pause every N seconds during gameplay (where N = music length)
- The pause coincides with the music duration

**Phase to address:** **P3**.

---

### Pitfall 14: iOS scroll/zoom hijacks swipe gestures

**What goes wrong:**
Player swipes up to jump. iOS Safari interprets the swipe as a page scroll and the entire site scrolls instead of jumping. Or pinch-zooms. Or pulls down to refresh. The game is unplayable on mobile.

**Why it happens:**
Browser default gestures (scroll, pull-to-refresh, pinch-zoom, double-tap-zoom) compete with custom swipe handlers. `preventDefault()` in `touchmove` only partially helps — iOS Safari ignores it for some gestures unless `touch-action` CSS is set.

**How to avoid:**
- On the canvas element: `touch-action: none; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none;`.
- On the body or game wrapper: `overscroll-behavior: none;` to kill pull-to-refresh.
- Add `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">`. The `maximum-scale=1` and `user-scalable=no` are essential to disable double-tap zoom and pinch.
- Use **Pointer Events**, not touch events — `pointerdown` / `pointerup` work uniformly across iOS/Android/desktop. Hand-rolled (15 lines, see STACK.md). Do not import Hammer.js.
- Test on a real iPhone — desktop devtools mobile mode does *not* reproduce all iOS gesture behavior.

**Warning signs:**
- Page scrolls when the player swipes
- Zoom in/out happens accidentally during play
- Pull-to-refresh triggers when swiping down to slide
- Swipes "miss" because the browser ate the gesture

**Phase to address:** **P1** for keyboard, **P2** for swipe wiring, **P4** for real-device verification.

---

### Pitfall 15: iframe sizing breaks on the WordPress embed

**What goes wrong:**
Game runs perfectly at `play.saynine.ai`. Embed via `<iframe>` on the WP page and it's either a tiny 300×150 box (iframe default), or it's full-width but only 400 px tall, or it scrolls inside its container, or the canvas never reaches mobile viewport edges. Mobile users get a postage stamp.

**Why it happens:**
`<iframe>` has no intrinsic content sizing. The parent decides. WordPress themes apply CSS resets that fight `width: 100%`. Mobile WP layouts add padding/margins that push the iframe off-screen.

**How to avoid:**
- Inside the iframe: full-viewport canvas with `position: fixed; inset: 0; width: 100vw; height: 100vh;` on a wrapper. The game *owns* the iframe.
- Outside the iframe (WP shortcode template): set explicit aspect ratio via `aspect-ratio: 16/9` on the iframe element, or fixed `height` for desktop and `height: 100vh` for mobile via media query. Or use `height: 100svh` (small viewport height) on iOS so the URL bar doesn't crop.
- Add `allow="autoplay; fullscreen; gamepad"` and `allowfullscreen` on the iframe element — Apple requires both `allow="fullscreen"` *and* `allowfullscreen` for the older API.
- Test on real Safari iOS (not desktop Safari responsive mode) — `100vh` is famously wrong on iOS Safari due to the URL bar; use `100dvh` / `100svh`.

**Warning signs:**
- Canvas is much smaller than the iframe
- Iframe is much smaller than the page section
- Bottom of the game is hidden behind the iOS URL bar
- Inner scrolling within the iframe instead of game-only

**Phase to address:** **P5**, but prototype the iframe wrapper and test on a real WP page in **P4** — finding embed bugs the day before launch is its own pitfall.

---

### Pitfall 16: CSP on saynine.ai blocks the game's inline scripts and WASM

**What goes wrong:**
WP site has a Content Security Policy (CSP) header — common with security plugins (Wordfence, SecuPress). It includes `script-src 'self'` and possibly `worker-src 'self'`. The Vite-built game uses inline `<script>` for module loading, loads Basis transcoder WASM, fetches GLBs, and may use blob URLs for workers. CSP blocks all of this. Game loads as a black screen with 30 console errors.

**Why it happens:**
WordPress security plugins set restrictive CSP without coordinating with embedded apps.

**How to avoid:**
- **Iframe approach (recommended):** host the game on a different origin (`play.saynine.ai`) so the parent CSP doesn't apply to the iframe document at all. Iframes have their own CSP context. Add `frame-src https://play.saynine.ai` to the parent CSP if it has `frame-src` set.
- **Same-origin static upload approach:** coordinate with whoever maintains the WP CSP to add: `script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; img-src 'self' data: blob:; connect-src 'self' data:; media-src 'self' blob:`. The `'wasm-unsafe-eval'` is required for Basis transcoder.
- Avoid inline scripts in the Vite build with `build.cssCodeSplit: false` and configure Vite to emit only external scripts (default behavior since Vite 4).
- Test the embedded game in a private/incognito window on the *real* saynine.ai page before declaring P5 done.

**Warning signs:**
- Console errors mentioning "Refused to execute" or "violates the following Content Security Policy"
- Black canvas with no JS errors except CSP ones
- Works at `play.saynine.ai` direct, broken when embedded

**Phase to address:** **P5**, with a CSP audit conversation in P4 if the saynine.ai team has known CSP rules.

---

### Pitfall 17: Three.js ESM-only — old `require` patterns and CDN copy-paste fail

**What goes wrong:**
You copy a tutorial from 2021 that does `const THREE = require('three')` or `<script src="three.min.js">` with global `THREE`. Modern Three.js (r150+) is ESM-only — there is no UMD build, no global `THREE`, no `require`. Build fails or everything is undefined.

**Why it happens:**
Three.js dropped UMD builds. Many tutorials and Stack Overflow answers predate this.

**How to avoid:**
- Always import: `import * as THREE from 'three'` and `import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'`. Note the `.js` extension — required for ESM resolution.
- For loaders, the path is `three/examples/jsm/...` — not `three/examples/js/...` (the latter is the old non-ESM path and was removed).
- Ignore any tutorial that uses `script` tags with `three.min.js`.
- If a third-party Three.js library hasn't published ESM, don't use it.

**Warning signs:**
- `THREE is not defined`
- `Cannot find module 'three/examples/js/...'`
- `require is not defined`

**Phase to address:** **P0**.

---

### Pitfall 18: Garbage collection causes microstutter every few seconds

**What goes wrong:**
The game runs at 60 fps with occasional 16–60 ms spikes every 2–5 seconds. Players don't see "lag" — they feel "this game stutters." On profiling, the spikes correlate with V8 minor GC. Cause: per-frame allocation of `Vector3`, `Box3`, arrays, closures, etc.

**Why it happens:**
Three.js math objects (`Vector3`, `Box3`, `Matrix4`, `Quaternion`) are heap-allocated. Creating one per frame per object × 30 obstacles × 60 fps = 1800 allocations/sec. The minor GC eventually pauses to clean them up.

**How to avoid:**
- **Reuse temporary math objects.** Module-level scratch:
  ```js
  const _v = new THREE.Vector3();
  const _box = new THREE.Box3();
  function check(obj) {
    _v.copy(obj.position);
    _box.setFromObject(obj);
    // ...
  }
  ```
- **Object-pool obstacles and Linkys** instead of creating/destroying. Spawn N instances at startup, recycle by repositioning.
- **Avoid array literals in the loop.** `for (const o of [a,b,c])` allocates a 3-element array every frame.
- **Avoid closures captured in loops.** `obstacles.forEach(o => doStuff(o))` allocates a closure unless the function is hoisted.
- **`InstancedMesh` for Linkys** — one Object3D, hundreds of instances, near-zero allocation.
- Profile with Chrome DevTools Performance tab, look for GC bars.

**Warning signs:**
- Stats.js shows fps spikes every few seconds
- Chrome Performance profile shows yellow "Minor GC" bars during gameplay
- "Heap size" graph in DevTools sawtooths

**Phase to address:** **P4** — premature optimization here is a waste, but the patterns (scratch vars, pooling) should be present from **P1** so they don't have to be retrofitted.

---

### Pitfall 19: Speed ramp + procedural spawning produces unwinnable runs

**What goes wrong:**
At high speed, the spawn system places three obstacles in three lanes simultaneously, with no gap, with the slide-only obstacle directly after a jump-only obstacle. The player physically cannot react in time. Players blame the game and quit.

**Why it happens:**
Procedural spawning chooses each obstacle independently without looking at the surrounding pattern. Random ≠ fair.

**How to avoid:**
- **Hand-author "chunks" of 4–8 obstacle slots**, each chunk verified solvable. Spawn picks a random chunk from a pool of ~20 hand-authored ones, rotates/mirrors them.
- **Always leave at least one safe lane** in any cross-section. Validate at spawn time: if all three lanes are obstructed at a given z, abort and pick a different chunk.
- **Reaction-time floor**: minimum gap between consecutive obstacles in the same lane is `(reaction_time × current_speed)`. Reaction time = 350 ms for casual players. At 16 m/s that's 5.6 m minimum.
- **Don't place jump-only and slide-only in adjacent slots** in the same lane — the player needs landing time.

**Warning signs:**
- Playtesters die in the same spot every time
- Death rate is correlated with speed in a non-linear way (cliff at some speed)
- "There was nowhere to go" feedback

**Phase to address:** **P2** for the chunk system, **P3** for tuning during playfeel.

---

### Pitfall 20: GDPR / cookie banner eats the game start

**What goes wrong:**
saynine.ai has a cookie banner (Cookiebot, Iubenda, OneTrust). Banner overlays the page on first visit. On the embed page, the banner sits *over* the game canvas, blocks the "Tap to start" button on mobile, and the player can't dismiss it without scrolling. Or the banner blocks third-party scripts (analytics, fonts) that the game depends on. Or the leaderboard with email capture violates the cookie consent the user gave.

**Why it happens:**
Cookie banners are added by site-wide WP plugins and are unaware of the game iframe. GDPR consent is required *before* any non-essential cookies/data, including a leaderboard tied to an email.

**How to avoid:**
- **Coordinate with the site team early (P5):** confirm what cookie/consent system runs on saynine.ai and whether the game's domain (`play.saynine.ai`) is in scope.
- **Game uses zero cookies in v1.** localStorage is technically not a cookie under GDPR but is "similar storage" — for a high score, it's defensible as "strictly necessary for the requested functionality" and does not require consent. Document this decision.
- **Email capture requires explicit opt-in:** the email field on the game-over screen needs a checkbox "Send me SayNine updates" that is *unchecked by default*. The score itself can be submitted without an email.
- **Leaderboard with name+score:** if no PII beyond a self-chosen display name, no consent needed. If the display name is the email or real name, you need consent.
- **Don't load Google Fonts / third-party CDNs from the game** — they trigger consent requirements. Self-host fonts and decoders.
- **Don't autoplay audio.** Beyond browser policies (Pitfall 12), autoplaying audio on a marketing site is a brand-image issue and gets the page downgraded by Chrome's autoplay heuristics, affecting other parts of saynine.ai. Music must be off until the user explicitly enables it.

**Warning signs:**
- Cookie banner overlaps the canvas on mobile
- Game's network requests fail until consent is granted
- Email field is mandatory or pre-checked
- Music plays before any user interaction

**Phase to address:** **P5**, with the no-third-party-fonts and no-cookies decisions locked in **P0**.

---

### Pitfall 21: Polish paralysis + "just one more power-up" — solo-sprint scope creep

**What goes wrong:**
Day 8 of 10: the magnet works, the loop is fun, but you "just want to add" a shield. Then a 2× score multiplier. Then character trails. Then a glow shader on the magnet. Each one is "1 hour." On day 11 nothing ships and the core loop has bugs the polish is hiding.

**Why it happens:**
Solo sprints have no PM. The brain that wrote the scope is the same brain that wants to break it. Polish is more fun than testing.

**How to avoid:**
- **Hard scope freeze at day 7.** From day 7 onward, only bug fixes and verified-on-real-mobile fixes. No new features, no new shaders, no new animations.
- **Out-of-scope list is sacred.** PROJECT.md already lists shield, speed boost, daily missions, character shop as Out of Scope. Re-read it daily during the second week.
- **"What ships if I stopped now?"** ask this at end of every day. If the answer isn't "a playable game with the core loop," fix that before doing anything else.
- **Write the deploy step early (P0 or P1).** A deployable-from-day-1 build forces honesty about what's done. CI to Cloudflare Pages on every commit, even with placeholder cubes.

**Warning signs:**
- Day count > 7 and you're adding rather than fixing
- The Out of Scope list has been "renegotiated"
- You haven't run the build on a real phone in ≥3 days
- "Just one more thing" said more than twice in a day

**Phase to address:** Behavioral, applies across **P3**, **P4**, **P5**. The roadmap should explicitly mark a feature freeze date.

---

### Pitfall 22: First-frame lag — game appears frozen during loading

**What goes wrong:**
Page loads, white screen for 4 seconds, *then* the loading bar appears, *then* it jumps to 80%, *then* freezes for 2 seconds, *then* the game starts. Visitors leave during the white screen. Lighthouse score tanks.

**Why it happens:**
- HTML loaded but JS bundle still parsing → blank
- `GLTFLoader` doesn't fire progress events for assets served without `Content-Length` (CDN gzip strips it)
- First frame after load triggers shader compilation hitch (Pitfall 3)
- KTX2 transcoder WASM downloads in parallel and stalls

**How to avoid:**
- **Inline a CSS-only loading screen in `index.html`** that shows immediately, before any JS executes. A bare `<div>` with the brand orange and a spinning Linky chain SVG. Removed by JS once the Three.js scene is ready.
- **Show a meaningful loading bar** based on `GLTFLoader.onProgress` *and* a manual count of loaded assets. Don't trust gzip-stripped progress.
- **Pre-warm shaders** before hiding the loader (Pitfall 3).
- **Code-split the Three.js bundle** so the loading screen renders before three.js is parsed. Vite: dynamic `import('./game.js')` from a thin entry script.
- **Set `Cache-Control: immutable` on all hashed assets** so repeat visits skip the network entirely.

**Warning signs:**
- Lighthouse "First Contentful Paint" > 2s
- Loading bar visibly jumps from 0 → 80 → 100 in steps
- "Time to interactive" > 5s on 4G

**Phase to address:** **P3** (loading UX), validated in **P4**.

---

### Pitfall 23: Mixed content — HTTPS site embeds HTTP-served asset

**What goes wrong:**
saynine.ai is HTTPS. Game iframe loads, but an asset (a leaderboard API call, a font, a CDN GLB) is served over HTTP. Browser blocks the request silently. Game appears broken with no obvious error.

**Why it happens:**
Forgetting that all subresources of an HTTPS page must also be HTTPS. Common with copy-pasted tutorial URLs.

**How to avoid:**
- All resources protocol-relative (`//cdn...`) or explicitly `https://`.
- Self-host Basis/Draco decoders from `/public/` so there's no CDN involved.
- For any future leaderboard API: HTTPS with a valid cert (Cloudflare provides this free).
- Add `upgrade-insecure-requests` to the iframe document's CSP as a safety net.

**Warning signs:**
- Console: "Mixed Content: The page was loaded over HTTPS, but requested an insecure resource"
- Asset loads in direct browse but fails in iframe

**Phase to address:** **P5**.

---

### Pitfall 24: Three.js version pinned with `^` — silent breaking changes on `npm install`

**What goes wrong:**
`package.json` has `"three": "^0.171.0"`. CI runs `npm install` two weeks later, picks up `0.173.0`, which renamed `outputColorSpace` constants or removed a deprecated method. Build still passes (no TS), runtime is broken in production.

**Why it happens:**
**Three.js does not follow semver.** Every release is a `0.x.0` and may include breaking changes. The `^` semver range allows minor bumps which Three.js treats as major.

**How to avoid:**
- **Pin exact versions:** `"three": "0.171.0"` (no `^`, no `~`).
- Same for `vite`, `howler`, and any decoder packages — though these *do* respect semver.
- Commit `package-lock.json`.
- Read the [Three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide) before bumping the Three.js version, ever.

**Warning signs:**
- Build is fine yesterday, broken today, no code change
- `npm outdated` shows three with a new minor available
- Stack Overflow answers don't match your installed version

**Phase to address:** **P0**.

---

### Pitfall 25: Mobile testing deferred until day 12

**What goes wrong:**
The entire game is built and tested in Chrome desktop responsive mode. On day 12 you finally open it on a real iPhone. Touch doesn't work. Audio doesn't unlock. Canvas is 200 px tall. Performance is 18 fps. The viewport is wrong. All of these are 1-day fixes individually; together with 2 days left, you ship broken or you don't ship.

**Why it happens:**
Desktop dev is fast and easy; pulling out a phone and opening a dev URL is friction. Each day deferred makes it cheaper to defer one more day.

**How to avoid:**
- **Real-device test on day 1.** Ship the empty Three.js scene to Cloudflare Pages day 1, open it on a real phone, confirm the canvas fills the viewport, confirm a basic touch event fires. Five minutes of work that prevents two days of debugging.
- **Real-device test at every phase boundary.** P1, P2, P3, P4, P5 all end with a "verified on real iPhone *and* real Android" check. Use BrowserStack or — better — a real iPhone SE / iPhone 12 (mid-range, what visitors actually have).
- **Connect Chrome DevTools to Android over USB** for live profiling (`chrome://inspect`). For iOS, Safari → Develop → [iPhone name] gives the same.
- **Throttle desktop to "Slow 4G" + 6× CPU slowdown** in DevTools as a daily smoke test, not a final-week task.

**Warning signs:**
- "I'll test on mobile after the next feature lands" — said more than once
- More than 3 days since last real-device run
- Mobile-specific code paths exist that haven't been executed on a phone

**Phase to address:** **All phases** — but add a hard "Mobile smoke test" gate to every phase transition in the roadmap. **P4 (Mobile Hardening)** is the dedicated hardening pass *on top of* the per-phase gates, not a substitute for them.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Placeholder cubes for Ninty/Linky | Unblocks dev while real assets are optimized | Visual feedback misleads — "the cube fits the lane, the rigged model won't" | P0–P1 only; replace before P3 polish |
| Single hardcoded chunk pattern instead of authored chunks | Get spawning working in 30 min | Repetitive runs feel boring; players quit after 30 sec | P1 only; need ≥10 chunks by end of P2 |
| `setTimeout`-driven game loop instead of `requestAnimationFrame` + delta cap | "Just to test" | Frame-rate-dependent physics (Pitfall 5); wrong on 120 Hz screens | Never. RAF + dt cap from frame one. |
| `console.log` in the game loop | Easy debugging | 1–5 ms per frame on mobile, garbage allocation per call | Behind a `?debug` flag only; never in shipped main loop |
| Inline `new Vector3()` in update() | Faster to write | GC stutter (Pitfall 18) | First implementation pass, fix in P4 |
| Autoplay background music to "feel alive" | Demos better in tutorials | iOS blocks it (Pitfall 12); brand-image issue (Pitfall 20); Chrome autoplay-policy demote | Never |
| Skip the loading screen, "it loads fast on my mac" | Saves a day | Visitors bounce on mobile/4G during the white screen | Never |
| Hardcoded leaderboard in localStorage | No backend coordination | Resets on browser clear, not actually a leaderboard | P3–P4; PROJECT.md explicitly accepts this for v1 |
| Skip pre-compile of shaders | Saves an hour | First-jump hitch on every player's first run (Pitfall 3) | Never; 5 lines of code |
| Use `mesh.clone()` for Linkys | Familiar API | Skeleton sharing (Pitfall 8); 100× the draw calls vs `InstancedMesh` | Never for the spawned ones; `InstancedMesh` from P2 |
| Test only in Chrome desktop | Speed | Pitfall 25 catastrophe | Day 1 only |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| `GLTFLoader` + KTX2 textures | Forgetting `loader.setKTX2Loader(ktx2.detectSupport(renderer))` — textures load uncompressed | Always wire KTX2Loader and call `detectSupport(renderer)` *before* loading |
| `GLTFLoader` + DRACO geometry | Forgetting `loader.setDRACOLoader(dracoLoader)` — load fails silently with "no decoder" | Wire the decoder; host WASM at `/public/draco/` not Google CDN to avoid CORS/HTTPS issues |
| AnimationMixer + cloned mesh | `mesh.clone()` shares skeleton (Pitfall 8) | `SkeletonUtils.clone(mesh)` |
| Howler + iOS | Calling `play()` from a timer (Pitfall 12) | Play first sound from a real `pointerdown` handler |
| Cloudflare Pages + GLB MIME | GLB served as `application/octet-stream` triggers download in some Safari versions | Add `_headers` file: `*.glb Content-Type: model/gltf-binary` |
| WordPress iframe + viewport | Iframe parent CSS overrides game viewport | Game iframe uses `100dvh`/`100svh`, parent uses fixed aspect ratio (Pitfall 15) |
| WP CSP plugin + WASM | `wasm-unsafe-eval` not in `script-src` blocks Basis transcoder (Pitfall 16) | Use iframe on separate origin OR coordinate CSP |
| Vite + GLB import | `import url from './ninty.glb'` returns the raw module not a URL | Use `import url from './ninty.glb?url'` or put in `/public/` |
| Brand fonts | Self-hosted vs Google Fonts | Self-host to avoid GDPR consent issues (Pitfall 20) |
| Email capture API | POST without CORS preflight handling | Even in v1, plan for CORS; for v1 the capture is localStorage-only |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| Per-frame `Vector3`/`Box3` allocation (Pitfall 18) | Periodic stutter every 2–5 sec | Module-level scratch vars; object pooling | ~30 obstacles on a mid-range Android |
| Many separate Linky meshes instead of `InstancedMesh` | Draw calls > 100; fps drop with Linky count | `InstancedMesh` from start | ~50 Linkys onscreen on mid-range |
| Real-time shadow map at 2048² | Frame time > 16 ms on mobile | Single 1024² shadow map, or bake shadows into terrain texture | Always on mid-range mobile |
| Post-processing (Bloom/SSAO) | Frame time doubled | Skip post-processing entirely; use fog + tone mapping (per project constraint) | Always on mobile |
| Per-frame `BoxHelper`/`Box3.setFromObject` for collision | GC stutter, wasted CPU | Cache obstacle AABBs at spawn time, never recompute | ~10 obstacles |
| Materials cloned per-instance | Shader compile hitch per clone (Pitfall 3) | One material per type, share across instances | First time each type spawns |
| Infinite chunk array growing | Memory leak, slow array iteration | Recycle chunks behind the camera; cap pool size | ~60 sec of play |
| Audio DOM nodes per SFX | iOS audio resource exhaustion (~16 simultaneous limit) | Howler handles pooling; don't create raw `<audio>` | ~16 rapid coin pickups in 1 sec |
| Texture upload on first use | First-frame stall | `renderer.initTexture(tex)` during loading screen | First time any texture is rendered |
| Render at devicePixelRatio = 3 on iPhone | 9× pixel cost; 18 fps | `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` | Always on retina mobile |

---

## Security Mistakes

For a no-account, no-backend, marketing-embed game the security surface is small but specific.

| Mistake | Risk | Prevention |
|---|---|---|
| Email capture posts to a third-party form service without consent | GDPR fine, trust loss, brand damage | v1: localStorage only. v2: own backend with explicit opt-in checkbox. |
| Leaderboard accepts client-submitted scores without validation | Cheaters submit `score=999999` and ruin the leaderboard | v1: localStorage (per-device, no incentive to cheat). v2: server validates against play time and event log, not just score. |
| Display name in leaderboard allows arbitrary HTML | XSS in the leaderboard component | Always render display names as text (`textContent`, not `innerHTML`); strip on input |
| iframe `sandbox` attribute too restrictive | Game can't run; or too permissive lets game break out | `sandbox="allow-scripts allow-same-origin allow-pointer-lock"` if same-origin needed; otherwise omit `sandbox` and rely on iframe origin isolation |
| `postMessage` from game to parent without origin check | Other sites embedding the game can spoof | Always `postMessage(data, 'https://saynine.ai')` with explicit target origin; on the parent side, `event.origin === 'https://play.saynine.ai'` |
| Loading user-supplied GLB | RCE-class risk via maliciously crafted GLB → memory corruption in the parser | The game doesn't load user-supplied GLBs; ensure no future feature does without sandboxing |
| Share-to-Twitter URL containing user score | Tracking link injection | Use the official intent URL: `https://twitter.com/intent/tweet?text=...&url=...`; URL-encode the score |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---|---|---|
| "Tap to start" button that's also the audio unlock — but the button is below the fold on mobile | Player can't start the game | Center the button; verify with `100svh` viewport (Pitfall 15) |
| Music on by default | Users on transit / at work get blasted | Mute by default with a clear unmute toggle, per PROJECT.md |
| Game-over screen auto-restarts | Player loses control, frustration | Wait for explicit "Play again" tap |
| Death screen blocks the share button under cookie banner | Score lost when banner appears | Coordinate z-index; or render share inside the canvas overlay |
| No indication of what swipe does what | First-time player flails | 3-second tutorial overlay on first load: "← → switch lanes, ↑ jump, ↓ slide". Skippable. |
| Score keeps ticking after death | Confuses "what was my final score?" | Freeze score on collision; pop final number with juice |
| Magnet activation has no visual feedback | Player doesn't notice the power-up | Bright UI flash + ring effect on Ninty + audio sting; see brand gradients in PROJECT.md |
| Loading screen with no progress | Visitor thinks the page is broken | Spinning Linky + "Loading XX%" or animated dots |
| iOS notch / dynamic island clips HUD | Score hidden | `viewport-fit=cover` + `env(safe-area-inset-top)` padding on the HUD |
| Lane switch animation too slow | Feels unresponsive | 0.12–0.18s tween, with collision using discrete lane (Pitfall 11) |
| First obstacle appears in the player's lane within 1 second | Player dies before learning the controls | Guarantee the first 5 seconds are obstacle-free; spawn coins instead |
| Restart button position changes with game-over score size | Mis-tap causes unintended action | Fixed-position restart button independent of score |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Ninty GLB loads:** Verify it's the *optimized* GLB (<2 MB), KTX2 textures, in-place root motion, only the 5 needed clips. The 138 MB source is *never* loaded.
- [ ] **Animations play:** Verify each one-shot has `LoopOnce` + `clampWhenFinished` + a `finished` listener that returns to `run`. No silent looping.
- [ ] **Audio works:** Verify on a *real iPhone* with the device on silent mode (Howler should still play through media volume) and with the device on full volume. Check that switching apps and returning doesn't desync the music.
- [ ] **Pause works:** Verify visibility-change pauses, explicit pause button pauses, both unpause correctly, the AnimationMixer doesn't tick while paused, and `clock.getDelta()` is reset on resume (Pitfall 5).
- [ ] **Collision is fair:** Verify lane-switch through an obstacle does not kill (Pitfall 11), high-speed collision with thin obstacles still registers (Pitfall 10), and a clean miss never registers a hit.
- [ ] **Mobile input:** Verify on real iOS that swipe up jumps (not page scroll), swipe down slides (not pull-to-refresh), pinch does nothing, double-tap does nothing.
- [ ] **Loading UX:** Verify the loading screen appears in <500 ms on slow 3G, the bar advances, and the "Tap to start" appears only when *all* assets including KTX2 transcoder WASM are ready.
- [ ] **Pre-compiled shaders:** Verify no first-frame hitch on the first jump, first Linky pickup, first magnet activation. Use stats.js — frame time should be consistent from the very first frame of gameplay.
- [ ] **Score persists across game over:** Verify high score in localStorage survives a refresh, doesn't get clobbered by a lower score, and the leaderboard displays correctly after a manual `localStorage.clear()`.
- [ ] **Restart truly resets:** Verify after restart there are no leftover obstacles in the scene, the AnimationMixer is reset, the player position/state is reset, the score is 0, the speed is base speed, and any active power-up is cancelled. Memory should not grow across 10 restarts.
- [ ] **Build is deployable:** Verify `npm run build` produces `/dist`, it loads correctly when served from a static server (`npx serve dist`), and asset paths are not absolute to localhost.
- [ ] **iframe-embeddable:** Verify the built `/dist` works inside a test `<iframe>` on a separate origin, with no console errors.
- [ ] **Brand colors render correctly:** Verify the in-canvas orange matches the HUD orange (color-space pitfall, #4) — they should be visually identical.
- [ ] **No third-party network requests:** Verify the network tab on the deployed build only shows requests to the game's own origin. No Google Fonts, no analytics, no CDN decoders.
- [ ] **GDPR-clean:** Verify no cookies are set by the game, the email field is optional and unchecked by default, the share buttons don't load tracking pixels.

---

## Recovery Strategies

When pitfalls occur despite prevention.

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| 138 MB Ninty.glb is the only file you have, artist is unreachable | LOW (with `gltf-transform`) | Run the optimization pipeline (Pitfall 1). 95% of the time it Just Works. Worst case, decimate manually in Blender — 1–2 hours. |
| Color space wrong, everything looks washed out | LOW | One-line fix per Pitfall 4. Re-test under different lighting. |
| Tab-switch crashes the game | LOW | Add `Math.min(dt, 1/30)` to the loop (Pitfall 5) and a visibility-change pause handler. ~10 minutes. |
| Animations cross-fade incorrectly | LOW | Audit the action setup, set `LoopOnce` where needed, replace `crossFadeTo` with `fadeOut`/`fadeIn` for one-shots. ~1 hour. |
| iOS audio silent | LOW | Verify Howler is being called from a real `pointerdown`, not a timer. Move the unlock to "Tap to start". ~30 minutes. |
| Mobile fps is 30, target is 60 | MEDIUM | Profile with `chrome://inspect` connected to the phone. Most likely culprits in order: shadow map, pixel ratio, draw calls (instance Linkys), GC (pool/scratch), texture format (verify KTX2). Each fix is 1–4 hours. |
| Iframe is the wrong size on WP | LOW | Adjust the WP shortcode/template CSS. ~1 hour. |
| CSP blocks the embed | MEDIUM | Move to subdomain iframe approach (Pitfall 16). 2–4 hours including DNS propagation. |
| Game tunnels through obstacles at high speed | MEDIUM | Implement swept AABB or substep collision (Pitfall 10). Re-tune speed ramp. ~3 hours. |
| Players say controls feel unfair | MEDIUM | Tighten lane-switch tween, add forgiveness frames, narrow the player AABB on x (Pitfall 11). ~2 hours + playtesting loop. |
| Cookie banner overlaps the canvas | LOW–MEDIUM | Coordinate with site team on z-index and exclusion of the play page. Often a 1-line CSS fix on their side. |
| You hit day 9 with no real-device testing done | HIGH | Cancel scope, pull out the phone now, fix the worst things until day 14. Accept a worse v1 to ship at all. |
| Three.js minor bump broke everything | LOW | `npm install three@<previous-pinned-version>`. Pin exact (Pitfall 24). |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---|---|---|
| 1. 138 MB Ninty.glb | **P0** | Optimized GLB <2 MB committed; source GLB in `.gitignore` |
| 2. Uncompressed PNGs in GLB | **P0** | `renderer.info.memory.textures` < 50 MB; Spector.js shows compressed formats |
| 3. Shader compile hitches | **P3** wired, **P4** verified | Stats.js shows no first-event spikes on real device |
| 4. Color space migration | **P1** | In-canvas brand orange visually matches HUD orange |
| 5. Delta-time spikes | **P1** | Tab-switch + 30s + return → no death, no animation skip |
| 6. Cross-fade warp | **P2** | All animation transitions visually smooth on slow-mo recording |
| 7. Root motion drift | **P2** | Ninty.x stays exactly equal to `player.x` over a 60 sec idle test |
| 8. `mesh.clone()` skeleton sharing | **P2** | If cloning needed, `SkeletonUtils.clone` used; Linkys are `InstancedMesh` |
| 9. One-shot animations loop | **P2** | Manual test: each one-shot plays once and returns to run |
| 10. AABB tunneling | **P1** | Test at 2× max speed, very thin obstacle — still detected |
| 11. Lane-switch ghost hits | **P1** | Test: swipe through an obstacle into a clear lane — no death |
| 12. iOS audio unlock | **P3** wired, **P4** verified | Real iPhone test: music plays after first tap |
| 13. Music loop click | **P3** | Loop a 30s clip for 5 minutes, verify no audible pause |
| 14. iOS scroll/zoom hijack | **P1** for keyboard, **P2** for swipe, **P4** for real device | Real iPhone: page does not scroll, zoom, or refresh during play |
| 15. Iframe sizing | **P5** wired, **P4** prototyped | Real WP page test: canvas fills container on iPhone & desktop |
| 16. CSP blocks embed | **P5** | Real saynine.ai embed test in incognito |
| 17. Three.js ESM-only | **P0** | Build succeeds with all imports from `three/examples/jsm/...` |
| 18. GC stutter | **P4** (with patterns from **P1**) | Chrome perf profile shows no GC bars during 60s play |
| 19. Unwinnable spawning | **P2** chunks, **P3** tuning | 10 playtest runs: no "no escape" deaths |
| 20. GDPR / cookie banner | **P0** decisions, **P5** verification | Game uses no cookies, no third-party fonts, email opt-in unchecked |
| 21. Solo scope creep | **All phases** (behavioral) | Day 7 freeze date in roadmap; daily "what ships if I stopped now" |
| 22. First-frame lag | **P3** | Lighthouse FCP < 1.5s on Slow 4G + 6× CPU |
| 23. Mixed content HTTPS | **P5** | Network tab on embed: zero HTTP requests |
| 24. Three.js `^` semver | **P0** | `package.json` has no `^`/`~` on three; `package-lock.json` committed |
| 25. Mobile testing deferred | **All phase boundaries** | Each phase ends with real iPhone + real Android smoke test |

---

## Three.js / Mobile / Embed-Specific "Surprise" List

A condensed list to keep on a sticky note during build:

1. **Pin Three.js exact** — no `^`. It doesn't follow semver.
2. **`Math.min(dt, 1/30)`** in the game loop. Day 1.
3. **`renderer.outputColorSpace = SRGBColorSpace`** + **`texture.colorSpace = SRGBColorSpace`** for color maps only. Day 1.
4. **`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`**. Day 1.
5. **`touch-action: none`** on the canvas, **`overscroll-behavior: none`** on body. Day 1.
6. **`viewport-fit=cover`**, **`100svh`**/**`100dvh`** — not `100vh` on iOS.
7. **KTX2 + Meshopt** in the asset pipeline. Convert the 138 MB Ninty.glb offline; never load the source.
8. **`SkeletonUtils.clone`**, never `mesh.clone()`, for skinned meshes.
9. **`InstancedMesh`** for Linkys.
10. **`renderer.compile(scene, camera)`** before showing "Tap to start".
11. **Howler** + first sound from a real `pointerdown`.
12. **Cap fps with fixed-step accumulator** for collision/physics.
13. **Real-device test at every phase boundary**, not at the end.
14. **Day 7 = scope freeze.**

---

## Sources

- **Three.js Migration Guide** — `https://github.com/mrdoob/three.js/wiki/Migration-Guide` (HIGH, canonical for breaking-change pitfalls #4, #17, #24)
- **Three.js docs: AnimationMixer / AnimationAction** — `https://threejs.org/docs/#api/en/animation/AnimationMixer` (HIGH, pitfalls #6, #7, #9)
- **Three.js docs: SkeletonUtils** — `https://threejs.org/docs/#examples/en/utils/SkeletonUtils` (HIGH, pitfall #8)
- **Three.js docs: WebGLRenderer.compile / compileAsync** — `https://threejs.org/docs/#api/en/renderers/WebGLRenderer.compile` (HIGH, pitfall #3)
- **Three.js manual: loading 3D models** — `https://threejs.org/manual/#en/load-gltf` (HIGH, pitfalls #1, #2, #17)
- **gltf-transform docs** — `https://gltf-transform.dev/` (HIGH, asset pipeline for pitfalls #1, #2)
- **meshoptimizer / gltfpack** — `https://github.com/zeux/meshoptimizer` (HIGH, asset pipeline)
- **Basis Universal / KTX2** — `https://github.com/BinomialLLC/basis_universal` (HIGH, pitfall #2)
- **MDN: Pointer Events** — `https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events` (HIGH, pitfall #14)
- **MDN: visibilitychange** — `https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event` (HIGH, pitfall #5)
- **WebKit: HTML5 video/audio user-gesture requirement** — `https://webkit.org/blog/6784/new-video-policies-for-ios/` (HIGH, pitfall #12)
- **Apple iOS Safari viewport behaviors** — `https://webkit.org/blog/7929/designing-websites-for-iphone-x/` (HIGH, pitfall #15)
- **MDN: Content Security Policy** — `https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP` (HIGH, pitfall #16)
- **MDN: Mixed Content** — `https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content` (HIGH, pitfall #23)
- **Howler.js docs** — `https://howlerjs.com/` (HIGH, pitfalls #12, #13)
- **GDPR ePrivacy guidance on localStorage** — EU consensus that "strictly necessary" local storage for game state does not require consent; PII in leaderboard does (MEDIUM, pitfall #20)
- **Personal experience / community consensus** — Pitfalls #10, #11, #18, #19, #21, #25 are observed across many Three.js endless-runner clones and game-jam post-mortems and represent stable community knowledge.
- **STACK.md (this project)** — performance budgets, library choices, deployment recommendations referenced throughout

---

*Pitfalls research for: SayNine Xtreme — browser-based 3D endless runner on Three.js, embedded on saynine.ai*
*Researched: 2026-04-08*
