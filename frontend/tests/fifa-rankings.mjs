#!/usr/bin/env node
// Regression guard: FIFA ranking data must be REAL published world-ranking
// positions, never qualification/seeding order (session brief, Part 1).
//
// The original bug: fifa_rankings.json held a compressed, contiguous 1..48 list
// where each qualified team's rank equalled its seeding slot (New Zealand at #45,
// Curaçao #47, Haiti #48). That is impossible for the real FIFA table — the 48
// qualifiers sit at their true world positions, which are non-contiguous and run
// well past 48. This guard fails loudly if that bug class ever returns.
//
// Pure Node (no browser): reads the JSON directly, so it runs in `npm run lint`-
// style CI without a dev server.  Run:  node tests/fifa-rankings.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(HERE, '../src/data/fifa_rankings.json'), 'utf8'))
const ranks = data.ranks || {}
const names = Object.keys(ranks)

// A few hand-verified anchors from the 11 June 2026 FIFA/Coca-Cola ranking
// (cross-checked Wikipedia + Sofascore + whereig). If any of these is ever set
// from seeding order again, it will diverge from the real value here.
const ANCHORS = {
  Argentina: 1,
  'New Zealand': 85, // the reported bug: was falsely #45, real rank is in the 80s
  Curaçao: 82,
  Haiti: 83,
  Morocco: 7, // seeding order would have put Morocco outside the top 10
  Mexico: 14,
}

const results = []
const check = (name, ok, detail) => results.push({ name, ok, detail })

// 1. All 48 qualified nations present.
check('all-48-present', names.length === 48, `${names.length} teams`)

// 2. No two teams share a rank (real table positions are unique).
const dupes = names.filter((n, _i, a) => a.filter((m) => ranks[m] === ranks[n]).length > 1)
check('no-duplicate-ranks', dupes.length === 0, dupes.length ? `dupes: ${dupes.join(', ')}` : 'all unique')

// 3. THE BUG SIGNATURE: ranks must NOT be the contiguous seeding sequence.
//    If sorted ranks equal exactly [1,2,3,...,48], they were derived from
//    qualification order, not the real world ranking.
const sorted = [...Object.values(ranks)].sort((a, b) => a - b)
const isSeedingOrder = sorted.every((r, i) => r === i + 1)
check('not-seeding-order', !isSeedingOrder, isSeedingOrder ? 'ranks are a contiguous 1..48 seeding sequence' : 'ranks are non-contiguous (real world positions)')

// 4. The real table has gaps: not-yet-qualified/uninvited teams sit between the
//    qualifiers, so the max rank must exceed 48 and at least one team must rank
//    outside the top 48 (the exact class of value the bug erased).
const maxRank = Math.max(...Object.values(ranks))
check('has-teams-outside-top-48', maxRank > 48, `max rank = ${maxRank}`)

// 5. New Zealand specifically must be in the 80s, not the top 48 (reported bug).
check('new-zealand-realistic', ranks['New Zealand'] > 48 && ranks['New Zealand'] < 100, `NZ = #${ranks['New Zealand']}`)

// 6. Hand-verified anchors match the real 2026 ranking.
for (const [team, expected] of Object.entries(ANCHORS)) {
  check(`anchor-${team}`, ranks[team] === expected, `${team}: got #${ranks[team]}, expected #${expected}`)
}

let failed = 0
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  —  ${r.detail}`)
  if (!r.ok) failed++
}
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
