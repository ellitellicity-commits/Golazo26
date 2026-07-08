#!/usr/bin/env node
// Playwright scenario: Country Encyclopedia / Atlas (session brief, Part D).
//
// Runs against `npm run dev`. Drives the global playwright-cli. Asserts:
//   1. globe-renders     — /encyclopedia mounts the interactive globe canvas.
//   2. data-complete     — getCountry() over all 48 nations returns non-empty
//                          SOURCED fields (FIFA rank, Elo, confederation, record).
//                          Coach/players/history are intentionally null (flagged
//                          in countryData.js), so they are NOT asserted present.
//   3. panel-populates   — selecting a nation opens the profile panel with a
//                          non-empty name, rank and Elo, and the full stat grid.
//   no console errors throughout.

import { execFileSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = 'wc-enc-test'

function cli(args, { raw = false } = {}) {
  const base = [`-s=${SESSION}`]
  if (raw) base.push('--raw')
  return execFileSync('playwright-cli', [...base, ...args], { encoding: 'utf8' }).trim()
}
const evalJSON = (expr) => JSON.parse(cli(['eval', expr], { raw: true }))
const errorsClean = () => /Errors:\s*0|Returning 0 messages/.test(cli(['console', 'error']))

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

try {
  cli(['open', `${BASE_URL}/encyclopedia`])
  cli(['run-code', 'async page => { await page.waitForSelector(".globe-hero canvas", { timeout: 15000 }) }'])
  record('globe-renders', evalJSON('!!document.querySelector(".globe-hero canvas")') && errorsClean(), 'interactive globe canvas present')

  // 2. Every nation has complete sourced data.
  const data = evalJSON(`(async () => {
    const m = await import('/src/lib/countryData.js');
    let ok = 0, bad = [];
    for (const name of m.COUNTRY_NAMES) {
      const c = m.getCountry(name);
      const good = c && typeof c.fifaRank === 'number' && typeof c.elo === 'number' && c.confederation && c.record && typeof c.record.w === 'number';
      if (good) ok++; else bad.push(name);
    }
    return { total: m.COUNTRY_NAMES.length, ok, bad };
  })()`)
  record('data-complete', data.total === 48 && data.ok === 48, `${data.ok}/${data.total} complete; missing: ${JSON.stringify(data.bad)}`)

  // 3. Selecting a nation populates the panel.
  evalJSON(`(() => {
    const el = [...document.querySelectorAll('select')].find(s => s.getAttribute('aria-label') === 'Jump to a nation');
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    set.call(el, 'Japan');
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return 1;
  })()`)
  cli(['run-code', 'async page => { await page.waitForSelector(".enc-panel", { timeout: 5000 }) }'])
  const panel = evalJSON(`(() => {
    const p = document.querySelector('.enc-panel');
    const val = (sel, i) => p.querySelectorAll(sel)[i]?.textContent?.trim() || '';
    return {
      name: p.querySelector('.enc-panel__name')?.textContent?.trim() || '',
      rank: val('.enc-stat__value', 0),
      elo: val('.enc-stat__value', 1),
      stats: p.querySelectorAll('.enc-stat').length,
      hasRecord: !!p.querySelector('.enc-panel__wdl'),
    };
  })()`)
  record(
    'panel-populates',
    panel.name === 'Japan' && /^#\d+$/.test(panel.rank) && /^\d+$/.test(panel.elo) && panel.stats === 5 && panel.hasRecord && errorsClean(),
    `name=${panel.name} rank=${panel.rank} elo=${panel.elo} stats=${panel.stats} record=${panel.hasRecord}`,
  )
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
