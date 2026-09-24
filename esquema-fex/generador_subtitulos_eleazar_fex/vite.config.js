import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Rutas relativas: la build funciona en cualquier subcarpeta de un servidor estatico.
  base: './',
  plugins: [react()],
  worker: {
    // El worker de Whisper se compila como modulo ES y se sirve desde el mismo origen.
    format: 'es',
  },
  optimizeDeps: {
    // @ffmpeg/* se carga en runtime desde /public; no debe pre-bundlearse.
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@ffmpeg/core'],
  },
  server: {
    // OJO: no activamos COOP/COEP. Usamos el core de FFmpeg de un solo hilo,
    // que no necesita SharedArrayBuffer, y asi no bloqueamos la descarga
    // del modelo de Whisper desde Hugging Face.
    port: 5173,
    host: true,
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
  },
})
