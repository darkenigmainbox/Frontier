import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The generator is reached through a worker entry, which Vite's normal
  // client scan can miss. Pre-bundle it so the first worker doesn't race a
  // dependency re-optimization/reload in proxied previews.
  optimizeDeps: { include: ['three/addons/math/SimplexNoise.js'] },
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
});
