import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

// https://vite.dev/config/
const rootDir = fileURLToPath(new URL('./', import.meta.url))
const sharedDir = path.resolve(rootDir, '../../packages')

export default defineConfig({
  // Needed for Electron production builds (loads `dist/index.html` via `file://`).
  // Also keeps `dist/index.html` double-clickable without a dev server.
  base: './',
  server: {
    fs: {
      allow: [rootDir, sharedDir],
    },
    proxy: {
      '/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openai/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@insight/shared': path.resolve(rootDir, '../../packages/shared/src'),
      react: path.join(rootDir, 'node_modules/react'),
      'react-dom': path.join(rootDir, 'node_modules/react-dom'),
      'react/jsx-runtime': path.join(rootDir, 'node_modules/react/jsx-runtime'),
    },
  },
  plugins: [react()],
})
