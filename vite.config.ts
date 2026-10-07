import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages project site needs /rxscan/; local dev stays at /
  base: process.env.GHPAGES ? '/rxscan/' : '/',
  plugins: [react()],
})
