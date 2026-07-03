import { useEffect, useState } from 'react'
import { loadMatchSummaryByTeams } from '../lib/espn'
import './MatchStatsPanel.css'

// Expandable match-detail panel for a fixture in any state. Collapsed by default;
// only when opened does it fetch ESPN's summary (line-ups, team stats, events,
// minute). What it shows follows the match state:
//   pre    → confirmed line-ups (no stats, no events)
//   live   → live stats + a recent goals/cards strip + the running minute; polls
//   final  → final stats + the full chronological goal/card summary; no polling
// Data source is unofficial (see lib/espn.js), so every failure resolves to an
// "unavailable"/pre-match state rather than breaking the card.
// 30s while a live panel is open (ESPN is keyless, so no shared rate limit to
// respect). The app-level score/status poll (tournamentData.jsx) stays at 60s to
// protect football-data.org's shared 10 req/min free-tier key.
const POLL_MS = 30_000

const STATE_META = {
  pre: { label: 'Pre-Match', credit: 'Line-ups · ESPN', empty: 'Line-ups will be confirmed before kickoff.' },
  live: { label: 'Live', credit: 'Live data · ESPN', empty: 'Live stats aren’t available for this match right now.' },
  final: { label: 'Final', credit: 'Final data · ESPN', empty: 'Match stats aren’t available for this match.' },
}

const stateOf = (status) => (status === 'live' ? 'live' : status === 'completed' ? 'final' : 'pre')

function initialsOf(name) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

// Player photo with a neutral initials fallback (photo may 404, or be missing).
function Avatar({ player }) {
  const [broken, setBroken] = useState(false)
  const showImg = player.headshot && !broken
  return (
    <span className="lsp-avatar" aria-hidden="true">
      {showImg ? (
        <img src={player.headshot} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
      ) : (
        <span className="lsp-avatar__initials">{initialsOf(player.name)}</span>
      )}
    </span>
  )
}

function PlayerRow({ player }) {
  return (
    <li className="lsp-player">
      <Avatar player={player} />
      <span className="lsp-player__jersey tnum">{player.jersey || '–'}</span>
      <span className="lsp-player__name">{player.name}</span>
      {player.pos && <span className="lsp-player__pos">{player.pos}</span>}
    </li>
  )
}

function Lineup({ side, team, lineup }) {
  return (
    <div className={`lsp-lineup lsp-lineup--${side}`}>
      <div className="lsp-lineup__head">
        <span className="lsp-lineup__team display">{team}</span>
        {lineup.formation && <span className="lsp-lineup__formation tnum">{lineup.formation}</span>}
      </div>
      <ul className="lsp-lineup__list">
        {lineup.starters.map((p) => (
          <PlayerRow key={`${p.jersey}-${p.name}`} player={p} />
        ))}
      </ul>
      {lineup.bench.length > 0 && (
        <>
          <p className="lsp-lineup__sub">Bench</p>
          <ul className="lsp-lineup__list lsp-lineup__list--bench">
            {lineup.bench.map((p) => (
              <PlayerRow key={`${p.jersey}-${p.name}`} player={p} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function StatRow({ row, home, away }) {
  const h = home[row.key]
  const a = away[row.key]
  const total = h.value + a.value
  // Diverging bar: home grows from centre-left in blue, away from centre-right
  // in neutral ink. When both are zero, render a flat, even neutral bar.
  const hGrow = total > 0 ? h.value : 1
  const aGrow = total > 0 ? a.value : 1
  const sfx = row.suffix || ''
  return (
    <div className="lsp-stat">
      <div className="lsp-stat__nums">
        <span className="lsp-stat__val tnum">
          {h.display}
          {sfx}
        </span>
        <span className="lsp-stat__label">{row.label}</span>
        <span className="lsp-stat__val tnum">
          {a.display}
          {sfx}
        </span>
      </div>
      <div className="lsp-stat__bar" aria-hidden="true">
        <span className="lsp-stat__seg lsp-stat__seg--home" style={{ flexGrow: hGrow }} />
        <span className="lsp-stat__seg lsp-stat__seg--away" style={{ flexGrow: aGrow }} />
      </div>
    </div>
  )
}

const EVENT_LABEL = { goal: 'Goal', yellow: 'Yellow card', red: 'Red card', sub: 'Substitution' }

// Inline soccer-ball glyph in the project icon idiom (stroke circle + filled
// pentagon + spokes). Cards render as coloured rectangles via CSS, so only the
// goal marker needs a glyph.
function GoalBall() {
  return (
    <svg className="lsp-event__ball" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5.7 10.19 7.29 9.35 9.86 6.65 9.86 5.81 7.29Z" fill="currentColor" />
      <path
        d="M8 5.7V1.9M10.19 7.29 13.8 6.12M9.35 9.86 11.59 12.93M6.65 9.86 4.41 12.93M5.81 7.29 2.2 6.12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EventRow({ ev, homeTeam, awayTeam }) {
  const team = ev.side === 'home' ? homeTeam : ev.side === 'away' ? awayTeam : ''
  return (
    <li className={`lsp-event lsp-event--${ev.kind}`}>
      <span className="lsp-event__min tnum">{ev.minute}</span>
      <span className={`lsp-event__marker lsp-event__marker--${ev.kind}`} aria-hidden="true">
        {ev.kind === 'goal' && <GoalBall />}
      </span>
      <span className="lsp-event__player">
        <span className="visually-hidden">{EVENT_LABEL[ev.kind]} — </span>
        {ev.player}
      </span>
      {team && <span className="lsp-event__team">{team}</span>}
    </li>
  )
}

/**
 * @param {object} p
 * @param {string} p.homeName  canonical home team name (for ESPN reconciliation)
 * @param {string} p.awayName  canonical away team name
 * @param {string} p.homeTeam  display name for the home team
 * @param {string} p.awayTeam  display name for the away team
 * @param {'scheduled'|'live'|'completed'} p.status  fixture state (drives the panel)
 * @param {string|null} [p.date]  fixture date (ISO) — lets a finished match resolve
 */
function MatchStatsPanel({ homeName, awayName, homeTeam, awayTeam, status, date = null }) {
  const stateKey = stateOf(status)
  const meta = STATE_META[stateKey]
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [data, setData] = useState(null)
  const [tab, setTab] = useState(stateKey === 'pre' ? 'lineups' : 'stats')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let timer
    const poll = stateKey === 'live' // pre/final are static; only a live tie polls
    const tick = async () => {
      if (document.visibilityState === 'hidden') {
        if (poll) timer = setTimeout(tick, POLL_MS)
        return
      }
      const d = await loadMatchSummaryByTeams(homeName, awayName, date)
      if (cancelled) return
      setData(d)
      setLoaded(true)
      if (poll) timer = setTimeout(tick, POLL_MS)
    }
    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, homeName, awayName, date, stateKey])

  // Which tabs the fetched data can actually fill, and the resolved active one.
  const tabs = []
  if (data?.hasLineups) tabs.push('lineups')
  if (data?.hasStats) tabs.push('stats')
  const activeTab = tabs.includes(tab) ? tab : tabs[0]

  // Goals + cards (subs are noise). Live shows a most-recent-first strip; a
  // finished match shows the whole thing in chronological (kickoff→final) order.
  const goalsCards = data ? data.events.filter((e) => e.kind !== 'sub') : []
  const eventList = stateKey === 'live' ? goalsCards.slice(0, 6) : [...goalsCards].reverse()

  return (
    <details className={`lsp lsp--${stateKey}`} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="lsp__summary">
        <span className={`lsp__badge lsp__badge--${stateKey}`}>
          {stateKey === 'live' && <span className="lsp__badge-dot" aria-hidden="true" />}
          {meta.label}
        </span>
        <span className="lsp__summary-label">Match details</span>
        {stateKey === 'live' && open && loaded && data?.minute && <span className="lsp__minute tnum">{data.minute}</span>}
        <svg className="lsp__chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="lsp__body">
        {!loaded ? (
          <p className="lsp__note">Loading match data…</p>
        ) : !data || (!data.hasLineups && !data.hasStats) ? (
          <p className="lsp__note">{meta.empty}</p>
        ) : (
          <>
            {tabs.length > 1 && (
              <div className="lsp__tabs" role="tablist" aria-label="Match detail view">
                {tabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t}
                    className={`lsp__tab${activeTab === t ? ' is-on' : ''}`}
                    onClick={() => setTab(t)}
                  >
                    {t === 'lineups' ? 'Line-ups' : 'Stats'}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'stats' && data.hasStats && (
              <section className="lsp__stats" aria-label="Team statistics">
                {data.statRows.map((row) => (
                  <StatRow key={row.key} row={row} home={data.stats.home} away={data.stats.away} />
                ))}
              </section>
            )}

            {activeTab === 'lineups' && data.hasLineups && (
              <section className="lsp__lineups" aria-label="Line-ups">
                <div className="lsp__lineups-grid">
                  <Lineup side="home" team={homeTeam} lineup={data.lineups.home} />
                  <Lineup side="away" team={awayTeam} lineup={data.lineups.away} />
                </div>
              </section>
            )}

            {stateKey !== 'pre' && eventList.length > 0 && (
              <section className="lsp__events" aria-label={stateKey === 'live' ? 'Recent goals and cards' : 'Match summary'}>
                <h4 className="lsp__section-title">{stateKey === 'live' ? 'Recent' : 'Match summary'}</h4>
                <ul className="lsp__event-list">
                  {eventList.map((ev, i) => (
                    <EventRow key={`${ev.clockValue}-${i}`} ev={ev} homeTeam={homeTeam} awayTeam={awayTeam} />
                  ))}
                </ul>
              </section>
            )}

            <p className="lsp__credit">{meta.credit}</p>
          </>
        )}
      </div>
    </details>
  )
}

export default MatchStatsPanel
