// vite.config.ts (ROOT)

import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    // 👇 Tell Vite where index.html is
    root: 'src/frontend/app',

    build: {
      // 👇 Output outside app folder
      outDir: '../../../dist',
      emptyOutDir: true,
    },

    plugins: [react()],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/frontend'),
      },
    },

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    base: '/',
  }
})
