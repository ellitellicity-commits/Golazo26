import MatchStatsPanel from './MatchStatsPanel'
import GoalBurst, { useGoalBurst } from './GoalBurst'
import ProbabilityBar from './ProbabilityBar'
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

function TeamRow({ team, pct, favored, score, isWinner, dimmed }) {
  const showScore = score != null
  return (
    <div className={`koc-team${favored && !showScore ? ' is-fav' : ''}${dimmed ? ' is-dim' : ''}`}>
      {team.flag ? (
        <img className="koc-team__flag" src={team.flag} alt="" width="24" height="18" loading="lazy" decoding="async" />
      ) : (
        <span className="koc-team__flag koc-team__flag--none" aria-hidden="true" />
      )}
      <span className="koc-team__code">{team.code}</span>
      <span className="koc-team__name display">{team.name}</span>
      {showScore ? (
        <span className={`koc-team__score display tnum${isWinner ? ' is-win' : ''}`}>{score}</span>
      ) : (
        <span className="koc-team__prob tnum" title="Model win probability">
          {pct}
          <span className="koc-team__prob-unit">%</span>
        </span>
      )}
    </div>
  )
}

// The green group identity badge (DESIGN §5) — reused on finished group cards so
// they share the KO card's compact chrome while keeping green = group data.
function GroupChip({ letter }) {
  return (
    <span className="koc__group">
      <span className="koc__group-badge" aria-hidden="true">{letter}</span>
      <span className="koc__group-text">Group {letter}</span>
    </span>
  )
}

/**
 * Compact card for a knockout tie. For an upcoming tie the probability is
 * two-way (knockout is decided outright, no draw): the model's home advance
 * chance in American Blue (the prediction channel), the away chance in neutral
 * ink. A finished tie instead shows the scoreline — winner in ink, loser dimmed,
 * penalties noted — with the pre-match model kept below and a neutral verdict on
 * whether the model's favourite actually advanced (mirrors MatchCard's group
 * cards, so finished KO ties read the same as finished group games).
 *
 * `group` mode: a finished GROUP fixture, adapted into the same view shape, so
 * group games get this exact compact layout (flags, Full time, winner/dim,
 * venue, stats panel). Two deliberate differences kept for group games: the
 * green GROUP chip replaces the round label, and the model bar stays the honest
 * three-way home/draw/away ProbabilityBar (a group game can draw), not the
 * two-way advance bar.
 * @param {object} view  a bracket view: { round, home, away, pHome, venue, ... }
 * @param {string} [roundLabel]
 * @param {string} [group]  group letter → render as a finished group card
 */
function KnockoutCard({ view, roundLabel, group = null }) {
  const isGroup = group != null
  const live = view.status === 'live'
  const when = whenLabel(view)

  // Group mode: the outcome (incl. draw) comes from the score; the model "called
  // it" when the top of the three-way prediction matches what happened.
  const groupOutcome = isGroup
    ? view.score.home_score > view.score.away_score
      ? 'home'
      : view.score.home_score < view.score.away_score
        ? 'away'
        : 'draw'
    : null
  const groupPred = isGroup
    ? { homeWin: view.prediction.home_win, draw: view.prediction.draw, awayWin: view.prediction.away_win }
    : null

  const homePct = isGroup ? Math.round(view.prediction.home_win * 100) : Math.round(view.pHome * 100)
  const awayPct = isGroup ? Math.round(view.prediction.away_win * 100) : 100 - homePct
  // A finished tie ('completed' for R32, 'decided' for R16+) carries both a
  // scoreline and a resolved winner — the same match-status logic the bracket
  // and live rails use (lib/bracket liveResults / buildViews). A group card is
  // always decided.
  const decided = isGroup || (!live && view.winner != null && view.score != null)
  const showScore = live || decided

  const homeWon = isGroup ? groupOutcome === 'home' : decided ? view.winner === view.home.name : null
  const awayWon = isGroup ? groupOutcome === 'away' : decided ? !homeWon : null
  const pens = !isGroup && decided ? view.score.penalties : null
  // The model "called it" when its pre-match favourite is the side that advanced
  // (KO) or the top three-way pick is what happened (group).
  const called = isGroup
    ? [['home', view.prediction.home_win], ['draw', view.prediction.draw], ['away', view.prediction.away_win]].sort(
        (a, b) => b[1] - a[1],
      )[0][0] === groupOutcome
    : decided
      ? homePct >= awayPct
        ? homeWon
        : !homeWon
      : null

  const [burst, clearBurst] = useGoalBurst({
    live,
    homeScore: view.score?.home_score,
    awayScore: view.score?.away_score,
  })

  return (
    <article
      className={`koc${live ? ' koc--live' : ''}${decided ? ' koc--decided' : ''}${isGroup ? ' koc--group' : ''}`}
      aria-label={`${view.home.name} versus ${view.away.name}, ${isGroup ? `Group ${group}` : roundLabel}`}
    >
      <header className="koc__head">
        {isGroup ? <GroupChip letter={group} /> : <span className="koc__round">{roundLabel}</span>}
        {live ? (
          <span className="koc__live">
            <span className="koc__live-dot" aria-hidden="true" />
            {liveClock(view.live)}
          </span>
        ) : decided ? (
          <span className="koc__ft">Full time</span>
        ) : (
          when && <span className="koc__when">{when}</span>
        )}
      </header>

      <div className="koc__teams">
        {burst && <GoalBurst side={burst.side} key={burst.key} onDone={clearBurst} />}
        <TeamRow
          team={view.home}
          pct={homePct}
          favored={isGroup ? view.prediction.home_win >= view.prediction.away_win : homePct >= awayPct}
          score={showScore ? view.score.home_score : null}
          isWinner={decided && homeWon}
          dimmed={decided && awayWon}
        />
        <TeamRow
          team={view.away}
          pct={awayPct}
          favored={isGroup ? view.prediction.away_win > view.prediction.home_win : awayPct > homePct}
          score={showScore ? view.score.away_score : null}
          isWinner={decided && awayWon}
          dimmed={decided && homeWon}
        />
      </div>

      {pens && (
        <p className="koc__pens">
          {view.winner} advance on penalties (<span className="tnum">{pens.home_score}–{pens.away_score}</span>)
        </p>
      )}

      <div className="koc__pred">
        <div className="koc__pred-head">
          <span className="koc__pred-label">{isGroup ? 'Pre-match model' : 'Pre-match model · to advance'}</span>
          {decided && (
            <span className={`koc-verdict ${called ? 'is-hit' : 'is-miss'}`}>
              <svg className="koc-verdict__icon" viewBox="0 0 16 16" aria-hidden="true">
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
        {isGroup ? (
          <ProbabilityBar prediction={groupPred} homeCode={view.home.code} awayCode={view.away.code} actual={groupOutcome} />
        ) : (
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
        )}
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

      <MatchStatsPanel
        homeName={view.home.name}
        awayName={view.away.name}
        homeTeam={view.home.name}
        awayTeam={view.away.name}
        status={decided ? 'completed' : view.status}
        date={view.date}
      />
    </article>
  )
}

export default KnockoutCard
