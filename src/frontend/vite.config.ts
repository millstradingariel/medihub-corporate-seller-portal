import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'app',        // points to index.html
  build: {
    outDir: 'dist',   // relative to root
    emptyOutDir: true,
  },
  plugins: [react()],
  base: '/',
});
