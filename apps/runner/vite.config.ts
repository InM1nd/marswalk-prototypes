import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Standalone dev/deploy uses '/'. The root dev proxy sets VITE_BASE_PATH=/runner/
  // so asset/HMR URLs resolve correctly when this app is served under /runner
  // behind the hub (see ../../scripts/dev-server.mjs).
  base: process.env.VITE_BASE_PATH ?? '/',
})
