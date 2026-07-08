// Pure geo/sphere math for the globe — no Three.js import, so it runs in Node
// and unit tests. GlobeHero wraps the [x,y,z] outputs in THREE.Vector3.
//
// Convention: latitude in [-90,90], longitude in [-180,180]. The sphere maps
// lat/lng so the two directions are consistent and invertible (llToXYZ ∘ xyzToLL
// round-trips); the exact axis orientation only has to match itself.

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

// [lat,lng] on a sphere of radius r → [x,y,z].
export function llToXYZ(lat, lng, r = 1) {
  const phi = (90 - lat) * D2R
  const theta = (lng + 180) * D2R
  return [-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)]
}

// Inverse of llToXYZ → [lat,lng].
export function xyzToLL([x, y, z]) {
  const r = Math.hypot(x, y, z) || 1
  const lat = 90 - Math.acos(Math.min(1, Math.max(-1, y / r))) * R2D
  let lng = Math.atan2(z, -x) * R2D - 180
  if (lng < -180) lng += 360
  if (lng > 180) lng -= 360
  return [lat, lng]
}

// Great-circle angular separation between two [lat,lng] points, in degrees.
export function angularDistDeg([lat1, lng1], [lat2, lng2]) {
  const a =
    Math.sin(lat1 * D2R) * Math.sin(lat2 * D2R) +
    Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.cos((lng2 - lng1) * D2R)
  return Math.acos(Math.min(1, Math.max(-1, a))) * R2D
}

// Sample a great-circle arc between two [lat,lng] points as `segments`+1 points
// on the unit sphere, each lifted by a sine bump so the arc bows out from the
// surface (taller for longer routes). Returns [x,y,z][] at the given base radius.
export function greatCircleArc(fromLL, toLL, r = 1, segments = 96) {
  const a = new Array(3)
  const b = new Array(3)
  ;[a[0], a[1], a[2]] = llToXYZ(fromLL[0], fromLL[1], 1)
  ;[b[0], b[1], b[2]] = llToXYZ(toLL[0], toLL[1], 1)
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const omega = Math.acos(dot)
  const sinO = Math.sin(omega)
  // Arc apex height as a fraction of r, scaled by route length (0 for adjacent,
  // ~0.45r for antipodal) so short hops stay low and intercontinental legs soar.
  const lift = r * (0.12 + 0.33 * (omega / Math.PI))
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    let p
    if (sinO < 1e-6) {
      p = [a[0], a[1], a[2]]
    } else {
      const c1 = Math.sin((1 - t) * omega) / sinO
      const c2 = Math.sin(t * omega) / sinO
      p = [a[0] * c1 + b[0] * c2, a[1] * c1 + b[1] * c2, a[2] * c1 + b[2] * c2]
    }
    const alt = r + lift * Math.sin(Math.PI * t)
    pts.push([p[0] * alt, p[1] * alt, p[2] * alt])
  }
  return pts
}

// Host-nation bounding circles for the emblem trigger (Part B). Centres are the
// rough geographic middle of each host; radii are generous — the check only has
// to feel intentional, not be exact. Overlaps at the borders are resolved by
// hostAtPoint picking the single closest containing circle, so only one fires.
export const HOST_CIRCLES = {
  CA: { center: [58, -100], radiusDeg: 26 },
  US: { center: [39, -98], radiusDeg: 20 },
  MX: { center: [23, -102], radiusDeg: 11 },
}

// The host country whose circle currently contains [lat,lng], or null. When a
// point falls in more than one circle (border regions) the closest centre wins,
// so the caller never gets two hosts at once.
export function hostAtPoint(latlng) {
  let best = null
  let bestD = Infinity
  for (const code of Object.keys(HOST_CIRCLES)) {
    const c = HOST_CIRCLES[code]
    const d = angularDistDeg(latlng, c.center)
    if (d <= c.radiusDeg && d < bestD) {
      bestD = d
      best = code
    }
  }
  return best
}
