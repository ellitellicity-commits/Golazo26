#!/usr/bin/env node
// Playwright scenario: the atmospheric CloudBackground renders behind both globes.
//
// Runs against `npm run dev`. A decorative deep-space nebula layer sits behind the
// Atlas and Matchup Sandbox globes. Asserts, on BOTH tabs and at desktop + mobile
// widths:
//   1. clouds-present     — the .clouds layer + its 6 nebula masses are in the DOM.
//   2. behind-globe       — the clouds layer paints strictly behind the globe
//                           (clouds z-index 0 < globe-hero z-index 1).
//   3. no-globe-overlap   — the clouds layer never sits on top of the globe:
//                           the element at the globe's centre point is the globe
//                           canvas, not a cloud mass (checked desktop + mobile).
//   4. animation-runs     — a drift animation is applied and advancing.
// No console errors throughout.

import { execFileSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = 'wc-cloud-test'

function cli(args, { raw = false } = {}) {
  const base = [`-s=${SESSION}`]
  if (raw) base.push('--raw')
  return execFileSync('playwright-cli', [...base, ...args], { encoding: 'utf8' }).trim()
}
const evalJSON = (expr) => JSON.parse(cli(['eval', expr], { raw: true }))
const sleep = (ms) => cli(['run-code', `async page => { await page.waitForTimeout(${ms}) }`])
const setViewport = (w, h) => cli(['run-code', `async page => { await page.setViewportSize({ width: ${w}, height: ${h} }) }`])
const goto = (path) => cli(['run-code', `async page => { await page.goto("${BASE_URL}${path}"); await page.waitForSelector(".globe-hero canvas", { timeout: 20000 }) }`])

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

// Central assertions for whichever tab is loaded. `tab` names it for reporting.
function checkTab(tab, stageSel) {
  // 1. Clouds present.
  const count = evalJSON(`document.querySelectorAll('${stageSel} .clouds .clouds__c').length`)
  record(`${tab}-clouds-present`, count === 6, `${count} nebula masses under ${stageSel}`)

  // 2. Behind the globe by z-index.
  const z = evalJSON(`(() => {
    const clouds = document.querySelector('${stageSel} .clouds');
    const globe = document.querySelector('${stageSel} .globe-hero');
    if (!clouds || !globe) return null;
    const cz = +getComputedStyle(clouds).zIndex || 0;
    const gz = +getComputedStyle(globe).zIndex || 0;
    return { cz, gz };
  })()`)
  record(`${tab}-behind-globe`, z && z.cz < z.gz, `clouds z=${z?.cz} < globe z=${z?.gz}`)

  // 3. No overlap on the globe: the top element at the globe canvas centre is the
  //    canvas itself (or globe-hero), never a .clouds node.
  const overlap = evalJSON(`(() => {
    const cv = document.querySelector('${stageSel} .globe-hero canvas');
    const r = cv.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const el = document.elementFromPoint(cx, cy);
    if (!el) return { hit: 'none', cloud: false };
    return { hit: el.className && el.className.toString ? el.className.toString() : el.tagName, cloud: !!el.closest('.clouds') };
  })()`)
  record(`${tab}-no-globe-overlap`, overlap && overlap.cloud === false, `centre hit = ${JSON.stringify(overlap)}`)

  // 4. Animation applied + advancing (transform matrix changes over time).
  const anim = evalJSON(`(() => {
    const c = document.querySelector('${stageSel} .clouds .clouds__c1');
    const name = getComputedStyle(c).animationName;
    return name;
  })()`)
  const t1 = evalJSON(`getComputedStyle(document.querySelector('${stageSel} .clouds .clouds__c1')).transform`)
  sleep(1200)
  const t2 = evalJSON(`getComputedStyle(document.querySelector('${stageSel} .clouds .clouds__c1')).transform`)
  record(`${tab}-animation-runs`, anim && anim !== 'none' && t1 !== t2, `animation=${anim}, transform advanced=${t1 !== t2}`)
}

try {
  // --- Atlas (Encyclopedia) ---
  cli(['open', `${BASE_URL}/encyclopedia`])
  setViewport(1280, 800)
  goto('/encyclopedia')
  sleep(1500)
  checkTab('atlas-desktop', '.enc__stage')
  setViewport(390, 844)
  sleep(1200)
  checkTab('atlas-mobile', '.enc__stage')

  // --- Matchup Sandbox (Simulator) ---
  setViewport(1280, 800)
  goto('/simulator')
  sleep(1500)
  checkTab('sim-desktop', '.sim__stage')
  setViewport(390, 844)
  sleep(1200)
  checkTab('sim-mobile', '.sim__stage')

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
