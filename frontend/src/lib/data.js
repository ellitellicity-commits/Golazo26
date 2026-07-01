// Single data-access seam for the app. Every view reads live-swappable tournament
// data through the functions here, never by importing the JSON directly.
//
// Fixtures (schedule + results) are the live-swappable feed: loadFixtures() pulls
// live match results from football-data.org when a key is configured, and falls
// back to the bundled static snapshot on any failure, rate-limit, or missing key.
// Championship odds are the XGBoost model's own output — football-data.org has no
// such feed — so loadOdds() always resolves to the static snapshot; it's async
// only to give the two the same interface for the loader in DataProvider.
//
// Structural/reference data that isn't part of live tournament state —
// bracket.json (venues + knockout schedule) and fifa_rankings.json — stays a
// direct import; it doesn't move with the live feed.
//
// SECURITY: the API key is server-side only (see vite.config.js). The browser
// calls the same-origin proxy at /football-api/*; it never sees the token.

/* global __HAS_LIVE_DATA__ */
import staticFixtures from '../data/fixtures.json'
import oddsData from '../data/odds.json'
import bracketData from '../data/bracket.json'
import TEAM_META from './teams'

// Compiled in by vite.config.js: true only when FOOTBALL_DATA_API_KEY is set.
// Guarded so non-Vite runtimes (tests, node) don't throw on the missing global.
const HAS_LIVE_DATA = typeof __HAS_LIVE_DATA__ !== 'undefined' && __HAS_LIVE_DATA__

// FIFA World Cup competition on football-data.org. Free tier permitting, this
// returns every tournament match with live status and scores.
const LIVE_MATCHES_URL = '/football-api/v4/competitions/WC/matches'
const FETCH_TIMEOUT_MS = 6000

// --- Team-name reconciliation ----------------------------------------------
// football-data.org uses FIFA/UEFA long-forms that differ from our names. Map
// the known divergences; anything already matching our set passes through. If a
// live name can't be resolved to one of our teams, that match is simply skipped
// (the fixture keeps its static result), so an unmapped name degrades gracefully
// rather than corrupting the table. Extend this map as real live data surfaces.
// Verified against the live football-data.org WC response: the API's 48 team
// names match ours except for the entries below. Only two actually diverge in
// live data today — Bosnia and Cape Verde — and each silently dropped every one
// of that team's matches (both sides of a pairing must resolve). The rest are
// defensive mappings for naming football-data.org uses across competitions.
const NAME_ALIASES = {
  'Korea Republic': 'South Korea',
  'Korea DPR': 'North Korea',
  'IR Iran': 'Iran',
  Iran: 'Iran',
  'United States': 'United States',
  USA: 'United States',
  'Côte d’Ivoire': 'Ivory Coast',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cape Verde Islands': 'Cape Verde', // live API form
  'Cabo Verde': 'Cape Verde',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina', // live API form
  'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
  'Czech Republic': 'Czechia',
  Türkiye: 'Turkey',
  'DR Congo': 'DR Congo',
  'Congo DR': 'DR Congo',
}

const OUR_NAMES = new Set(Object.keys(TEAM_META))

function resolveTeamName(liveName) {
  if (!liveName) return null
  if (OUR_NAMES.has(liveName)) return liveName
  const aliased = NAME_ALIASES[liveName]
  if (aliased && OUR_NAMES.has(aliased)) return aliased
  return null
}

const pairKey = (a, b) => [a, b].sort().join('|')

// --- Live fetch -------------------------------------------------------------

async function fetchLiveMatches() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(LIVE_MATCHES_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`football-data.org responded ${res.status}`)
    const json = await res.json()
    if (!Array.isArray(json.matches)) throw new Error('unexpected API shape')
    return json.matches
  } finally {
    clearTimeout(timer)
  }
}

// Index every FINISHED live match by its (unordered) team pair. Each entry keeps
// the goals per team and the decided winner — knockout ties can be level after
// 90/120 minutes and settled on penalties, so we read the API's own `winner`
// (falling back to goals, then the penalty shootout) rather than assuming the
// higher fullTime score won. Unmapped team names are skipped, not guessed.
function indexFinished(matches) {
  const idx = new Map()
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    const home = resolveTeamName(m.homeTeam?.name)
    const away = resolveTeamName(m.awayTeam?.name)
    const s = m.score || {}

    // On a shootout, football-data.org's `fullTime` is the COMBINED total
    // (regulation + extra time + penalties), so the match score to display is
    // regulation+extra (falling back to fullTime minus the shootout). Group and
    // regulation knockouts have no penalties, so fullTime is used directly.
    const pens =
      s.penalties && typeof s.penalties.home === 'number' && typeof s.penalties.away === 'number' ? s.penalties : null
    let hs, as
    if (pens && typeof s.regularTime?.home === 'number') {
      hs = s.regularTime.home + (s.extraTime?.home || 0)
      as = s.regularTime.away + (s.extraTime?.away || 0)
    } else if (pens && typeof s.fullTime?.home === 'number') {
      hs = s.fullTime.home - pens.home
      as = s.fullTime.away - pens.away
    } else {
      hs = s.fullTime?.home
      as = s.fullTime?.away
    }
    if (!home || !away || typeof hs !== 'number' || typeof as !== 'number') continue

    let winner = null
    if (s.winner === 'HOME_TEAM') winner = home
    else if (s.winner === 'AWAY_TEAM') winner = away
    else if (hs > as) winner = home
    else if (as > hs) winner = away
    else if (pens && pens.home !== pens.away) winner = pens.home > pens.away ? home : away

    idx.set(pairKey(home, away), {
      scores: { [home]: hs, [away]: as },
      winner,
      penalties: pens ? { [home]: pens.home, [away]: pens.away } : null,
    })
  }
  return idx
}

// Overlay finished scorelines onto a static match list keyed by team pair. Shared
// by the group fixtures (1–72) and the R32 (73–88): only status + result change;
// teams, venues, groups, predictions and kickoffs stay from the static scaffold.
function overlayResults(list, index, nameOf) {
  let applied = 0
  const out = list.map((m) => {
    const { home, away } = nameOf(m)
    const hit = index.get(pairKey(home, away))
    if (!hit || !(home in hit.scores) || !(away in hit.scores)) return m
    applied++
    return {
      ...m,
      status: 'completed',
      result: {
        home_score: hit.scores[home],
        away_score: hit.scores[away],
        ...(hit.penalties ? { penalties: { home_score: hit.penalties[home], away_score: hit.penalties[away] } } : {}),
      },
    }
  })
  return { out, applied }
}

const groupName = (f) => ({ home: f.home.name, away: f.away.name })
const koName = (m) => ({ home: m.home, away: m.away })

/**
 * Pure transform: given a football-data.org matches array, produce the merged
 * fixtures + knockout model. Exported so the live path is testable without a key.
 *   - fixtures: static group fixtures with live results overlaid (1–72)
 *   - knockout.r32: static R32 with live results overlaid (73–88)
 *   - knockout.resultsByPair: every finished live result by team pair — lets the
 *     bracket resolve R16→final once each round's teams are known (see bracket.js)
 *   - applied: how many static matches got a live result (0 ⇒ treat as static)
 */
export function mergeLiveData(matches) {
  const index = indexFinished(matches)
  const group = overlayResults(staticFixtures.fixtures, index, groupName)
  const ko = overlayResults(bracketData.r32, index, koName)
  return {
    fixtures: { ...staticFixtures, fixtures: group.out },
    knockout: { r32: ko.out, resultsByPair: index },
    applied: group.applied + ko.applied,
  }
}

// The knockout scaffold with no live data — corrected static bracket.json only.
function staticKnockout() {
  return { r32: bracketData.r32, resultsByPair: new Map() }
}

/**
 * Fixtures + knockout: schedule, group assignments, results, per-fixture
 * predictions, and the knockout bracket structure. Live results are merged in
 * when available; otherwise the static snapshot is returned unchanged.
 * @returns {Promise<{ generated: string, fixtures: object[], knockout: object, source: 'live'|'static' }>}
 */
export async function loadFixtures() {
  if (!HAS_LIVE_DATA) return { ...staticFixtures, knockout: staticKnockout(), source: 'static' }
  try {
    const matches = await fetchLiveMatches()
    const merged = mergeLiveData(matches)
    // If the feed matched nothing (wrong competition window, all-unmapped names),
    // treat it as static — a "live" badge over untouched static data would lie.
    if (merged.applied === 0) return { ...staticFixtures, knockout: staticKnockout(), source: 'static' }
    return { ...merged.fixtures, knockout: merged.knockout, source: 'live' }
  } catch {
    return { ...staticFixtures, knockout: staticKnockout(), source: 'static' }
  }
}

/**
 * Championship odds: teams ranked by Monte Carlo title probability. No live
 * source exists for this (it's model output), so it always resolves static.
 * @returns {Promise<{ simulations: number, teams: object[], source: 'static' }>}
 */
export async function loadOdds() {
  return { ...oddsData, source: 'static' }
}

/**
 * Synchronous odds snapshot for library modules (bracket.js, simulation.js) that
 * build strength/rating lookup tables at import time. Odds are static and
 * bundled, so a sync read is safe and correct here.
 * @returns {{ simulations: number, teams: object[] }}
 */
export function getOdds() {
  return oddsData
}
