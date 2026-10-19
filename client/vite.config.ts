import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isGitHubPages = Boolean(process.env.GITHUB_ACTIONS);

export default defineConfig({
  base: isGitHubPages ? '/VibeGram/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', changeOrigin: true, ws: true },
    }
  }
})
