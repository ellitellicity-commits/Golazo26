import { useState } from 'react'
import GlobeHero from '../components/GlobeHero'
import { TEAM_COORDINATES, STADIUMS } from '../lib/stadiumData'
import { teamMeta } from '../lib/teams'
import './Simulator.css'

// Minimal Part-A harness: proves GlobeHero flies a real great-circle arc between
// two team origins and a host stadium. The full team/round selector + result
// panel land in Part C (via craft).
const AR = TEAM_COORDINATES['Argentina']
const STAD = STADIUMS['MetLife Stadium']

export default function Simulator() {
  const [flight, setFlight] = useState(null)
  const [arrived, setArrived] = useState(false)
  const markers = [
    { name: 'Argentina', lat: AR[0], lng: AR[1], code: teamMeta('Argentina').code, hot: true },
    { name: 'MetLife Stadium', lat: STAD.lat, lng: STAD.lng, hot: true },
  ]
  const fly = () => {
    setArrived(false)
    setFlight({ id: Date.now(), from: AR, to: [STAD.lat, STAD.lng] })
  }

  return (
    <div className="sim">
      <div className="sim__stage">
        <GlobeHero
          mode="flight"
          markers={markers}
          flight={flight}
          onFlightComplete={() => setArrived(true)}
          ariaLabel="Match flight globe"
        />
      </div>
      <button className="sim__btn" onClick={fly} type="button">Fly to the match</button>
      <p className="sim__status" data-arrived={arrived}>{arrived ? 'Arrived' : ''}</p>
    </div>
  )
}
