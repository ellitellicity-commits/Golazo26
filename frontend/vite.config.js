import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// Live-data proxy. football-data.org does not send CORS headers and requires an
// auth token, so the browser can't call it directly. We proxy same-origin
// requests to `/football-api/*` through to the API and inject the token
// server-side. The key is read from FOOTBALL_DATA_API_KEY (NOT a VITE_-prefixed
// var on purpose — VITE_ vars are inlined into the client bundle, which would
// leak the key to anyone who views source). It therefore never reaches the
// browser; only this dev/preview server sees it.
//
// `__HAS_LIVE_DATA__` is compiled in as a plain boolean so the client knows
// whether to attempt a live fetch at all. When no key is set (e.g. a fresh
// clone) the proxy is disabled and the app runs entirely on the bundled static
// snapshot — see src/lib/data.js.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.FOOTBALL_DATA_API_KEY || ''

  const proxy = apiKey
    ? {
        '/football-api': {
          target: 'https://api.football-data.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/football-api/, ''),
          headers: { 'X-Auth-Token': apiKey },
        },
      }
    : undefined

  return {
    plugins: [react()],
    define: {
      __HAS_LIVE_DATA__: JSON.stringify(Boolean(apiKey)),
    },
    server: { proxy },
    preview: { proxy },
  }
})
