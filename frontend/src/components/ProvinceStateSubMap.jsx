import hostSubs from '../data/hostSubdivisions.json'
import './ProvinceStateSubMap.css'

// Host-nation sub-map (B3). For the three 2026 hosts only, an SVG inset of the
// nation's real internal provinces/states (Natural Earth 10m admin-1) with its
// state/provincial capitals plotted — a richer treatment than the plain
// silhouette the other 45 nations get. Rendered in the Atlas panel when a host
// is the active selection. Coloured in the host's national colour (US blue,
// Canada red, Mexico green — the host-identity treatment, matched to the globe).

const HOST_LABEL = { US: 'United States', CA: 'Canada', MX: 'Mexico' }
const UNIT = { US: 'states', CA: 'provinces & territories', MX: 'states' }
// The US map excludes Alaska + Hawaii so the contiguous states (where all 11 US
// venues sit) read legibly instead of being squashed by the ~120° span to
// Alaska. Their capitals are dropped to match.
const EXCLUDE = { US: new Set(['Alaska', 'Hawaii']) }
const LEGEND = { US: '48 contiguous states + DC', CA: 'provinces & territories', MX: 'states' }

export default function ProvinceStateSubMap({ code }) {
  const data = hostSubs[code]
  if (!data) return null
  const ex = EXCLUDE[code]
  const subs = ex ? data.subs.filter((s) => !ex.has(s.name)) : data.subs
  const capitals = ex ? data.capitals.filter((c) => !ex.has(c.region)) : data.capitals

  // Tight bounds from the rendered subdivisions (not data.bbox, which may include
  // excluded outliers). Equirectangular with lng scaled by cos(midLat); y flipped.
  let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90
  for (const s of subs) for (const ring of s.rings) for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat
  }
  const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180)
  const project = (lng, lat) => [(lng - minLng) * k, maxLat - lat]

  let w = 0, h = 0
  const provs = subs.map((s) => {
    const d = s.rings
      .map((ring) => 'M' + ring.map(([lng, lat]) => { const [x, y] = project(lng, lat); if (x > w) w = x; if (y > h) h = y; return `${x.toFixed(2)},${y.toFixed(2)}` }).join('L') + 'Z')
      .join(' ')
    return { name: s.name, d }
  })
  const caps = capitals.map((c) => { const [x, y] = project(c.lng, c.lat); return { ...c, x, y } })
  const nCaps = caps.length

  return (
    <figure className={`submap submap--${code}`} aria-label={`${HOST_LABEL[code]} — ${subs.length} ${UNIT[code]} and their capitals`}>
      <svg viewBox={`-1 -1 ${(w + 2).toFixed(1)} ${(h + 2).toFixed(1)}`} role="img" preserveAspectRatio="xMidYMid meet">
        <g className="submap__provs">
          {provs.map((p) => <path key={p.name} d={p.d} className="submap__prov" />)}
        </g>
        <g className="submap__caps">
          {caps.map((c) => (
            <circle
              key={`${c.name}-${c.region || 'nat'}`}
              cx={c.x.toFixed(2)} cy={c.y.toFixed(2)} r={c.national ? 0.9 : 0.42}
              className={`submap__cap${c.national ? ' submap__cap--nat' : ''}`}
            >
              <title>{c.name}{c.region ? ` · ${c.region}` : ''}{c.national ? ' (capital)' : ''}</title>
            </circle>
          ))}
        </g>
      </svg>
      <figcaption className="submap__legend">
        {code === 'US' ? LEGEND.US : <><span className="tnum">{subs.length}</span> {UNIT[code]}</>} · <span className="tnum">{nCaps}</span> capitals
      </figcaption>
    </figure>
  )
}
