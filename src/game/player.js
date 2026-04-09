import * as THREE from 'three';
import {
  CAPSULE_HEIGHT,
  CAPSULE_RADIUS,
  CAPSULE_COLOR,
  LANE_X,
  JUMP_AIR_MS,
  JUMP_PEAK_Y,
  SLIDE_MS,
  PLAYER_RUN_SPEED,
} from '../config.js';
import { damp } from '../util/math.js';

// Jump physics: given total air time T and peak height H with gravity g constant,
//   H = g*T^2 / 8   →  g = 8H / T^2
//   v0 = g*T / 2
const T = JUMP_AIR_MS / 1000; // 0.8 s
const H = JUMP_PEAK_Y; // 1.8
const GRAVITY = (8 * H) / (T * T); // ~22.5 u/s²
const JUMP_V0 = (GRAVITY * T) / 2; // ~9.0 u/s

// Damping lambda for the lane-switch tween. 18 with dt=1/60 converges
// most of the way in ~150 ms, matching LOOP-02.
const LANE_DAMP_LAMBDA = 18;

/**
 * Placeholder Ninty (PLAYER-03) with the full Phase 1 feel:
 *  - Lane switch tween (~150 ms)            — LOOP-02
 *  - Jump arc (~800 ms air, ~1.8 u peak)    — LOOP-03
 *  - Slide with visible squash (~600 ms)    — LOOP-04
 *
 * Plan D swaps the Plan B stub out for this. Phase 2 will swap the capsule
 * out for the real rigged Mixamo GLB while keeping this FSM.
 */
export function createPlayer() {
  const geo = new THREE.CapsuleGeometry(
    CAPSULE_RADIUS,
    CAPSULE_HEIGHT - 2 * CAPSULE_RADIUS,
    8,
    16
  );
  const mat = new THREE.MeshStandardMaterial({
    color: CAPSULE_COLOR,
    roughness: 0.55,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const standingY = CAPSULE_HEIGHT / 2;
  mesh.position.set(LANE_X[1], standingY, 0);

  const p = {
    mesh,
    lane: 1, // 0 | 1 | 2 — centre default
    targetX: LANE_X[1],
    y: 0, // height above ground (added to standingY)
    vy: 0,
    zSpeed: PLAYER_RUN_SPEED,
    state: 'run', // 'run' | 'jump' | 'slide' | 'dead'
    slideTimer: 0,

    tick(dt, input) {
      // ── Lane switching (LOOP-02) ──────────────────────────────────────
      // Edge-triggered. Allowed mid-jump and mid-slide so air-lane-switch
      // feels responsive, matching Subway Surfers convention.
      if (p.state !== 'dead') {
        if (input.leftPressed && p.lane > 0) {
          p.lane -= 1;
          p.targetX = LANE_X[p.lane];
        }
        if (input.rightPressed && p.lane < 2) {
          p.lane += 1;
          p.targetX = LANE_X[p.lane];
        }
      }
      // Smoothly damp x toward target (~150 ms converge).
      mesh.position.x = damp(mesh.position.x, p.targetX, LANE_DAMP_LAMBDA, dt);

      // ── Jump (LOOP-03) ────────────────────────────────────────────────
      // Only from the 'run' state. No double-jump. No jump while sliding.
      if (input.jumpPressed && p.state === 'run') {
        p.state = 'jump';
        p.vy = JUMP_V0;
      }

      // ── Slide (LOOP-04) ───────────────────────────────────────────────
      // Only from the 'run' state. ~600 ms duration.
      if (input.slidePressed && p.state === 'run') {
        p.state = 'slide';
        p.slideTimer = SLIDE_MS / 1000;
      }

      // ── State integration ─────────────────────────────────────────────
      if (p.state === 'jump') {
        p.vy -= GRAVITY * dt;
        p.y += p.vy * dt;
        if (p.y <= 0) {
          p.y = 0;
          p.vy = 0;
          p.state = 'run';
        }
      } else if (p.state === 'slide') {
        p.slideTimer -= dt;
        if (p.slideTimer <= 0) {
          p.slideTimer = 0;
          p.state = 'run';
        }
      }

      // ── Visual transform ──────────────────────────────────────────────
      // Slide squash: ~50% height, bottom stays on ground.
      const targetScaleY = p.state === 'slide' ? 0.5 : 1.0;
      mesh.scale.y = damp(mesh.scale.y, targetScaleY, 24, dt);

      // Base Y = standing y + physics y, with slide-squash compensation
      // so the capsule bottom stays anchored on the ground.
      const squashOffset = p.state === 'slide' ? standingY * 0.5 : 0;
      mesh.position.y = standingY + p.y - squashOffset;

      // Forward motion (run speed is constant in Phase 1).
      mesh.position.z -= p.zSpeed * dt;
    },
  };

  return p;
}
