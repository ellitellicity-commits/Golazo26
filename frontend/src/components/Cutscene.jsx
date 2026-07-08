import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { GEO, MAP_VIEWBOX, project } from '../lib/cutsceneMap'
import './Cutscene.css'

// Pregame broadcast cutscene (B4, reworked in Part F) — an EA-Sports-FC-style
// intro, not a travel montage. One gsap.timeline() runs four sequenced beats so
// they never race:
//   1 VS card clash → 2 paper-map flight to the destination pin → 3 hype text →
//   4 whistle countdown → hard cut, then onComplete() reveals the result.
//
// Beat 2 replaces the old black-screen 3D stadium flyover with a vintage
// aeronautical-chart: an aged parchment map with a graticule + compass, a dashed
// flight arc that draws as a plane glyph flies along it, ending on a dropped pin
// at the destination city. Pure SVG + GSAP (no three.js here any more). The map's
// sepia/parchment palette is a deliberate, self-contained cinematic prop — the
// product chrome and its role-locked accents are untouched. All copy stays on the
// site stack (Barlow Condensed display, Noto Sans body). data-beat exposes the
// active beat for tests; skippable; degrades to an instant reveal under reduced
// motion.

// A top-down airliner glyph centred on its own origin so translate+rotate along
// the flight path orients it nose-first (nose at +X). Fuselage, swept delta
// wings and a tailplane — an actual plane silhouette, not an arrow.
function PlaneGlyph() {
  return (
    <g className="cut__plane">
      <path
        d="M17,0 L5,1.4 L3,1.4 L-3,8 L-5,8 L-1,1.4 L-11,1.4 L-11,4.5 L-15,4.5 L-16,1 L-16,0 L-16,-1 L-15,-4.5 L-11,-4.5 L-11,-1.4 L-1,-1.4 L-5,-8 L-3,-8 L3,-1.4 L5,-1.4 Z"
        fill="var(--cut-ink)"
        stroke="var(--cut-parchment)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </g>
  )
}

export default function Cutscene({ match, onComplete }) {
  const { home, away, homeFlag, awayFlag, homeCode, awayCode, venue, hype } = match
  const rootRef = useRef(null)
  const pathRef = useRef(null)
  const planeRef = useRef(null)
  const tlRef = useRef(null)
  const doneRef = useRef(false)
  const [beat, setBeat] = useState('vs')

  // Destination pin, projected from the venue's real coordinate so it lands on
  // the actual host city (Part 1b) — never floating in the Atlantic. The plane
  // then approaches it from off-screen (lower-left), so there is no origin dot:
  // it just enters frame, small and distant, and grows toward the pin (the depth
  // read). The dashed route is a quadratic arc from that off-canvas entry to the
  // pin; getPointAtLength samples it so the nose always tracks the arc.
  const { dest, routeD } = useMemo(() => {
    const d = venue?.lat != null && venue?.lng != null ? project(venue.lng, venue.lat) : { x: 640, y: 300 }
    const sx = -160
    const sy = Math.min(560, d.y + 170)
    const cx = (sx + d.x) / 2 + 40
    const cy = Math.min(d.y, sy) - 90
    return { dest: d, routeD: `M${sx} ${sy} Q ${cx} ${cy} ${d.x} ${d.y}` }
  }, [venue?.lat, venue?.lng])

  const finish = () => {
    if (!doneRef.current) {
      doneRef.current = true
      onComplete?.()
    }
  }

  useEffect(() => {
    const root = rootRef.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const q = gsap.utils.selector(root)

    if (reduce) {
      // Reduced motion: hold the VS card briefly, then reveal — no motion.
      const t = setTimeout(finish, 700)
      return () => clearTimeout(t)
    }

    const tl = gsap.timeline({ onComplete: finish })
    tlRef.current = tl

    // --- Beat 1 — VS card clash ---
    setBeat('vs')
    tl.fromTo(q('.cut__side--home'), { xPercent: -160, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5, ease: 'power4.out' }, 0)
    tl.fromTo(q('.cut__side--away'), { xPercent: 160, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5, ease: 'power4.out' }, 0)
    tl.fromTo(q('.cut__vs-badge'), { scale: 0, rotate: -35 }, { scale: 1, rotate: 0, duration: 0.34, ease: 'back.out(2.4)' }, 0.26)
    tl.to(q('.cut__vs-badge'), { scale: 1.12, duration: 0.16, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.6)
    tl.to(q('.cut__vs'), { autoAlpha: 0, scale: 1.14, duration: 0.34, ease: 'power2.in' }, '+=0.9')

    // --- Beat 2 — paper-map flight to the destination pin ---
    tl.add(() => setBeat('flight'))
    tl.fromTo(q('.cut__map'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, '<')
    tl.fromTo(q('.cut__caption--venue'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '<0.2')

    // Fly the plane along the (statically dashed, vintage-chart) route: one
    // progress tween samples the path so the nose always points along the arc.
    const path = pathRef.current
    const plane = planeRef.current
    const len = path.getTotalLength()
    gsap.set(plane, { autoAlpha: 1 })
    const prog = { t: 0 }
    tl.to(
      prog,
      {
        t: 1,
        duration: 1.9,
        ease: 'power1.inOut',
        onUpdate: () => {
          const d = prog.t * len
          const p = path.getPointAtLength(d)
          const p2 = path.getPointAtLength(Math.min(d + 1, len))
          const ang = (Math.atan2(p2.y - p.y, p2.x - p.x) * 180) / Math.PI
          // Grow as it nears the pin — the "flying toward you" depth read.
          const scale = 0.45 + 0.6 * prog.t
          plane.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${ang}) scale(${scale})`)
        },
      },
      '<0.1',
    )

    // Pin drops in as the plane lands on it; the plane fades once parked.
    tl.fromTo(q('.cut__pin'), { scale: 0, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.42, ease: 'back.out(2.2)' }, '>-0.35')
    tl.to(q('.cut__pin-pulse'), { scale: 2.4, opacity: 0, duration: 0.7, ease: 'power2.out' }, '<')
    tl.to(plane, { autoAlpha: 0, duration: 0.3 }, '<0.2')
    tl.to(q('.cut__caption--venue'), { opacity: 0, duration: 0.3 }, '+=0.5')
    tl.to(q('.cut__map'), { autoAlpha: 0, duration: 0.35 }, '<')

    // --- Beat 3 — hype text ---
    tl.add(() => setBeat('hype'))
    tl.fromTo(q('.cut__hype-line'), { opacity: 0, x: -48, skewX: -10 }, { opacity: 1, x: 0, skewX: 0, duration: 0.42, stagger: 0.5, ease: 'power3.out' }, '<0.1')
    tl.to({}, { duration: 0.7 })
    tl.to(q('.cut__hype'), { autoAlpha: 0, duration: 0.3 }, '+=0')

    // --- Beat 4 — whistle countdown + hard cut ---
    tl.add(() => setBeat('count'))
    for (const n of ['3', '2', '1']) {
      tl.add(() => {
        const el = q('.cut__count')[0]
        if (el) el.textContent = n
      })
      tl.fromTo(q('.cut__count'), { scale: 1.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: 'power2.out' })
      tl.to(q('.cut__count'), { opacity: 0, duration: 0.18, ease: 'power2.in' }, '+=0.22')
    }
    tl.to(q('.cut__flash'), { opacity: 1, duration: 0.14, ease: 'power2.in' })

    return () => tl.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const skip = () => {
    tlRef.current?.kill()
    finish()
  }

  return (
    <div className="cutscene" ref={rootRef} data-beat={beat} role="dialog" aria-label="Pregame sequence">
      {/* Beat 2 — vintage aeronautical chart */}
      <div className="cut__map" aria-hidden="true">
        <svg className="cut__chart" viewBox={MAP_VIEWBOX} preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="cut-grat" width="62.5" height="62.5" patternUnits="userSpaceOnUse">
              <path d="M62.5 0 H0 V62.5" fill="none" stroke="var(--cut-line)" strokeWidth="1" />
            </pattern>
            <radialGradient id="cut-vignette" cx="50%" cy="46%" r="72%">
              <stop offset="55%" stopColor="transparent" />
              <stop offset="100%" stopColor="var(--cut-vignette)" />
            </radialGradient>
          </defs>

          <rect width="1000" height="600" fill="url(#cut-grat)" />

          {/* Host-nation coastlines (6a) — a faint sepia land layer under the route. */}
          <g className="cut__geo" aria-hidden="true">
            <path d={GEO.canada} />
            <path d={GEO.usa} />
            <path d={GEO.mexico} />
          </g>

          {/* Ornamental double border */}
          <rect x="24" y="24" width="952" height="552" fill="none" stroke="var(--cut-frame)" strokeWidth="3" />
          <rect x="34" y="34" width="932" height="532" fill="none" stroke="var(--cut-frame)" strokeWidth="1" />

          {/* Compass rose, lower-left */}
          <g className="cut__compass" transform="translate(120 470)">
            <circle r="46" fill="none" stroke="var(--cut-frame)" strokeWidth="1.5" />
            <circle r="30" fill="none" stroke="var(--cut-line)" strokeWidth="1" />
            <path d="M0 -52 L9 -6 L0 0 L-9 -6 Z" fill="var(--cut-frame)" />
            <path d="M0 52 L9 6 L0 0 L-9 6 Z" fill="var(--cut-line)" />
            <path d="M52 0 L6 9 L0 0 L6 -9 Z" fill="var(--cut-line)" />
            <path d="M-52 0 L-6 9 L0 0 L-6 -9 Z" fill="var(--cut-line)" />
            <text x="0" y="-58" className="cut__compass-n">N</text>
          </g>

          {/* Flight arc: plane enters from off-screen (lower-left) and closes on
              the projected destination pin. No origin marker — it just arrives. */}
          <path
            ref={pathRef}
            className="cut__route"
            d={routeD}
            fill="none"
            stroke="var(--cut-route)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="9 10"
          />

          {/* Destination pin at the venue's real projected coordinate. */}
          <g className="cut__pin" transform={`translate(${dest.x} ${dest.y})`}>
            <circle className="cut__pin-pulse" cx="0" cy="0" r="12" fill="none" stroke="var(--cut-route)" strokeWidth="2.5" />
            <path d="M0 4 C -12 -12 -12 -26 0 -34 C 12 -26 12 -12 0 4 Z" fill="var(--cut-route)" stroke="var(--cut-parchment)" strokeWidth="1.5" />
            <circle cx="0" cy="-20" r="5.5" fill="var(--cut-parchment)" />
          </g>

          <g ref={planeRef} className="cut__plane-wrap" style={{ opacity: 0 }}>
            <PlaneGlyph />
          </g>

          <rect width="1000" height="600" fill="url(#cut-vignette)" />
        </svg>
      </div>

      <p className="cut__caption cut__caption--venue">
        {venue.name}
        <span className="cut__caption-city">Arriving · {venue.city}</span>
      </p>

      {/* Beat 1 — VS card */}
      <div className="cut__vs">
        <div className="cut__side cut__side--home">
          {homeFlag && <img className="cut__flag" src={homeFlag} alt="" width="120" height="90" />}
          <span className="cut__code">{homeCode}</span>
          <span className="cut__team display">{home}</span>
        </div>
        <span className="cut__vs-badge display">VS</span>
        <div className="cut__side cut__side--away">
          {awayFlag && <img className="cut__flag" src={awayFlag} alt="" width="120" height="90" />}
          <span className="cut__code">{awayCode}</span>
          <span className="cut__team display">{away}</span>
        </div>
      </div>

      {/* Beat 3 — hype */}
      <div className="cut__hype">
        {hype.map((line, i) => (
          <p className="cut__hype-line" key={i}>{line}</p>
        ))}
      </div>

      {/* Beat 4 — countdown + hard cut */}
      <div className="cut__count display" aria-hidden="true" />
      <div className="cut__flash" aria-hidden="true" />
      <button className="cut__skip" type="button" onClick={skip}>Skip ›</button>
    </div>
  )
}
