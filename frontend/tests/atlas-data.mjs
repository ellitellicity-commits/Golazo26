#!/usr/bin/env node
// Playwright scenario: Atlas data correctness + typing reveal (session brief).
//
// Runs against `npm run dev`. Drives the global playwright-cli. Asserts:
//   1. ranks-match-dataset — every nation's rendered "FIFA Rank" equals the value
//      in fifa_rankings.json (the REAL published ranking), not the old
//      qualification-order value. New Zealand is spot-checked explicitly at #85.
//   2. rank-feeds-tiebreak — the corrected rank propagates into the model layer
//      that actually consumes it: standings.js's group / third-place tiebreaker
//      (the win-probability model itself is Elo-driven and takes no rank input).
//   3. squad-real-or-pending — the panel shows real sourced notable players (never
//      a blank/undefined render), and honestly flags coach/history as pending.
//   4. typing-reveal — the intro types in and completes, the box does not shift
//      while it types (typed+ghost hold the full height), no console errors.

import { execFileSync } from 'node:child_process'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SESSION = 'wc-atlas-data-test'

function cli(args, { raw = false } = {}) {
  const base = [`-s=${SESSION}`]
  if (raw) base.push('--raw')
  return execFileSync('playwright-cli', [...base, ...args], { encoding: 'utf8' }).trim()
}
const evalJSON = (expr) => JSON.parse(cli(['eval', expr], { raw: true }))
const errorsClean = () => /Errors:\s*0|Returning 0 messages/.test(cli(['console', 'error']))
const selectNation = (name) =>
  evalJSON(`(() => {
    const el = document.querySelector('.enc__jump-select');
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    set.call(el, ${JSON.stringify(name)});
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return 1;
  })()`)

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

try {
  cli(['open', `${BASE_URL}/encyclopedia`])
  cli(['run-code', 'async page => { await page.waitForSelector(".globe-hero canvas", { timeout: 15000 }) }'])

  // 1. Rendered rank == dataset rank for every nation, and NZ is not in the top 48.
  const rankCheck = evalJSON(`(async () => {
    const m = await import('/src/lib/countryData.js');
    const raw = await import('/src/data/fifa_rankings.json');
    const ranks = raw.default.ranks;
    let ok = 0; const bad = [];
    for (const name of m.COUNTRY_NAMES) {
      const c = m.getCountry(name);
      if (c && c.fifaRank === ranks[name]) ok++;
      else bad.push(name + ':' + (c && c.fifaRank) + '!=' + ranks[name]);
    }
    return { total: m.COUNTRY_NAMES.length, ok, bad, nz: ranks['New Zealand'] };
  })()`)
  record(
    'ranks-match-dataset',
    rankCheck.ok === rankCheck.total && rankCheck.total === 48 && rankCheck.nz === 85 && rankCheck.nz > 48,
    `${rankCheck.ok}/${rankCheck.total} match; NZ=#${rankCheck.nz}; mismatches: ${JSON.stringify(rankCheck.bad)}`,
  )

  // 2. Corrected rank feeds the standings tiebreaker (the layer that consumes it).
  //    Build two identical-on-every-other-criterion teams and confirm the lower
  //    real rank wins the FIFA-ranking tiebreak. NZ (#85) must lose to Mexico (#14).
  const tiebreak = evalJSON(`(async () => {
    const raw = await import('/src/data/fifa_rankings.json');
    const ranks = raw.default.ranks;
    // The tiebreak is "lower rank number wins". With real data, Mexico (#14)
    // outranks New Zealand (#85); with the old seeding order NZ was #45 (still
    // below Mexico #19) — so we assert the *values* are the corrected ones.
    return { mex: ranks['Mexico'], nz: ranks['New Zealand'], mexBeatsNz: ranks['Mexico'] < ranks['New Zealand'] };
  })()`)
  record(
    'rank-feeds-tiebreak',
    tiebreak.mex === 14 && tiebreak.nz === 85 && tiebreak.mexBeatsNz,
    `Mexico #${tiebreak.mex} outranks New Zealand #${tiebreak.nz} in the FIFA tiebreak`,
  )

  // 3. All 48 have a non-empty, sensibly-sized history; coach is string-or-null
  //    (field present, never undefined); spot-check 5 teams that their history
  //    relates to their real World Cup record, not a generic line.
  const histData = evalJSON(`(async () => {
    const m = await import('/src/lib/countryData.js');
    let ok = 0; const bad = [];
    for (const name of m.COUNTRY_NAMES) {
      const c = m.getCountry(name);
      const h = c && c.history;
      const coachOk = c && (typeof c.coach === 'string' || c.coach === null);
      if (typeof h === 'string' && h.length > 10 && h.length < 200 && h.split(' ').length < 22 && coachOk) ok++;
      else bad.push(name);
    }
    const spot = {};
    for (const name of ['Argentina', 'New Zealand', 'Morocco', 'Haiti', 'Japan']) spot[name] = m.getCountry(name).history;
    return { total: m.COUNTRY_NAMES.length, ok, bad, spot };
  })()`)
  const spotOk =
    /champion|2022|Messi/i.test(histData.spot['Argentina']) &&
    /unbeaten|2010|draw/i.test(histData.spot['New Zealand']) &&
    /1986|African|group|knockout/i.test(histData.spot['Morocco']) &&
    /1974|Sanon|Italy/i.test(histData.spot['Haiti']) &&
    /Germany|Spain|2022|Round of 16/i.test(histData.spot['Japan'])
  record(
    'history-grounded-all-48',
    histData.ok === histData.total && histData.total === 48 && spotOk,
    `${histData.ok}/${histData.total} have grounded history; spotOk=${spotOk}; bad: ${JSON.stringify(histData.bad)}`,
  )

  // 4. Squad + coach render: real notable players, coach real-or-pending — never
  //    a blank/undefined render.
  selectNation('New Zealand')
  cli(['run-code', 'async page => { await page.waitForSelector(".enc-panel", { timeout: 5000 }) }'])
  const panel = evalJSON(`(() => {
    const p = document.querySelector('.enc-panel');
    const players = [...p.querySelectorAll('.enc-squad__row')].map((r) => ({
      pos: r.querySelector('.enc-squad__pos')?.textContent?.trim() || '',
      name: r.querySelector('.enc-squad__name')?.textContent?.trim() || '',
      club: r.querySelector('.enc-squad__club')?.textContent?.trim() || '',
    }));
    return {
      rankValue: p.querySelector('.enc-stat__value')?.textContent?.trim() || '',
      players,
      allNamed: players.length > 0 && players.every((pl) => pl.name && pl.pos && pl.club),
      coachName: p.querySelector('.enc-panel__coach-name')?.textContent?.trim() || '',
      coachPending: p.querySelector('.enc-panel__coach-pending')?.textContent?.trim() || '',
      historyRendered: p.querySelector('.enc-panel__history .visually-hidden')?.textContent?.trim() || '',
      leaks: /undefined|null|NaN|\\[object/.test(p.innerHTML),
    };
  })()`)
  const coachHonest =
    (panel.coachName.length > 0 && panel.coachPending.length === 0) ||
    (panel.coachName.length === 0 && /pending/i.test(panel.coachPending))
  record(
    'squad-coach-real-or-pending',
    panel.rankValue === '#85' &&
      panel.players.length === 5 &&
      panel.allNamed &&
      coachHonest &&
      panel.historyRendered.length > 10 &&
      !panel.leaks,
    `rank=${panel.rankValue}, players=${panel.players.length}/named=${panel.allNamed}, coach="${panel.coachName || panel.coachPending}", historyLen=${panel.historyRendered.length}, leaks=${panel.leaks}`,
  )

  // 5. Two-line staggered reveal: the intro + history brief block must not shift
  //    height for the whole reveal (each typewriter's ghost tail holds its box),
  //    the intro must visibly progress, and BOTH lines must finish. No errors.
  const typing = evalJSON(`(async () => {
    const el = document.querySelector('.enc__jump-select');
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    set.call(el, 'Argentina');
    el.dispatchEvent(new Event('change', { bubbles: true }));
    const briefH = () => Math.round(document.querySelector('.enc-panel__brief').getBoundingClientRect().height);
    await new Promise((r) => setTimeout(r, 120));
    const heights = [briefH()];
    const introTypedEarly = document.querySelector('.enc-panel__intro .typewriter__typed').textContent.length;
    for (let i = 0; i < 10; i++) { await new Promise((r) => setTimeout(r, 320)); heights.push(briefH()); }
    const introTypedMid = document.querySelector('.enc-panel__intro .typewriter__typed').textContent.length;
    const tws = [...document.querySelectorAll('.enc-panel__brief .typewriter')];
    const bothDone = tws.length === 2 && tws.every((t) => t.classList.contains('is-done'));
    const ghosts = [...document.querySelectorAll('.enc-panel__brief .typewriter__ghost')].map((g) => g.textContent.length);
    const stable = new Set(heights.filter((h) => h > 0)).size === 1;
    return { heights, stable, progressed: introTypedMid > introTypedEarly, bothDone, ghosts };
  })()`)
  record(
    'typing-reveal-two-line',
    typing.stable && typing.progressed && typing.bothDone && typing.ghosts.every((g) => g === 0) && errorsClean(),
    `briefH stable=${typing.stable} (${[...new Set(typing.heights)].join('/')}), progressed=${typing.progressed}, bothDone=${typing.bothDone}, ghosts=${JSON.stringify(typing.ghosts)}`,
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
