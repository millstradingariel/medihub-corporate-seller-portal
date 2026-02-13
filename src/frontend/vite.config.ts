import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'app',          // app folder contains index.html and main.tsx
  build: {
    outDir: '../dist',   // relative to root (creates /src/frontend/dist)
    emptyOutDir: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'app'),
    },
  },
  base: '/',
});
