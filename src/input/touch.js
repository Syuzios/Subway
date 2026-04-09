/**
 * Mobile swipe detection (INPUT-02, INPUT-03).
 *
 * Hand-rolled Pointer Events swipe detector. STACK.md explicitly rules out
 * Hammer.js (unmaintained since 2017) — the whole detector is ~15 lines.
 *
 * Pointer Events unify mouse/touch/pen so the same code path serves both
 * desktop drag-to-test and mobile swipes. The `touch-action: none` CSS on
 * the #game canvas (set in index.html, Plan A) prevents iOS Safari from
 * scrolling / pinch-zooming during swipes.
 */
export function initTouch(
  canvas,
  { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown }
) {
  const MIN_DIST = 30; // pixels — min swipe length to register
  const MAX_TIME = 500; // ms — longer than this is a drag, not a swipe

  let sx = 0;
  let sy = 0;
  let st = 0;
  let active = false;

  const onDown = (e) => {
    active = true;
    sx = e.clientX;
    sy = e.clientY;
    st = performance.now();
    // Belt-and-braces: preventDefault here too in case a consumer's CSS
    // has accidentally overridden touch-action on the canvas.
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
      if (dx > 0) onSwipeRight();
      else onSwipeLeft();
    } else {
      if (dy > 0) onSwipeDown();
      else onSwipeUp();
    }
  };

  const onCancel = () => {
    active = false;
  };

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
