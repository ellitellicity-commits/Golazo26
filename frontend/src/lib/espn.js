// ESPN's free, keyless, CORS-open hidden API — the match-detail source (lineups,
// team statistics, events, live minute) for the expandable stats panel across ALL
// three match states: pre-match (confirmed line-ups), in-play (live stats + the
// running minute), and finished (final stats + the full goal/card summary).
// football-data.org's free tier exposes none of this (see lib/data.js), so ESPN
// is layered on ONLY for the expanded panel; scores/results stay on
// football-data.org. The browser calls ESPN directly (no key, no proxy).
//
// ESPN uses its own event ids, so a match is reconciled to an ESPN event by
// team pair — its team names use the same long-forms we already alias in
// lib/data.js, so resolveTeamName() maps both sides back to our canonical names.
// A finished match drops off the live scoreboard, so when a fixture date is known
// we query that day's board first (which still lists it), then fall back to the
// live board.
//
// This is an unofficial API: everything degrades to null on any failure, timeout,
// or shape change, and the panel renders an "unavailable"/pre-match state rather
// than break.

import { resolveTeamName } from './data'

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const SCOREBOARD_URL = `${BASE}/scoreboard`
const summaryUrl = (id) => `${BASE}/summary?event=${id}`
const TIMEOUT_MS = 6000
const SCOREBOARD_TTL_MS = 20_000

const pairKey = (a, b) => [a, b].sort().join('|')
// A fixture date (ISO, "2026-06-11" or a full instant) → ESPN's "YYYYMMDD" board
// filter. Null when there's no usable date, so the caller falls back to the board.
const boardDate = (iso) => (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).replace(/-/g, '') : null)

// ESPN's competition.status.type.state is the clean tri-state signal.
const STATE_MAP = { pre: 'pre', in: 'live', post: 'final' }

async function fetchJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal })
    if (!res.ok) throw new Error(`ESPN responded ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// Short-lived scoreboard cache, keyed by day ("today" for the live board, or a
// "YYYYMMDD" for a specific date): several panels can be open at once and the
// board changes slowly, so one shared fetch per day serves them all.
const scoreboardCache = new Map()

function getScoreboard(dateKey) {
  const key = dateKey || 'today'
  const now = Date.now()
  const hit = scoreboardCache.get(key)
  if (hit && now - hit.at <= SCOREBOARD_TTL_MS) return hit.promise
  const url = dateKey ? `${SCOREBOARD_URL}?dates=${dateKey}` : SCOREBOARD_URL
  const entry = { at: now, promise: fetchJson(url).catch(() => null) }
  scoreboardCache.set(key, entry)
  return entry.promise
}

function matchEvent(board, want) {
  const events = board?.events
  if (!Array.isArray(events)) return null
  for (const ev of events) {
    const cs = ev.competitions?.[0]?.competitors
    if (!Array.isArray(cs) || cs.length < 2) continue
    const a = resolveTeamName(cs[0].team?.displayName)
    const b = resolveTeamName(cs[1].team?.displayName)
    if (a && b && pairKey(a, b) === want) return ev.id
  }
  return null
}

// Resolve an ESPN event id for a fixture from its two canonical team names. When
// a fixture date is known, that day's board is tried first (a finished match has
// dropped off the live board), then the live/today board as a fallback.
async function findEventId(homeName, awayName, dateISO) {
  const want = pairKey(homeName, awayName)
  const dk = boardDate(dateISO)
  if (dk) {
    const id = matchEvent(await getScoreboard(dk), want)
    if (id) return id
  }
  return matchEvent(await getScoreboard(null), want)
}

// --- Summary normalisation --------------------------------------------------

// Map ESPN's stat keys to the panel's rows. Order here is the display order.
const STAT_ROWS = [
  { key: 'possessionPct', label: 'Possession', suffix: '%' },
  { key: 'totalShots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'On target' },
  { key: 'foulsCommitted', label: 'Fouls' },
  { key: 'offsides', label: 'Offsides' },
  { key: 'wonCorners', label: 'Corners' },
]

const num = (v) => {
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

function statsForTeam(teamNode) {
  const byName = new Map((teamNode?.statistics || []).map((s) => [s.name, s.displayValue]))
  const out = {}
  for (const row of STAT_ROWS) out[row.key] = { display: byName.get(row.key) ?? '—', value: num(byName.get(row.key)) }
  return out
}

function lineupForTeam(rosterNode) {
  const players = (rosterNode?.roster || []).map((p) => ({
    name: p.athlete?.displayName || '',
    jersey: p.jersey ?? '',
    pos: p.position?.abbreviation || '',
    headshot: p.athlete?.headshot?.href || null,
    starter: !!p.starter,
  }))
  return {
    formation: rosterNode?.formation || null,
    starters: players.filter((p) => p.starter),
    bench: players.filter((p) => !p.starter),
  }
}

// Goals, cards and substitutions, most recent first, tagged with the side they
// belong to. The panel slices this for a live "recent" strip or reverses it for a
// finished match's chronological summary.
function eventsFor(summary, sideById) {
  const kindOf = (t) => {
    const type = t?.type || ''
    if (type.startsWith('goal')) return 'goal'
    if (type === 'yellow-card') return 'yellow'
    if (type === 'red-card') return 'red'
    if (type === 'substitution') return 'sub'
    return null
  }
  return (summary.keyEvents || [])
    .map((e) => {
      const kind = kindOf(e.type)
      if (!kind) return null
      return {
        kind,
        minute: e.clock?.displayValue || '',
        clockValue: e.clock?.value ?? 0,
        player: e.participants?.[0]?.athlete?.displayName || '',
        side: sideById.get(String(e.team?.id)) || null,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.clockValue - a.clockValue)
}

/**
 * Full normalised view for an ESPN event across every match state. Returns an
 * object whenever the summary is fetchable — even pre-kickoff with no line-ups
 * yet (so the panel can show its "line-ups to be confirmed" state) — and null
 * only when the event summary itself can't be fetched.
 * @returns {Promise<null | {
 *   state: 'pre'|'live'|'final', minute: string|null,
 *   hasStats: boolean, hasLineups: boolean,
 *   stats: {home:object, away:object}|null, statRows: object[],
 *   lineups: {home:object, away:object}, events: object[],
 * }>}
 */
export async function loadMatchSummary(eventId) {
  const d = await fetchJson(summaryUrl(eventId)).catch(() => null)
  if (!d) return null

  const comp = d.header?.competitions?.[0]
  const competitors = comp?.competitors || []
  // ESPN keys boxscore/rosters/events by team id; map each id to home/away.
  const sideById = new Map(competitors.map((c) => [String(c.team?.id), c.homeAway]))
  const idFor = (side) => competitors.find((c) => c.homeAway === side)?.team?.id

  const boxTeams = d.boxscore?.teams || []
  const boxFor = (side) => boxTeams.find((t) => String(t.team?.id) === String(idFor(side)))
  const rosters = d.rosters || []
  const rosterFor = (side) => rosters.find((r) => String(r.team?.id) === String(idFor(side)))

  const lineups = { home: lineupForTeam(rosterFor('home')), away: lineupForTeam(rosterFor('away')) }
  const hasLineups = lineups.home.starters.length > 0 || lineups.away.starters.length > 0
  const hasStats = (boxFor('home')?.statistics || []).length > 0

  const status = comp?.status?.type || {}
  return {
    state: STATE_MAP[status.state] || 'pre',
    minute: status.shortDetail || status.detail || null,
    hasStats,
    hasLineups,
    stats: hasStats ? { home: statsForTeam(boxFor('home')), away: statsForTeam(boxFor('away')) } : null,
    statRows: STAT_ROWS,
    lineups,
    events: eventsFor(d, sideById),
  }
}

/**
 * Reconcile a fixture (by canonical team names, optionally its date) to its ESPN
 * event and return the normalised view. Null when there's no matching ESPN event.
 */
export async function loadMatchSummaryByTeams(homeName, awayName, dateISO = null) {
  const id = await findEventId(homeName, awayName, dateISO)
  if (!id) return null
  return loadMatchSummary(id)
}
