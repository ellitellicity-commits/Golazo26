// Broadcast-flavoured full match stats for the Matchup sim (B4).
//
// The sim is a hypothetical tie, so there is no real box score to fetch (unlike
// MatchStatsPanel, which pulls ESPN data for actual fixtures). This generates a
// plausible, internally-consistent stat line around the sampled scoreline and
// the model's win probability — possession/shots skew toward the stronger side,
// shots-on-target never fall below goals, Man of the Match comes from the
// winner's real squad. Flavour, not model output — same spirit as sampleResult.

import squads from '../data/countrySquads.json'

const SQUADS = squads.teams
const FORMATIONS = ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2', '3-4-3', '5-3-2', '4-1-4-1']

const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1))
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Man of the Match from a side's real notable players — prefer an attacker,
// since MOTM skews forward. Falls back gracefully when squad data is missing.
function manOfTheMatch(team) {
  const players = SQUADS[team]?.notablePlayers
  if (!players || !players.length) return null
  const attackers = players.filter((p) => /F|W|ST|CF/i.test(p.position) || /Forward|Wing/i.test(p.position))
  const p = pick(attackers.length ? attackers : players)
  return { name: p.name, team, position: p.position, club: p.club }
}

export function sampleMatchStats(home, away, score, pHome) {
  // Possession centred on the win probability, with noise, clamped and paired.
  let posHome = Math.round(50 + (pHome - 0.5) * 44 + (Math.random() * 10 - 5))
  posHome = Math.max(34, Math.min(66, posHome))
  const posAway = 100 - posHome

  const strong = pHome >= 0.5
  const shotsHome = randInt(strong ? 11 : 6, strong ? 22 : 15)
  const shotsAway = randInt(strong ? 5 : 10, strong ? 14 : 21)
  // On-target respects goals scored and total shots.
  const sotHome = Math.min(shotsHome, Math.max(score.home, randInt(2, 8)))
  const sotAway = Math.min(shotsAway, Math.max(score.away, randInt(2, 8)))

  const yellowsHome = randInt(0, 4)
  const yellowsAway = randInt(0, 4)
  const redHome = Math.random() < 0.06 ? 1 : 0
  const redAway = Math.random() < 0.06 ? 1 : 0

  // MOTM from the winning side; on a draw, the higher-possession side.
  const motmTeam = score.outcome === 'home' ? home : score.outcome === 'away' ? away : (posHome >= posAway ? home : away)

  return {
    formations: { home: pick(FORMATIONS), away: pick(FORMATIONS) },
    motm: manOfTheMatch(motmTeam) || manOfTheMatch(home) || manOfTheMatch(away),
    // Each row: [home, away]. Goals first so the box score leads with the score.
    rows: [
      { label: 'Goals', home: score.home, away: score.away },
      { label: 'Possession', home: posHome, away: posAway, unit: '%' },
      { label: 'Shots', home: shotsHome, away: shotsAway },
      { label: 'Shots on target', home: sotHome, away: sotAway },
      { label: 'Corners', home: randInt(2, 11), away: randInt(2, 11) },
      { label: 'Fouls', home: randInt(6, 17), away: randInt(6, 17) },
      { label: 'Offsides', home: randInt(0, 5), away: randInt(0, 5) },
      { label: 'Yellow cards', home: yellowsHome, away: yellowsAway },
      { label: 'Red cards', home: redHome, away: redAway },
      { label: 'Substitutions', home: randInt(3, 5), away: randInt(3, 5) },
    ],
  }
}
