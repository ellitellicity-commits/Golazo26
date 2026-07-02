import LiveStatsPanel from './LiveStatsPanel'
import { liveClock } from '../lib/live'
import './KnockoutCard.css'

// Kickoffs/dates are UTC; format in UTC so US-local timezones don't shift the day.
const DATE_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const TIME_FMT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })

function whenLabel(view) {
  const iso = view.kickoff || (view.date ? `${view.date}T00:00:00Z` : view.venue?.date ? `${view.venue.date}T00:00:00Z` : null)
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const date = DATE_FMT.format(d)
  return view.kickoff ? `${date} · ${TIME_FMT.format(d)}` : date
}

function TeamRow({ team, pct, favored, score }) {
  const showScore = score != null
  return (
    <div className={`koc-team${favored && !showScore ? ' is-fav' : ''}`}>
      {team.flag ? (
        <img className="koc-team__flag" src={team.flag} alt="" width="24" height="18" loading="lazy" decoding="async" />
      ) : (
        <span className="koc-team__flag koc-team__flag--none" aria-hidden="true" />
      )}
      <span className="koc-team__code">{team.code}</span>
      <span className="koc-team__name display">{team.name}</span>
      {showScore ? (
        <span className="koc-team__score display tnum">{score}</span>
      ) : (
        <span className="koc-team__prob tnum" title="Model win probability">
          {pct}
          <span className="koc-team__prob-unit">%</span>
        </span>
      )}
    </div>
  )
}

/**
 * Compact prediction card for an upcoming knockout tie. Knockout is decided
 * outright (no draw), so the probability is two-way: the model's home win chance
 * in American Blue (the prediction channel), the away chance in neutral ink.
 * @param {object} view  a bracket view: { round, home, away, pHome, venue, ... }
 * @param {string} roundLabel
 */
function KnockoutCard({ view, roundLabel }) {
  const homePct = Math.round(view.pHome * 100)
  const awayPct = 100 - homePct
  const live = view.status === 'live'
  const when = whenLabel(view)

  return (
    <article className={`koc${live ? ' koc--live' : ''}`} aria-label={`${view.home.name} versus ${view.away.name}, ${roundLabel}`}>
      <header className="koc__head">
        <span className="koc__round">{roundLabel}</span>
        {live ? (
          <span className="koc__live">
            <span className="koc__live-dot" aria-hidden="true" />
            {liveClock(view.live)}
          </span>
        ) : (
          when && <span className="koc__when">{when}</span>
        )}
      </header>

      <div className="koc__teams">
        <TeamRow team={view.home} pct={homePct} favored={homePct >= awayPct} score={live ? view.score.home_score : null} />
        <TeamRow team={view.away} pct={awayPct} favored={awayPct > homePct} score={live ? view.score.away_score : null} />
      </div>

      <div className="koc__pred">
        <span className="koc__pred-label">{live ? 'Pre-match model · to advance' : 'Model prediction · to advance'}</span>
        <div
          className="koc__bar"
          role="img"
          aria-label={`Model prediction — ${view.home.code} advance ${homePct}%, ${view.away.code} advance ${awayPct}%.`}
        >
          <span className="koc__bar-seg koc__bar-seg--home" style={{ flexGrow: Math.max(homePct, 1) }}>
            {homePct >= 18 && <span className="koc__bar-pct tnum">{homePct}%</span>}
          </span>
          <span className="koc__bar-seg koc__bar-seg--away" style={{ flexGrow: Math.max(awayPct, 1) }}>
            {awayPct >= 18 && <span className="koc__bar-pct tnum">{awayPct}%</span>}
          </span>
        </div>
      </div>

      {view.venue && (
        <footer className="koc__foot">
          <span className="koc__venue">
            {view.venue.city}
            <span className="koc__venue-sep" aria-hidden="true">·</span>
            {view.venue.stadium}
          </span>
        </footer>
      )}

      {live && (
        <LiveStatsPanel
          homeName={view.home.name}
          awayName={view.away.name}
          homeTeam={view.home.name}
          awayTeam={view.away.name}
        />
      )}
    </article>
  )
}

export default KnockoutCard
