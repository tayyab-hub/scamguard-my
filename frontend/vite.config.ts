// Frontend development/build/test configuration. React and Tailwind transform source, /api
// proxies to the local FastAPI server during development, and Vitest uses jsdom with shared
// cleanup. Preview intentionally has no API proxy.

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    // The camera worker is loaded on demand. Discover its decoder up front so a
    // cold dev server does not reload the page and cancel the first camera scan.
    optimizeDeps: { include: ['zxing-wasm/reader'] },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:8000', changeOrigin: true },
      },
    },
    // Exercise the same frontend-only boundary as Vercel; never inherit the dev API proxy.
    preview: { proxy: {} },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      clearMocks: true,
    },
  }
})
