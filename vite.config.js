import {defineConfig} from 'vite';
export default defineConfig({
 // Relative URLs also work when served under raw.githack.com's /owner/repo/ref/site/ path.
 base:'./',
 server:{host:'0.0.0.0',allowedHosts:['.e2b.app']},
 build:{rollupOptions:{input:{main:'index.html',terrain:'terrain/index.html'},output:{manualChunks:{three:['three']}}}},
});
