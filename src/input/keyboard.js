/**
 * Keyboard input (INPUT-01).
 *
 * Arrow keys AND WASD both work simultaneously — no mode switch, no config.
 * Listens on window (not canvas) because canvas doesn't receive keyboard
 * focus unless tabindex is set and it's actually focused; window-level
 * listeners are reliable across browsers.
 *
 * Uses keydown/keyup with an `e.repeat` guard so holding a key does not
 * re-fire jump/lane-switch every frame (edge-triggered actions only).
 */

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const SLIDE_KEYS = new Set(['ArrowDown', 'KeyS']);

export function initKeyboard({
  onLeft,
  onRight,
  onJump,
  onSlide,
  onLeftUp,
  onRightUp,
}) {
  const onKeyDown = (e) => {
    // Prevent arrow keys / space from scrolling the page.
    // Space in particular is a page-down trigger in most browsers.
    if (
      JUMP_KEYS.has(e.code) ||
      SLIDE_KEYS.has(e.code) ||
      LEFT_KEYS.has(e.code) ||
      RIGHT_KEYS.has(e.code)
    ) {
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
