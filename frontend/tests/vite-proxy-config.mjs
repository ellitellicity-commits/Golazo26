#!/usr/bin/env node
// Regression guard: the live-data proxy wiring in vite.config.js must stay intact
// through unrelated edits (session brief, Part 0a).
//
// Context: the Home page fell back to "Snapshot" and the suspected cause was that
// hand-editing vite.config.js (adding the Tailwind plugin + `@` alias) had damaged
// the proxy. Diagnosis showed the config was actually intact — the real cause was
// a missing FOOTBALL_DATA_API_KEY in .env. But the config IS the thing a future
// manual edit could quietly break, so this pins the pieces the live path depends
// on. It's a static check (no browser, no key): run `node tests/vite-proxy-config.mjs`.
//
// NOTE: a green check here does NOT mean live data is on — that additionally needs
// FOOTBALL_DATA_API_KEY set in .env (or the environment). This only proves the
// proxy plumbing wasn't removed.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const cfg = readFileSync(join(HERE, '../vite.config.js'), 'utf8')

// Each guard: a label and a matcher that must be present in vite.config.js.
const guards = [
  ['reads all env vars (empty prefix)', /loadEnv\(\s*mode\s*,\s*process\.cwd\(\)\s*,\s*['"]['"]\s*\)/],
  ['extracts the football-data key', /FOOTBALL_DATA_API_KEY/],
  ['defines the /football-api proxy route', /['"]\/football-api['"]\s*\]?\s*[:=]|proxy\[['"]\/football-api['"]\]/],
  ['proxies to football-data.org', /target:\s*['"]https:\/\/api\.football-data\.org['"]/],
  ['injects the auth token server-side', /['"]X-Auth-Token['"]\s*:/],
  ['strips the /football-api prefix', /replace\(\s*\/\^\\?\/football-api\/?,\s*['"]{2}\s*\)/],
  ['compiles the __HAS_LIVE_DATA__ flag', /__HAS_LIVE_DATA__:\s*JSON\.stringify\(Boolean\(apiKey\)\)/],
  ['only enables the proxy when a key exists', /if\s*\(\s*apiKey\s*\)/],
]

const results = guards.map(([name, re]) => ({ name, ok: re.test(cfg) }))

let failed = 0
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`)
  if (!r.ok) failed++
}
console.log(`\n${results.length - failed}/${results.length} proxy-config guards intact`)
if (failed) console.log('The live-data proxy wiring in vite.config.js was altered — restore it before shipping.')
process.exit(failed ? 1 : 0)
