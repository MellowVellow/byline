import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': process.env.VITE_API_URL || 'http://localhost:8000' } },
  // Keep harper.js unbundled in dev: its `new URL('*.wasm', import.meta.url)`
  // must resolve against its real dist/ path, not a pre-bundled chunk URL.
  optimizeDeps: { exclude: ['harper.js'] },
})
