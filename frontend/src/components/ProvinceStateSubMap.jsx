import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import hostSubs from '../data/hostSubdivisions.json'
import './ProvinceStateSubMap.css'

// Host-nation sub-map (B3). For the three 2026 hosts only, an SVG inset of the
// nation's real internal provinces/states (Natural Earth 10m admin-1) with its
// state/provincial capitals plotted and labelled — a richer treatment than the
// plain silhouette the other 45 nations get. Rendered in the Atlas panel when a
// host is the active selection. Coloured in the host's national colour (US blue,
// Canada red, Mexico green — the host-identity treatment, matched to the globe).
// Scroll/pinch to zoom (1×–6×) and drag to pan a viewport <g>; a reset returns
// the default full-country view.

const HOST_LABEL = { US: 'United States', CA: 'Canada', MX: 'Mexico' }
const UNIT = { US: 'states', CA: 'provinces & territories', MX: 'states' }
// The US map excludes Alaska + Hawaii so the contiguous states (where all 11 US
// venues sit) read legibly instead of being squashed by the ~120° span to
// Alaska. Their capitals are dropped to match.
const EXCLUDE = { US: new Set(['Alaska', 'Hawaii']) }
const LEGEND = { US: '48 contiguous states + DC', CA: 'provinces & territories', MX: 'states' }

const MIN_ZOOM = 1
const MAX_ZOOM = 6
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function ProvinceStateSubMap({ code }) {
  const data = hostSubs[code]

  // All geometry, labels and viewBox derive from the (static) subdivision data,
  // so memoise on `code` — the pointer handlers below read it without recomputing.
  const geo = useMemo(() => {
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

    // City labels — a greedy de-clutter so dense regions (US Northeast) don't turn
    // into a smear of overlapping text. The national capital is placed first and
    // always kept; every other label is dropped if its box would collide with one
    // already placed. Labels offset up-right of the dot so they never sit on it.
    const ordered = [...caps].sort((a, b) => (b.national ? 1 : 0) - (a.national ? 1 : 0))
    const placed = []
    const labels = ordered.map((c) => {
      const fs = c.national ? 2.8 : 2.2
      const tx = c.x + 1.2
      const ty = c.y - 1.0
      const box = { x1: tx, y1: ty - fs, x2: tx + c.name.length * fs * 0.52, y2: ty }
      const hit = placed.some((p) => !(box.x2 < p.x1 || box.x1 > p.x2 || box.y2 < p.y1 || box.y1 > p.y2))
      const show = c.national || !hit
      if (show) placed.push(box)
      return { ...c, fs, tx, ty, show }
    })

    return { subs, provs, caps, labels, w, h, vbW: w + 2, vbH: h + 2 }
  }, [data, code])

  const svgRef = useRef(null)
  const [view, setView] = useState({ z: 1, x: 0, y: 0 })
  const drag = useRef(null)

  // Keep the viewport clamped so the map can never be panned fully off-frame.
  const clampView = useCallback((v) => {
    if (!geo) return v
    const z = clamp(v.z, MIN_ZOOM, MAX_ZOOM)
    return {
      z,
      x: clamp(v.x, geo.w * (1 - z), 0),
      y: clamp(v.y, geo.h * (1 - z), 0),
    }
  }, [geo])

  useEffect(() => { setView({ z: 1, x: 0, y: 0 }) }, [code])

  // Client point → SVG user units (viewBox origin is -1,-1).
  const toUser = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg || !geo) return { x: 0, y: 0 }
    const r = svg.getBoundingClientRect()
    return {
      x: -1 + ((clientX - r.left) / r.width) * geo.vbW,
      y: -1 + ((clientY - r.top) / r.height) * geo.vbH,
    }
  }, [geo])

  // Wheel zoom anchored on the cursor. Registered non-passive so it can stop the
  // parent Atlas panel from scrolling while the pointer is over the sub-map.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !geo) return undefined
    const onWheel = (e) => {
      e.preventDefault()
      const p = toUser(e.clientX, e.clientY)
      setView((v) => {
        const nz = clamp(v.z * (e.deltaY < 0 ? 1.18 : 1 / 1.18), MIN_ZOOM, MAX_ZOOM)
        const ratio = nz / v.z
        return clampView({ z: nz, x: p.x - (p.x - v.x) * ratio, y: p.y - (p.y - v.y) * ratio })
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [geo, toUser, clampView])

  if (!geo) return null

  const onPointerDown = (e) => {
    if (view.z <= MIN_ZOOM) return // nothing to pan at the default full view
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, ox: view.x, oy: view.y }
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    const svg = svgRef.current
    const r = svg.getBoundingClientRect()
    const dx = ((e.clientX - drag.current.px) / r.width) * geo.vbW
    const dy = ((e.clientY - drag.current.py) / r.height) * geo.vbH
    setView((v) => clampView({ ...v, x: drag.current.ox + dx, y: drag.current.oy + dy }))
  }
  const endDrag = () => { drag.current = null }
  const reset = () => setView({ z: 1, x: 0, y: 0 })

  const zoomed = view.z > MIN_ZOOM

  return (
    <figure className={`submap submap--${code}`} aria-label={`${HOST_LABEL[code]} — ${geo.subs.length} ${UNIT[code]} and their capitals`}>
      <svg
        ref={svgRef}
        viewBox={`-1 -1 ${geo.vbW.toFixed(1)} ${geo.vbH.toFixed(1)}`}
        role="img"
        preserveAspectRatio="xMidYMid meet"
        className={`submap__svg${zoomed ? ' is-zoomed' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        <g transform={`translate(${view.x.toFixed(3)} ${view.y.toFixed(3)}) scale(${view.z.toFixed(3)})`}>
          <g className="submap__provs">
            {geo.provs?.map((p) => <path key={p.name} d={p.d} className="submap__prov" />)}
          </g>
          <g className="submap__caps">
            {geo.caps.map((c) => (
              <circle
                key={`${c.name}-${c.region || 'nat'}`}
                cx={c.x.toFixed(2)} cy={c.y.toFixed(2)} r={c.national ? 0.9 : 0.42}
                className={`submap__cap${c.national ? ' submap__cap--nat' : ''}`}
              >
                <title>{c.name}{c.region ? ` · ${c.region}` : ''}{c.national ? ' (capital)' : ''}</title>
              </circle>
            ))}
          </g>
          <g className="submap__labels">
            {geo.labels.filter((c) => c.show).map((c) => (
              <text
                key={`${c.name}-${c.region || 'nat'}`}
                x={c.tx.toFixed(2)} y={c.ty.toFixed(2)}
                fontSize={c.fs}
                className={`submap__label${c.national ? ' submap__label--nat' : ''}`}
              >
                {c.name}
              </text>
            ))}
          </g>
        </g>
      </svg>
      {zoomed && (
        <button type="button" className="submap__reset" onClick={reset} aria-label="Reset sub-map view">
          Reset
        </button>
      )}
      <figcaption className="submap__legend">
        {code === 'US' ? LEGEND.US : <><span className="tnum">{geo.subs.length}</span> {UNIT[code]}</>} · <span className="tnum">{geo.caps.length}</span> capitals · scroll to zoom
      </figcaption>
    </figure>
  )
}
