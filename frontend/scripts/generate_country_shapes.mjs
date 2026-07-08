// Generate src/data/countryShapes.json — real boundary polygons for the 48
// qualified nations, so the Atlas can fill a country's actual landmass with its
// flag on hover (not a bounding box or a hand-drawn silhouette).
//
// SOURCE: Natural Earth 110m admin-0 (countries) + 110m admin-1 (states/
// provinces, used only to carve England and Scotland out of the UK, since
// admin-0 has no separate GB-ENG / GB-SCT features). Fetched from the
// nvkelso/natural-earth-vector mirror at build time; the baked JSON is what
// ships, so runtime never hits the network. Public domain (Natural Earth).
//
// OUTPUT shape (compact, keyed by the canonical team name in lib/teams.js):
//   { "Argentina": { iso: "ar", bbox: [minLng,minLat,maxLng,maxLat],
//                    polys: [[[lng,lat],...], ...] }, ... }
// Coordinates are rounded to 2dp (~1km) — plenty for a globe silhouette, and
// keeps the file small. Tiny outlying islands are dropped (see MIN_AREA_FRAC)
// so a country reads as its recognizable mainland, not a scatter of specks.
//
// Run: node scripts/generate_country_shapes.mjs

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/data/countryShapes.json')

const A0 = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
// 50m fallbacks: 110m drops the small island nations (Cape Verde, Curaçao) and
// has no UK subdivisions, so England/Scotland + those islands come from 50m.
const A0_50 = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'
// map_units splits sovereign states into their constituent units — the only NE
// layer where England / Scotland exist as separate features (admin-0 and both
// admin-1 layers keep them inside "United Kingdom").
const MAP_UNITS_50 = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_units.geojson'

// team name → ISO 3166-1 alpha-2 (same values lib/teams.js keys flags off).
// gb-eng / gb-sct are handled specially via admin-1 (not real ISO A2).
const TEAM_ISO = {
  Argentina: 'ar', France: 'fr', Brazil: 'br', England: 'gb-eng', Spain: 'es',
  Portugal: 'pt', Colombia: 'co', Netherlands: 'nl', Switzerland: 'ch', Norway: 'no',
  Japan: 'jp', Belgium: 'be', Ecuador: 'ec', Germany: 'de', Mexico: 'mx',
  Turkey: 'tr', Croatia: 'hr', Senegal: 'sn', Uruguay: 'uy', Canada: 'ca',
  Morocco: 'ma', Austria: 'at', Paraguay: 'py', 'United States': 'us', Australia: 'au',
  'South Korea': 'kr', Scotland: 'gb-sct', Algeria: 'dz', Czechia: 'cz', Iran: 'ir',
  Panama: 'pa', Egypt: 'eg', Uzbekistan: 'uz', 'DR Congo': 'cd', Jordan: 'jo',
  'Bosnia and Herzegovina': 'ba', 'Ivory Coast': 'ci', 'New Zealand': 'nz', Sweden: 'se',
  'Cape Verde': 'cv', Ghana: 'gh', Haiti: 'ht', Iraq: 'iq', Qatar: 'qa',
  'Saudi Arabia': 'sa', 'South Africa': 'za', Tunisia: 'tn', 'Curaçao': 'cw',
}

// Some NE admin-0 features carry ISO_A2 = '-99'; match those by ADMIN name.
const NAME_ALIAS = {
  fr: 'France', no: 'Norway', // France/Norway often lack ISO_A2 in 110m
}

const MIN_AREA_FRAC = 0.06 // drop rings whose bbox area < 6% of the largest ring's

async function getJSON(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`)
  return r.json()
}

const bboxArea = (b) => (b[2] - b[0]) * (b[3] - b[1])
function ringBbox(ring) {
  let a = 180, b = 90, c = -180, d = -90
  for (const [x, y] of ring) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y }
  return [a, b, c, d]
}

// A GeoJSON geometry → array of exterior rings (we ignore holes; a flag fill
// doesn't need lakes punched out, and it keeps the mesh simple).
function outerRings(geom) {
  if (!geom) return []
  if (geom.type === 'Polygon') return [geom.coordinates[0]]
  if (geom.type === 'MultiPolygon') return geom.coordinates.map((p) => p[0])
  return []
}

function packCountry(iso, rings) {
  // Keep the mainland + any island comparable to it; drop specks.
  const withBox = rings.map((r) => ({ r, box: ringBbox(r) })).filter((x) => x.r.length >= 4)
  if (!withBox.length) return null
  const maxArea = Math.max(...withBox.map((x) => bboxArea(x.box)))
  const kept = withBox.filter((x) => bboxArea(x.box) >= MIN_AREA_FRAC * maxArea || bboxArea(x.box) === maxArea)
  const polys = kept.map((x) => x.r.map(([lng, lat]) => [Math.round(lng * 100) / 100, Math.round(lat * 100) / 100]))
  // Overall bbox across kept polys — the UV frame the flag is mapped into.
  let a = 180, b = 90, c = -180, d = -90
  for (const p of polys) for (const [x, y] of p) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y }
  return { iso, bbox: [a, b, c, d], polys }
}

function indexCountries(fc) {
  const byIso = new Map()
  const byName = new Map()
  for (const f of fc.features) {
    const p = f.properties
    const i2 = (p.ISO_A2 || p.ISO_A2_EH || '').toUpperCase()
    if (i2 && i2 !== '-99') byIso.set(i2, f)
    const nm = (p.ADMIN || p.NAME || p.NAME_LONG || '').toLowerCase()
    if (nm) byName.set(nm, f)
  }
  return { byIso, byName }
}

function findFeature(idx, team, iso) {
  let f = idx.byIso.get(iso.toUpperCase())
  if (!f && NAME_ALIAS[iso]) f = idx.byName.get(NAME_ALIAS[iso].toLowerCase())
  if (!f) f = idx.byName.get(team.toLowerCase())
  return f
}

async function main() {
  console.log('fetching Natural Earth admin-0 (110m) …')
  const idx110 = indexCountries(await getJSON(A0))
  let idx50 = null // lazily loaded only if a 110m lookup misses

  const out = {}
  const misses = []
  for (const [team, iso] of Object.entries(TEAM_ISO)) {
    if (iso === 'gb-eng' || iso === 'gb-sct') continue // handled below
    let f = findFeature(idx110, team, iso)
    if (!f) {
      if (!idx50) { console.log('fetching Natural Earth admin-0 (50m) for small nations …'); idx50 = indexCountries(await getJSON(A0_50)) }
      f = findFeature(idx50, team, iso)
    }
    if (!f) { misses.push(`${team} (${iso})`); continue }
    const packed = packCountry(iso, outerRings(f.geometry))
    if (packed) out[team] = packed
    else misses.push(`${team} (empty geom)`)
  }

  // England + Scotland from the 50m map_units layer (they exist as separate
  // features there, unlike admin-0/admin-1 which keep them inside the UK).
  console.log('fetching Natural Earth map_units (50m, England/Scotland) …')
  const mu = await getJSON(MAP_UNITS_50)
  for (const [team, iso, unit] of [['England', 'gb-eng', 'England'], ['Scotland', 'gb-sct', 'Scotland']]) {
    const f = mu.features.find((x) => String(x.properties.NAME || x.properties.name || '').toLowerCase() === unit.toLowerCase())
    const packed = f ? packCountry(iso, outerRings(f.geometry)) : null
    if (packed) out[team] = packed
    else misses.push(`${team} (no map_unit match)`)
  }

  writeFileSync(OUT, JSON.stringify(out))
  const kb = (JSON.stringify(out).length / 1024).toFixed(1)
  console.log(`\nwrote ${Object.keys(out).length}/48 countries → ${OUT} (${kb} KB)`)
  if (misses.length) console.log('UNMATCHED:', misses.join(', '))
}

main().catch((e) => { console.error(e); process.exit(1) })
