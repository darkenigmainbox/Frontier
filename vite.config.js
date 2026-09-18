import { defineConfig } from 'vite';

// The dev server is meant to run behind a preview proxy (https://<port>-<id>.e2b.app),
// so host checking is disabled and the server binds all interfaces. All terrain
// simulation is pure JS/typed-array code — no WASM assets, no CDN, no workers that
// need special headers.
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    cors: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
  },
  worker: { format: 'es' },
});
