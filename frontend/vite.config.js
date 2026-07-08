import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
//
// The `/photo-api` proxy works the same way for player headshots: it injects the
// Google Custom Search key + engine ID server-side (GOOGLE_CUSTOM_SEARCH_KEY /
// GOOGLE_CUSTOM_SEARCH_ENGINE_ID, again NOT VITE_-prefixed) and mirrors the
// production serverless handler in api/photo.js. `__HAS_PHOTO_SEARCH__` gates the
// client so it never calls the proxy when photo search is unconfigured — see
// src/lib/playerPhotoCache.js.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.FOOTBALL_DATA_API_KEY || ''
  const googleKey = env.GOOGLE_CUSTOM_SEARCH_KEY || ''
  const googleCx = env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID || ''
  const hasPhotoSearch = Boolean(googleKey && googleCx)

  const proxy = {}
  if (apiKey) {
    proxy['/football-api'] = {
      target: 'https://api.football-data.org',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/football-api/, ''),
      headers: { 'X-Auth-Token': apiKey },
    }
  }
  if (hasPhotoSearch) {
    proxy['/photo-api'] = {
      target: 'https://www.googleapis.com',
      changeOrigin: true,
      // Rebuild the Custom Search request, injecting key/cx server-side so they
      // never touch the browser. Mirrors api/photo.js.
      rewrite: (path) => {
        const incoming = new URL(path, 'http://localhost')
        const name = incoming.searchParams.get('name') || ''
        const team = incoming.searchParams.get('team') || ''
        const out = new URLSearchParams({
          q: `${name} ${team} 2026 World Cup`.trim(),
          key: googleKey,
          cx: googleCx,
          searchType: 'image',
          num: '3',
          safe: 'active',
        })
        return `/customsearch/v1?${out}`
      },
    }
  }
  const hasProxy = Object.keys(proxy).length > 0

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __HAS_LIVE_DATA__: JSON.stringify(Boolean(apiKey)),
      __HAS_PHOTO_SEARCH__: JSON.stringify(hasPhotoSearch),
    },
    server: { proxy: hasProxy ? proxy : undefined },
    preview: { proxy: hasProxy ? proxy : undefined },
  }
})
