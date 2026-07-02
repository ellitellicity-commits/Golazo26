// ESPN's free, keyless, CORS-open hidden API — the live-stats source (lineups,
// team statistics, events, live minute) for the expandable stats panel.
// football-data.org's free tier exposes none of this (see lib/data.js), so ESPN
// is layered on ONLY for the expanded live panel; scores/results stay on
// football-data.org. The browser calls ESPN directly (no key, no proxy).
//
// ESPN uses its own event ids, so a match is reconciled to an ESPN event by
// team pair — its team names use the same long-forms we already alias in
// lib/data.js, so resolveTeamName() maps both sides back to our canonical names.
//
// This is an unofficial API: everything degrades to null on any failure, timeout,
// or shape change, and the panel renders an "unavailable" state rather than break.

import { resolveTeamName } from './data'

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const SCOREBOARD_URL = `${BASE}/scoreboard`
const summaryUrl = (id) => `${BASE}/summary?event=${id}`
const TIMEOUT_MS = 6000
const SCOREBOARD_TTL_MS = 20_000

const pairKey = (a, b) => [a, b].sort().join('|')

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

// Short-lived scoreboard cache: several panels can be open at once, and the
// scoreboard changes slowly, so one shared fetch every 20s serves them all.
let scoreboardCache = { at: 0, promise: null }

function getScoreboard() {
  const now = Date.now()
  if (!scoreboardCache.promise || now - scoreboardCache.at > SCOREBOARD_TTL_MS) {
    scoreboardCache = {
      at: now,
      promise: fetchJson(SCOREBOARD_URL).catch(() => null),
    }
  }
  return scoreboardCache.promise
}

// Resolve an ESPN event id for a fixture from its two canonical team names.
async function findEventId(homeName, awayName) {
  const board = await getScoreboard()
  const events = board?.events
  if (!Array.isArray(events)) return null
  const want = pairKey(homeName, awayName)
  for (const ev of events) {
    const cs = ev.competitions?.[0]?.competitors
    if (!Array.isArray(cs) || cs.length < 2) continue
    const a = resolveTeamName(cs[0].team?.displayName)
    const b = resolveTeamName(cs[1].team?.displayName)
    if (a && b && pairKey(a, b) === want) return ev.id
  }
  return null
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

// Goals and cards, most recent first, tagged with the side that they belong to.
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
 * Full normalised live view for an ESPN event: side-keyed stats + lineups,
 * recent events, and the live minute. Returns null when the event can't be
 * fetched or lacks a boxscore yet (pre-kickoff).
 */
export async function loadLiveSummary(eventId) {
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

  const hasStats = (boxFor('home')?.statistics || []).length > 0
  const hasLineups = (rosterFor('home')?.roster || []).length > 0
  if (!hasStats && !hasLineups) return null // nothing useful yet

  return {
    minute: comp?.status?.type?.detail || null,
    state: comp?.status?.type?.state || null,
    stats: { home: statsForTeam(boxFor('home')), away: statsForTeam(boxFor('away')) },
    statRows: STAT_ROWS,
    lineups: { home: lineupForTeam(rosterFor('home')), away: lineupForTeam(rosterFor('away')) },
    events: eventsFor(d, sideById),
  }
}

/**
 * Reconcile a fixture (by canonical team names) to its ESPN event and return the
 * normalised live view. Null when there's no matching live/scheduled ESPN event.
 */
export async function loadLiveMatch(homeName, awayName) {
  const id = await findEventId(homeName, awayName)
  if (!id) return null
  return loadLiveSummary(id)
}
