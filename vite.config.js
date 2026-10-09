import { defineConfig } from 'vite';

// Relatív base: így GitHub Pages alatt bármilyen /repo-nev/ útvonalon működik.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
});
