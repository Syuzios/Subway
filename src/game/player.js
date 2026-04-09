import * as THREE from 'three';
import {
  CAPSULE_HEIGHT,
  CAPSULE_RADIUS,
  CAPSULE_COLOR,
  LANE_X,
} from '../config.js';

/**
 * Placeholder Ninty (PLAYER-03): a coloured capsule used as a development
 * fallback until the real rigged Mixamo GLB lands in Phase 2. Loader code in
 * src/engine/assets.js already accepts a GLB path — Phase 1 just doesn't call
 * it so that asset delivery is decoupled from the critical path.
 *
 * Plan B ships this as a static capsule standing in the centre lane.
 * Plan D will extend `tick()` with lane-switch, jump, and slide logic.
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
  mesh.position.set(LANE_X[1], CAPSULE_HEIGHT / 2, 0);

  return {
    mesh,
    lane: 1, // 0 | 1 | 2 — centre default
    targetX: LANE_X[1],
    y: 0,
    vy: 0,
    state: 'run', // 'run' | 'jump' | 'slide' | 'dead'
    stateTimer: 0,
    // Plan D fills this in.
    tick(_dt, _input) {
      // intentionally no-op in Plan B
    },
  };
}
