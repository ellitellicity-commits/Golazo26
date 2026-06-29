import MatchCard from './components/MatchCard'
import FixturesRail from './components/FixturesRail'
import oddsData from './data/odds.json'
import fixturesData from './data/fixtures.json'
import './App.css'

const TODAY = fixturesData.generated

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

const fixtures = fixturesData.fixtures
const completed = fixtures.filter((f) => f.status === 'completed')
const scheduled = fixtures.filter((f) => f.status === 'scheduled')

const todaysMatches = scheduled.filter((f) => f.date === TODAY)
const upcoming = scheduled.filter((f) => f.date !== TODAY)
const groupStageRail = [...completed.slice(-3), ...upcoming.slice(0, 5)]

const champion = oddsData.teams[0]
const updated = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
  new Date(`${TODAY}T00:00:00Z`),
)

// Card-states gallery is a component demo, not part of the product page.
// Reachable at ?demo for design review; off the main page by default.
const showDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')

function buildDemoItems() {
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

function App() {
  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__brand">
          <span className="masthead__kicker">FIFA World Cup 26 · USA · Canada · Mexico</span>
          <h1 className="masthead__title display">Match Predictor</h1>
        </div>
        <dl className="masthead__model" aria-label="Model summary">
          <div className="masthead__stat">
            <dt>Engine</dt>
            <dd>XGBoost</dd>
          </div>
          <div className="masthead__stat">
            <dt>Simulations</dt>
            <dd className="tnum">{oddsData.simulations.toLocaleString('en-GB')}</dd>
          </div>
          <div className="masthead__stat masthead__stat--fav">
            <dt>Favourite</dt>
            <dd>
              {champion.team}{' '}
              <span className="tnum masthead__fav-odds">{(champion.championship_odds * 100).toFixed(1)}%</span>
            </dd>
          </div>
          <div className="masthead__stat">
            <dt>Updated</dt>
            <dd>{updated}</dd>
          </div>
        </dl>
      </header>

      <main className="page__main">
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
              <p className="gallery__sub">
                Component demo — every state driven by the same card and real model output.
              </p>
            </div>
            <div className="gallery__grid">
              {buildDemoItems().map((item) => (
                <figure className="gallery__cell" key={item.label}>
                  <figcaption className="gallery__caption">{item.label}</figcaption>
                  <MatchCard fixture={item.fixture} isToday={item.today} />
                </figure>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="page__foot">
        <p>
          Predictions are model estimates from historical results, Elo ratings, and recent form. For analysis, not
          wagering.
        </p>
      </footer>
    </div>
  )
}

export default App
