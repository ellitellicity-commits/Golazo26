// "Run Your Own Simulation" engine. Plays the group stage forward from the real
// results, derives the 32 qualifiers with full FIFA tiebreakers, seeds them into
// the Round-of-32 slots, then plays the knockout bracket to a champion. Every
// run produces different qualifiers in different seeded positions.

import bracketData from '../data/bracket.json'
import { getOdds } from './data'
import { teamMeta } from './teams'
import { simulateKnockout } from './bracket'
import { simulateGroupQualifiers } from './standings'

const ODDS = Object.fromEntries(getOdds().teams.map((t) => [t.team, t.championship_odds]))
const groupOf = (name) => teamMeta(name).group

// --- R32 slot template -----------------------------------------------------
// The locked bracket lists concrete default qualifiers; we relabel each slot by
// its group role so any run's qualifiers can be dropped in. Within a group's
// default representatives, strength (title odds) orders winner → runner-up →
// third. The eight third-place slots are labelled T1..T8 by strength, and filled
// each run by that run's eight best third-placed teams (in rank order), since
// which groups' thirds advance changes from run to run.
function buildTemplate() {
  const repsByGroup = {}
  for (const m of bracketData.r32) {
    for (const name of [m.home, m.away]) {
      const g = groupOf(name)
      ;(repsByGroup[g] ||= new Set()).add(name)
    }
  }

  const slotOfTeam = {}
  const defaultThirds = []
  for (const g of Object.keys(repsByGroup)) {
    const reps = [...repsByGroup[g]].sort((a, b) => (ODDS[b] || 0) - (ODDS[a] || 0))
    slotOfTeam[reps[0]] = `1${g}`
    if (reps[1]) slotOfTeam[reps[1]] = `2${g}`
    if (reps[2]) defaultThirds.push(reps[2])
  }
  defaultThirds
    .sort((a, b) => (ODDS[b] || 0) - (ODDS[a] || 0))
    .forEach((name, i) => (slotOfTeam[name] = `T${i + 1}`))

  return bracketData.r32.map((m) => ({
    id: m.id,
    venue: m.venue,
    date: m.date,
    kickoff: m.kickoff,
    homeSlot: slotOfTeam[m.home],
    awaySlot: slotOfTeam[m.away],
  }))
}

const R32_TEMPLATE = buildTemplate()

// Two teams from the same group can't meet in the R32. Only the third-place
// slots are flexible, so resolve any same-group clash by swapping the offending
// third into another T-slot match where it doesn't clash.
function resolveSameGroupClashes(matches) {
  const isClash = (m) => groupOf(m.home) === groupOf(m.away)
  const tIndexes = matches.map((m, i) => (m.awayIsThird || m.homeIsThird ? i : -1)).filter((i) => i >= 0)
  for (const i of matches.keys()) {
    if (!isClash(matches[i])) continue
    for (const j of tIndexes) {
      if (j === i) continue
      const a = matches[i]
      const b = matches[j]
      const aKey = a.awayIsThird ? 'away' : 'home'
      const bKey = b.awayIsThird ? 'away' : 'home'
      const swapped = { ...a, [aKey]: b[bKey] }
      const swappedB = { ...b, [bKey]: a[aKey] }
      if (!isClash(swapped) && !isClash(swappedB)) {
        matches[i] = swapped
        matches[j] = swappedB
        break
      }
    }
  }
  return matches.map((m) => ({
    id: m.id,
    venue: m.venue,
    date: m.date,
    kickoff: m.kickoff,
    status: m.status,
    result: m.result,
    home: m.home,
    away: m.away,
  }))
}

/**
 * @returns {{ r32: object[], results: Object<number,object> }}
 *   r32: the seeded R32 matchups ({id, home, away, venue, date, kickoff, status})
 *   results: winner/loser for every knockout match id (R32 → final + third)
 */
export function runFullSimulation(fixturesData) {
  const { winners, runners, thirdsRanked } = simulateGroupQualifiers(fixturesData)
  const slotToTeam = {}
  for (const g of Object.keys(winners)) slotToTeam[`1${g}`] = winners[g]
  for (const g of Object.keys(runners)) slotToTeam[`2${g}`] = runners[g]
  thirdsRanked.slice(0, 8).forEach((name, i) => (slotToTeam[`T${i + 1}`] = name))

  let r32 = R32_TEMPLATE.map((s) => ({
    id: s.id,
    venue: s.venue,
    date: s.date,
    kickoff: s.kickoff,
    status: 'scheduled',
    result: null,
    home: slotToTeam[s.homeSlot],
    away: slotToTeam[s.awaySlot],
    homeIsThird: s.homeSlot.startsWith('T'),
    awayIsThird: s.awaySlot.startsWith('T'),
  }))
  r32 = resolveSameGroupClashes(r32)

  const results = simulateKnockout(r32)
  return { r32, results }
}
