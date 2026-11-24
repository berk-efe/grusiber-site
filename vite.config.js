import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // `npm run dev:api` runs the worker on 8787; the site calls it as /api.
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
})
