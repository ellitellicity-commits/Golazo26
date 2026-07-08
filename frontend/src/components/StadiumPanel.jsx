import StadiumModel from './StadiumModel'
import Typewriter from './Typewriter'
import './StadiumPanel.css'

// Stadium encyclopedia panel (B2) — the Matchup-tab analogue of the Atlas
// country profile. Opens when a venue marker is clicked; shows a distinct
// procedural 3D model of that stadium, a grounded blurb (Typewriter reveal, as
// in the Atlas), and sourced facts (capacity, city, opened). Mirrors the
// enc-panel layout/tokens so the two encyclopedias read as one system.

const HOST_LABEL = { US: 'United States', CA: 'Canada', MX: 'Mexico' }

function Stat({ label, value }) {
  return (
    <div className="stad-stat">
      <dt className="stad-stat__label">{label}</dt>
      <dd className="stad-stat__value tnum">{value}</dd>
    </div>
  )
}

export default function StadiumPanel({ venue, onClose }) {
  if (!venue) return null
  // `venue` carries the model params (plan/tiers/roof/tone/flags) at top level
  // alongside the facts, so it doubles as the StadiumModel spec.
  const { name, city, hostCity, country, capacity, opened, blurb } = venue
  return (
    <aside className="stad-panel" aria-label={`${name} profile`}>
      <button className="stad-panel__close" onClick={onClose} type="button" aria-label="Close venue profile">×</button>
      <header className="stad-panel__head">
        <p className="stad-panel__kicker">
          Host Venue<span className="stad-panel__nation">{HOST_LABEL[country] || country}</span>
        </p>
        <h2 className="stad-panel__name display">{name}</h2>
        <p className="stad-panel__city">{hostCity}{city !== hostCity ? ` · ${city}` : ''}</p>
      </header>

      <div className="stad-panel__stage">
        <StadiumModel spec={venue} size={240} />
      </div>

      {blurb && <Typewriter key={name} text={blurb} className="stad-panel__blurb" />}

      <dl className="stad-panel__stats">
        <Stat label="Capacity" value={capacity ? capacity.toLocaleString() : '—'} />
        <Stat label="Opened" value={opened || '—'} />
        <Stat label="City" value={hostCity} />
        <Stat label="Nation" value={country} />
      </dl>
    </aside>
  )
}
