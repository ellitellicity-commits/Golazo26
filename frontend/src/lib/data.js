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
const NAME_ALIASES = {
  'Korea Republic': 'South Korea',
  'Korea DPR': 'North Korea',
  'IR Iran': 'Iran',
  Iran: 'Iran',
  'United States': 'United States',
  USA: 'United States',
  'Côte d’Ivoire': 'Ivory Coast',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cabo Verde': 'Cape Verde',
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

// Overlay finished live scorelines onto the static fixtures, keyed by the
// (unordered) team pair. Predictions, groups, venues, and kickoff times stay
// from the static snapshot — only the result + status come from the feed.
function mergeLiveResults(matches) {
  const liveByPair = new Map()
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    const home = resolveTeamName(m.homeTeam?.name)
    const away = resolveTeamName(m.awayTeam?.name)
    const hs = m.score?.fullTime?.home
    const as = m.score?.fullTime?.away
    if (!home || !away || typeof hs !== 'number' || typeof as !== 'number') continue
    liveByPair.set(pairKey(home, away), { [home]: hs, [away]: as })
  }

  let applied = 0
  const fixtures = staticFixtures.fixtures.map((f) => {
    const scores = liveByPair.get(pairKey(f.home.name, f.away.name))
    if (!scores || !(f.home.name in scores) || !(f.away.name in scores)) return f
    applied++
    return {
      ...f,
      status: 'completed',
      result: { home_score: scores[f.home.name], away_score: scores[f.away.name] },
    }
  })

  return { data: { ...staticFixtures, fixtures }, applied }
}

/**
 * Fixtures: schedule, group assignments, results, and the model's per-fixture
 * predictions. Live results are merged in when available; otherwise the static
 * snapshot is returned unchanged.
 * @returns {Promise<{ generated: string, fixtures: object[], source: 'live'|'static' }>}
 */
export async function loadFixtures() {
  if (!HAS_LIVE_DATA) return { ...staticFixtures, source: 'static' }
  try {
    const matches = await fetchLiveMatches()
    const { data, applied } = mergeLiveResults(matches)
    // If the feed matched nothing (wrong competition window, all-unmapped names),
    // treat it as static — a "live" badge over untouched static data would lie.
    if (applied === 0) return { ...staticFixtures, source: 'static' }
    return { ...data, source: 'live' }
  } catch {
    return { ...staticFixtures, source: 'static' }
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
