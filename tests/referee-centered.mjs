#!/usr/bin/env node
// Playwright scenario: the cutscene referee sits at true dead-centre (both axes).
//
// Runs against `npm run dev`. Fix 4 moves the referee from centre-bottom to true
// dead-centre of the screen. Drives the Matchup cutscene to the countdown beat
// (where the bubble is suppressed, so the referee element IS the SVG) and asserts
// at desktop + mobile:
//   1. horizontally-centred — referee box centre x == viewport centre x.
//   2. vertically-centred   — referee box centre y == viewport centre y (this is
//                             the actual fix: it used to be pinned to the bottom).
//   3. countdown-behind     — the giant countdown paints behind the referee
//                             (z-index 2 < 6) and is itself centred on the frame.
// No console errors throughout.

import { execFileSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = 'wc-referee-test'

function cli(args, { raw = false } = {}) {
  const base = [`-s=${SESSION}`]
  if (raw) base.push('--raw')
  return execFileSync('playwright-cli', [...base, ...args], { encoding: 'utf8' }).trim()
}
const evalJSON = (expr) => JSON.parse(cli(['eval', expr], { raw: true }))

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

// Drive one viewport: reload sim, run the cutscene to the count beat, measure.
function checkViewport(tag, w, h) {
  cli(['run-code', `async page => {
    await page.setViewportSize({ width: ${w}, height: ${h} });
    await page.goto('${BASE_URL}/simulator');
    await page.waitForSelector('.sim__go', { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.click('.sim__go');
    await page.waitForSelector('.cutscene[data-beat="count"]', { timeout: 20000 });
  }`])

  const m = evalJSON(`(() => {
    const ref = document.querySelector('.referee--cutscene');
    const count = document.querySelector('.cut__count');
    const r = ref.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const refZ = +getComputedStyle(ref).zIndex || 0;
    const countZ = count ? (+getComputedStyle(count).zIndex || 0) : null;
    const cr = count ? count.getBoundingClientRect() : null;
    return {
      cx: r.left + r.width / 2, cy: r.top + r.height / 2,
      vw, vh, refZ, countZ,
      countCx: cr ? cr.left + cr.width / 2 : null,
      countCy: cr ? cr.top + cr.height / 2 : null,
    };
  })()`)

  const dx = Math.abs(m.cx - m.vw / 2)
  const dy = Math.abs(m.cy - m.vh / 2)
  // Horizontal: tight. Vertical: allow a little for the referee's own asymmetry
  // (raised arm shifts the SVG box a few px), but must be nowhere near the bottom.
  record(`${tag}-horizontally-centred`, dx <= 24, `centre x off by ${dx.toFixed(1)}px (vw=${m.vw})`)
  record(`${tag}-vertically-centred`, dy <= 48, `centre y off by ${dy.toFixed(1)}px (vh=${m.vh}, refCy=${m.cy.toFixed(0)})`)

  const countBehind = m.countZ !== null && m.countZ < m.refZ &&
    Math.abs(m.countCx - m.vw / 2) <= 24 && Math.abs(m.countCy - m.vh / 2) <= 24
  record(`${tag}-countdown-behind`, countBehind, `countZ=${m.countZ} < refZ=${m.refZ}, count centre=(${m.countCx?.toFixed(0)},${m.countCy?.toFixed(0)})`)
}

try {
  cli(['open', `${BASE_URL}/simulator`])
  checkViewport('desktop', 1280, 800)
  checkViewport('mobile', 390, 844)

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
