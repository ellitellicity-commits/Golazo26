import { useMemo } from 'react'
import FixturesRail from '../components/FixturesRail'
import MatchCard from '../components/MatchCard'
import { useTournamentData } from '../lib/tournamentData'
import './Predictor.css'

// --- ?demo: the card-states gallery (component review, not the product page) --
const showDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')

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

function buildDemoItems({ completed, fixtures, todaysMatches }) {
  const calledIt = completed
    .filter((f) => modelCalledIt(f))
    .sort((a, b) => Math.max(b.prediction.home_win, b.prediction.away_win) - Math.max(a.prediction.home_win, a.prediction.away_win))[0]
  const upset = completed.filter((f) => modelCalledIt(f) === false).sort((a, b) => probOfActual(a) - probOfActual(b))[0]
  const longName = [...fixtures].sort((a, b) => b.home.name.length + b.away.name.length - (a.home.name.length + a.away.name.length))[0]
  return [
    { label: 'Today — live indicator', fixture: todaysMatches[0], today: true },
    { label: 'Completed — model called it', fixture: calledIt },
    { label: 'Completed — upset', fixture: upset },
    { label: 'Long team names', fixture: longName },
  ].filter((i) => i.fixture)
}

function Predictor() {
  const { fixtures: fixturesData } = useTournamentData()
  const view = useMemo(() => {
    const TODAY = fixturesData.generated
    const fixtures = fixturesData.fixtures
    const completed = fixtures.filter((f) => f.status === 'completed')
    const scheduled = fixtures.filter((f) => f.status === 'scheduled')
    const todaysMatches = scheduled.filter((f) => f.date === TODAY)
    const upcoming = scheduled.filter((f) => f.date !== TODAY)
    const groupStageRail = [...completed.slice(-3), ...upcoming.slice(0, 5)]
    return { TODAY, fixtures, completed, scheduled, todaysMatches, groupStageRail }
  }, [fixturesData])
  const { TODAY, completed, scheduled, todaysMatches, groupStageRail } = view

  return (
    <div className="predictor">
      <header className="predictor__head">
        <h1 className="predictor__title display">Match Predictor</h1>
        <p className="predictor__sub">
          The model’s win, draw and loss probabilities for every fixture. Each card opens on the matchup;
          the probability bar carries the prediction. Completed ties show the result against the call.
        </p>
      </header>

      {todaysMatches.length > 0 && (
        <FixturesRail title="Today" eyebrow={`${todaysMatches.length} matches`} fixtures={todaysMatches} todayDate={TODAY} />
      )}

      <FixturesRail
        title="Group Stage"
        eyebrow={`${completed.length} played · ${scheduled.length} to come`}
        fixtures={groupStageRail}
        todayDate={TODAY}
      />

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
