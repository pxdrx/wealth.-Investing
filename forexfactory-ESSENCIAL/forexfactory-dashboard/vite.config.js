import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './frontend',
  test: {
    globals: true,
    environment: 'jsdom',
  },
  server: {
    port: 3000,
    proxy: {
      // CORRIGIDO: Removido rewrite que estava causando o problema
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      // Mantido proxy para /analysis
      '/analysis': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: '../dist'
  }
})