import ChampionshipOdds from '../components/ChampionshipOdds'
import { useTournamentData } from '../lib/tournamentData'

function Odds() {
  const { odds } = useTournamentData()
  return <ChampionshipOdds odds={odds} />
}

export default Odds
