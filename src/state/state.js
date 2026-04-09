// Singleton game state. UI reads it; game layer writes it. Leaf module — imports nothing.
// Phase 1 keeps this minimal; Phase 2/3 expand with pause, game_over, and more fields.

export const PHASES = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
});

export const state = {
  phase: PHASES.PLAYING, // Phase 1 boots straight into PLAYING; menu lands in Phase 3
  score: 0,
  linkys: 0,
};

export function setPhase(next) {
  state.phase = next;
}
