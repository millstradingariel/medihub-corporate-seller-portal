import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: '.',            // ← Change from 'app' to '.'
  build: {
    outDir: 'dist',     // ← Change from '../dist' to 'dist'
    emptyOutDir: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),  // ← Change to '.'
    },
  },
  base: '/',
});