import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import hostSubs from '../data/hostSubdivisions.json'
import { subAbbr } from '../data/subdivisionAbbr'
import { STADIUMS } from '../lib/stadiumData'
import './ProvinceStateSubMap.css'

// Host-nation sub-map (B3). For the three 2026 hosts only, an SVG inset of the
// nation's real internal provinces/states (Natural Earth 10m admin-1) with its
// state/provincial capitals plotted and labelled - a richer treatment than the
// plain silhouette the other 45 nations get. Rendered in the Atlas panel when a
// host is the active selection. Coloured in the host's national colour (US blue,
// Canada red, Mexico green - the host-identity treatment, matched to the globe).
// Scroll/pinch to zoom (1×-6×) and drag to pan a viewport <g>; a reset returns
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
  // so memoise on `code` - the pointer handlers below read it without recomputing.
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

    // Signed-area centroid of a projected ring, so the abbreviation lands at the
    // visual centre of each subdivision's largest landmass (returns area too, to
    // pick that largest ring). Falls back to the bbox centre for degenerate rings.
    const centroidOf = (ring) => {
      let a = 0, cx = 0, cy = 0
      for (let i = 0, n = ring.length; i < n; i++) {
        const [x0, y0] = ring[i]
        const [x1, y1] = ring[(i + 1) % n]
        const cross = x0 * y1 - x1 * y0
        a += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross
      }
      if (Math.abs(a) < 1e-6) {
        let bx1 = Infinity, by1 = Infinity, bx2 = -Infinity, by2 = -Infinity
        for (const [x, y] of ring) { if (x < bx1) bx1 = x; if (x > bx2) bx2 = x; if (y < by1) by1 = y; if (y > by2) by2 = y }
        return [(bx1 + bx2) / 2, (by1 + by2) / 2, Math.abs((bx2 - bx1) * (by2 - by1))]
      }
      a /= 2
      return [cx / (6 * a), cy / (6 * a), Math.abs(a)]
    }

    // Each subdivision is filled with one of five tonal steps of the host colour
    // (index-cycled), so neighbours read as distinct shapes - the reference-map
    // effect, kept role-locked to the host hue rather than a rainbow palette.
    let w = 0, h = 0
    const provs = subs.map((s, i) => {
      let best = null
      // Track the subdivision's own extent so tiny regions (NE US: CT, RI, NJ,
      // DE, MD, DC) can suppress their label - too small to letter cleanly, the
      // codes just clump. The capital dot still plots; only the text is dropped.
      let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity
      const d = s.rings
        .map((ring) => {
          const pts = ring.map(([lng, lat]) => {
            const [x, y] = project(lng, lat)
            if (x > w) w = x; if (y > h) h = y
            if (x < pMinX) pMinX = x; if (x > pMaxX) pMaxX = x
            if (y < pMinY) pMinY = y; if (y > pMaxY) pMaxY = y
            return [x, y]
          })
          const [cx, cy, area] = centroidOf(pts)
          if (!best || area > best.area) best = { cx, cy, area }
          return 'M' + pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L') + 'Z'
        })
        .join(' ')
      const tooSmall = (pMaxX - pMinX) < 1.5 || (pMaxY - pMinY) < 1.5
      return { name: s.name, d, tone: i % 5, abbr: subAbbr(code, s.name), cx: best.cx, cy: best.cy, tooSmall }
    })
    const caps = capitals.map((c) => { const [x, y] = project(c.lng, c.lat); return { ...c, x, y } })

    // World Cup venue cities for this host, projected through the same transform so
    // the gold dots land on the real host cities. Additive layer over the capitals.
    const venues = Object.entries(STADIUMS)
      .filter(([, s]) => s.country === code)
      .map(([name, s]) => { const [x, y] = project(s.lng, s.lat); return { name, city: s.hostCity, x, y } })

    // Faint constellation links: each capital tethered to its two nearest neighbours
    // within a size-relative cutoff, so the field reads as a network, not a web.
    const diag = Math.hypot(w, h) || 1
    const maxD = diag * 0.18
    const seen = new Set()
    const links = []
    caps.forEach((a, i) => {
      caps
        .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
        .filter((o) => o.j !== i && o.d <= maxD)
        .sort((p, q) => p.d - q.d)
        .slice(0, 2)
        .forEach(({ j }) => {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`
          if (!seen.has(key)) { seen.add(key); links.push({ key, x1: a.x, y1: a.y, x2: caps[j].x, y2: caps[j].y }) }
        })
    })

    return { subs, provs, caps, venues, links, w, h, vbW: w + 2, vbH: h + 2 }
  }, [data, code])

  const figRef = useRef(null) // <figure> - GSAP scope + tooltip positioning frame
  const svgRef = useRef(null)
  const vpRef = useRef(null) // the panned/zoomed viewport <g>
  // View lives in a ref, not state: a wheel tick or a pointer-move pixel updates
  // the <g> transform directly via the DOM, so 48+ paths never trigger a React
  // re-render mid-gesture (the old setState-per-pixel caused frame drops/crash).
  const viewRef = useRef({ z: 1, x: 0, y: 0 })
  const drag = useRef(null)
  // The only reactive bit: a boolean that flips just once when zoom crosses the
  // 1x threshold, to swap the grab cursor and mount the reset button.
  const [zoomed, setZoomed] = useState(false)
  // Hover tooltip: {text, x, y} in figure-relative px. Positioned from the pointer
  // client coords (not SVG user units), so it stays correct through zoom/pan.
  const [tip, setTip] = useState(null)
  const showTip = useCallback((text) => (e) => {
    const fig = figRef.current
    if (!fig) return
    const r = fig.getBoundingClientRect()
    setTip({ text, x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])
  const hideTip = useCallback(() => setTip(null), [])

  // Keep the viewport clamped so the map can never be panned fully off-frame.
  // Plain in/out - no setState - so it can run inside the imperative handlers.
  const clampViewRaw = useCallback((v) => {
    if (!geo) return v
    const z = clamp(v.z, MIN_ZOOM, MAX_ZOOM)
    return {
      z,
      x: clamp(v.x, geo.w * (1 - z), 0),
      y: clamp(v.y, geo.h * (1 - z), 0),
    }
  }, [geo])

  // Push the current view straight onto the <g> transform attribute, and flip the
  // zoomed flag only when it actually changes (the functional updater bails out of
  // a re-render when the boolean is unchanged), so this is cheap to call per frame.
  const applyTransform = useCallback(() => {
    const vp = vpRef.current
    if (!vp) return
    const { z, x, y } = viewRef.current
    vp.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${z.toFixed(3)})`)
    const isZoomed = z > MIN_ZOOM
    setZoomed((prev) => (prev === isZoomed ? prev : isZoomed))
  }, [])

  // Reset to the full-country view whenever the selected host changes.
  useEffect(() => {
    viewRef.current = { z: 1, x: 0, y: 0 }
    applyTransform()
  }, [code, applyTransform])

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
      const v = viewRef.current
      const nz = clamp(v.z * (e.deltaY < 0 ? 1.18 : 1 / 1.18), MIN_ZOOM, MAX_ZOOM)
      const ratio = nz / v.z
      viewRef.current = clampViewRaw({ z: nz, x: p.x - (p.x - v.x) * ratio, y: p.y - (p.y - v.y) * ratio })
      applyTransform()
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [geo, toUser, clampViewRaw, applyTransform])

  // Staggered dot entrance, replayed on every country switch (keyed on `code`).
  // Scoped to the figure via useGSAP so the tween context reverts cleanly on
  // unmount/remount (StrictMode-safe). Skipped under reduced motion, leaving the
  // dots and legend at their natural (visible) CSS state.
  useGSAP(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || !figRef.current) return
    const q = gsap.utils.selector(figRef.current)
    const dots = q('.submap__cap, .submap__venue')
    const stagger = 0.008
    if (dots.length) {
      gsap.fromTo(
        dots,
        { opacity: 0, scale: 0, transformOrigin: '50% 50%' },
        { opacity: 1, scale: 1, duration: 0.3, stagger, ease: 'back.out(1.4)' },
      )
    }
    // Legend fades in only after the dots have finished landing.
    gsap.fromTo(
      q('.submap__legend'),
      { opacity: 0 },
      { opacity: 1, duration: 0.4, delay: dots.length * stagger + 0.1, ease: 'power2.out' },
    )
  }, { scope: figRef, dependencies: [code] })

  if (!geo) return null

  const onPointerDown = (e) => {
    if (viewRef.current.z <= MIN_ZOOM) return // nothing to pan at the default full view
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const v = viewRef.current
    drag.current = { px: e.clientX, py: e.clientY, ox: v.x, oy: v.y }
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    const svg = svgRef.current
    const r = svg.getBoundingClientRect()
    const dx = ((e.clientX - drag.current.px) / r.width) * geo.vbW
    const dy = ((e.clientY - drag.current.py) / r.height) * geo.vbH
    viewRef.current = clampViewRaw({ ...viewRef.current, x: drag.current.ox + dx, y: drag.current.oy + dy })
    applyTransform()
  }
  const endDrag = () => { drag.current = null }
  const reset = () => { viewRef.current = { z: 1, x: 0, y: 0 }; applyTransform() }

  return (
    <figure ref={figRef} className={`submap submap--${code}`} aria-label={`${HOST_LABEL[code]} - ${geo.subs.length} ${UNIT[code]} and their capitals`}>
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
        <g ref={vpRef} className="submap__viewport" transform="translate(0 0) scale(1)">
          <g className="submap__provs">
            {geo.provs?.map((p) => (
              <path key={p.name} d={p.d} className={`submap__prov submap__prov--t${p.tone}`} />
            ))}
          </g>
          {/* Constellation links - faint, static, atmospheric (host sub-maps only). */}
          <g className="submap__links" aria-hidden="true">
            {geo.links.map((l) => (
              <line key={l.key} x1={l.x1.toFixed(2)} y1={l.y1.toFixed(2)} x2={l.x2.toFixed(2)} y2={l.y2.toFixed(2)} className="submap__link" />
            ))}
          </g>
          <g className="submap__caps">
            {geo.caps.map((c) => (
              <circle
                key={`${c.name}-${c.region || 'nat'}`}
                cx={c.x.toFixed(2)} cy={c.y.toFixed(2)} r={c.national ? 1.2 : 0.5}
                className={`submap__cap${c.national ? ' submap__cap--nat' : ''}`}
                onMouseEnter={showTip(`${c.name}${c.region ? ` · ${c.region}` : ''}${c.national ? ' (capital)' : ''}`)}
                onMouseMove={showTip(`${c.name}${c.region ? ` · ${c.region}` : ''}${c.national ? ' (capital)' : ''}`)}
                onMouseLeave={hideTip}
              >
                <title>{c.name}{c.region ? ` · ${c.region}` : ''}{c.national ? ' (capital)' : ''}</title>
              </circle>
            ))}
          </g>
          {/* World Cup venue cities - trophy gold, larger, pulsing (host maps only). */}
          <g className="submap__venues">
            {geo.venues.map((v) => (
              <circle
                key={v.name}
                cx={v.x.toFixed(2)} cy={v.y.toFixed(2)} r={0.95}
                className="submap__venue"
                onMouseEnter={showTip(`${v.city} · World Cup venue`)}
                onMouseMove={showTip(`${v.city} · World Cup venue`)}
                onMouseLeave={hideTip}
              >
                <title>{v.city} · World Cup venue</title>
              </circle>
            ))}
          </g>
          <g className="submap__abbrs">
            {geo.provs?.filter((p) => p.abbr && !p.tooSmall).map((p) => (
              <text
                key={p.name}
                x={p.cx.toFixed(2)} y={p.cy.toFixed(2)}
                className="submap__abbr"
                textAnchor="middle" dominantBaseline="middle"
              >
                {p.abbr}
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
      {tip && (
        <span className="submap__tooltip is-on" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
          {tip.text}
        </span>
      )}
      <figcaption className="submap__legend">
        {code === 'US' ? LEGEND.US : <><span className="tnum">{geo.subs.length}</span> {UNIT[code]}</>} · <span className="tnum">{geo.caps.length}</span> capitals · scroll to zoom
        <span className="submap__legend-venue"><span className="submap__legend-dot" aria-hidden="true" /> World Cup venues</span>
      </figcaption>
    </figure>
  )
}
