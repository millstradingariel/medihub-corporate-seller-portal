import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'app',        // <-- points to index.html
  build: {
    outDir: 'dist',   // output folder relative to root
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'app'),
    },
  },
  plugins: [react()],
  base: '/',
});
