#!/usr/bin/env node
// Playwright scenario: country emblems via the real simulator flow (Part B/C).
//
// Runs against `npm run dev`. Each host emblem is triggered end-to-end: pick the
// round whose venue sits in that host (Final→MetLife/US, Group→Azteca/MX,
// Semi-final→BC Place/CA), simulate, and watch the flight cross into that host's
// bounding circle and fire its emblem. Asserts, via a MutationObserver (robust to
// the variable headless frame rate):
//   1. us-emblem-fires / mx-emblem-fires / ca-emblem-fires — each host emblem
//      appears during its flight.
//   2. no-cross-fire — never more than one emblem in the DOM at once.
// No console errors throughout.

import { execFileSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = 'wc-emblem-test'

function cli(args, { raw = false } = {}) {
  const base = [`-s=${SESSION}`]
  if (raw) base.push('--raw')
  return execFileSync('playwright-cli', [...base, ...args], { encoding: 'utf8' }).trim()
}
const evalJSON = (expr) => JSON.parse(cli(['eval', expr], { raw: true }))
const sleep = (ms) => cli(['run-code', `async page => { await page.waitForTimeout(${ms}) }`])

// Set a React-controlled <select> by aria-label (native value setter + change).
const setRound = (roundId) =>
  evalJSON(`(() => {
    const el = [...document.querySelectorAll('select')].find(s => s.getAttribute('aria-label') === 'Round');
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    set.call(el, ${JSON.stringify(roundId)});
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  })()`)

// Reset the observer, simulate, and return { seen, max } after the flight. A
// persistent observer catches every emblem regardless of the headless frame
// rate; the window is generous enough for the two-leg flight even when slow.
function runFlight() {
  evalJSON(`(() => {
    window.__seen = new Set();
    window.__max = 0;
    const root = document.querySelector('.sim');
    window.__obs && window.__obs.disconnect();
    window.__obs = new MutationObserver(() => {
      const n = document.querySelectorAll('.emblem').length;
      window.__max = Math.max(window.__max, n);
      const e = document.querySelector('.emblem');
      if (e) window.__seen.add(e.dataset.country);
    });
    window.__obs.observe(root, { childList: true, subtree: true });
    document.querySelector('.sim__go').click();
    return 1;
  })()`)
  sleep(9000)
  return { seen: evalJSON('[...(window.__seen||[])]'), max: evalJSON('window.__max||0') }
}

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

try {
  cli(['open', `${BASE_URL}/simulator`])
  cli(['run-code', 'async page => { await page.waitForSelector(".sim__go", { timeout: 15000 }) }'])

  let maxEver = 0
  for (const [round, host, name] of [['final', 'US', 'us-emblem-fires'], ['group', 'MX', 'mx-emblem-fires'], ['sf', 'CA', 'ca-emblem-fires']]) {
    setRound(round)
    sleep(400)
    const { seen, max } = runFlight()
    maxEver = Math.max(maxEver, max)
    record(name, seen.includes(host), `round=${round} emblems seen=${JSON.stringify(seen)} (want ${host})`)
    sleep(500)
  }
  record('no-cross-fire', maxEver <= 1, `max emblems on screen at once = ${maxEver}`)

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
