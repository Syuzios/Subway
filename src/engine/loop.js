import { FIXED_STEP, MAX_DELTA } from '../config.js';

/**
 * Fixed-step game loop (PERF-05).
 *
 * Accumulates wall-clock delta and runs `tick(FIXED_STEP)` as many times as
 * needed per rAF frame, then calls `render()` once.
 *
 * Why fixed step:
 * - Collision at variable dt is the #1 source of "I clearly dodged that and
 *   still died" bugs in runners.
 * - Mobile rAF can spike from 16ms to 50ms on a notification; without an
 *   accumulator the player teleports through obstacles ("tunneling").
 * - Delta is clamped to MAX_DELTA (1/30s) so a backgrounded tab doesn't wake
 *   up and execute hundreds of ticks in a row ("spiral of death").
 *
 * @param {(dt: number) => void} tick   Called once per fixed physics step.
 * @param {() => void} render           Called once per rAF frame.
 * @returns {() => void} disposer that stops the loop.
 */
export function startLoop(tick, render) {
  let last = performance.now() / 1000;
  let acc = 0;
  let running = true;

  const frame = (nowMs) => {
    if (!running) return;
    const now = nowMs / 1000;
    let dt = now - last;
    last = now;
    if (dt > MAX_DELTA) dt = MAX_DELTA;
    acc += dt;
    // Bounded inner loop as an extra safety net against pathological catch-up.
    let safety = 8;
    while (acc >= FIXED_STEP && safety-- > 0) {
      tick(FIXED_STEP);
      acc -= FIXED_STEP;
    }
    render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  return () => {
    running = false;
  };
}
