// Country profiles for the Encyclopedia (Atlas). Everything here is real, sourced
// data joined from the project's own pipeline:
//   - FIFA rank        → data/fifa_rankings.json (real 11-Jun-2026 world ranking,
//                        not seeding order; feeds group/third-place tiebreaks)
//   - Elo, record,     → data/countryProfiles.json, extracted from the model
//     confederation       pipeline's elo_ratings_wc2026.csv (latest snapshot)
//   - championship odds→ odds.json (the 10k-run Monte Carlo output)
//   - group / code / iso→ lib/teams.js
//
// Data sources (all real / honestly attributed — nothing fabricated):
//   - fifa_rank, elo, confederation, record: sourced from prior corrections
//     (fifa_rankings.json = real 11-Jun-2026 world ranking; profiles from the
//     model pipeline's elo_ratings_wc2026.csv). See git log.
//   - squad: data/countrySquads.json — real WC2026 squads, the team_id→country
//     join resolved by scripts/generate_squads.py (match_team_stats x matches_detailed).
//   - intro: data/countryIntros.json — unique, hand-written editorial blurbs (no template).
//   - history: data/countryHistory.json — one-sentence World Cup record per team,
//     grounded in each nation's "X at the FIFA World Cup" Wikipedia page + synthesis.
//   - coach: data/countryCoaches.json — current manager from the football-data.org
//     API (v4/teams/{teamId}). Teams the API had no coach for stay null → "pending".
//
// `coach` and `history` were previously null placeholders; both are now sourced.
// Any value that genuinely can't be sourced stays null and surfaces as "pending"
// in the panel rather than being invented.

import { getOdds } from './data'
import fifaRankings from '../data/fifa_rankings.json'
import profiles from '../data/countryProfiles.json'
import squads from '../data/countrySquads.json'
import intros from '../data/countryIntros.json'
import histories from '../data/countryHistory.json'
import coaches from '../data/countryCoaches.json'
import { teamMeta, flagUrl } from './teams'

const RANKS = fifaRankings.ranks
const SQUADS = squads.teams
const INTROS = intros.intros
const HISTORY = histories.history
const COACHES = coaches.coaches
const ODDS = Object.fromEntries(getOdds().teams.map((t) => [t.team, t]))

// The 48 qualified nations, in ascending real FIFA-rank order (the globe plots
// them anyway). Ranks are non-contiguous — the qualifiers sit at their true world
// positions, so the list is not a 1..48 sequence.
export const COUNTRY_NAMES = Object.keys(RANKS)

/**
 * Full profile for a team name, or null if unknown. Sourced fields are real
 * (rank, Elo, record, squad, coach, history); `intro` is editorial copy. Any
 * field a source genuinely lacks stays null and surfaces as "pending".
 */
export function getCountry(name) {
  if (!name || !RANKS[name]) return null
  const meta = teamMeta(name)
  const p = profiles[name] || null
  const o = ODDS[name] || null
  const sq = SQUADS[name] || null
  return {
    name,
    code: meta.code,
    iso: meta.iso,
    flag: flagUrl(meta.iso),
    group: meta.group,
    fifaRank: RANKS[name] ?? null,
    elo: p?.elo ?? null,
    confederation: p?.confederation ?? null,
    isHost: p?.isHost ?? false,
    championshipOdds: o?.championship_odds ?? null,
    record: p ? { w: p.w, d: p.d, l: p.l, gf: p.gf, ga: p.ga, played: p.played } : null,
    // Sourced squad data (join resolved via scripts/generate_squads.py):
    squadSize: sq?.squadSize ?? null,
    notablePlayers: sq?.notablePlayers ?? null,
    // Editorial broadcast intro copy — powers the typewriter reveal:
    intro: INTROS[name] ?? null,
    // Sourced: Wikipedia World Cup record (history) + football-data.org API (coach).
    // null when the source had none for this team → panel shows "pending".
    history: HISTORY[name] ?? null,
    coach: COACHES[name] ?? null,
  }
}
