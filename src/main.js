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

  // Wire input. Game code reads from the shared `input` object only —
  // never touches window.addEventListener itself (INPUT-04).
  initInput(canvas);

  // PERF-06: pre-compile shaders for everything currently in the scene
  // before the first real frame. Prevents the first-frame spike the first
  // time a material is seen by the renderer.
  renderer.compile(scene, camera);

  const tick = (dt) => {
    player.tick(dt, input);
    endFrame(); // clear edge-triggered action flags for the next tick
  };
  const render = () => {
    renderer.render(scene, camera);
  };

  startLoop(tick, render);

  // Expose for devtools debugging.
  if (typeof window !== 'undefined') {
    window.__saynine = { renderer, scene, camera, player, input };
  }

  console.log('[saynine] engine booted');
}

boot();
