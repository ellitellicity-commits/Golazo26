#!/usr/bin/env node
// Regression: penalty-shootout score is derived correctly (session brief, quick fix).
//
// football-data.org sometimes reports a decided shootout with a degenerate
// `penalties` field (observed: Australia–Egypt as pens 4–4 with a null winner),
// while `fullTime` still encodes the real result. data.js now derives the
// shootout from fullTime minus the 120-minute score. This pins that against the
// three real ties from the live feed, asserting the displayed shootout and the
// advancing winner match the actual result — not the bad raw field.
//
// Runs in-page through Vite (data.js pulls in SVG imports Node can't load), so it
// needs `npm run dev`. Drives the global playwright-cli.

import { execFileSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173/'
const SESSION = 'wc-shootout-test'

function cli(args, { raw = false } = {}) {
  const base = [`-s=${SESSION}`]
  if (raw) base.push('--raw')
  return execFileSync('playwright-cli', [...base, ...args], { encoding: 'utf8' }).trim()
}

// The three FINISHED shootout ties exactly as the live API returns them. Egypt's
// `penalties` (4–4) and null winner are the degenerate case; fullTime (3–5) is right.
const PROBE = `(async () => {
  const data = await import('/src/lib/data.js');
  const mk = (home, away, s) => ({ status: 'FINISHED', homeTeam: { name: home }, awayTeam: { name: away }, score: s });
  const matches = [
    mk('Germany', 'Paraguay', { winner: 'AWAY_TEAM', duration: 'PENALTY_SHOOTOUT', regularTime: { home: 1, away: 1 }, extraTime: { home: 0, away: 0 }, fullTime: { home: 4, away: 5 }, penalties: { home: 3, away: 4 } }),
    mk('Netherlands', 'Morocco', { winner: 'AWAY_TEAM', duration: 'PENALTY_SHOOTOUT', regularTime: { home: 1, away: 1 }, extraTime: { home: 0, away: 0 }, fullTime: { home: 3, away: 4 }, penalties: { home: 2, away: 3 } }),
    mk('Australia', 'Egypt', { winner: null, duration: 'PENALTY_SHOOTOUT', regularTime: { home: 1, away: 1 }, extraTime: { home: 0, away: 0 }, fullTime: { home: 3, away: 5 }, penalties: { home: 4, away: 4 } }),
  ];
  const merged = data.mergeLiveData(matches);
  const rp = merged.knockout.resultsByPair;
  const key = (a, b) => [a, b].sort().join('|');
  const read = (h, a) => { const r = rp.get(key(h, a)); return r ? { winner: r.winner, pens: r.penalties } : null; };
  return {
    egypt: read('Australia', 'Egypt'),
    germany: read('Germany', 'Paraguay'),
    netherlands: read('Netherlands', 'Morocco'),
  };
})()`

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

try {
  cli(['open', BASE_URL])
  cli(['run-code', 'async page => { await page.waitForSelector(".snapshot", { timeout: 10000 }) }'])
  const p = JSON.parse(cli(['eval', PROBE], { raw: true }))

  // The bug case: Egypt won 4–2, from fullTime 3–5 over 120' 1–1 (not the raw 4–4).
  record(
    'egypt-derived-4-2',
    p.egypt && p.egypt.winner === 'Egypt' && p.egypt.pens.Egypt === 4 && p.egypt.pens.Australia === 2,
    `winner=${p.egypt?.winner}, pens EGY-AUS=${p.egypt?.pens?.Egypt}-${p.egypt?.pens?.Australia} (want Egypt 4-2)`,
  )
  // The clean cases must be unchanged.
  record(
    'germany-paraguay-4-3',
    p.germany && p.germany.winner === 'Paraguay' && p.germany.pens.Paraguay === 4 && p.germany.pens.Germany === 3,
    `winner=${p.germany?.winner}, pens PAR-GER=${p.germany?.pens?.Paraguay}-${p.germany?.pens?.Germany}`,
  )
  record(
    'netherlands-morocco-3-2',
    p.netherlands && p.netherlands.winner === 'Morocco' && p.netherlands.pens.Morocco === 3 && p.netherlands.pens.Netherlands === 2,
    `winner=${p.netherlands?.winner}, pens MAR-NED=${p.netherlands?.pens?.Morocco}-${p.netherlands?.pens?.Netherlands}`,
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
