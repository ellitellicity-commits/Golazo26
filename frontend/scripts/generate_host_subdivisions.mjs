// Generate src/data/hostSubdivisions.json — real province/state boundaries and
// admin-1 capitals for the three 2026 host nations (USA, Canada, Mexico), so the
// Atlas can render a richer sub-map for the hosts than the plain silhouette used
// for the other 45 nations (B3).
//
// SOURCE: Natural Earth 10m admin-1 states/provinces (50m/110m drop Mexico) for
// the subdivision polygons, and NE 10m populated_places for the state/provincial
// capitals (featurecla "Admin-1 capital"/"Admin-0 capital"). Public domain.
//
// OUTPUT (keyed by host country code US/CA/MX):
//   { US: { bbox, subs: [{ name, rings: [[[lng,lat],...]] }],
//           capitals: [{ name, region, lat, lng, national }] }, ... }
// Coordinates rounded to 2dp; only the largest ring per subdivision is kept
// (islands/exclaves dropped) to stay compact and legible as an inset map.
//
// Run: node scripts/generate_host_subdivisions.mjs

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/data/hostSubdivisions.json')

const A1 = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'
const PP = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson'

const HOSTS = { USA: 'US', CAN: 'CA', MEX: 'MX' }
const ADM0NAME = { 'United States of America': 'US', Canada: 'CA', Mexico: 'MX' }

async function getJSON(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`)
  return r.json()
}

const round2 = (n) => Math.round(n * 100) / 100

// Douglas–Peucker simplification in lng/lat degrees. Tolerance ~0.12° keeps
// province shapes recognizable as an inset while cutting the 10m point count
// (and file size) by an order of magnitude.
function rdp(points, eps) {
  if (points.length < 3) return points
  let maxD = 0, idx = 0
  const [ax, ay] = points[0]
  const [bx, by] = points[points.length - 1]
  const dx = bx - ax, dy = by - ay
  const len = Math.hypot(dx, dy) || 1e-9
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i]
    const d = Math.abs((px - ax) * dy - (py - ay) * dx) / len
    if (d > maxD) { maxD = d; idx = i }
  }
  if (maxD > eps) {
    const left = rdp(points.slice(0, idx + 1), eps)
    const right = rdp(points.slice(idx), eps)
    return left.slice(0, -1).concat(right)
  }
  return [points[0], points[points.length - 1]]
}

function largestRing(geom) {
  const rings = geom.type === 'Polygon' ? [geom.coordinates[0]]
    : geom.type === 'MultiPolygon' ? geom.coordinates.map((p) => p[0]) : []
  let best = null, bestA = -1
  for (const r of rings) {
    let a = 180, b = 90, c = -180, d = -90
    for (const [x, y] of r) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y }
    const area = (c - a) * (d - b)
    if (area > bestA) { bestA = area; best = r }
  }
  if (!best) return null
  const simplified = rdp(best, 0.12)
  return simplified.map(([x, y]) => [round2(x), round2(y)])
}

async function main() {
  console.log('fetching NE 10m admin-1 …')
  const a1 = await getJSON(A1)
  const out = {}
  for (const [a3, code] of Object.entries(HOSTS)) {
    const feats = a1.features.filter((f) => f.properties.adm0_a3 === a3)
    const subs = []
    let a = 180, b = 90, c = -180, d = -90
    for (const f of feats) {
      const ring = largestRing(f.geometry)
      if (!ring) continue
      subs.push({ name: f.properties.name, rings: [ring] })
      for (const [x, y] of ring) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y }
    }
    out[code] = { bbox: [a, b, c, d], subs, capitals: [] }
    console.log(`${code}: ${subs.length} subdivisions`)
  }

  console.log('fetching NE 10m populated places (capitals) …')
  const pp = await getJSON(PP)
  for (const f of pp.features) {
    const p = f.properties
    const code = ADM0NAME[p.adm0name]
    if (!code) continue
    const fc = String(p.featurecla || '')
    const isNational = /Admin-0 capital/.test(fc)
    const isState = /Admin-1 capital/.test(fc)
    if (!isNational && !isState) continue
    const [lng, lat] = f.geometry.coordinates
    out[code].capitals.push({ name: p.name, region: p.adm1name || null, lat: round2(lat), lng: round2(lng), national: isNational })
  }
  for (const code of Object.values(HOSTS)) console.log(`${code}: ${out[code].capitals.length} capitals`)

  writeFileSync(OUT, JSON.stringify(out))
  console.log(`\nwrote ${OUT} (${(JSON.stringify(out).length / 1024).toFixed(1)} KB)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
