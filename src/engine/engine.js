import * as THREE from 'three';
import { DPR_MAX, SKY_COLOR } from '../config.js';

/**
 * Create and configure the Three.js renderer.
 * - SRGBColorSpace (PERF-06): mandatory; otherwise colors look washed out.
 * - DPR capped at 2 (PERF-06): keeps fragment shader cost sane on high-DPI phones.
 * - antialias on: Phase 5 may disable it on mobile during perf tuning.
 */
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_MAX));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(SKY_COLOR, 1.0);
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(SKY_COLOR, 40, 140);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(6, 12, 4);
  scene.add(sun);

  return scene;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  // Follow-cam offset behind and above the player, looking at chest height.
  camera.position.set(0, 3.2, 6.5);
  camera.lookAt(0, 1.0, 0);
  return camera;
}

/**
 * Install a window resize handler that keeps camera aspect and renderer size in sync.
 * Called once at boot.
 */
export function attachResize(renderer, camera) {
  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_MAX));
  };
  window.addEventListener('resize', onResize);
  return onResize;
}
