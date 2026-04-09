// All tunable constants live here. No logic, no side-effects.
// Referenced by engine, player, and input layers. Keep this file lean.

// ── Lanes (LOOP-02) ────────────────────────────────────────────────────
export const LANE_WIDTH = 2.0; // world units between lanes
export const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH]; // left, center, right
export const LANE_SWITCH_MS = 150; // ~150ms smooth tween

// ── Jump (LOOP-03) ─────────────────────────────────────────────────────
export const JUMP_AIR_MS = 800; // total air time
export const JUMP_PEAK_Y = 1.8; // peak jump height in world units

// ── Slide (LOOP-04) ────────────────────────────────────────────────────
export const SLIDE_MS = 600;

// ── Player ─────────────────────────────────────────────────────────────
export const PLAYER_RUN_SPEED = 12; // world units / second forward
export const CAPSULE_HEIGHT = 1.6;
export const CAPSULE_RADIUS = 0.35;
export const CAPSULE_COLOR = 0xff8a3b; // SayNine brand orange (VIS-01)

// ── World ──────────────────────────────────────────────────────────────
export const GROUND_COLOR = 0x2e7d4f; // placeholder sunny-city grass
export const SKY_COLOR = 0x87ceeb; // placeholder sky blue

// ── Engine loop (PERF-05) ──────────────────────────────────────────────
export const FIXED_STEP = 1 / 60; // physics tick
export const MAX_DELTA = 1 / 30; // delta clamp — prevents tunneling after tab switch
export const DPR_MAX = 2; // devicePixelRatio cap (PERF-06)
