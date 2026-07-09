#!/usr/bin/env node
// Playwright scenario: the Atlas globe's render loop pauses off-screen (perf).
//
// Runs against `npm run dev`. GlobeHero drives a raw requestAnimationFrame loop;
// left ungated it renders full-speed even when the canvas is below the fold,
// burning GPU/main-thread on mobile. This asserts the IntersectionObserver gate:
//   1. renders-in-view   — frames advance while the globe is on-screen.
//   2. pauses-off-screen — moving the canvas out of the viewport stops the loop
//                          (E.running false, ~0 render calls).
//   3. resumes-on-return — bringing it back restarts the loop and renders again.
// Uses the DEV-only window.__eng() handle to read engine state + count renders.

import { execFileSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = 'wc-raf-test'

function cli(args, { raw = false } = {}) {
  const base = [`-s=${SESSION}`]
  if (raw) base.push('--raw')
  return execFileSync('playwright-cli', [...base, ...args], { encoding: 'utf8' }).trim()
}
const evalJSON = (expr) => JSON.parse(cli(['eval', expr], { raw: true }))
const sleep = (ms) => cli(['run-code', `async page => { await page.waitForTimeout(${ms}) }`])

// Wrap renderer.render to count calls; reset+read over a window.
const installCounter = () => evalJSON(`(() => {
  const E = window.__eng && window.__eng();
  if (!E) return false;
  if (!E.__orig) { E.__orig = E.renderer.render.bind(E.renderer); }
  E.__count = 0;
  E.renderer.render = (...a) => { E.__count++; return E.__orig(...a); };
  return true;
})()`)
const readCount = () => evalJSON('(() => { const E = window.__eng && window.__eng(); return E ? (E.__count|0) : -1 })()')
const readRunning = () => evalJSON('(() => { const E = window.__eng && window.__eng(); return E ? !!E.running : null })()')

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

try {
  cli(['open', `${BASE_URL}/encyclopedia`])
  cli(['run-code', 'async page => { await page.waitForSelector(".globe-hero canvas", { timeout: 20000 }) }'])
  sleep(600)

  record('eng-handle', installCounter(), 'window.__eng() render counter installed')

  // 1. In view: frames advance.
  evalJSON('(() => { const E = window.__eng(); E.__count = 0; return 1 })()')
  sleep(1000)
  const inView = readCount()
  record('renders-in-view', inView > 10 && readRunning() === true, `render calls in ~1s = ${inView}, running=${readRunning()}`)

  // 2. Move the canvas mount out of the viewport -> IntersectionObserver fires.
  evalJSON(`(() => {
    const el = document.querySelector('.globe-hero');
    el.dataset.prevStyle = el.getAttribute('style') || '';
    el.style.position = 'fixed';
    el.style.top = '-6000px';
    el.style.left = '0';
    return 1;
  })()`)
  sleep(700) // let IO fire + the loop wind down
  evalJSON('(() => { const E = window.__eng(); E.__count = 0; return 1 })()')
  sleep(1000)
  const offScreen = readCount()
  record('pauses-off-screen', offScreen <= 1 && readRunning() === false, `render calls off-screen = ${offScreen}, running=${readRunning()}`)

  // 3. Restore -> loop resumes.
  evalJSON(`(() => {
    const el = document.querySelector('.globe-hero');
    el.setAttribute('style', el.dataset.prevStyle || '');
    return 1;
  })()`)
  sleep(700)
  evalJSON('(() => { const E = window.__eng(); E.__count = 0; return 1 })()')
  sleep(1000)
  const resumed = readCount()
  record('resumes-on-return', resumed > 10 && readRunning() === true, `render calls after return = ${resumed}, running=${readRunning()}`)

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
