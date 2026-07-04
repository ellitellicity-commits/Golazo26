import { useMemo, useRef, useState } from 'react'
import GlobeHero from '../components/GlobeHero'
import CountryEmblem from '../components/CountryEmblem'
import { TEAM_COORDINATES, STADIUMS } from '../lib/stadiumData'
import { winProb } from '../lib/bracket'
import TEAM_META, { teamMeta, flagUrl } from '../lib/teams'
import './Simulator.css'

// Matchup Sandbox — a standalone "what if these two met?" tool. Distinct from the
// tournament-level Monte Carlo simulator that feeds Bracket/Odds/Predictor: this
// never touches the bracket, it just plays one hypothetical tie. (The old
// bracket-altering "Run Your Own Simulation" mode was removed in dba5ced; this is
// not that — no bracket impact.)

const TEAMS = Object.keys(TEAM_META).sort()

// Round → a plausible host venue for the tie. All real WC2026 stadiums; the Final
// lands at MetLife, the rest spread across the three hosts.
const ROUNDS = [
  { id: 'group', label: 'Group Stage', stadium: 'Estadio Azteca' },
  { id: 'r32', label: 'Round of 32', stadium: 'Mercedes-Benz Stadium' },
  { id: 'r16', label: 'Round of 16', stadium: 'NRG Stadium' },
  { id: 'qf', label: 'Quarter-final', stadium: 'AT&T Stadium' },
  { id: 'sf', label: 'Semi-final', stadium: 'BC Place' },
  { id: 'final', label: 'Final', stadium: 'MetLife Stadium' },
]

// A plausible scoreline consistent with the sampled winner. Group ties may draw;
// knockouts are forced decisive. Not model output — a broadcast-flavoured result
// around the model's real win probability (winProb).
function sampleResult(pHome, roundId) {
  const decisive = roundId !== 'group'
  const homeWins = Math.random() < pHome
  if (!decisive && Math.random() < 0.26) {
    const g = Math.floor(Math.random() * 3)
    return { home: g, away: g, outcome: 'draw' }
  }
  const winG = 1 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < 0.22 ? 1 : 0)
  const loseG = Math.floor(Math.random() * winG)
  return homeWins ? { home: winG, away: loseG, outcome: 'home' } : { home: loseG, away: winG, outcome: 'away' }
}

function TeamPicker({ label, value, exclude, onChange }) {
  return (
    <label className="sim-pick">
      <span className="sim-pick__label">{label}</span>
      <select className="sim-pick__select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="">Select a team…</option>
        {TEAMS.map((t) => (
          <option key={t} value={t} disabled={t === exclude}>
            {t}
          </option>
        ))}
      </select>
    </label>
  )
}

function ResultCard({ result }) {
  const { home, away, score, pHome, round, venue } = result
  const hm = teamMeta(home)
  const am = teamMeta(away)
  const homePct = Math.round(pHome * 100)
  const awayPct = 100 - homePct
  const winName = score.outcome === 'home' ? home : score.outcome === 'away' ? away : null
  return (
    <section className="sim-result" aria-live="polite">
      <p className="sim-result__round">{round.label} · {venue.city}</p>
      <div className="sim-result__score">
        <Side name={home} meta={hm} goals={score.home} win={score.outcome === 'home'} dim={score.outcome === 'away'} />
        <span className="sim-result__dash" aria-hidden="true">–</span>
        <Side name={away} meta={am} goals={score.away} win={score.outcome === 'away'} dim={score.outcome === 'home'} align="right" />
      </div>
      <p className="sim-result__verdict">
        {winName ? <><span className="display">{winName}</span> advance</> : 'Level — honours even'}
      </p>
      <div className="sim-result__prob" role="img" aria-label={`Win probability — ${hm.code} ${homePct}%, ${am.code} ${awayPct}%.`}>
        <span className="sim-result__prob-label">Model win probability</span>
        <div className="sim-result__bar">
          <span className="sim-result__seg sim-result__seg--home" style={{ flexGrow: Math.max(homePct, 1) }}>
            {homePct >= 16 && <span className="tnum">{homePct}%</span>}
          </span>
          <span className="sim-result__seg sim-result__seg--away" style={{ flexGrow: Math.max(awayPct, 1) }}>
            {awayPct >= 16 && <span className="tnum">{awayPct}%</span>}
          </span>
        </div>
      </div>
    </section>
  )
}

function Side({ name, meta, goals, win, dim, align }) {
  const flag = flagUrl(meta.iso)
  return (
    <div className={`sim-side${align === 'right' ? ' sim-side--right' : ''}${dim ? ' is-dim' : ''}`}>
      <span className="sim-side__team">
        {flag && <img className="sim-side__flag" src={flag} alt="" width="26" height="19" />}
        <span className="sim-side__name display">{name}</span>
      </span>
      <span className={`sim-side__goals display tnum${win ? ' is-win' : ''}`}>{goals}</span>
    </div>
  )
}

export default function Simulator() {
  const [home, setHome] = useState('Argentina')
  const [away, setAway] = useState('France')
  const [roundId, setRoundId] = useState('final')
  const [phase, setPhase] = useState('idle') // idle | flying | result
  const [flight, setFlight] = useState(null)
  const [result, setResult] = useState(null)
  const [emblem, setEmblem] = useState(null)
  const lastHost = useRef(null)
  const pending = useRef(null)
  const leg = useRef(0)

  const round = ROUNDS.find((r) => r.id === roundId)
  const canSim = home && away && home !== away

  const markers = useMemo(() => {
    const stad = STADIUMS[round.stadium]
    const ms = []
    if (home) ms.push({ name: home, lat: TEAM_COORDINATES[home][0], lng: TEAM_COORDINATES[home][1], code: teamMeta(home).code, hot: true })
    if (away) ms.push({ name: away, lat: TEAM_COORDINATES[away][0], lng: TEAM_COORDINATES[away][1], code: teamMeta(away).code, hot: true })
    ms.push({ name: stad.hostCity, lat: stad.lat, lng: stad.lng })
    return ms
  }, [home, away, round])

  const simulate = () => {
    if (!canSim) return
    const stad = STADIUMS[round.stadium]
    const pHome = winProb(home, away, stad.country)
    const score = sampleResult(pHome, roundId)
    pending.current = { home, away, score, pHome, round, venue: stad }
    setResult(null)
    setEmblem(null)
    lastHost.current = null
    leg.current = 0
    setPhase('flying')
    setFlight({ id: Date.now(), from: TEAM_COORDINATES[home], to: [stad.lat, stad.lng] })
  }

  const onFlightComplete = () => {
    const stad = pending.current.venue
    if (leg.current === 0) {
      leg.current = 1
      lastHost.current = null
      setFlight({ id: Date.now() + 1, from: TEAM_COORDINATES[away], to: [stad.lat, stad.lng] })
    } else {
      setResult(pending.current)
      setPhase('result')
    }
  }

  const onProgress = ({ host }) => {
    if (host && host !== lastHost.current) {
      lastHost.current = host
      setEmblem({ code: host, id: Date.now() })
    } else if (!host) {
      lastHost.current = null
    }
  }

  return (
    <div className="sim">
      <header className="sim__intro">
        <h1 className="sim__title display">Matchup Sandbox</h1>
        <p className="sim__sub">
          Pick any two of the 48 nations and a round, then watch them fly in and the model call the tie. A standalone
          what-if — it never changes the real bracket.
        </p>
      </header>

      <form
        className="sim__panel"
        onSubmit={(e) => {
          e.preventDefault()
          simulate()
        }}
      >
        <TeamPicker label="Team A" value={home} exclude={away} onChange={setHome} />
        <span className="sim__vs" aria-hidden="true">vs</span>
        <TeamPicker label="Team B" value={away} exclude={home} onChange={setAway} />
        <label className="sim-pick">
          <span className="sim-pick__label">Round</span>
          <select className="sim-pick__select" value={roundId} onChange={(e) => setRoundId(e.target.value)} aria-label="Round">
            {ROUNDS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
        <button className="sim__go" type="submit" disabled={!canSim || phase === 'flying'}>
          {phase === 'flying' ? 'In flight…' : 'Simulate'}
        </button>
      </form>

      <div className="sim__stage">
        <GlobeHero
          mode="flight"
          markers={markers}
          flight={flight}
          onFlightProgress={onProgress}
          onFlightComplete={onFlightComplete}
          ariaLabel="Match flight globe"
        />
      </div>

      {phase === 'result' && result && <ResultCard result={result} />}
      {emblem && <CountryEmblem key={emblem.id} country={emblem.code} onDone={() => setEmblem(null)} />}
    </div>
  )
}
