import { useState } from 'react'
import GlobeHero from '../components/GlobeHero'
import { TEAM_COORDINATES } from '../lib/stadiumData'
import { teamMeta } from '../lib/teams'
import './Encyclopedia.css'

// Minimal Part-A harness: proves GlobeHero's interactive mode plots all 48 team
// markers and reports clicks. The sourced detail panel (rank, Elo, coach, etc.)
// and countryData.js land in Part D (via craft).
const MARKERS = Object.entries(TEAM_COORDINATES).map(([name, [lat, lng]]) => ({
  name,
  lat,
  lng,
  code: teamMeta(name).code,
}))

export default function Encyclopedia() {
  const [selected, setSelected] = useState(null)
  return (
    <div className="enc">
      <div className="enc__stage">
        <GlobeHero mode="interactive" markers={MARKERS} onCountryClick={setSelected} ariaLabel="Country atlas globe" />
      </div>
      {selected && (
        <aside className="enc__panel">
          <p className="enc__panel-name">{selected.name}</p>
        </aside>
      )}
    </div>
  )
}
