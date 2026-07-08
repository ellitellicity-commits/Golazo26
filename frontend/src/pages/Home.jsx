import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BrandField } from '../components/BrandMarks'
import { getCurrentRound, finalCountdown, META } from '../lib/bracket'
import { teamMeta, flagUrl } from '../lib/teams'
import { useTournamentData } from '../lib/tournamentData'
import './Home.css'

// Dates are stored as UTC instants; format in UTC (matches the rest of the app).
const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

// The final's kickoff, mirroring finalCountdown()'s 20:00 UTC assumption. A real
// countdown clock names its target time, so the snapshot shows it beneath the
// figure ("Kick-off · 19 Jul, 20:00 UTC") — the detail that makes the number
// read as a countdown rather than just another stat.
const KICKOFF_ISO = `${META.final.date}T20:00:00Z`
const KICKOFF_TEXT = `${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(KICKOFF_ISO))} · 20:00 UTC`

// Short "28 Jun" form of the static snapshot's date, shown when the live feed
// isn't reaching us and the app is running on the bundled fallback.
const SNAPSHOT_DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const snapshotDate = (isoDate) => SNAPSHOT_DATE_FMT.format(new Date(`${isoDate}T00:00:00Z`))

// One broadcast-rundown row per destination — a meta figure that actually means
// something, a condensed title, a one-line read. Not a card grid (a hub menu).
// The Predictor figure is fixture-derived, so the list is built per render.
function buildDestinations({ todaysCount, upcomingCount }) {
  return [
    {
      to: '/odds',
      title: 'Championship Odds',
      blurb: 'All 48 nations ranked by their Monte Carlo chance of lifting the trophy.',
      meta: '48',
      metaLabel: 'nations',
    },
    {
      to: '/predictor',
      title: 'Match Predictor',
      blurb: 'Win, draw and loss probabilities for every fixture, match by match.',
      meta: todaysCount > 0 ? String(todaysCount) : String(upcomingCount),
      metaLabel: todaysCount > 0 ? 'today' : 'upcoming',
    },
    {
      to: '/bracket',
      title: 'Tournament Bracket',
      blurb: 'The locked 32-team knockout — or simulate every tie to the final.',
      meta: '32',
      metaLabel: 'knockout',
    },
    {
      to: '/groups',
      title: 'Group Tables',
      blurb: 'Standings and qualification probability for all twelve groups.',
      meta: '12',
      metaLabel: 'groups',
    },
  ]
}

// Live countdown to the final, recomputed hourly (per-second precision isn't
// needed for a days/hours figure). Both this and the stage below re-read on every
// live data refresh too, since the provider re-renders the tree.
function useFinalCountdown() {
  const [cd, setCd] = useState(finalCountdown)
  useEffect(() => {
    const id = setInterval(() => setCd(finalCountdown()), 3_600_000)
    return () => clearInterval(id)
  }, [])
  return cd
}

// A single status marker labelling the snapshot below it: red pulsing "LIVE"
// when the football-data.org feed is current, or a neutral "Snapshot · <date>"
// when the app has fallen back to the bundled data (missing key, rate limit,
// network error). Without this, a stale fallback looks identical to live state.
function DataStatus({ source, generated }) {
  if (source === 'live') {
    return (
      <p className="data-status data-status--live" role="status">
        <span className="data-status__dot" aria-hidden="true" />
        Live
      </p>
    )
  }
  return (
    <p className="data-status data-status--static" role="status">
      Snapshot · <time dateTime={generated} className="tnum">{snapshotDate(generated)}</time>
    </p>
  )
}

function Snapshot() {
  const { odds, fixtures, source } = useTournamentData()
  const favourite = odds.teams[0]
  const favMeta = teamMeta(favourite.team)
  const stage = getCurrentRound(fixtures.fixtures, fixtures.knockout)
  const countdown = useFinalCountdown()
  const favPct = (favourite.championship_odds * 100).toFixed(1)
  const flag = flagUrl(favMeta.iso)
  return (
    <div className="snapshot-block">
    <DataStatus source={source} generated={fixtures.generated} />
    <dl className="snapshot" aria-label="Tournament snapshot">
      <div className="snapshot__item snapshot__item--fav">
        <dt>Favourite</dt>
        <dd>
          {flag && <img className="snapshot__flag" src={flag} alt="" width="30" height="22" />}
          <span className="snapshot__fav-team">{favourite.team}</span>
          <span className="snapshot__fav-odds tnum">{favPct}%</span>
        </dd>
      </div>
      <div className="snapshot__item">
        <dt>Stage</dt>
        <dd className="snapshot__big">{stage}</dd>
      </div>
      <div className={`snapshot__item snapshot__item--${countdown.phase}`}>
        <dt>{countdown.label}</dt>
        <dd>
          {countdown.phase === 'live' && <span className="snapshot__live-dot" aria-hidden="true" />}
          <span className="snapshot__big tnum">{countdown.big}</span>
          {countdown.unit && <span className="snapshot__unit">{countdown.unit}</span>}
        </dd>
        {countdown.phase === 'countdown' && (
          <p className="snapshot__kickoff">
            Kick-off <time dateTime={KICKOFF_ISO} className="tnum">{KICKOFF_TEXT}</time>
          </p>
        )}
      </div>
    </dl>
    </div>
  )
}

function Home() {
  const { fixtures: fixturesData } = useTournamentData()
  const { destinations, playedCount, updated } = useMemo(() => {
    const fixtures = fixturesData.fixtures
    const scheduled = fixtures.filter((f) => f.status === 'scheduled')
    const playedCount = fixtures.filter((f) => f.status === 'completed').length
    const todaysCount = scheduled.filter((f) => f.date === fixturesData.generated).length
    return {
      destinations: buildDestinations({ todaysCount, upcomingCount: scheduled.length }),
      playedCount,
      updated: DATE_FMT.format(new Date(`${fixturesData.generated}T00:00:00Z`)),
    }
  }, [fixturesData])

  return (
    <div className="home">
      <section className="home-hero">
        <BrandField className="home-hero__field" />
        <div className="home-hero__inner">
          <p className="home-hero__intro">
            Broadcast-grade intelligence for the 2026 FIFA World Cup — a machine-learning model turns
            historical results, Elo ratings and live tournament data into win probabilities, championship
            odds and Monte Carlo bracket paths.
          </p>
          <Snapshot />
        </div>
      </section>

      <nav className="home-menu" aria-label="Sections">
        <h2 className="home-menu__title">Explore the desk</h2>
        <ul className="home-menu__list">
          {destinations.map((d) => (
            <li key={d.to}>
              <NavLink to={d.to} className="dest">
                <span className="dest__meta">
                  <span className="dest__meta-num tnum">{d.meta}</span>
                  <span className="dest__meta-label">{d.metaLabel}</span>
                </span>
                <span className="dest__body">
                  <span className="dest__title display">{d.title}</span>
                  <span className="dest__blurb">{d.blurb}</span>
                </span>
                <svg className="dest__arrow" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </NavLink>
            </li>
          ))}
        </ul>
        <p className="home-menu__note">
          <span className="tnum">{playedCount}</span> matches played · model updated {updated}
        </p>
      </nav>
    </div>
  )
}

export default Home
