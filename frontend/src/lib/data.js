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

// A match football-data.org reports as currently being played. IN_PLAY is an
// active half; PAUSED is half-time (and other in-match stoppages). The docs also
// expose a pseudo-status LIVE = IN_PLAY + PAUSED for filtering; we key off the
// concrete statuses so a single match object is enough to classify.
const LIVE_STATUSES = new Set(['IN_PLAY', 'PAUSED'])

// Reconcile a provider's team name to our canonical name (or null if unmapped).
// Exported because the ESPN live-stats feed (lib/espn.js) needs the same mapping
// to match its events back to our fixtures — ESPN uses the same long-forms.
export function resolveTeamName(liveName) {
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
    // No auth header here by design: the same-origin proxy injects the
    // server-side token (see vite.config.js). The browser must never send it.
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

    // The real shootout score. football-data.org's `penalties` field is
    // occasionally degenerate — we've seen a decided tie reported as pens 4–4
    // with a null winner — so don't trust it blindly. `fullTime` (the combined
    // total) minus the 120-minute score (hs/as) is the reliable derivation; use
    // it whenever it yields a valid, decisive shootout, and fall back to the raw
    // field otherwise. Without this, a bad `penalties` field shows e.g. "EGY win
    // 4–4 pens" and leaves the tie with no winner to advance.
    let shoot = pens
    if (pens && typeof s.fullTime?.home === 'number') {
      const dh = s.fullTime.home - hs
      const da = s.fullTime.away - as
      if (dh >= 0 && da >= 0 && dh !== da) shoot = { home: dh, away: da }
    }

    let winner = null
    if (s.winner === 'HOME_TEAM') winner = home
    else if (s.winner === 'AWAY_TEAM') winner = away
    else if (hs > as) winner = home
    else if (as > hs) winner = away
    else if (shoot && shoot.home !== shoot.away) winner = shoot.home > shoot.away ? home : away

    idx.set(pairKey(home, away), {
      scores: { [home]: hs, [away]: as },
      winner,
      penalties: shoot ? { [home]: shoot.home, [away]: shoot.away } : null,
    })
  }
  return idx
}

// Index IN_PLAY / PAUSED matches by team pair, capturing the running score and
// the live minute. During play, football-data.org carries the current score in
// `score.fullTime`; the free tier can omit `minute`, so it degrades to null (the
// UI then shows a plain LIVE state without the clock). Winners are NOT read here
// — an in-play tie has no result yet, so it never feeds knockout resolution.
function indexLive(matches) {
  const idx = new Map()
  for (const m of matches) {
    if (!LIVE_STATUSES.has(m.status)) continue
    const home = resolveTeamName(m.homeTeam?.name)
    const away = resolveTeamName(m.awayTeam?.name)
    if (!home || !away) continue
    const ft = m.score?.fullTime || {}
    idx.set(pairKey(home, away), {
      scores: { [home]: typeof ft.home === 'number' ? ft.home : 0, [away]: typeof ft.away === 'number' ? ft.away : 0 },
      minute: typeof m.minute === 'number' ? m.minute : null,
      injuryTime: typeof m.injuryTime === 'number' ? m.injuryTime : null,
      paused: m.status === 'PAUSED',
    })
  }
  return idx
}

// Overlay live scorelines onto a static match list keyed by team pair. Shared by
// the group fixtures (1–72) and the R32 (73–88): only status + result change;
// teams, venues, groups, predictions and kickoffs stay from the static scaffold.
// A finished result wins over an in-play one for the same pairing (a match only
// flips to FINISHED once, so this is just defensive ordering).
function overlayResults(list, finished, live, nameOf) {
  let applied = 0
  let liveCount = 0
  const out = list.map((m) => {
    const { home, away } = nameOf(m)
    const key = pairKey(home, away)
    const done = finished.get(key)
    if (done && home in done.scores && away in done.scores) {
      applied++
      return {
        ...m,
        status: 'completed',
        result: {
          home_score: done.scores[home],
          away_score: done.scores[away],
          ...(done.penalties ? { penalties: { home_score: done.penalties[home], away_score: done.penalties[away] } } : {}),
        },
      }
    }
    const now = live.get(key)
    if (now && home in now.scores && away in now.scores) {
      applied++
      liveCount++
      return {
        ...m,
        status: 'live',
        result: { home_score: now.scores[home], away_score: now.scores[away] },
        live: { minute: now.minute, injuryTime: now.injuryTime, paused: now.paused },
      }
    }
    return m
  })
  return { out, applied, liveCount }
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
  const finished = indexFinished(matches)
  const live = indexLive(matches)
  const group = overlayResults(staticFixtures.fixtures, finished, live, groupName)
  const ko = overlayResults(bracketData.r32, finished, live, koName)
  return {
    fixtures: { ...staticFixtures, fixtures: group.out },
    // resultsByPair stays finished-only: it drives knockout progression, and an
    // in-play tie has no winner to advance yet. liveByPair carries the in-play
    // knockout scorelines so buildViews can mark a live R16+ tie (whose teams are
    // already known from finished feeders) as live — the R32 overlay above only
    // covers R32, so later live rounds need the pair index threaded through.
    knockout: { r32: ko.out, resultsByPair: finished, liveByPair: live },
    applied: group.applied + ko.applied,
    liveCount: group.liveCount + ko.liveCount,
  }
}

// The knockout scaffold with no live data — corrected static bracket.json only.
function staticKnockout() {
  return { r32: bracketData.r32, resultsByPair: new Map(), liveByPair: new Map() }
}

/**
 * Fixtures + knockout: schedule, group assignments, results, per-fixture
 * predictions, and the knockout bracket structure. Live results are merged in
 * when available; otherwise the static snapshot is returned unchanged.
 * @returns {Promise<{ generated: string, fixtures: object[], knockout: object, source: 'live'|'static' }>}
 */
export async function loadFixtures() {
  if (!HAS_LIVE_DATA) return { ...staticFixtures, knockout: staticKnockout(), source: 'static', liveCount: 0 }
  try {
    const matches = await fetchLiveMatches()
    const merged = mergeLiveData(matches)
    // If the feed matched nothing (wrong competition window, all-unmapped names),
    // treat it as static — a "live" badge over untouched static data would lie.
    if (merged.applied === 0) return { ...staticFixtures, knockout: staticKnockout(), source: 'static', liveCount: 0 }
    return { ...merged.fixtures, knockout: merged.knockout, source: 'live', liveCount: merged.liveCount }
  } catch {
    return { ...staticFixtures, knockout: staticKnockout(), source: 'static', liveCount: 0 }
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
