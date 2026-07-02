import { useEffect, useState } from 'react'
import { loadLiveMatch } from '../lib/espn'
import './LiveStatsPanel.css'

// Live stats panel for an in-play tie. Collapsed by default; only when opened
// does it fetch ESPN's live summary (lineups, team stats, events, minute) and
// poll it every 60s while open and the tab is visible. Data source is unofficial
// (see lib/espn.js), so every failure resolves to an "unavailable" state.
const POLL_MS = 60_000

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

const EVENT_GLYPH = { goal: '⚽', yellow: '', red: '', sub: '⇄' }
const EVENT_LABEL = { goal: 'Goal', yellow: 'Yellow card', red: 'Red card', sub: 'Substitution' }

function EventRow({ ev, homeTeam, awayTeam }) {
  const team = ev.side === 'home' ? homeTeam : ev.side === 'away' ? awayTeam : ''
  return (
    <li className={`lsp-event lsp-event--${ev.kind}`}>
      <span className="lsp-event__min tnum">{ev.minute}</span>
      <span className={`lsp-event__marker lsp-event__marker--${ev.kind}`} aria-hidden="true">
        {EVENT_GLYPH[ev.kind]}
      </span>
      <span className="lsp-event__player">
        <span className="visually-hidden">{EVENT_LABEL[ev.kind]} — </span>
        {ev.player}
      </span>
      {team && <span className="lsp-event__team">{team}</span>}
    </li>
  )
}

function LiveStatsPanel({ homeName, awayName, homeTeam, awayTeam }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let timer
    const tick = async () => {
      if (document.visibilityState === 'hidden') {
        timer = setTimeout(tick, POLL_MS)
        return
      }
      const d = await loadLiveMatch(homeName, awayName)
      if (cancelled) return
      setData(d)
      setLoaded(true)
      timer = setTimeout(tick, POLL_MS)
    }
    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, homeName, awayName])

  // Recent goals + cards only (subs are noise for the highlight strip).
  const highlights = data ? data.events.filter((e) => e.kind !== 'sub').slice(0, 4) : []

  return (
    <details className="lsp" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="lsp__summary">
        <span className="lsp__summary-label">Live match stats</span>
        {open && loaded && data?.minute && <span className="lsp__minute tnum">{data.minute}</span>}
        <svg className="lsp__chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="lsp__body">
        {!loaded ? (
          <p className="lsp__note">Loading live data…</p>
        ) : !data ? (
          <p className="lsp__note">Live stats aren’t available for this match right now.</p>
        ) : (
          <>
            <section className="lsp__stats" aria-label="Team statistics">
              {data.statRows.map((row) => (
                <StatRow key={row.key} row={row} home={data.stats.home} away={data.stats.away} />
              ))}
            </section>

            {highlights.length > 0 && (
              <section className="lsp__events" aria-label="Recent goals and cards">
                <h4 className="lsp__section-title">Recent</h4>
                <ul className="lsp__event-list">
                  {highlights.map((ev, i) => (
                    <EventRow key={`${ev.clockValue}-${i}`} ev={ev} homeTeam={homeTeam} awayTeam={awayTeam} />
                  ))}
                </ul>
              </section>
            )}

            {(data.lineups.home.starters.length > 0 || data.lineups.away.starters.length > 0) && (
              <section className="lsp__lineups" aria-label="Line-ups">
                <h4 className="lsp__section-title">Line-ups</h4>
                <div className="lsp__lineups-grid">
                  <Lineup side="home" team={homeTeam} lineup={data.lineups.home} />
                  <Lineup side="away" team={awayTeam} lineup={data.lineups.away} />
                </div>
              </section>
            )}

            <p className="lsp__credit">Live data · ESPN</p>
          </>
        )}
      </div>
    </details>
  )
}

export default LiveStatsPanel
