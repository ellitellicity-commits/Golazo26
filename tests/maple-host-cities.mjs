#!/usr/bin/env node
// Playwright scenario: Maple's guided tour names Canada's real host cities only.
//
// Runs against `npm run dev`. Canada co-hosts WC2026 with exactly two venues -
// BC Place (Vancouver) and BMO Field (Toronto). Edmonton is NOT a host city and
// must never appear in Maple's tour, fun facts, or the Atlas panel. This drives
// the Atlas end-to-end: jump to Canada, walk every tour beat, and assert:
//   1. no-edmonton        — "Edmonton" appears in no rendered tour/panel text.
//   2. names-vancouver    — Vancouver is named across the tour.
//   3. names-toronto      — Toronto is named across the tour.
//   4. exactly-two-venues — the Atlas venue/host-city surface lists exactly the
//                           two real Canada venues, no third city.
// No console errors throughout.

import { execFileSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = 'wc-maple-test'

function cli(args, { raw = false } = {}) {
  const base = [`-s=${SESSION}`]
  if (raw) base.push('--raw')
  return execFileSync('playwright-cli', [...base, ...args], { encoding: 'utf8' }).trim()
}
const evalJSON = (expr) => JSON.parse(cli(['eval', expr], { raw: true }))
const sleep = (ms) => cli(['run-code', `async page => { await page.waitForTimeout(${ms}) }`])

// Set a React-controlled <select> by aria-label (native value setter + change).
const setSelect = (label, value) =>
  evalJSON(`(() => {
    const el = [...document.querySelectorAll('select')].find(s => s.getAttribute('aria-label') === ${JSON.stringify(label)});
    if (!el) return null;
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  })()`)

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

try {
  cli(['open', `${BASE_URL}/encyclopedia`])
  // Wait for the Atlas jump-select to mount (globe lazy-loads behind it).
  cli(['run-code', `async page => {
    await page.waitForFunction(() =>
      [...document.querySelectorAll('select')].some(s => s.getAttribute('aria-label') === 'Jump to a nation'),
      { timeout: 20000 })
  }`])

  setSelect('Jump to a nation', 'Canada')
  // Wait for Maple's tour bubble.
  cli(['run-code', 'async page => { await page.waitForSelector(".mascot--tour .mascot__fact", { timeout: 15000 }) }'])

  // Walk every tour beat, letting the typewriter settle, collecting rendered text.
  const seen = []
  for (let i = 0; i < 8; i++) {
    sleep(1400) // typewriter finishes the current line
    const text = evalJSON(`(() => {
      const f = document.querySelector('.mascot--tour .mascot__fact') || document.querySelector('.mascot__fact');
      return f ? f.textContent : '';
    })()`)
    if (text) seen.push(text)
    const last = evalJSON(`(() => {
      const b = document.querySelector('.mascot__next');
      return b ? /Explore/.test(b.textContent) : true;
    })()`)
    // Advance (or hand off on the final beat).
    cli(['run-code', 'async page => { const b = await page.$(".mascot__next"); if (b) await b.click() }'])
    if (last) break
  }

  const tourText = seen.join(' | ')

  // After the tour hands off, capture the panel's HOST-CITY / VENUE COPY channels
  // (brief, fun facts, stats) - but NOT the geographic province/capital sub-map.
  // The sub-map legitimately plots all 13 Canadian provincial capitals (incl.
  // Edmonton = Alberta's capital, Ottawa = national) as reference dots; those are
  // correct geography, not host-city claims, so they're excluded from this check.
  sleep(1200)
  const panelCopy = evalJSON(`(() => {
    const p = document.querySelector('.enc-panel');
    if (!p) return '';
    const clone = p.cloneNode(true);
    clone.querySelectorAll('.submap').forEach((el) => el.remove());
    return clone.textContent;
  })()`)

  const allCopy = `${tourText} || ${panelCopy}`

  record('no-edmonton', !/Edmonton/i.test(allCopy), `tour+panel copy=${JSON.stringify(tourText)}`)
  record('names-vancouver', /Vancouver/i.test(allCopy), 'Vancouver present')
  record('names-toronto', /Toronto/i.test(allCopy), 'Toronto present')

  // Count distinct Canada host cities named in the host-city/venue copy. The real
  // set is exactly {Vancouver, Toronto}; a third (Edmonton/Montreal/etc.) fails.
  const cities = ['Vancouver', 'Toronto', 'Edmonton', 'Montreal', 'Calgary', 'Ottawa']
    .filter((c) => new RegExp(c, 'i').test(allCopy))
  record('exactly-two-venues', cities.length === 2 && cities.includes('Vancouver') && cities.includes('Toronto'),
    `Canada host cities in copy = ${JSON.stringify(cities)}`)

  // Sanity: the geographic sub-map still plots Edmonton as Alberta's capital (a
  // non-national dot) - correct reference data we deliberately keep, not a venue.
  const edmontonIsCapital = evalJSON(`(() => {
    const titles = [...document.querySelectorAll('.submap title')].map(t => t.textContent);
    return titles.some(t => /Edmonton/i.test(t) && /Alberta/i.test(t) && !/capital\\)/i.test(t));
  })()`)
  record('edmonton-is-capital-not-venue', edmontonIsCapital,
    'sub-map keeps Edmonton as Alberta provincial capital (correct geography)')

  const noErr = /Errors:\s*0|Returning 0 messages/.test(cli(['console', 'error']))
  record('no-console-errors', noErr, noErr ? 'clean' : 'errors present')
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
