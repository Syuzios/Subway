// World stub. Phase 2 implements chunk streaming, obstacles, coins, and pools.
//
// Phase 1 only needs a flat ground plane so the capsule has something
// to "run" over. Plan B calls `buildFlatGround` from the engine bootstrap.

import * as THREE from 'three';
import { GROUND_COLOR } from '../config.js';

/**
 * Build a long static ground plane in front of the camera.
 * The capsule runs "into" it — i.e. the camera + player move forward
 * while the plane is stationary, so we extend it far along -Z.
 *
 * @param {THREE.Scene} scene
 * @returns {THREE.Mesh}
 */
export function buildFlatGround(scene) {
  const geo = new THREE.PlaneGeometry(24, 2000, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: GROUND_COLOR });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.z = -900; // extend far forward
  mesh.receiveShadow = false;
  scene.add(mesh);
  return mesh;
}
