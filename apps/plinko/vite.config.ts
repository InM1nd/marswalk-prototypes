import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Standalone dev/deploy uses '/'. The root dev proxy sets VITE_BASE_PATH=/plinko/
  // so asset/HMR URLs resolve correctly when served under /plinko behind the hub.
  base: process.env.VITE_BASE_PATH ?? '/',
})
