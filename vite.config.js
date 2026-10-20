import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The fixed port and the quiet screen are for the desktop app (src-tauri/tauri.conf.json points at
// this port); the web build and `npm run dev` in a browser are unaffected.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
})
