import { NavLink } from 'react-router-dom'
import { useTournamentData } from '../lib/tournamentData'
import wcMark from '../assets/WC_26_Mark.gif'
import './AppNav.css'

/**
 * Data-source indicator. Red is the app's live-state channel (DESIGN.md §5), so
 * a live feed reads as a pulsing red "LIVE" chip; the static snapshot reads as a
 * quiet neutral "SNAPSHOT" with a hollow dot. The dot (filled vs hollow) carries
 * the state without relying on colour alone.
 */
function DataSourceChip({ source }) {
  const live = source === 'live'
  return (
    <span
      className={`nav__source${live ? ' is-live' : ''}`}
      aria-label={
        live
          ? 'Live results from football-data.org'
          : 'Static snapshot — set FOOTBALL_DATA_API_KEY for live results'
      }
      title={
        live
          ? 'Live results from football-data.org'
          : 'Static snapshot — set FOOTBALL_DATA_API_KEY for live results'
      }
    >
      <span className="nav__source-dot" aria-hidden="true" />
      <span className="nav__source-text" aria-hidden="true">{live ? 'Live' : 'Snapshot'}</span>
    </span>
  )
}

// Coherent hand-drawn line-icon set (matches the project's inline-SVG idiom:
// 1.6px stroke, round joins). One glyph per destination — icons reinforce the
// label on the bottom tab bar, they never stand alone.
const ICONS = {
  home: 'M3 9.5 10 4l7 5.5M5 8.5V16h10V8.5',
  odds: 'M4 16V9M10 16V4M16 16v-5', // ascending bars = ranked leaderboard
  predictor: 'M3 6h14M3 10h14M3 14h9', // stacked fixture lines
  bracket: 'M3 5h4v4M3 11h4v4M7 7h3v6h3M15 8v4', // knockout tree
  groups: 'M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z', // group grid
  matchup: 'M3 12c3.5-7 10.5-7 14 0', // great-circle flight arc
  atlas: 'M10 3a7 7 0 100 14 7 7 0 000-14M3.5 10h13M10 3c2.4 2 2.4 12 0 14M10 3c-2.4 2-2.4 12 0 14', // globe
}

function TabIcon({ name }) {
  return (
    <svg className="nav-tab__icon" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TABS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/odds', label: 'Odds', icon: 'odds' },
  { to: '/predictor', label: 'Predictor', icon: 'predictor' },
  { to: '/bracket', label: 'Bracket', icon: 'bracket' },
  { to: '/groups', label: 'Groups', icon: 'groups' },
  { to: '/simulator', label: 'Matchup', icon: 'matchup' },
  { to: '/encyclopedia', label: 'Atlas', icon: 'atlas' },
]

/**
 * Persistent app chrome. A slim sticky masthead carries the brand and the model
 * badge on every route; the route tabs ride a second row on desktop and drop to
 * a fixed bottom tab bar on narrow viewports. Active route is marked with a 2px
 * American-blue rule — blue is the product's wayfinding / prediction channel
 * (DESIGN.md §5); trophy gold stays reserved for genuine championship moments.
 */
function AppNav() {
  const { odds, source } = useTournamentData()
  const sims = odds.simulations.toLocaleString('en-GB')

  return (
    <>
      <header className="nav">
        <div className="nav__inner">
          <NavLink to="/" className="nav__brand" aria-label="World Cup 26 — home">
            <img className="nav__mark" src={wcMark} alt="" width="40" height="40" aria-hidden="true" />
            <span className="nav__wordmark">
              <span className="nav__title display">
                FIFA World Cup <span className="nav__26">26</span>
              </span>
              <span className="nav__hosts">USA · Canada · Mexico</span>
            </span>
          </NavLink>

          <nav className="nav__tabs" aria-label="Primary">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) => `nav__tab${isActive ? ' is-active' : ''}`}
              >
                {t.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav__meta">
            <DataSourceChip source={source} />
            <p className="nav__badge" title="Predictions from a machine-learning model over 10,000 Monte Carlo tournament runs">
              <span className="nav__badge-engine">Model</span>
              <span className="nav__badge-dot" aria-hidden="true">·</span>
              <span className="nav__badge-sims tnum">{sims}</span>
              <span className="nav__badge-unit"> simulations</span>
            </p>
          </div>
        </div>
      </header>

      <nav className="tabbar" aria-label="Primary">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => `tabbar__tab${isActive ? ' is-active' : ''}`}
          >
            <TabIcon name={t.icon} />
            <span className="tabbar__label">{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export default AppNav
