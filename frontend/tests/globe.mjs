#!/usr/bin/env node
// Playwright scenario: GlobeHero foundation (session brief, Part A).
//
// Runs against `npm run dev`. Drives the global playwright-cli. Asserts:
//   1. globe-renders       — /encyclopedia mounts a WebGL canvas, no console errors.
//   2. flight-completes    — /simulator's scripted flight runs to completion
//                            (onFlightComplete fires → "Arrived"), no console errors.
//   3. geo-foundation      — the pure geo helpers behind arcs + emblem triggers
//                            round-trip and classify the host centres correctly.

import { execFileSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = 'wc-globe-test'

function cli(args, { raw = false } = {}) {
  const base = [`-s=${SESSION}`]
  if (raw) base.push('--raw')
  return execFileSync('playwright-cli', [...base, ...args], { encoding: 'utf8' }).trim()
}
const errorsClean = () => /Errors:\s*0|Returning 0 messages/.test(cli(['console', 'error']))

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

try {
  // 1. Interactive globe renders.
  cli(['open', `${BASE_URL}/encyclopedia`])
  cli(['run-code', 'async page => { await page.waitForSelector(".globe-hero canvas", { timeout: 15000 }) }'])
  const encCanvas = JSON.parse(
    cli(['eval', '(() => { const c=document.querySelector(".globe-hero canvas"); return { ok: !!c && c.width>0 && c.height>0 }; })()'], { raw: true }),
  )
  record('globe-renders', encCanvas.ok && errorsClean(), `canvas ${encCanvas.ok ? 'present' : 'missing'}`)

  // 3. Geo foundation (import the real module through Vite).
  const geo = JSON.parse(
    cli(['eval', `(async () => {
      const g = await import('/src/lib/geo.js');
      const rt = g.xyzToLL(g.llToXYZ(19.43, -99.13, 1)).map(n => Math.round(n * 10) / 10);
      return {
        roundtrip: rt,
        mx: g.hostAtPoint([19.43, -99.13]),
        us: g.hostAtPoint([39, -98]),
        ca: g.hostAtPoint([56, -106]),
        none: g.hostAtPoint([51.5, -0.13]),
        arcLen: g.greatCircleArc([51.5, -0.13], [40.7, -74], 1, 32).length,
      };
    })()`], { raw: true }),
  )
  record(
    'geo-foundation',
    Math.abs(geo.roundtrip[0] - 19.4) < 0.2 && geo.mx === 'MX' && geo.us === 'US' && geo.ca === 'CA' && geo.none === null && geo.arcLen === 33,
    `mx=${geo.mx} us=${geo.us} ca=${geo.ca} none=${geo.none} arcLen=${geo.arcLen}`,
  )

  // 2. Scripted flight completes.
  cli(['open', `${BASE_URL}/simulator`])
  cli(['run-code', 'async page => { await page.waitForSelector(".sim__btn", { timeout: 15000 }) }'])
  cli(['click', '.sim__btn'])
  // Poll the arrival signal (flight is ~2.5s).
  let arrived = false
  const start = Date.now()
  while (Date.now() - start < 10000) {
    const v = cli(['eval', 'document.querySelector(".sim__status")?.dataset.arrived === "true"'], { raw: true })
    if (v === 'true') { arrived = true; break }
    cli(['run-code', 'async page => { await page.waitForTimeout(400) }'])
  }
  record('flight-completes', arrived && errorsClean(), `arrived=${arrived}`)
} catch (err) {
  record('harness', false, err.message)
} finally {
  try { cli(['close']) } catch { /* noop */ }
}

let failed = 0
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  —  ${r.detail}`)
  if (!r.ok) failed++
}
console.log(`\n${results.length - failed}/${results.length} scenarios passed`)
process.exit(failed ? 1 : 0)
