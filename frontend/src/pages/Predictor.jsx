import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import FixturesRail from '../components/FixturesRail'
import MatchCard from '../components/MatchCard'
import KnockoutCard from '../components/KnockoutCard'
import { buildViews, liveResults } from '../lib/bracket'
import { useTournamentData } from '../lib/tournamentData'
import './Predictor.css'

// --- ?demo: the card-states gallery (component review, not the product page) --
const showDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')

const ROUND_LABEL = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', final: 'Final', third: 'Third place' }
const ROUND_RANK = { r32: 0, r16: 1, qf: 2, sf: 3, third: 4, final: 5 }

function modelCalledIt(f) {
  if (f.status !== 'completed' || !f.result) return null
  const actual =
    f.result.home_score > f.result.away_score
      ? 'home'
      : f.result.home_score < f.result.away_score
        ? 'away'
        : 'draw'
  const top = [
    ['home', f.prediction.home_win],
    ['draw', f.prediction.draw],
    ['away', f.prediction.away_win],
  ].sort((a, b) => b[1] - a[1])[0][0]
  return top === actual
}

function probOfActual(f) {
  if (!f.result) return 1
  if (f.result.home_score > f.result.away_score) return f.prediction.home_win
  if (f.result.home_score < f.result.away_score) return f.prediction.away_win
  return f.prediction.draw
}

function buildDemoItems({ completed, allFixtures, todaysMatches }) {
  const calledIt = completed
    .filter((f) => modelCalledIt(f))
    .sort((a, b) => Math.max(b.prediction.home_win, b.prediction.away_win) - Math.max(a.prediction.home_win, a.prediction.away_win))[0]
  const upset = completed.filter((f) => modelCalledIt(f) === false).sort((a, b) => probOfActual(a) - probOfActual(b))[0]
  const longName = [...allFixtures].sort((a, b) => b.home.name.length + b.away.name.length - (a.home.name.length + a.away.name.length))[0]
  return [
    { label: 'Today — live indicator', fixture: todaysMatches[0], today: true },
    { label: 'Completed — model called it', fixture: calledIt },
    { label: 'Completed — upset', fixture: upset },
    { label: 'Long team names', fixture: longName },
  ].filter((i) => i.fixture)
}

// Rail of upcoming knockout ties (reuses the shared .rail layout from FixturesRail).
function KnockoutRail({ title, ties }) {
  return (
    <section className="rail" aria-label={title}>
      <div className="rail__head">
        <h2 className="rail__title display">{title}</h2>
        <span className="rail__eyebrow">{ties.length} knockout {ties.length === 1 ? 'tie' : 'ties'}</span>
      </div>
      <ul className="rail__track">
        {ties.map((v) => (
          <li className="rail__item" key={v.id}>
            <KnockoutCard view={v} roundLabel={ROUND_LABEL[v.round]} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Predictor() {
  const { fixtures: data } = useTournamentData()

  const view = useMemo(() => {
    const TODAY = data.generated
    const allFixtures = data.fixtures
    const completed = allFixtures.filter((f) => f.status === 'completed')
    const scheduled = allFixtures.filter((f) => f.status === 'scheduled')
    const todaysMatches = scheduled.filter((f) => f.date === TODAY)
    // Upcoming group matches: today first, then chronological.
    const upcomingGroup = [...scheduled].sort(
      (a, b) => (b.date === TODAY) - (a.date === TODAY) || a.date.localeCompare(b.date) || (a.kickoff || '').localeCompare(b.kickoff || ''),
    )
    // Finished group matches: most recent first.
    const finished = [...completed].reverse()

    // Upcoming knockout ties: both teams known, not yet decided (the real
    // "upcoming matches" once the group stage is over). Predictions come from the
    // same win-probability model the bracket uses.
    const koViews = buildViews(liveResults(data.knockout), 'live', data.knockout.r32)
    const upcomingKO = Object.values(koViews)
      .filter((v) => v.home?.kind === 'team' && v.away?.kind === 'team' && !v.winner && v.status !== 'completed')
      .sort((a, b) => ROUND_RANK[a.round] - ROUND_RANK[b.round] || a.id - b.id)

    return { TODAY, allFixtures, completed, todaysMatches, upcomingGroup, upcomingKO, finished }
  }, [data])

  const { TODAY, upcomingGroup, upcomingKO, finished } = view
  const nothingUpcoming = upcomingGroup.length === 0 && upcomingKO.length === 0

  return (
    <div className="predictor">
      <header className="predictor__head">
        <h1 className="predictor__title display">Match Predictor</h1>
        <p className="predictor__sub">
          The model’s win probabilities for what’s next, up top. Completed matches — with the result against the
          call — sit in Finished Matches below.
        </p>
      </header>

      {upcomingKO.length > 0 && <KnockoutRail title="Upcoming" ties={upcomingKO} />}

      {upcomingGroup.length > 0 && (
        <FixturesRail
          title={upcomingKO.length > 0 ? 'Upcoming — Group Stage' : 'Upcoming'}
          eyebrow={`${upcomingGroup.length} to play`}
          fixtures={upcomingGroup}
          todayDate={TODAY}
        />
      )}

      {nothingUpcoming && (
        <section className="predictor__empty">
          <p className="predictor__empty-title">No matches left to play.</p>
          <p className="predictor__empty-body">
            The tournament is complete. Revisit the run on the <Link to="/bracket">Tournament Bracket</Link>.
          </p>
        </section>
      )}

      {finished.length > 0 && (
        <FixturesRail
          title="Finished Matches"
          eyebrow={`${finished.length} played`}
          fixtures={finished}
          todayDate={TODAY}
        />
      )}

      {showDemo && (
        <section className="gallery" aria-label="Match card states">
          <div className="gallery__head">
            <h2 className="gallery__title display">Card States</h2>
            <p className="gallery__sub">Component demo — every state driven by the same card and real model output.</p>
          </div>
          <div className="gallery__grid">
            {buildDemoItems(view).map((item) => (
              <figure className="gallery__cell" key={item.label}>
                <figcaption className="gallery__caption">{item.label}</figcaption>
                <MatchCard fixture={item.fixture} isToday={item.today} />
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default Predictor
