// Point-in-polygon hit testing for the Atlas flag-fill hover.
//
// Pure geo logic (no Three.js, no DOM) so it runs in Node/tests. Given a
// [lat,lng] sample from the globe surface under the cursor, decide which of the
// 48 qualified nations owns that point — that country's landmass then fills with
// its flag. Countries are pre-baked in data/countryShapes.json as { iso, bbox,
// polys }, polys being [lng,lat] rings (see scripts/generate_country_shapes.mjs).
//
// The bbox is a cheap pre-filter: skip any country whose bounding box can't
// contain the point before running the O(n) ray-cast. With 48 small polygons
// this is comfortably fast enough to run on every pointermove.

// Ray-casting point-in-polygon. `ring` is [[lng,lat], ...]; point is (lng,lat).
// Standard even-odd rule; edges are half-open so shared borders don't
// double-count (a point on a border resolves to exactly one country).
function inRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

const inBbox = (lng, lat, b) => lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3]

// Name of the country whose landmass contains [lat,lng], or null. `shapes` is
// the countryShapes map (name → { iso, bbox, polys }). When polygons overlap at
// a shared border the first match in iteration order wins — deterministic, and
// the flag layer only ever shows one country, so there's no double render.
export function countryAt(lat, lng, shapes) {
  for (const name in shapes) {
    const s = shapes[name]
    if (!inBbox(lng, lat, s.bbox)) continue
    for (const poly of s.polys) {
      if (inRing(lng, lat, poly)) return name
    }
  }
  return null
}

export { inRing }
