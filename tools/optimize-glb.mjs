#!/usr/bin/env node
// Thin wrapper documenting the canonical GLB optimize pipeline.
// Usage: node tools/optimize-glb.mjs <input.glb> <output.glb>
//
// Under the hood this calls `gltf-transform optimize` with meshopt geometry
// compression and webp texture compression, per STACK.md guidance.
// For Phase 2 real assets we may switch textures to KTX2/Basis for VRAM savings.
import { spawnSync } from 'node:child_process';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('Usage: node tools/optimize-glb.mjs <input.glb> <output.glb>');
  process.exit(1);
}

const result = spawnSync(
  'npx',
  [
    '--yes',
    '@gltf-transform/cli@latest',
    'optimize',
    input,
    output,
    '--texture-compress',
    'webp',
    '--compress',
    'meshopt',
  ],
  { stdio: 'inherit', shell: true }
);

process.exit(result.status ?? 1);
