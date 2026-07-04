// Populate frontend/src/data/countryCoaches.json with each nation's current head
// coach, sourced from the football-data.org API. Honest sourcing only: any team
// the API has no coach for stays null and surfaces as "pending" in the Atlas.
//
// Strategy (kind to the ~10 req/min free tier):
//   1. ONE call to /v4/competitions/WC/teams — this list usually already carries
//      each team's `coach.name`, so most coaches come from a single request.
//   2. For any qualified team still missing a coach, fall back to the per-team
//      /v4/teams/{id} endpoint (what the brief specifies), throttled to stay
//      under the rate limit, with 429 backoff.
//
// Requires FOOTBALL_DATA_API_KEY (from the environment or frontend/.env).
// Run:  node scripts/fetch_coaches.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..')
const RANKS_JSON = join(REPO, 'frontend/src/data/fifa_rankings.json')
const OUT_JSON = join(REPO, 'frontend/src/data/countryCoaches.json')
const ENV_FILE = join(REPO, 'frontend/.env')

const API = 'https://api.football-data.org/v4'

// Read the key from the environment, falling back to frontend/.env (same var the
// dev-server proxy uses). Never printed.
function apiKey() {
  if (process.env.FOOTBALL_DATA_API_KEY) return process.env.FOOTBALL_DATA_API_KEY.trim()
  try {
    const line = readFileSync(ENV_FILE, 'utf8').split('\n').find((l) => l.startsWith('FOOTBALL_DATA_API_KEY='))
    if (line) return line.slice('FOOTBALL_DATA_API_KEY='.length).trim()
  } catch { /* no .env */ }
  return ''
}

// football-data.org uses FIFA/UEFA long-forms; map the known divergences to our
// canonical names. Mirrors NAME_ALIASES in frontend/src/lib/data.js.
const NAME_ALIASES = {
  'Korea Republic': 'South Korea',
  'IR Iran': 'Iran',
  USA: 'United States',
  'Côte d’Ivoire': 'Ivory Coast',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cape Verde Islands': 'Cape Verde',
  'Cabo Verde': 'Cape Verde',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Czech Republic': 'Czechia',
  Türkiye: 'Turkey',
  'Congo DR': 'DR Congo',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(path, key) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${API}${path}`, { headers: { 'X-Auth-Token': key } })
    if (res.status === 429) {
      const wait = 8000 * (attempt + 1)
      console.warn(`  rate-limited on ${path}; waiting ${wait / 1000}s…`)
      await sleep(wait)
      continue
    }
    if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
    return res.json()
  }
  throw new Error(`${path} → gave up after repeated 429s`)
}

async function main() {
  const key = apiKey()
  if (!key) {
    console.error('FOOTBALL_DATA_API_KEY not set (env or frontend/.env). Nothing fetched; coaches stay pending.')
    process.exit(1)
  }

  const ourNames = Object.keys(JSON.parse(readFileSync(RANKS_JSON, 'utf8')).ranks)
  const ourSet = new Set(ourNames)
  const resolve = (name) => (ourSet.has(name) ? name : NAME_ALIASES[name] || null)

  const coaches = Object.fromEntries(ourNames.map((n) => [n, null]))
  const idByName = {}

  // 1. Competition teams — often carries coach.name directly.
  console.log('Fetching /competitions/WC/teams …')
  const comp = await api('/competitions/WC/teams', key)
  for (const t of comp.teams || []) {
    const name = resolve(t.name)
    if (!name) continue
    idByName[name] = t.id
    const coach = t.coach && t.coach.name ? t.coach.name : null
    if (coach) coaches[name] = coach
  }

  // 2. Per-team fallback for any qualified team still without a coach.
  const missing = ourNames.filter((n) => !coaches[n] && idByName[n])
  console.log(`${ourNames.length - missing.length}/${ourNames.length} coaches from the teams list; ${missing.length} need a per-team call.`)
  for (const name of missing) {
    try {
      const team = await api(`/teams/${idByName[name]}`, key)
      coaches[name] = team.coach && team.coach.name ? team.coach.name : null
    } catch (err) {
      console.warn(`  ${name}: ${err.message} — left pending`)
    }
    await sleep(6500) // ~9 req/min, under the free-tier ceiling
  }

  const filled = ourNames.filter((n) => coaches[n]).length
  const unresolved = ourNames.filter((n) => !idByName[n])
  const payload = {
    note: 'Current national-team manager per country, sourced from the football-data.org API '
      + '(/v4/competitions/WC/teams, with /v4/teams/{id} fallback). null = the API had no coach '
      + 'for this team → panel shows "pending". Regenerate with: node scripts/fetch_coaches.mjs',
    source: 'football-data.org v4 coach.name',
    fetched: new Date().toISOString().slice(0, 10),
    coaches,
  }
  writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n')
  console.log(`[OK] ${OUT_JSON.replace(REPO + '/', '')} — ${filled}/${ourNames.length} coaches filled.`)
  if (unresolved.length) console.log(`  not found in the WC feed (left pending): ${unresolved.join(', ')}`)
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
