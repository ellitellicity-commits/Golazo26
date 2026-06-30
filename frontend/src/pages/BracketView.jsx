import { useSearchParams } from 'react-router-dom'
import Bracket from '../components/Bracket'
import { getGroups } from '../lib/bracket'

const groups = getGroups()

function BracketView() {
  const [params] = useSearchParams()
  // /bracket?sim=1 — arrive in Simulate mode and run one play-out (the Groups
  // view's "Simulate from here" shortcut).
  const sim = params.get('sim') === '1'
  return <Bracket groups={groups} initialMode={sim ? 'simulate' : 'live'} autoSimulate={sim} />
}

export default BracketView
