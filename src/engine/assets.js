// GLB loader scaffold.
//
// Phase 1 ships with a capsule placeholder and does not load any real GLB yet.
// Phase 2 swaps in the real Ninty (ninty_player.glb) and Linky (linky.glb).
//
// PITFALLS.md / PERF-07 mandate: any skinned-mesh cloning MUST use
// SkeletonUtils.clone, NOT object3d.clone() — otherwise skeletons desync and
// animations break silently. We establish the pattern in Phase 1 even though
// nothing currently needs it.

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader();

/**
 * Load a GLB file and resolve with the parsed glTF object.
 * @param {string} url
 * @returns {Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>}
 */
export function loadGLB(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf), undefined, reject);
  });
}

/**
 * Clone a skinned mesh / rigged object. ALWAYS use this instead of `.clone()`
 * for anything loaded from a GLB with a skeleton.
 * @template {import('three').Object3D} T
 * @param {T} object3d
 * @returns {T}
 */
export function cloneSkinned(object3d) {
  return skeletonClone(object3d);
}
