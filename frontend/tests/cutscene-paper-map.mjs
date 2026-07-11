#!/usr/bin/env node
// Playwright scenario: the pregame Cutscene's vintage paper map overhaul.
//
// Runs against `npm run dev`. Drives the Matchup Sandbox cutscene to its
// 'flight' beat (the paper-map segment) and asserts, at desktop + mobile:
//   1. map-renders        — the chart SVG mounts with no console errors.
//   2. host-tint-present  — each host nation's land fill carries its own
//                           low-opacity role colour (Canada red / USA blue /
//                           Mexico green), not a single flat sepia wash.
//   3. borders-present    — the province/state border layer has real path
//                           geometry (not an empty/missing baked export).
//   4. comet-tail-moves   — the near-trail's stroke-dashoffset changes over
//                           time as the plane flies (a moving window, not a
//                           static line that's either fully there or absent).
//   5. no-console-errors

import { execFileSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = 'wc-papermap-test'

function cli(args, { raw = false } = {}) {
  const base = [`-s=${SESSION}`]
  if (raw) base.push('--raw')
  return execFileSync('playwright-cli', [...base, ...args], { encoding: 'utf8' }).trim()
}

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

function checkViewport(tag, w, h) {
  const data = JSON.parse(cli(['run-code', `async page => {
    await page.setViewportSize({ width: ${w}, height: ${h} });
    await page.goto('${BASE_URL}/simulator');
    await page.waitForSelector('.sim__go', { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.click('.sim__go');
    await page.waitForFunction(() => document.querySelector('.cutscene')?.getAttribute('data-beat') === 'flight', { timeout: 20000 });
    const samples = [];
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(180);
      samples.push(await page.evaluate(() => document.querySelector('.cut__route-trail--near')?.getAttribute('stroke-dashoffset')));
    }
    return await page.evaluate((samples) => {
      const svg = document.querySelector('.cut__chart');
      const ca = getComputedStyle(document.querySelector('.cut__geo-land--ca')).fill;
      const us = getComputedStyle(document.querySelector('.cut__geo-land--us')).fill;
      const mx = getComputedStyle(document.querySelector('.cut__geo-land--mx')).fill;
      const borders = [...document.querySelectorAll('.cut__borders path')].map((p) => (p.getAttribute('d') || '').length);
      return {
        svgPresent: !!svg,
        tintsDistinct: new Set([ca, us, mx]).size === 3,
        bordersHaveGeometry: borders.every((len) => len > 100),
        trailSamples: samples,
        trailMoved: new Set(samples).size > 1,
      };
    }, samples);
  }`], { raw: true }))
  record(`${tag}-map-renders`, data.svgPresent, JSON.stringify(data))
  record(`${tag}-host-tint-present`, data.tintsDistinct, JSON.stringify(data))
  record(`${tag}-borders-present`, data.bordersHaveGeometry, JSON.stringify(data))
  record(`${tag}-comet-tail-moves`, data.trailMoved, JSON.stringify(data.trailSamples))
}

try {
  cli(['open', '--browser=chromium', `${BASE_URL}/simulator`])
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
