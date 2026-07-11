#!/usr/bin/env node
// Playwright scenario: the cutscene referee's whistle renders IN the mouth.
//
// Runs against `npm run dev`. The whistle used to paint behind the neck/head
// because ref-head was the last group in the SVG (SVG paint order = document
// order), so the raised whistle-hand - a child of ref-arm-r, which came earlier
// in the markup - was always occluded. The fix draws ref-head first and the
// arms after, plus an explicit CSS z-index lock. This asserts, at the 'count'
// and 'whistle' beats:
//   1. whistle-above-head   — computed z-index of .ref-whistle-hand > .ref-head.
//   2. whistle-at-mouth     — the whistle's bounding box sits at mouth height
//                             and is within a small horizontal tolerance of the
//                             mouth's centre (not off beside the shoulder).
// No console errors throughout.

import { execFileSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = 'wc-whistle-test'

function cli(args, { raw = false } = {}) {
  const base = [`-s=${SESSION}`]
  if (raw) base.push('--raw')
  return execFileSync('playwright-cli', [...base, ...args], { encoding: 'utf8' }).trim()
}
const evalJSON = (expr) => JSON.parse(cli(['eval', expr], { raw: true }))

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

const MEASURE_SRC = `() => {
  const mouth = document.querySelector('.ref-mouth');
  const whistle = document.querySelector('.ref-whistle-hand');
  const head = document.querySelector('.ref-head');
  if (!mouth || !whistle || !head) return { missing: true };
  const m = mouth.getBoundingClientRect();
  const w = whistle.getBoundingClientRect();
  const whistleZ = +getComputedStyle(whistle).zIndex || 0;
  const headZ = +getComputedStyle(head).zIndex || 0;
  const dx = Math.abs((m.left + m.right) / 2 - (w.left + w.right) / 2);
  const yOverlap = Math.min(m.bottom, w.bottom) - Math.max(m.top, w.top);
  return { whistleZ, headZ, dx, yOverlap, headW: head.getBoundingClientRect().width };
}`

// Drives to the 'count' beat (held 1.8s - safe to measure after a settle wait)
// in one round trip.
function measureAtCount() {
  return JSON.parse(cli(['run-code', `async page => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('${BASE_URL}/simulator');
    await page.waitForSelector('.sim__go', { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.click('.sim__go');
    await page.waitForFunction(() => document.querySelector('.cutscene')?.getAttribute('data-beat') === 'count', { timeout: 20000 });
    await page.waitForTimeout(700);
    return await page.evaluate(${MEASURE_SRC});
  }`], { raw: true }))
}

// The 'whistle' beat is a ~0.14s flash before the timeline auto-completes and
// unmounts the Cutscene - a second CDP round trip after waitForFunction would
// race it. Instead, a MutationObserver + measurement run inside ONE page.evaluate
// call, so the reading happens synchronously in the same tick the attribute
// flips to 'whistle' - no round trip in between.
function measureAtWhistleBeat() {
  return JSON.parse(cli(['run-code', `async page => {
    await page.goto('${BASE_URL}/simulator');
    await page.waitForSelector('.sim__go', { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.click('.sim__go');
    return await page.evaluate(() => new Promise((resolve) => {
      const cs = document.querySelector('.cutscene');
      const measure = ${MEASURE_SRC};
      const obs = new MutationObserver(() => {
        if (cs.getAttribute('data-beat') === 'whistle') {
          obs.disconnect();
          resolve(measure());
        }
      });
      obs.observe(cs, { attributes: true, attributeFilter: ['data-beat'] });
      setTimeout(() => { obs.disconnect(); resolve({ missing: true, timedOut: true }); }, 20000);
    }));
  }`], { raw: true }))
}

try {
  cli(['open', `${BASE_URL}/simulator`])

  const count = measureAtCount()
  record('count-whistle-above-head', !count.missing && count.whistleZ > count.headZ, JSON.stringify(count))
  record(
    'count-whistle-at-mouth',
    !count.missing && count.yOverlap > 0 && count.dx <= count.headW * 0.4,
    JSON.stringify(count),
  )

  const blow = measureAtWhistleBeat()
  record('whistle-beat-whistle-above-head', !blow.missing && blow.whistleZ > blow.headZ, JSON.stringify(blow))
  record(
    'whistle-beat-whistle-at-mouth',
    !blow.missing && blow.yOverlap > -4 && blow.dx <= blow.headW * 0.4,
    JSON.stringify(blow),
  )

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
