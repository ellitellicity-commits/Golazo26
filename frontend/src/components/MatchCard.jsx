import ProbabilityBar from './ProbabilityBar'
import LiveStatsPanel from './LiveStatsPanel'
import { liveClock } from '../lib/live'
import './MatchCard.css'

// Fixture kickoffs/dates are UTC; format in UTC so US-local timezones don't
// shift the day backwards (off-by-one).
const DATE_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const TIME_FMT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })

function kickoffTime(fixture) {
  if (!fixture.kickoff) return null
  const d = new Date(fixture.kickoff)
  return Number.isNaN(d.getTime()) ? null : TIME_FMT.format(d)
}

function formatDate(fixture) {
  const d = new Date(fixture.kickoff || `${fixture.date}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return fixture.date
  const date = DATE_FMT.format(d)
  const time = kickoffTime(fixture)
  return time ? `${date} · ${time}` : date
}

function outcomeOf(result) {
  if (!result) return null
  if (result.home_score > result.away_score) return 'home'
  if (result.home_score < result.away_score) return 'away'
  return 'draw'
}

function modelCalledIt(prediction, actual) {
  if (!actual) return null
  const ranked = [
    ['home', prediction.home_win],
    ['draw', prediction.draw],
    ['away', prediction.away_win],
  ].sort((a, b) => b[1] - a[1])
  return ranked[0][0] === actual
}

function TeamRow({ team, winProb, score, isWinner, dimmed }) {
  return (
    <div className={`mc-team${dimmed ? ' is-dimmed' : ''}`}>
      <div className="mc-team__id">
        <span className="mc-team__code">{team.code}</span>
        <span className="mc-team__name display">{team.name}</span>
      </div>
      {score != null ? (
        <span className={`mc-team__num mc-team__num--score display tnum${isWinner ? ' is-winner' : ''}`}>
          {score}
        </span>
      ) : (
        <span className="mc-team__num mc-team__num--prob tnum" title="Model win probability">
          {Math.round(winProb * 100)}
          <span className="mc-team__num-unit">%</span>
        </span>
      )}
    </div>
  )
}

/**
 * Broadcast-desk match card for a single WC2026 fixture.
 * @param {object} fixture
 * @param {boolean} [isToday]  match kicks off today → red "Today" live indicator
 */
function MatchCard({ fixture, isToday = false }) {
  const { home, away, prediction, result, status, group, venue } = fixture
  const isCompleted = status === 'completed'
  const isLive = status === 'live'
  // Only a finished match has a settled winner/loser; an in-play score shows for
  // both teams without dimming or a called-it verdict.
  const actual = isCompleted ? outcomeOf(result) : null
  const called = modelCalledIt(prediction, actual)
  const time = kickoffTime(fixture)

  const pred = { homeWin: prediction.home_win, draw: prediction.draw, awayWin: prediction.away_win }

  return (
    <article
      className={`mc${isCompleted ? ' mc--completed' : ''}${isLive ? ' mc--live' : ''}`}
      aria-label={`${home.name} versus ${away.name}, Group ${group}`}
    >
      <header className="mc__head">
        <span className="mc-chip mc-chip--group">
          <span className="mc-chip__badge" aria-hidden="true">
            {group}
          </span>
          <span className="mc-chip__text">Group {group}</span>
        </span>
        {isLive ? (
          <span className="mc-chip mc-chip--live">
            <span className="mc-chip__dot" aria-hidden="true" />
            {liveClock(fixture.live)}
          </span>
        ) : isToday ? (
          <span className="mc-chip mc-chip--today">
            <span className="mc-chip__dot" aria-hidden="true" />
            Today{time ? ` · ${time}` : ''}
          </span>
        ) : isCompleted ? (
          <span className="mc-status mc-status--ft">Full time</span>
        ) : (
          <time className="mc-status" dateTime={fixture.kickoff || fixture.date}>
            {formatDate(fixture)}
          </time>
        )}
      </header>

      <div className="mc__teams">
        <TeamRow
          team={home}
          winProb={prediction.home_win}
          score={result ? result.home_score : null}
          isWinner={actual === 'home'}
          dimmed={isCompleted && actual === 'away'}
        />
        <TeamRow
          team={away}
          winProb={prediction.away_win}
          score={result ? result.away_score : null}
          isWinner={actual === 'away'}
          dimmed={isCompleted && actual === 'home'}
        />
      </div>

      <div className="mc__pred">
        <div className="mc__pred-head">
          <span className="mc__pred-label">{isCompleted ? 'Pre-match model' : 'Model prediction'}</span>
          {isCompleted && (
            <span className={`mc-verdict ${called ? 'is-hit' : 'is-miss'}`}>
              <svg className="mc-verdict__icon" viewBox="0 0 16 16" aria-hidden="true">
                {called ? (
                  <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M4 5.5h7l-2-2M12 10.5H5l2 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
              {called ? 'Called it' : 'Upset'}
            </span>
          )}
        </div>
        <ProbabilityBar prediction={pred} homeCode={home.code} awayCode={away.code} actual={isCompleted ? actual : null} />
      </div>

      <footer className="mc__foot">
        <span className="mc__venue">
          {venue.city}
          <span className="mc__venue-sep" aria-hidden="true">
            ·
          </span>
          {venue.stadium}
        </span>
        <dl className="mc__odds" title="Championship odds (Monte Carlo, 10k sims)">
          <div className="mc__odd">
            <dt>{home.code}</dt>
            <dd className="tnum">{(home.championship_odds * 100).toFixed(1)}%</dd>
          </div>
          <div className="mc__odd">
            <dt>{away.code}</dt>
            <dd className="tnum">{(away.championship_odds * 100).toFixed(1)}%</dd>
          </div>
        </dl>
      </footer>

      {isLive && (
        <LiveStatsPanel homeName={home.name} awayName={away.name} homeTeam={home.name} awayTeam={away.name} />
      )}
    </article>
  )
}

export default MatchCard
