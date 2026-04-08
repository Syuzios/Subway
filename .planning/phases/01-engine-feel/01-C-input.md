---
phase: 01-engine-feel
plan: C
type: execute
wave: 2
depends_on: [A]
files_modified:
  - src/input/keyboard.js
  - src/input/touch.js
  - src/input/input.js
autonomous: true
requirements: [INPUT-01, INPUT-02, INPUT-03, INPUT-04]

must_haves:
  truths:
    - "Arrow keys AND WASD both trigger the same semantic actions"
    - "Space key emits jump action; Down/S key emits slide action"
    - "Pointer Events swipe detector emits left/right/up/down based on dominant axis and min distance"
    - "Swipe up → jump; swipe down → slide; swipe left → lane-left; swipe right → lane-right"
    - "Game code (player.js) imports ONLY from src/input/input.js, never calls window.addEventListener directly"
    - "Input module exposes level state (held) AND edge-triggered actions (pressed-this-frame)"
    - "Edge-triggered action flags reset after each frame via Input.endFrame()"
  artifacts:
    - path: "src/input/keyboard.js"
      provides: "Keyboard listener, emits semantic actions to a shared state"
    - path: "src/input/touch.js"
      provides: "Pointer Events swipe detector, hand-rolled ~15 lines per STACK.md"
    - path: "src/input/input.js"
      provides: "Aggregator: level state + pressed-this-frame flags + endFrame() reset"
  key_links:
    - from: "src/input/touch.js"
      to: "document.getElementById('game')"
      via: "Pointer Events on canvas, not window"
      pattern: "pointerdown|pointerup"
    - from: "src/input/input.js"
      to: "src/input/keyboard.js AND src/input/touch.js"
      pattern: "initKeyboard|initTouch"
---

<objective>
Build the input abstraction layer: a keyboard module (Arrow + WASD), a touch module (Pointer Events swipe detector), and an aggregator (`input.js`) that emits ONLY semantic actions. Game code must never touch raw events (INPUT-04).

Purpose: Deliver INPUT-01/02/03/04 as a clean abstraction so Plan D's player FSM can read `input.left`, `input.right`, `input.jumpPressed`, `input.slidePressed` without caring whether they came from a key or a swipe.

Output: A module exporting `initInput(canvas)` and a shared `input` state object the loop polls each tick. This plan does not yet wire input into `main.js` — Plan D does that.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/research/STACK.md
@.planning/research/PITFALLS.md
@src/config.js
</context>

<interfaces>
This plan creates new interfaces. The shared Input object shape (contract for Plan D):

```js
// src/input/input.js exports:
export const input = {
  // Level state (true while held). Reset when key/pointer is released.
  left: false,
  right: false,
  // Edge-triggered actions. True for exactly one frame after the event.
  // Player.tick() reads these; Input.endFrame() clears them after each tick.
  leftPressed: false,
  rightPressed: false,
  jumpPressed: false,
  slidePressed: false,
};

export function initInput(canvas);   // wires keyboard + touch
export function endFrame();           // clears edge-triggered flags. Call AFTER tick.
```

Semantic actions (what keys/swipes map to):
- Left: ArrowLeft, A, swipe-left
- Right: ArrowRight, D, swipe-right
- Jump: Space, ArrowUp, W, swipe-up
- Slide: ArrowDown, S, swipe-down
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Keyboard module — Arrow + WASD both simultaneously</name>
  <files>src/input/keyboard.js</files>
  <action>
Create `src/input/keyboard.js`:
```js
/**
 * Keyboard input (INPUT-01). Arrow keys AND WASD work simultaneously — no mode switch.
 * Emits into the shared input state by calling the callbacks provided by input.js.
 *
 * Listens on window (not canvas) because canvas doesn't take keyboard focus unless
 * tabindex is set and it's actually focused. Window-level listeners are reliable.
 *
 * Uses keydown/keyup with an `e.repeat` guard on edge-triggered actions so holding
 * a key does not re-fire jump every frame.
 */
export function initKeyboard({ onLeft, onRight, onJump, onSlide, onLeftUp, onRightUp }) {
  const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
  const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
  const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
  const SLIDE_KEYS = new Set(['ArrowDown', 'KeyS']);

  const onKeyDown = (e) => {
    // Prevent arrow keys / space from scrolling the page when the canvas
    // isn't focused. Space in particular is a page-down trigger in most browsers.
    if (JUMP_KEYS.has(e.code) || SLIDE_KEYS.has(e.code) ||
        LEFT_KEYS.has(e.code) || RIGHT_KEYS.has(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return; // edge-triggered only
    if (LEFT_KEYS.has(e.code)) onLeft();
    else if (RIGHT_KEYS.has(e.code)) onRight();
    else if (JUMP_KEYS.has(e.code)) onJump();
    else if (SLIDE_KEYS.has(e.code)) onSlide();
  };

  const onKeyUp = (e) => {
    if (LEFT_KEYS.has(e.code)) onLeftUp();
    else if (RIGHT_KEYS.has(e.code)) onRightUp();
  };

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}
```
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const k=fs.readFileSync('src/input/keyboard.js','utf8');const req=[/ArrowLeft/,/KeyA/,/ArrowRight/,/KeyD/,/Space/,/KeyW/,/ArrowDown/,/KeyS/,/e\\.repeat/,/preventDefault/];for(const r of req){if(!r.test(k)){console.error('FAIL keyboard.js missing',r);process.exit(1)}}console.log('OK keyboard.js')"</automated>
  </verify>
  <done>
- `src/input/keyboard.js` exports `initKeyboard(callbacks)` that listens on window
- Arrow keys AND WASD both mapped; Space = jump; preventDefault on game keys
- e.repeat guard prevents held-key re-firing
- Returns a disposer function
  </done>
</task>

<task type="auto">
  <name>Task 2: Touch module (Pointer Events swipe) + Input aggregator</name>
  <files>src/input/touch.js, src/input/input.js</files>
  <action>
1. Create `src/input/touch.js` — hand-rolled Pointer Events swipe detector (~15 lines per STACK.md answer 8):
   ```js
   /**
    * Mobile swipe detection (INPUT-02, INPUT-03) — hand-rolled Pointer Events,
    * NOT Hammer.js (unmaintained since 2017 per STACK.md).
    *
    * Pointer Events unify mouse/touch/pen so the same code serves desktop drag-to-test
    * and mobile swipes. The `touch-action: none` CSS on the canvas (already in
    * index.html from Plan A) prevents iOS Safari from scrolling/zooming during swipes.
    */
   export function initTouch(canvas, { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown }) {
     const MIN_DIST = 30;    // pixels — min swipe length to register
     const MAX_TIME = 500;   // ms — longer than this is a drag, not a swipe

     let sx = 0, sy = 0, st = 0, active = false;

     const onDown = (e) => {
       active = true;
       sx = e.clientX;
       sy = e.clientY;
       st = performance.now();
       // Prevent 300ms tap delay remnants and stray gestures.
       e.preventDefault();
     };

     const onUp = (e) => {
       if (!active) return;
       active = false;
       const dx = e.clientX - sx;
       const dy = e.clientY - sy;
       const dt = performance.now() - st;
       if (dt > MAX_TIME) return;
       if (Math.abs(dx) < MIN_DIST && Math.abs(dy) < MIN_DIST) return;
       if (Math.abs(dx) > Math.abs(dy)) {
         if (dx > 0) onSwipeRight(); else onSwipeLeft();
       } else {
         if (dy > 0) onSwipeDown(); else onSwipeUp();
       }
     };

     const onCancel = () => { active = false; };

     canvas.addEventListener('pointerdown', onDown, { passive: false });
     canvas.addEventListener('pointerup', onUp);
     canvas.addEventListener('pointercancel', onCancel);
     canvas.addEventListener('pointerleave', onCancel);

     return () => {
       canvas.removeEventListener('pointerdown', onDown);
       canvas.removeEventListener('pointerup', onUp);
       canvas.removeEventListener('pointercancel', onCancel);
       canvas.removeEventListener('pointerleave', onCancel);
     };
   }
   ```
2. Create `src/input/input.js` — the aggregator that game code imports:
   ```js
   /**
    * Input aggregator (INPUT-04).
    *
    * Game code MUST import from this module only. Never import keyboard.js or touch.js
    * from game/ — that would leak raw-event handling across the abstraction boundary.
    *
    * The shared `input` object has two kinds of fields:
    * - Level state (left, right): true while held — useful for "is the user still
    *   holding left" style reads.
    * - Edge-triggered (leftPressed, rightPressed, jumpPressed, slidePressed): true
    *   for exactly ONE tick after the event. Must be cleared via endFrame() after
    *   each game tick.
    *
    * Lane switching in Plan D uses edge-triggered (*Pressed) flags so that holding
    * the left key doesn't repeatedly move the lane. Swipes naturally only fire once
    * per gesture so they also use edge-triggered flags.
    */
   import { initKeyboard } from './keyboard.js';
   import { initTouch } from './touch.js';

   export const input = {
     // Level state
     left: false,
     right: false,
     // Edge-triggered (cleared by endFrame())
     leftPressed: false,
     rightPressed: false,
     jumpPressed: false,
     slidePressed: false,
   };

   export function initInput(canvas) {
     const disposeKb = initKeyboard({
       onLeft: () => { input.left = true; input.leftPressed = true; },
       onRight: () => { input.right = true; input.rightPressed = true; },
       onLeftUp: () => { input.left = false; },
       onRightUp: () => { input.right = false; },
       onJump: () => { input.jumpPressed = true; },
       onSlide: () => { input.slidePressed = true; },
     });
     const disposeTouch = initTouch(canvas, {
       onSwipeLeft: () => { input.leftPressed = true; },
       onSwipeRight: () => { input.rightPressed = true; },
       onSwipeUp: () => { input.jumpPressed = true; },
       onSwipeDown: () => { input.slidePressed = true; },
     });
     return () => { disposeKb(); disposeTouch(); };
   }

   /**
    * Call AFTER each game tick. Clears edge-triggered action flags so they
    * are only observable for a single tick.
    */
   export function endFrame() {
     input.leftPressed = false;
     input.rightPressed = false;
     input.jumpPressed = false;
     input.slidePressed = false;
   }
   ```
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const t=fs.readFileSync('src/input/touch.js','utf8');const i=fs.readFileSync('src/input/input.js','utf8');const reqT=[/pointerdown/,/pointerup/,/MIN_DIST/,/MAX_TIME/,/Math\\.abs\\(dx\\)/];for(const r of reqT){if(!r.test(t)){console.error('FAIL touch.js',r);process.exit(1)}}const reqI=[/initKeyboard/,/initTouch/,/jumpPressed/,/slidePressed/,/endFrame/];for(const r of reqI){if(!r.test(i)){console.error('FAIL input.js',r);process.exit(1)}}console.log('OK touch.js and input.js')"</automated>
  </verify>
  <done>
- `src/input/touch.js` exports `initTouch(canvas, callbacks)` using Pointer Events with MIN_DIST=30 and MAX_TIME=500
- `src/input/input.js` exports `input` state object, `initInput(canvas)`, and `endFrame()`
- Input module merges keyboard + touch into a single `input` state
- No game file imports keyboard.js or touch.js directly (verified by grep in Plan D)
  </done>
</task>

</tasks>

<success_criteria>
- Input layer is fully abstracted: three files under `src/input/`, game code will import only from `input.js`.
- Keyboard handles Arrow AND WASD with e.repeat guard and preventDefault on game keys.
- Touch uses Pointer Events with `touch-action: none` relying on Plan A's CSS.
- Edge-triggered and level-state flags both available in the shared `input` object.
- `endFrame()` is exported and documented so Plan D can call it after each tick.
</success_criteria>

<output>
After completion, create `.planning/phases/01-engine-feel/01-C-SUMMARY.md` listing files, the exact key mappings, and the chosen swipe thresholds (MIN_DIST and MAX_TIME). Note any feel tuning that should be revisited in Plan E after real-device testing.
</output>
