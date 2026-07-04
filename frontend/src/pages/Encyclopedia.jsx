import { useMemo, useState } from 'react'
import GlobeHero from '../components/GlobeHero'
import Typewriter from '../components/Typewriter'
import { TEAM_COORDINATES } from '../lib/stadiumData'
import { getCountry, COUNTRY_NAMES } from '../lib/countryData'
import { teamMeta } from '../lib/teams'
import './Encyclopedia.css'

const NAMES_SORTED = [...COUNTRY_NAMES].sort()

// The Atlas — an interactive globe of the 48 qualified nations. Click a marker to
// open that nation's profile: real sourced data (FIFA rank, Elo, group,
// confederation, championship odds, all-time record, squad). An editorial intro
// blurb reveals with a typewriter effect. Coach / history stay flagged as pending
// rather than invented (see lib/countryData.js).
const MARKERS = Object.entries(TEAM_COORDINATES).map(([name, [lat, lng]]) => ({
  name,
  lat,
  lng,
  code: teamMeta(name).code,
}))

function Stat({ label, value, accent }) {
  return (
    <div className={`enc-stat${accent ? ' enc-stat--accent' : ''}`}>
      <dt className="enc-stat__label">{label}</dt>
      <dd className="enc-stat__value tnum">{value}</dd>
    </div>
  )
}

// Match the Typewriter's own cadence so the history line begins just as the intro
// finishes — a staggered two-line broadcast reveal rather than two racing at once.
function typeMs(text) {
  if (!text) return 0
  return 160 + text.length * Math.max(9, Math.min(22, 1500 / text.length))
}

function Panel({ country, onClose }) {
  const c = country
  const odds = c.championshipOdds != null ? `${(c.championshipOdds * 100).toFixed(1)}%` : '—'
  const rec = c.record
  const winPct = rec && rec.played ? Math.round((rec.w / rec.played) * 100) : null
  const historyDelay = c.intro ? Math.round(typeMs(c.intro) + 140) : 160
  return (
    <aside className="enc-panel" aria-label={`${c.name} profile`}>
      <button className="enc-panel__close" onClick={onClose} type="button" aria-label="Close profile">×</button>
      <header className="enc-panel__head">
        {c.flag && <img className="enc-panel__flag" src={c.flag} alt="" width="44" height="33" />}
        <div>
          <p className="enc-panel__code">{c.code}{c.isHost && <span className="enc-panel__host">Host</span>}</p>
          <h2 className="enc-panel__name display">{c.name}</h2>
        </div>
      </header>

      {(c.intro || c.history) && (
        <div className="enc-panel__brief">
          {c.intro && <Typewriter key={`${c.name}-intro`} text={c.intro} className="enc-panel__intro" />}
          {c.history && (
            <Typewriter key={`${c.name}-history`} text={c.history} className="enc-panel__history" startDelay={historyDelay} />
          )}
        </div>
      )}

      <dl className="enc-panel__stats">
        <Stat label="FIFA Rank" value={c.fifaRank != null ? `#${c.fifaRank}` : '—'} />
        <Stat label="Elo Rating" value={c.elo != null ? c.elo : '—'} />
        <Stat label="Group" value={c.group || '—'} />
        <Stat label="Confederation" value={c.confederation || '—'} />
        <Stat label="Title Odds" value={odds} accent />
      </dl>

      <div className="enc-panel__coach">
        <span className="enc-panel__record-title">Head Coach</span>
        {c.coach ? (
          <span className="enc-panel__coach-name">{c.coach}</span>
        ) : (
          <span className="enc-panel__coach-pending">Data sourcing pending</span>
        )}
      </div>

      {rec && (
        <div className="enc-panel__record">
          <p className="enc-panel__record-title">All-time record · {rec.played} played</p>
          <div className="enc-panel__wdl" role="img" aria-label={`${rec.w} wins, ${rec.d} draws, ${rec.l} losses.`}>
            <span className="enc-wdl enc-wdl--w" style={{ flexGrow: Math.max(rec.w, 1) }}><span className="tnum">{rec.w}</span>W</span>
            <span className="enc-wdl enc-wdl--d" style={{ flexGrow: Math.max(rec.d, 1) }}><span className="tnum">{rec.d}</span>D</span>
            <span className="enc-wdl enc-wdl--l" style={{ flexGrow: Math.max(rec.l, 1) }}><span className="tnum">{rec.l}</span>L</span>
          </div>
          <p className="enc-panel__record-meta">
            <span className="tnum">{rec.gf}</span> for · <span className="tnum">{rec.ga}</span> against
            {winPct != null && <> · <span className="tnum">{winPct}%</span> win rate</>}
          </p>
        </div>
      )}

      {c.notablePlayers && c.notablePlayers.length > 0 && (
        <div className="enc-panel__squad">
          <p className="enc-panel__record-title">
            Notable players{c.squadSize ? <> · <span className="tnum">{c.squadSize}</span>-man squad</> : null}
          </p>
          <ul className="enc-squad">
            {c.notablePlayers.map((p) => (
              <li className="enc-squad__row" key={p.name}>
                <span className="enc-squad__pos">{p.position}</span>
                <span className="enc-squad__name">{p.name}</span>
                <span className="enc-squad__meta">
                  <span className="enc-squad__club">{p.club}</span>
                  <span className="enc-squad__caps tnum">{p.caps} caps{p.goals ? ` · ${p.goals} g` : ''}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </aside>
  )
}

export default function Encyclopedia() {
  const [selected, setSelected] = useState(null)
  const country = useMemo(() => (selected ? getCountry(selected) : null), [selected])

  return (
    <div className="enc">
      <header className="enc__intro">
        <div>
          <h1 className="enc__title display">The Atlas</h1>
          <p className="enc__sub">All 48 nations on one globe. Spin it and tap a marker, or jump straight to a nation.</p>
        </div>
        <label className="enc__jump">
          <span className="enc__jump-label">Jump to a nation</span>
          <select
            className="enc__jump-select"
            value={selected || ''}
            onChange={(e) => setSelected(e.target.value || null)}
            aria-label="Jump to a nation"
          >
            <option value="">Choose…</option>
            {NAMES_SORTED.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </header>
      <div className="enc__stage">
        <GlobeHero mode="interactive" markers={MARKERS} onCountryClick={(m) => setSelected(m.name)} ariaLabel="Country atlas globe" />
        {!country && <p className="enc__hint" aria-hidden="true">Tap a marker</p>}
        {country && <Panel country={country} onClose={() => setSelected(null)} />}
      </div>
    </div>
  )
}
