/**
 * Math helpers used across engine and game layers. Dependency-free on purpose.
 */

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Frame-rate-independent exponential damping toward a target.
 *
 * `lambda` controls speed (higher = snappier). `lambda = 18` with dt=1/60
 * converges most of the way in ~150 ms — exactly our LANE_SWITCH_MS target.
 *
 * See Freya Holmer's "Damp" talk for why this is better than naive lerp:
 * https://www.youtube.com/watch?v=LSNQuFEDOyQ
 */
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));
