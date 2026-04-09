import { defineConfig } from 'vite';

// DEPLOY-02: base: './' so the built bundle works when opened from any path.
// host: true exposes the dev server on the LAN so Phase 1 can run the real-device
// Android smoke test for PERF-09 (the project's critical-path gate).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
  },
});
