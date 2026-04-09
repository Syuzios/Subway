import * as THREE from 'three';
import {
  createRenderer,
  createScene,
  createCamera,
  attachResize,
} from './engine/engine.js';
import { startLoop } from './engine/loop.js';
import { buildFlatGround } from './game/world.js';
import { createPlayer } from './game/player.js';
import { initInput, input, endFrame } from './input/input.js';
import { damp } from './util/math.js';

function boot() {
  const canvas = document.getElementById('game');
  if (!canvas) throw new Error('[saynine] #game canvas not found');

  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();
  attachResize(renderer, camera);

  buildFlatGround(scene);

  const player = createPlayer();
  scene.add(player.mesh);

  // Cache the initial camera offset relative to the player for the follow-cam.
  const camOffset = new THREE.Vector3().copy(camera.position); // (0, 3.2, 6.5)

  // Wire input. Game code reads from the shared `input` object only —
  // never touches window.addEventListener itself (INPUT-04).
  initInput(canvas);

  // PERF-06: pre-compile shaders for everything in scene BEFORE the first frame.
  renderer.compile(scene, camera);

  const tick = (dt) => {
    player.tick(dt, input);
    endFrame(); // clear edge-triggered action flags (INPUT-04 contract)
  };

  const render = () => {
    // Follow-cam. The player walks in -z; camera z tracks that with a fixed offset.
    // A gentle x-damping gives a subtle lateral follow on lane changes.
    const targetX = player.mesh.position.x * 0.35;
    camera.position.x = damp(camera.position.x, targetX, 8, 1 / 60);
    camera.position.y = camOffset.y;
    camera.position.z = player.mesh.position.z + camOffset.z;
    camera.lookAt(
      player.mesh.position.x * 0.5,
      1.0,
      player.mesh.position.z - 4
    );
    renderer.render(scene, camera);
  };

  startLoop(tick, render);

  if (typeof window !== 'undefined') {
    window.__saynine = { renderer, scene, camera, player, input };
  }
  console.log('[saynine] boot complete — player feel ready');
}

boot();
