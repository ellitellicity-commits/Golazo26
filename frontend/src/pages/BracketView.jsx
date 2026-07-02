import Bracket from '../components/Bracket'
import { getGroups } from '../lib/bracket'

const groups = getGroups()

function BracketView() {
  return <Bracket groups={groups} />
}

export default BracketView
