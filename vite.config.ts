import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works on GitHub Pages under any repository path
  // (https://<user>.github.io/<repo>/) as well as on Netlify or itch.io.
  base: './',
  build: {
    outDir: 'dist',
    // Phaser alone is larger than Vite's default 500 kB warning threshold.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['src/tests/**/*.test.ts'],
    environment: 'node',
  },
});
