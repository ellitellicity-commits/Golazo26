#!/usr/bin/env node
// Unit test: the production football-data.org proxy (repo-root api/index.js).
//
// This is the serverless function that replaces the vite dev proxy in production
// (Vercel rewrites `/football-api/:path*` -> `/api?path=:path*`, which this
// handles). It never ran in a real build before, so this pins its contract:
//   - no key configured            -> 500 (never proxies without a token)
//   - missing upstream path        -> 400
//   - string path                  -> fetches the right upstream URL, token injected
//   - array path (Vercel may split)-> segments re-joined into the same URL
//   - the client token never leaks  (only the X-Auth-Token header carries it)
//
// No network: global.fetch is stubbed to capture the outgoing request. Runs under
// plain node, so it belongs in CI alongside the playwright scenarios.

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const handler = require('../../api/index.js')

const KEY = 'test-token-123'

function mockRes() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    jsonBody: null,
    setHeader(k, v) { this.headers[k] = v },
    status(c) { this.statusCode = c; return this },
    send(b) { this.body = b; return this },
    json(o) { this.jsonBody = o; return this },
  }
}

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })
const realFetch = global.fetch

try {
  // 1. No key -> 500, and it must NOT have attempted any upstream call.
  delete process.env.FOOTBALL_DATA_API_KEY
  let fetched = false
  global.fetch = async () => { fetched = true; return { status: 200, text: async () => '' } }
  let res = mockRes()
  await handler({ query: { path: 'v4/competitions/WC/matches' } }, res)
  record('no-key-500', res.statusCode === 500 && !fetched, `status=${res.statusCode}, fetched=${fetched}`)

  // 2. Key set, string path -> correct upstream URL + token header, status/body passed through.
  process.env.FOOTBALL_DATA_API_KEY = KEY
  let captured = {}
  global.fetch = async (url, opts) => {
    captured = { url: String(url), opts }
    return { status: 200, text: async () => '{"matches":[]}' }
  }
  res = mockRes()
  await handler({ query: { path: 'v4/competitions/WC/matches' } }, res)
  record(
    'string-path-proxies',
    captured.url === 'https://api.football-data.org/v4/competitions/WC/matches' &&
      captured.opts.headers['X-Auth-Token'] === KEY &&
      res.statusCode === 200 && res.body === '{"matches":[]}',
    `url=${captured.url}, token=${captured.opts?.headers?.['X-Auth-Token'] === KEY ? 'injected' : 'MISSING'}, status=${res.statusCode}`,
  )

  // 3. Array path (Vercel can hand back split segments) -> same joined URL.
  captured = {}
  res = mockRes()
  await handler({ query: { path: ['v4', 'competitions', 'WC', 'matches'] } }, res)
  record(
    'array-path-joined',
    captured.url === 'https://api.football-data.org/v4/competitions/WC/matches',
    `url=${captured.url}`,
  )

  // 4. Missing path -> 400.
  res = mockRes()
  await handler({ query: {} }, res)
  record('missing-path-400', res.statusCode === 400, `status=${res.statusCode}`)
} catch (err) {
  record('harness', false, err.message)
} finally {
  global.fetch = realFetch
}

let failed = 0
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  —  ${r.detail}`)
  if (!r.ok) failed++
}
console.log(`\n${results.length - failed}/${results.length} scenarios passed`)
process.exit(failed ? 1 : 0)
