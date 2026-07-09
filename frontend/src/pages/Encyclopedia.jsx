import { useMemo, useState } from 'react'
import GlobeHero from '../components/GlobeHero'
import Typewriter from '../components/Typewriter'
import HostMascot from '../components/HostMascot'
import ProvinceStateSubMap from '../components/ProvinceStateSubMap'
import TabHeader from '../components/TabHeader'
import { TEAM_COORDINATES } from '../lib/stadiumData'
import { getCountry, COUNTRY_NAMES } from '../lib/countryData'
import { teamMeta, flagUrl } from '../lib/teams'
import countryShapesRaw from '../data/countryShapes.json'
import './Encyclopedia.css'

const NAMES_SORTED = [...COUNTRY_NAMES].sort()

// Real boundary polygons (Natural Earth, baked in scripts/generate_country_shapes.mjs)
// joined with each nation's flag URL - drives the hover flag-fill on the globe.
const COUNTRY_SHAPES = Object.fromEntries(
  Object.entries(countryShapesRaw).map(([name, s]) => [name, { ...s, flag: flagUrl(teamMeta(name).iso) }]),
)

// The three 2026 hosts wear their national colour on the globe (B3) - the
// host-identity treatment (see DESIGN note in commit): US blue, Canada red,
// Mexico green, matched to lib/teams roles.
const HOST_TINTS = { Canada: 0xed4a49, 'United States': 0x439bf7, Mexico: 0x35c26d }
const HOST_ISO = new Set(['us', 'ca', 'mx']) // the three 2026 hosts, by ISO alpha-2

// Camera fly-to targets for the three hosts (Part 1c) - each nation's centroid
// and a zoom framing that fills the globe with the host without clipping it.
const HOST_COORDS = {
  ca: { lat: 56.1, lng: -106.3, zoom: 1.9 },
  us: { lat: 39.5, lng: -98.3, zoom: 1.9 },
  mx: { lat: 23.6, lng: -102.5, zoom: 2.0 },
}

// The Atlas - an interactive globe of the 48 qualified nations. Click a marker to
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
// finishes - a staggered two-line broadcast reveal rather than two racing at once.
function typeMs(text) {
  if (!text) return 0
  return 160 + text.length * Math.max(9, Math.min(22, 1500 / text.length))
}

function Panel({ country, onClose }) {
  const c = country
  const odds = c.championshipOdds != null ? `${(c.championshipOdds * 100).toFixed(1)}%` : '-'
  const rec = c.record
  const winPct = rec && rec.played ? Math.round((rec.w / rec.played) * 100) : null
  const historyDelay = c.intro ? Math.round(typeMs(c.intro) + 140) : 160
  // Fun facts type in after the intro + history have finished, one after another,
  // so the whole brief reads as a single broadcast sequence rather than a race.
  let factAcc = historyDelay + (c.history ? typeMs(c.history) : 0) + 160
  const factDelays = (c.funFacts || []).map((f) => {
    const d = Math.round(factAcc)
    factAcc += typeMs(f) + 120
    return d
  })
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

      {c.funFacts && c.funFacts.length > 0 && (
        <div className="enc-panel__facts">
          <p className="enc-panel__facts-label">⚡ Did you know</p>
          <ul className="enc-facts">
            {c.funFacts.map((f, i) => (
              <li className="enc-facts__item" key={i}>
                <span className="enc-facts__bullet" aria-hidden="true" />
                <Typewriter key={`${c.name}-fact-${i}`} text={f} className="enc-facts__text" startDelay={factDelays[i]} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.iso && HOST_ISO.has(c.iso) && <ProvinceStateSubMap code={c.iso.toUpperCase()} />}

      <dl className="enc-panel__stats">
        <Stat label="FIFA Rank" value={c.fifaRank != null ? `#${c.fifaRank}` : '-'} />
        <Stat label="Elo Rating" value={c.elo != null ? c.elo : '-'} />
        <Stat label="Group" value={c.group || '-'} />
        <Stat label="Confederation" value={c.confederation || '-'} />
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

const HOST_COLOURS = { ca: '#ed4a49', us: '#439bf7', mx: '#35c26d' }

export default function Encyclopedia() {
  const [selected, setSelected] = useState(null)
  // A host runs the guided tour before its panel opens; `tourDone` gates the panel
  // and resets whenever a different nation is chosen.
  const [tourDone, setTourDone] = useState(false)
  const country = useMemo(() => (selected ? getCountry(selected) : null), [selected])

  const isHost = !!(country?.iso && HOST_ISO.has(country.iso))
  const hostColour = country?.iso ? HOST_COLOURS[country.iso] : null

  const choose = (name) => {
    setTourDone(false)
    setSelected(name)
  }
  const close = () => {
    setSelected(null)
    setTourDone(false)
  }

  // A host nation flies the camera in (Part 1c); the 45 others just open the
  // panel over the still-rotating globe. `focus` identity changes per host so the
  // GlobeHero effect re-fires; null settles the camera home.
  const focus = useMemo(() => {
    const iso = country?.iso
    return iso && HOST_COORDS[iso] ? { id: iso, ...HOST_COORDS[iso] } : null
  }, [country])

  // Panel opens immediately for the 45 non-hosts; a host holds it back until the
  // mascot's guided tour hands off (onExplore → tourDone).
  const showPanel = !!country && (!isHost || tourDone)

  return (
    <div className="enc">
      <TabHeader
        titleId="enc-title"
        title="The Atlas"
        description="48 nations. One tournament. Spin the globe and tap any country to explore their story, squad, and odds of going all the way."
      >
        <label className="enc__jump">
          <span className="enc__jump-label">Jump to a nation</span>
          <select
            className="enc__jump-select"
            value={selected || ''}
            onChange={(e) => choose(e.target.value || null)}
            aria-label="Jump to a nation"
          >
            <option value="">Choose…</option>
            {NAMES_SORTED.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </TabHeader>
      <div
        className={`enc__stage${showPanel ? ' enc__stage--panel' : ''}`}
        style={hostColour ? { '--host-colour': hostColour } : undefined}
      >
        <GlobeHero mode="interactive" markers={MARKERS} countryShapes={COUNTRY_SHAPES} hostTints={HOST_TINTS} focus={focus} onCountryClick={(m) => choose(m.name)} ariaLabel="Country atlas globe" />
        {!country && <p className="enc__hint" aria-hidden="true">Tap a marker</p>}
        {/* Host mascot stays mounted for the whole selection: it runs the guided
            tour, then drops into idle (onExplore) beside the open panel. */}
        {isHost && (
          <HostMascot key={country.iso} iso={country.iso} variant="tour" onExplore={() => setTourDone(true)} />
        )}
        {showPanel && <Panel country={country} onClose={close} />}
      </div>
    </div>
  )
}
