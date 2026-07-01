// Live group standings + FIFA qualification logic, computed entirely from the
// data in fixtures.json. Nothing is hardcoded as qualified or eliminated — the
// status of every team is DERIVED from results, so this keeps working unchanged
// when fixtures.json is swapped for live API data (more completed matches just
// flip provisional statuses to final).
//
// Tiebreakers follow the 2026 FIFA regulations (see comparators below).

import { teamMeta, flagUrl } from './teams'
import { GROUP_COLOR, onColor } from './bracket'
import fifaRankings from '../data/fifa_rankings.json'

const TEAMS_PER_GROUP = 4
const MATCHES_PER_GROUP = (TEAMS_PER_GROUP * (TEAMS_PER_GROUP - 1)) / 2 // round-robin = 6
const GROUP_MATCHES_PER_TEAM = TEAMS_PER_GROUP - 1 // 3
const AUTO_SLOTS = 2 // top two of each group qualify directly
const THIRD_PLACE_SLOTS = 8 // best 8 of the 12 third-placed teams advance

// Lower FIFA rank number = stronger; unranked teams sort last on this criterion.
function fifaRank(name) {
  const r = fifaRankings.ranks?.[name]
  return typeof r === 'number' ? r : Number.POSITIVE_INFINITY
}

// Fair-play / conduct penalty for one team in one match. Lower is better. Reads
// disciplinary fields from the result if a data source provides them (several
// likely shapes supported) and contributes 0 when no card data is present, so
// this criterion is simply skipped until the data carries cards.
function matchConduct(result, side) {
  if (!result) return 0
  const d = result.discipline?.[side] || {}
  const yellow = result[`${side}_yellow`] ?? result[`${side}_yellow_cards`] ?? d.yellow ?? 0
  const secondYellow = result[`${side}_second_yellow`] ?? d.secondYellow ?? 0
  const red = result[`${side}_red`] ?? result[`${side}_red_cards`] ?? d.red ?? 0
  // FIFA fair-play deductions: yellow −1, second-yellow red −3, direct red −4.
  return yellow * 1 + secondYellow * 3 + red * 4
}

function blankRow(side) {
  const meta = teamMeta(side.name)
  return {
    name: side.name,
    code: side.code || meta.code,
    iso: meta.iso,
    flag: flagUrl(meta.iso),
    p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0,
    conduct: 0,
    fifa: fifaRank(side.name),
  }
}

// Accumulate group-stage record for every team, keep the contributing matches
// per group (head-to-head needs them). `scoreOf(fixture)` returns the result to
// count, or null to skip — the real table counts completed results only; the
// simulator also counts a sampled score for each remaining fixture.
function buildGroups(scoreOf, fixtures) {
  const groups = {}
  for (const f of fixtures) {
    const letter = f.group
    if (!letter) continue
    const g = (groups[letter] ||= { letter, teams: {}, matches: [] })
    g.teams[f.home.name] ||= blankRow(f.home)
    g.teams[f.away.name] ||= blankRow(f.away)

    const result = scoreOf(f)
    if (!result) continue
    g.matches.push({ home: f.home, away: f.away, result })
    const home = g.teams[f.home.name]
    const away = g.teams[f.away.name]
    const hs = result.home_score
    const as = result.away_score
    home.p++; away.p++
    home.gf += hs; home.ga += as
    away.gf += as; away.ga += hs
    home.conduct += matchConduct(result, 'home')
    away.conduct += matchConduct(result, 'away')
    if (hs > as) { home.w++; home.pts += 3; away.l++ }
    else if (hs < as) { away.w++; away.pts += 3; home.l++ }
    else { home.d++; away.d++; home.pts++; away.pts++ }
  }
  for (const g of Object.values(groups)) {
    for (const t of Object.values(g.teams)) t.gd = t.gf - t.ga
  }
  return groups
}

// Score providers. Real: completed results only. Sim: completed results, plus a
// sampled scoreline for every not-yet-played fixture (from the model's own
// outcome probabilities), so each run produces a different but plausible table.
const realScoreOf = (f) => (f.status === 'completed' && f.result ? f.result : null)
const simScoreOf = (f) => (f.status === 'completed' && f.result ? f.result : simulateScore(f))

function pick(weights) {
  const total = weights.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [v, w] of weights) {
    if ((r -= w) <= 0) return v
  }
  return weights[weights.length - 1][0]
}

// Sample a plausible scoreline consistent with the fixture's predicted outcome.
function simulateScore(f) {
  const p = f.prediction || { home_win: 0.4, draw: 0.3, away_win: 0.3 }
  const r = Math.random()
  if (r < p.draw) {
    const d = pick([[0, 0.32], [1, 0.42], [2, 0.20], [3, 0.06]])
    return { home_score: d, away_score: d }
  }
  const homeWins = r < p.draw + p.home_win
  const win = pick([[1, 0.30], [2, 0.34], [3, 0.22], [4, 0.10], [5, 0.04]])
  let lose = pick([[0, 0.46], [1, 0.33], [2, 0.15], [3, 0.06]])
  if (lose >= win) lose = win - 1
  return homeWins
    ? { home_score: win, away_score: lose }
    : { home_score: lose, away_score: win }
}

// Head-to-head mini-table among exactly the tied teams (completed matches only).
function headToHead(tiedNames, matches) {
  const h = {}
  for (const name of tiedNames) h[name] = { pts: 0, gf: 0, ga: 0 }
  for (const m of matches) {
    if (!h[m.home.name] || !h[m.away.name]) continue // both must be in the tied set
    const hs = m.result.home_score
    const as = m.result.away_score
    h[m.home.name].gf += hs; h[m.home.name].ga += as
    h[m.away.name].gf += as; h[m.away.name].ga += hs
    if (hs > as) h[m.home.name].pts += 3
    else if (hs < as) h[m.away.name].pts += 3
    else { h[m.home.name].pts++; h[m.away.name].pts++ }
  }
  for (const name of tiedNames) h[name].gd = h[name].gf - h[name].ga
  return h
}

// Within-group order. Teams level on overall points are separated by the FIFA
// chain: head-to-head (points → GD → goals among the tied teams), then overall
// GD → overall goals → conduct → FIFA ranking. Name is the final deterministic
// fallback in place of the regulations' drawing of lots.
function rankGroup(g) {
  const rows = Object.values(g.teams).map((r) => ({ ...r }))
  rows.sort((a, b) => b.pts - a.pts)

  const ordered = []
  for (let i = 0; i < rows.length; ) {
    let j = i
    while (j + 1 < rows.length && rows[j + 1].pts === rows[i].pts) j++
    const cluster = rows.slice(i, j + 1)
    if (cluster.length === 1) {
      ordered.push(cluster[0])
    } else {
      const h2h = headToHead(cluster.map((t) => t.name), g.matches)
      cluster.sort((x, y) => {
        const hx = h2h[x.name]
        const hy = h2h[y.name]
        return (
          hy.pts - hx.pts ||        // 1. head-to-head points
          hy.gd - hx.gd ||          // 2. head-to-head goal difference
          hy.gf - hx.gf ||          // 3. head-to-head goals scored
          y.gd - x.gd ||            // 4. overall goal difference
          y.gf - x.gf ||            // 5. overall goals scored
          x.conduct - y.conduct ||  // 6. conduct (fewer card points first)
          x.fifa - y.fifa ||        // 7. FIFA World Ranking
          x.name.localeCompare(y.name)
        )
      })
      ordered.push(...cluster)
    }
    i = j + 1
  }
  return ordered.map((row, idx) => ({ ...row, position: idx + 1 }))
}

// Cross-group ranking of the twelve third-placed teams. No head-to-head (they
// come from different groups) — full group record only.
function rankThirdPlace(thirds) {
  return [...thirds].sort(
    (x, y) =>
      y.pts - x.pts ||         // 1. points
      y.gd - x.gd ||           // 2. goal difference
      y.gf - x.gf ||           // 3. goals scored
      x.conduct - y.conduct || // 4. conduct
      x.fifa - y.fifa ||       // 5. FIFA World Ranking
      x.name.localeCompare(y.name),
  )
}

// Rank every group and build the cross-group third-place table from a given
// score provider. The shared core behind both the live table and the simulator.
function rankAll(scoreOf, fixtures) {
  const groups = buildGroups(scoreOf, fixtures)
  const ranked = Object.keys(groups)
    .sort()
    .map((letter) => ({ letter, rows: rankGroup(groups[letter]) }))

  const thirds = ranked
    .map((g) => (g.rows[AUTO_SLOTS] ? { ...g.rows[AUTO_SLOTS], group: g.letter } : null))
    .filter(Boolean)
  const thirdTable = rankThirdPlace(thirds).map((row, idx) => ({
    ...row,
    thirdRank: idx + 1,
    qualified: idx < THIRD_PLACE_SLOTS,
  }))
  return { ranked, thirdTable }
}

// The live view: stamps each row with its qualification status.
//   q     — top two: qualified for the Round of 32
//   q3in  — third place, currently inside the best-8 cut: provisionally through
//   q3out — third place, currently outside the cut: provisionally out
//   out   — fourth place: eliminated
function compute(fixtures) {
  const { ranked, thirdTable } = rankAll(realScoreOf, fixtures)
  const thirdStatusByGroup = Object.fromEntries(
    thirdTable.map((t) => [t.group, { thirdRank: t.thirdRank, qualified: t.qualified }]),
  )

  const groupsOut = ranked.map((g) => {
    const played = g.rows.reduce((n, r) => n + r.p, 0) / 2
    const rows = g.rows.map((r) => {
      let status = 'out'
      if (r.position <= AUTO_SLOTS) status = 'q'
      else if (r.position === AUTO_SLOTS + 1) {
        status = thirdStatusByGroup[g.letter]?.qualified ? 'q3in' : 'q3out'
      }
      return { ...r, status, thirdRank: r.position === AUTO_SLOTS + 1 ? thirdStatusByGroup[g.letter]?.thirdRank : null }
    })
    return {
      letter: g.letter,
      color: GROUP_COLOR[g.letter] || '#35c26d',
      textColor: onColor(GROUP_COLOR[g.letter] || '#35c26d'),
      rows,
      played,
      total: MATCHES_PER_GROUP,
    }
  })

  const groupStageComplete = thirdTable.every((t) => t.p === GROUP_MATCHES_PER_TEAM)

  return { groups: groupsOut, thirdTable, groupStageComplete }
}

// Memoised by fixtures-object identity. The loaded fixtures are stable for a
// session (one object from loadFixtures), so this recomputes once when the data
// resolves — but re-derives correctly if a different fixtures set is passed
// (e.g. static → live).
let _cache = null
let _cacheFor = null
function data(fixturesData) {
  if (_cacheFor !== fixturesData) {
    _cache = compute(fixturesData.fixtures)
    _cacheFor = fixturesData
  }
  return _cache
}

export function getGroupStandings(fixturesData) {
  return data(fixturesData).groups
}

/** @returns {{rows:object[], slots:number, complete:boolean}} the third-place race */
export function getThirdPlaceRace(fixturesData) {
  const { thirdTable, groupStageComplete } = data(fixturesData)
  return { rows: thirdTable, slots: THIRD_PLACE_SLOTS, complete: groupStageComplete }
}

export const QUALIFY_SLOTS = AUTO_SLOTS
export const THIRD_PLACE_QUALIFIERS = THIRD_PLACE_SLOTS

/**
 * One Monte Carlo realisation of how the group stage finishes: real results
 * stand, every remaining fixture is sampled, then the FIFA tiebreakers decide
 * each group and the third-place race. Returns the 32 qualifiers by slot —
 * different teams and seeds essentially every run.
 * @returns {{winners:Object<string,string>, runners:Object<string,string>, thirdsRanked:string[]}}
 */
export function simulateGroupQualifiers(fixturesData) {
  const { ranked, thirdTable } = rankAll(simScoreOf, fixturesData.fixtures)
  const winners = {}
  const runners = {}
  for (const g of ranked) {
    winners[g.letter] = g.rows[0].name
    runners[g.letter] = g.rows[1].name
  }
  return { winners, runners, thirdsRanked: thirdTable.map((t) => t.name) }
}
