// Builds the browser extension into extension/dist: content.js bundled with the guide's data, plus the static files.
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'extension/static',
  build: {
    outDir: 'extension/dist',
    emptyOutDir: true,
    lib: { entry: 'extension/src/content.js', formats: ['iife'], name: 'PRGOverlay', fileName: () => 'content.js' },
  },
});
