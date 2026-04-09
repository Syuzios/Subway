/**
 * Input aggregator (INPUT-04).
 *
 * Game code MUST import from this module only. NEVER import keyboard.js or
 * touch.js from game/ — that would leak raw-event handling across the
 * abstraction boundary.
 *
 * The shared `input` object has two kinds of fields:
 *  - Level state (left, right): true while held — for "is the user still
 *    holding left" reads.
 *  - Edge-triggered (leftPressed, rightPressed, jumpPressed, slidePressed):
 *    true for exactly ONE tick after the event. Must be cleared via
 *    `endFrame()` after each game tick.
 *
 * Lane switching in Plan D uses edge-triggered (*Pressed) flags so that
 * holding the left key doesn't repeatedly move the lane. Swipes naturally
 * only fire once per gesture so they also use the edge-triggered flags.
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
    onLeft: () => {
      input.left = true;
      input.leftPressed = true;
    },
    onRight: () => {
      input.right = true;
      input.rightPressed = true;
    },
    onLeftUp: () => {
      input.left = false;
    },
    onRightUp: () => {
      input.right = false;
    },
    onJump: () => {
      input.jumpPressed = true;
    },
    onSlide: () => {
      input.slidePressed = true;
    },
  });

  const disposeTouch = initTouch(canvas, {
    onSwipeLeft: () => {
      input.leftPressed = true;
    },
    onSwipeRight: () => {
      input.rightPressed = true;
    },
    onSwipeUp: () => {
      input.jumpPressed = true;
    },
    onSwipeDown: () => {
      input.slidePressed = true;
    },
  });

  return () => {
    disposeKb();
    disposeTouch();
  };
}

/**
 * Call AFTER each game tick. Clears edge-triggered action flags so they
 * are only observable for exactly one tick.
 */
export function endFrame() {
  input.leftPressed = false;
  input.rightPressed = false;
  input.jumpPressed = false;
  input.slidePressed = false;
}
