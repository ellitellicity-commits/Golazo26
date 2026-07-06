// Bracket engine — turns the model's Monte Carlo title odds into head-to-head
// knockout probabilities, wires the fixed 2026 bracket tree, and runs a single
// samplable simulation. No data is invented: team strength is derived from
// odds.json (the same 10k-sim output the rest of the product shows).

import bracketData from '../data/bracket.json'
import { getOdds } from './data'
import { teamMeta, flagUrl } from './teams'

const oddsData = getOdds()

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

// Winner-advancement parent of every knockout match: PARENT_OF[74] === 89 means
// the winner of M74 walks into M89. Inverted from FEEDS' "W" tokens only (the "L"
// tokens feed the third-place play-off, which draws no connector line). Used to
// scope the path highlight to a single team's advancement, not the whole tree.
export const PARENT_OF = (() => {
  const map = {}
  for (const [pid, feeders] of Object.entries(FEEDS)) {
    for (const tok of feeders) {
      if (tok.startsWith('W')) map[+tok.slice(1)] = +pid
    }
  }
  return map
})()

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

const pairKey = (a, b) => [a, b].sort().join('|')

// The static knockout scaffold, used when no live data is threaded in — keeps
// callers that don't have the tournament context (e.g. currentStageLabel's
// default) working against corrected bracket.json.
const STATIC_KNOCKOUT = { r32: bracketData.r32, resultsByPair: new Map(), liveByPair: new Map() }

// Real knockout results resolved onto the bracket. The R32 comes straight from
// the (live-merged) r32 list. Later rounds are walked in order: once a match's
// two teams are known from prior winners, a live result for that exact pairing
// (knockout.resultsByPair, keyed by team pair) decides it — the same overlay
// pattern the group stage uses, extended up the tree. Absent live data it
// resolves to the static scaffold (only completed R32 in bracket.json).
export function liveResults(knockout = STATIC_KNOCKOUT) {
  const results = {}
  const r32 = knockout.r32 || bracketData.r32
  for (const m of r32) {
    if (m.status !== 'completed' || !m.result) continue
    const r = m.result
    // A knockout can be level after 90/120' and settled on penalties, so decide
    // by the shootout when regulation was a draw — not by the (equal) score.
    const homeWon =
      r.home_score !== r.away_score ? r.home_score > r.away_score : r.penalties ? r.penalties.home_score > r.penalties.away_score : true
    results[m.id] = {
      winner: homeWon ? m.home : m.away,
      loser: homeWon ? m.away : m.home,
      score: r,
    }
  }

  // R16 → final. Ordered so each round's feeders are resolved first; third place
  // (104) before the final (103), both after the semis populate losers/winners.
  const byPair = knockout.resultsByPair || new Map()
  for (const id of [89, 90, 93, 94, 91, 92, 95, 96, 97, 98, 99, 100, 101, 102, 104, 103]) {
    const [hf, af] = FEEDS[id]
    const homeName = tokenName(hf, results)
    const awayName = tokenName(af, results)
    if (!homeName || !awayName) continue // teams not decided yet
    const hit = byPair.get(pairKey(homeName, awayName))
    if (!hit || !hit.winner) continue // no live result for this tie yet
    results[id] = {
      winner: hit.winner,
      loser: hit.winner === homeName ? awayName : homeName,
      score: {
        home_score: hit.scores[homeName],
        away_score: hit.scores[awayName],
        ...(hit.penalties
          ? { penalties: { home_score: hit.penalties[homeName], away_score: hit.penalties[awayName] } }
          : {}),
      },
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

// Knuth's Poisson sampler — a small goal count from a mean λ.
function samplePoisson(lambda) {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k += 1
    p *= Math.random()
  } while (p > L)
  return k - 1
}

// A plausible knockout scoreline consistent with the tie's decided winner. Goal
// expectations widen with the model's edge (p), so a heavy favourite tends to
// win by more. Knockouts are decided outright here (no draws), so we retry until
// the regulation score is decisive AND matches `homeWins`; a 1–0 fallback keeps
// the loop finite. Returns { home_score, away_score } for the tie's home slot.
function simulateScore(homeWins, p) {
  const edge = Math.abs(p - 0.5) * 2 // 0 (coin-flip) … 0.8 (clamped favourite)
  const strong = 1.5 + edge * 0.9
  const weak = Math.max(0.5, 1.15 - edge * 0.55)
  for (let i = 0; i < 8; i++) {
    const hs = samplePoisson(homeWins ? strong : weak)
    const as = samplePoisson(homeWins ? weak : strong)
    if (hs === as) continue
    if (hs > as === homeWins) return { home_score: hs, away_score: as }
  }
  return homeWins ? { home_score: 1, away_score: 0 } : { home_score: 0, away_score: 1 }
}

// One full Monte Carlo realisation of the knockout bracket (R32 -> Final + third
// place), given the R32 matchups. Defaults to the locked draw; the group-stage
// simulator passes its own re-seeded R32 so every run plays different teams.
export function simulateKnockout(r32 = bracketData.r32) {
  const results = {}
  const decide = (id, homeName, awayName) => {
    const p = winProb(homeName, awayName, venueOf(id)?.country)
    const homeWins = Math.random() < p
    results[id] = {
      winner: homeWins ? homeName : awayName,
      loser: homeWins ? awayName : homeName,
      p,
      score: simulateScore(homeWins, p),
    }
  }
  for (const m of r32) decide(m.id, m.home, m.away)
  for (const id of [89, 90, 93, 94, 91, 92, 95, 96, 97, 98, 99, 100, 101, 102, 104, 103]) {
    const [hf, af] = FEEDS[id]
    decide(id, tokenName(hf, results), tokenName(af, results))
  }
  return results
}

// Back-compat: a knockout-only sim from the locked R32 draw.
export function simulate() {
  return simulateKnockout()
}

// --- Build the full view the bracket renders -------------------------------
// `mode` is 'live' or 'simulate'. In simulate mode, `results` is a full sim;
// in live mode it is the real completed matches only.
export function buildViews(results, mode, r32 = bracketData.r32, liveByPair = new Map()) {
  const views = {}
  const today = bracketData.today

  // R32 — competitors always known (locked draw in live mode, or the simulator's
  // re-seeded qualifiers in simulate mode).
  for (const m of r32) {
    const home = team(m.home)
    const away = team(m.away)
    const completedLive = mode === 'live' && m.status === 'completed'
    const inPlayLive = mode === 'live' && m.status === 'live'
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
      status: completedLive ? 'completed' : inPlayLive ? 'live' : 'scheduled',
      // Live mode shows the real running/finished score; a re-roll ("simulate")
      // shows the sampled scoreline once the match is revealed (`r.score`).
      score: mode === 'live' ? (completedLive || inPlayLive ? m.result : null) : r?.score ?? null,
      live: inPlayLive ? m.live : null,
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
    // In-play knockout tie (R16+): both teams known from finished feeders but not
    // yet decided, and the live feed shows this exact pairing in play. Keyed by
    // team pair (not bracket slot), mirroring the R32 live path, so it holds even
    // if the real seeding differs from the static scaffold.
    const livePair = mode === 'live' && bothKnown && !r ? liveByPair.get(pairKey(home.name, away.name)) : null
    views[id] = {
      id,
      round: ROUND_OF[id],
      home,
      away,
      // Host status depends only on THIS team being known and playing in its own
      // country — not on the opponent being decided. A host that has advanced to
      // a home venue keeps its badge even while it awaits an opponent.
      homeHost: home.kind === 'team' && isHostAtHome(home.name, vc),
      awayHost: away.kind === 'team' && isHostAtHome(away.name, vc),
      pHome: bothKnown ? winProb(home.name, away.name, vc) : null,
      venue,
      status: r ? 'decided' : livePair ? 'live' : 'pending',
      // Real knockout ties (liveResults) and re-rolls (simulateKnockout) both
      // carry a scoreline now, so every decided round renders goal digits — the
      // same treatment R32 already got — instead of only a win-probability split.
      // A live tie carries its running score + clock the same way R32 does.
      score: r?.score ?? (livePair ? { home_score: livePair.scores[home.name], away_score: livePair.scores[away.name] } : null),
      live: livePair ? { minute: livePair.minute, injuryTime: livePair.injuryTime, paused: livePair.paused } : null,
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
export function currentStageLabel(knockout) {
  const live = liveResults(knockout)
  for (let i = 0; i < REVEAL_ORDER.length; i++) {
    if (!REVEAL_ORDER[i].every((id) => live[id])) return STAGE_LABELS[i]
  }
  return 'Final'
}

// The tournament's current round, group stage included — the full picture the
// home hub needs. currentStageLabel only knows the knockout tree, so on its own
// it reports "Round of 32" all through the group phase (no R32 is decided yet).
// This walks the real order — Group Stage → R32 → … → Final — holding on the
// group phase until every group fixture is completed, then handing off to the
// knockout walk. `groupFixtures` is the group-stage match list (the 72 fixtures);
// `knockout` is the live-merged knockout model. Both come from the same
// live-merged feed the bracket renders, so the two never disagree.
export function getCurrentRound(groupFixtures, knockout) {
  const groupComplete =
    Array.isArray(groupFixtures) && groupFixtures.length > 0 && groupFixtures.every((f) => f.status === 'completed')
  if (!groupComplete) return 'Group Stage'
  return currentStageLabel(knockout)
}

// Live countdown to the final (kickoff 20:00 UTC, 19 July 2026). Reads the real
// wall clock so the home hub ticks toward kickoff, and degrades through graceful
// phases: days → hours in the last two days → "Live" during the match → done.
// Returns { phase, big, unit, label } so the caller can render a headline figure
// with a matching unit and heading. `now` is injectable for testing.
const FINAL_MATCH_MS = 3 * 60 * 60 * 1000 // ~3h window: 90' + stoppage + ceremony
export function finalCountdown(now = new Date()) {
  const kickoff = new Date(`${META.final.date}T20:00:00Z`).getTime()
  const nowMs = now.getTime()
  if (nowMs >= kickoff + FINAL_MATCH_MS) return { phase: 'complete', big: 'Complete', unit: null, label: 'Tournament' }
  if (nowMs >= kickoff) return { phase: 'live', big: 'Live', unit: 'now', label: 'The final' }
  const hours = (kickoff - nowMs) / 3_600_000
  if (hours <= 48) {
    const h = Math.max(1, Math.ceil(hours))
    return { phase: 'countdown', big: String(h), unit: h === 1 ? 'hour' : 'hours', label: 'Until the final' }
  }
  const days = Math.ceil(hours / 24)
  return { phase: 'countdown', big: String(days), unit: days === 1 ? 'day' : 'days', label: 'Until the final' }
}
