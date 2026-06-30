import ChampionshipOdds from '../components/ChampionshipOdds'
import oddsData from '../data/odds.json'

function Odds() {
  return <ChampionshipOdds odds={oddsData} />
}

export default Odds
