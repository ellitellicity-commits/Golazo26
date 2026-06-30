// Bracket engine — turns the model's Monte Carlo title odds into head-to-head
// knockout probabilities, wires the fixed 2026 bracket tree, and runs a single
// samplable simulation. No data is invented: team strength is derived from
// odds.json (the same 10k-sim output the rest of the product shows).

import oddsData from '../data/odds.json'
import bracketData from '../data/bracket.json'
import { teamMeta, flagUrl } from './teams'

// --- Strength ratings ------------------------------------------------------
// A team's knockout strength is the log of its championship odds (the canonical
// strength ranking the product already presents), floored so the long tail of
// zero-title teams still has a finite, ordered rating.
const FLOOR = 0.00015
const RATING = Object.fromEntries(
  oddsData.teams.map((t) => [t.team, Math.log((t.championship_odds || 0) + FLOOR)]),
)
const ODDS = Object.fromEntries(oddsData.teams.map((t) => [t.team, t.championship_odds]))

// --- Venue-specific host advantage -----------------------------------------
// Mirrors scripts/generate_fixtures.py: a host nation only gets the boost when
// it is physically playing in its own country (by venue), in either slot. The
// boost is a measured nudge in rating units, not a structural home-slot bias.
const HOST_OF = { 'United States': 'US', Canada: 'CA', Mexico: 'MX' }
const HOST_BONUS = 0.62 // log-odds rating units → ~+6-9pt swing at K below

// Logistic on the rating gap. K tuned so clear favourites sit ~80–90% (a single
// knockout match is never a sure thing); clamped so nothing reads as a lock.
const K = 0.46

// Matchup probabilities are pure functions of (home, away, venue) and the same
// pairings recur thousands of times across a Monte Carlo run. Memoise them into
// a lookup table so a simulation loop is table reads, not repeated Math.exp —
// the same precompute-the-matchups trick the offline notebook uses. Keyed by
// venue too, because the host bonus is venue-specific.
const PROB_CACHE = new Map()

function computeWinProb(home, away, venueCountry) {
  let rh = RATING[home] ?? Math.log(FLOOR)
  let ra = RATING[away] ?? Math.log(FLOOR)
  if (venueCountry && HOST_OF[home] === venueCountry) rh += HOST_BONUS
  if (venueCountry && HOST_OF[away] === venueCountry) ra += HOST_BONUS
  const p = 1 / (1 + Math.exp(-K * (rh - ra)))
  return Math.min(0.9, Math.max(0.1, p))
}

export function winProb(home, away, venueCountry = null) {
  const key = `${home}␟${away}␟${venueCountry || ''}`
  let p = PROB_CACHE.get(key)
  if (p === undefined) {
    p = computeWinProb(home, away, venueCountry)
    PROB_CACHE.set(key, p)
  }
  return p
}

// Is `name` a host nation playing at home at this venue country?
export function isHostAtHome(name, venueCountry) {
  return !!venueCountry && HOST_OF[name] === venueCountry
}

// --- Group colours (rainbow data role, per the bracket brief) --------------
// 12 distinct vivid hues, one per group — group identity is a legitimate data
// channel in a 48-team bracket. Always paired with the group LETTER (non-colour
// signal) so it survives colour-vision deficiency.
// Hue-matched to the 12 group borders in WorldCup2026_Bracket.webp (sampled),
// vivified for legibility on the black ground.
export const GROUP_COLOR = {
  A: '#23c552', // green
  B: '#ff2e43', // red
  C: '#ff9d1c', // amber
  D: '#2f6bff', // blue
  E: '#8a3ff0', // violet
  F: '#bce021', // lime
  G: '#ff4d8d', // pink
  H: '#14cc97', // teal
  I: '#bd4de0', // magenta
  J: '#1fb0e0', // cyan
  K: '#ff5a1f', // rust
  L: '#3fb1f5', // sky
}

// Readable text colour on a given group fill (studio-black on light hues,
// near-white on dark ones), via relative luminance.
export function onColor(hex) {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16) / 255
  const g = parseInt(n.slice(2, 4), 16) / 255
  const b = parseInt(n.slice(4, 6), 16) / 255
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.4 ? '#080c0f' : '#f3f5f8'
}

// --- Teams + groups --------------------------------------------------------
export function team(name) {
  if (!name) return null
  const meta = teamMeta(name)
  return {
    kind: 'team',
    name,
    code: meta.code,
    group: meta.group,
    iso: meta.iso,
    flag: flagUrl(meta.iso),
    color: GROUP_COLOR[meta.group] || '#8a9096',
  }
}

// Groups A–L with their four nations, favourite first.
export function getGroups() {
  const byLetter = {}
  for (const t of oddsData.teams) {
    const meta = teamMeta(t.team)
    const g = meta.group
    if (!g || g === '?') continue
    ;(byLetter[g] ||= []).push({
      name: t.team,
      code: meta.code,
      iso: meta.iso,
      flag: flagUrl(meta.iso),
      odds: t.championship_odds,
    })
  }
  return Object.keys(byLetter)
    .sort()
    .map((letter) => ({
      letter,
      color: GROUP_COLOR[letter],
      textColor: onColor(GROUP_COLOR[letter]),
      teams: byLetter[letter].sort((a, b) => b.odds - a.odds),
    }))
}

// --- Fixed bracket tree ----------------------------------------------------
// Match numbers + feeders follow the locked 2026 bracket and the reference
// image. "W74" = winner of match 74; "L101" = loser of semi-final 101.
const FEEDS = {
  89: ['W74', 'W77'], 90: ['W73', 'W75'], 93: ['W83', 'W84'], 94: ['W81', 'W82'],
  91: ['W76', 'W78'], 92: ['W79', 'W80'], 95: ['W86', 'W88'], 96: ['W85', 'W87'],
  97: ['W89', 'W90'], 98: ['W93', 'W94'], 99: ['W91', 'W92'], 100: ['W95', 'W96'],
  101: ['W97', 'W98'], 102: ['W99', 'W100'],
  103: ['W101', 'W102'],
  104: ['L101', 'L102'],
}

// Display geometry: which ids sit in which column, top-to-bottom, per side.
export const LAYOUT = {
  left: {
    r32: [74, 77, 73, 75, 83, 84, 81, 82],
    r16: [89, 90, 93, 94],
    qf: [97, 98],
    sf: [101],
  },
  right: {
    r32: [76, 78, 79, 80, 86, 88, 85, 87],
    r16: [91, 92, 95, 96],
    qf: [99, 100],
    sf: [102],
  },
  finalId: 103,
  thirdId: 104,
}

const ROUND_OF = {}
;[74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87].forEach((id) => (ROUND_OF[id] = 'r32'))
;[89, 90, 93, 94, 91, 92, 95, 96].forEach((id) => (ROUND_OF[id] = 'r16'))
;[97, 98, 99, 100].forEach((id) => (ROUND_OF[id] = 'qf'))
;[101, 102].forEach((id) => (ROUND_OF[id] = 'sf'))
ROUND_OF[103] = 'final'
ROUND_OF[104] = 'third'

// Reveal order for the simulation: round by round, towards the trophy.
export const REVEAL_ORDER = [
  [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87], // R32
  [89, 90, 93, 94, 91, 92, 95, 96], // R16
  [97, 98, 99, 100], // QF
  [101, 102], // SF
  [104], // Third place
  [103], // Final
]

// --- Results -> resolved competitors ---------------------------------------
function tokenName(tok, results) {
  if (tok.startsWith('W')) return results[+tok.slice(1)]?.winner ?? null
  if (tok.startsWith('L')) return results[+tok.slice(1)]?.loser ?? null
  return null
}

function competitorFor(tok, results) {
  const name = tokenName(tok, results)
  return name ? team(name) : { kind: 'placeholder', label: tok }
}

// The real results known today (only completed R32 matches).
export function liveResults() {
  const results = {}
  for (const m of bracketData.r32) {
    if (m.status !== 'completed' || !m.result) continue
    const homeWins = m.result.home_score > m.result.away_score
    results[m.id] = {
      winner: homeWins ? m.home : m.away,
      loser: homeWins ? m.away : m.home,
      score: m.result,
    }
  }
  return results
}

// Venue country for any match id (R32 inline, knockout from koVenues).
const KO_VENUE = bracketData.koVenues || {}
const R32_VENUE = Object.fromEntries(bracketData.r32.map((m) => [m.id, m.venue]))
function venueOf(id) {
  return R32_VENUE[id] || KO_VENUE[id] || null
}

// One full Monte Carlo realisation of the bracket (R32 -> Final + third place).
export function simulate() {
  const results = {}
  const decide = (id, homeName, awayName) => {
    const p = winProb(homeName, awayName, venueOf(id)?.country)
    const homeWins = Math.random() < p
    results[id] = {
      winner: homeWins ? homeName : awayName,
      loser: homeWins ? awayName : homeName,
      p,
    }
  }
  for (const m of bracketData.r32) decide(m.id, m.home, m.away)
  for (const id of [89, 90, 93, 94, 91, 92, 95, 96, 97, 98, 99, 100, 101, 102, 104, 103]) {
    const [hf, af] = FEEDS[id]
    decide(id, tokenName(hf, results), tokenName(af, results))
  }
  return results
}

// --- Build the full view the bracket renders -------------------------------
// `mode` is 'live' or 'simulate'. In simulate mode, `results` is a full sim;
// in live mode it is the real completed matches only.
export function buildViews(results, mode) {
  const views = {}
  const today = bracketData.today

  // R32 — competitors always known from the fixture data.
  for (const m of bracketData.r32) {
    const home = team(m.home)
    const away = team(m.away)
    const completedLive = mode === 'live' && m.status === 'completed'
    const r = results[m.id] || null
    const vc = m.venue.country
    views[m.id] = {
      id: m.id,
      round: 'r32',
      home,
      away,
      homeHost: isHostAtHome(m.home, vc),
      awayHost: isHostAtHome(m.away, vc),
      pHome: winProb(m.home, m.away, vc),
      venue: m.venue,
      date: m.date,
      kickoff: m.kickoff,
      isToday: mode === 'live' && m.status === 'scheduled' && m.date === today,
      status: completedLive ? 'completed' : 'scheduled',
      score: completedLive ? m.result : null,
      winner: r?.winner ?? null,
      loser: r?.loser ?? null,
    }
  }

  // Knockout rounds — competitors resolved from results, else placeholders.
  for (const id of [89, 90, 93, 94, 91, 92, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104]) {
    const [hf, af] = FEEDS[id]
    const home = competitorFor(hf, results)
    const away = competitorFor(af, results)
    const bothKnown = home.kind === 'team' && away.kind === 'team'
    const r = results[id] || null
    const venue = KO_VENUE[id] || null
    const vc = venue?.country
    views[id] = {
      id,
      round: ROUND_OF[id],
      home,
      away,
      homeHost: bothKnown && isHostAtHome(home.name, vc),
      awayHost: bothKnown && isHostAtHome(away.name, vc),
      pHome: bothKnown ? winProb(home.name, away.name, vc) : null,
      venue,
      status: r ? 'decided' : 'pending',
      winner: r?.winner ?? null,
      loser: r?.loser ?? null,
    }
  }

  return views
}

export const META = {
  generated: bracketData.generated,
  locked: bracketData.locked,
  today: bracketData.today,
  final: bracketData.final,
  thirdPlace: bracketData.thirdPlace,
  rounds: bracketData.rounds,
}

// Title odds for a team name (for the champion card), formatted like the rest.
export function titleOdds(name) {
  return ODDS[name] ?? 0
}

// The earliest knockout round that isn't fully decided in the real results —
// the tournament's live stage. Derived from the same data the bracket renders,
// so the home hub and the bracket never disagree.
const STAGE_LABELS = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Third place', 'Final']
export function currentStageLabel() {
  const live = liveResults()
  for (let i = 0; i < REVEAL_ORDER.length; i++) {
    if (!REVEAL_ORDER[i].every((id) => live[id])) return STAGE_LABELS[i]
  }
  return 'Final'
}

// Whole days from the bracket's reference "today" to the final. Pinned to the
// data's date (UTC) rather than the wall clock, so the count is reproducible
// and consistent with every other date in the product.
export function daysToFinal() {
  const today = new Date(`${META.today}T00:00:00Z`)
  const final = new Date(`${META.final.date}T00:00:00Z`)
  return Math.round((final - today) / 86_400_000)
}
