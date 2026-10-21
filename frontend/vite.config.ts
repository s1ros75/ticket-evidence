import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // /api へのリクエストをRailsへ転送する（同じオリジンになるのでCORS設定が要らない）
    // Docker内では API_PROXY_TARGET=http://backend:3000 を渡す
    // 文字列で書くとHostヘッダーが backend:3000 に書き換わり、RailsのHost Authorizationに拒否されるため、
    // changeOrigin: false で localhost:5173 のまま転送する
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
