import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { GEO, MAP_VIEWBOX, project } from '../lib/cutsceneMap'
import { GEO_BORDERS } from '../lib/cutsceneMapBorders'
import { RefereeNarrator } from './RefereeMascot'
import './Cutscene.css'

// Short, generated whistle blow via the Web Audio API - no external file.
// Triggered on the hard cut, inside the user-initiated simulate gesture so the
// AudioContext is allowed to start. Silently no-ops if audio is unavailable or
// the user prefers reduced motion. A referee whistle reads as a bright pealing
// tone with a slight waver, not a flat single-frequency beep - the frequency
// ramp gives it that "peal" character - and the gain stays low so it doesn't
// blast out of the speakers.
function playWhistle() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(2800, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(3000, ctx.currentTime + 0.1)
    osc.frequency.linearRampToValueAtTime(2700, ctx.currentTime + 0.5)
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
    osc.onended = () => ctx.close?.()
  } catch {
    /* audio blocked - the visual flash carries the cut */
  }
}

// Pregame broadcast cutscene (B4, reworked in Part F) - an EA-Sports-FC-style
// intro, not a travel montage. One gsap.timeline() runs four sequenced beats so
// they never race:
//   1 VS card clash → 2 paper-map flight to the destination pin → 3 hype text →
//   4 whistle countdown → hard cut, then onComplete() reveals the result.
//
// Beat 2 replaces the old black-screen 3D stadium flyover with a vintage
// aeronautical-chart: an aged parchment map with a graticule + compass, a dashed
// flight arc that draws as a plane glyph flies along it, ending on a dropped pin
// at the destination city. Pure SVG + GSAP (no three.js here any more). The map's
// sepia/parchment palette is a deliberate, self-contained cinematic prop - the
// product chrome and its role-locked accents are untouched. All copy stays on the
// site stack (Barlow Condensed display, Noto Sans body). data-beat exposes the
// active beat for tests; skippable; degrades to an instant reveal under reduced
// motion.

// A top-down airliner glyph centred on its own origin so translate+rotate along
// the flight path orients it nose-first (nose at +X). Fuselage, swept delta
// wings and a tailplane - an actual plane silhouette, not an arrow.
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
  const trailNearRef = useRef(null)
  const trailFarRef = useRef(null)
  const planeRef = useRef(null)
  const tlRef = useRef(null)
  const doneRef = useRef(false)
  const [beat, setBeat] = useState('vs')

  // Destination pin, projected from the venue's real coordinate so it lands on
  // the actual host city (Part 1b) - never floating in the Atlantic. The plane
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
      // Reduced motion: hold the VS card briefly, then reveal - no motion.
      const t = setTimeout(finish, 700)
      return () => clearTimeout(t)
    }

    const tl = gsap.timeline({ onComplete: finish })
    tlRef.current = tl

    // --- Beat 1 - VS card clash ---
    setBeat('vs')
    tl.fromTo(q('.cut__side--home'), { xPercent: -160, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5, ease: 'power4.out' }, 0)
    tl.fromTo(q('.cut__side--away'), { xPercent: 160, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5, ease: 'power4.out' }, 0)
    tl.fromTo(q('.cut__vs-badge'), { scale: 0, rotate: -35 }, { scale: 1, rotate: 0, duration: 0.34, ease: 'back.out(2.4)' }, 0.26)
    tl.to(q('.cut__vs-badge'), { scale: 1.12, duration: 0.16, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.6)
    tl.to(q('.cut__vs'), { autoAlpha: 0, scale: 1.14, duration: 0.34, ease: 'power2.in' }, '+=0.9')

    // --- Beat 2 - paper-map flight to the destination pin ---
    tl.add(() => setBeat('flight'))
    tl.fromTo(q('.cut__map'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, '<')
    tl.fromTo(q('.cut__caption--venue'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '<0.2')

    // Fly the plane along the vintage-chart route: one progress tween samples
    // the path so the nose always points along the arc. The dashed route
    // itself (cut__route) is now a faint, always-visible flight-plan preview
    // rather than a solid line appearing instantly; two overlapping "trail"
    // paths (Part 2 overhaul) reveal a short, fading comet-tail that moves
    // with the plane, using the classic stroke-dasharray/dashoffset reveal
    // trick - a moving [d-trailLen, d] window rather than a monotonic 0→d
    // growth, so the tail actually trails instead of accumulating forever.
    const path = pathRef.current
    const plane = planeRef.current
    const trailNear = trailNearRef.current
    const trailFar = trailFarRef.current
    const len = path.getTotalLength()
    const setTrail = (el, trailLen, d) => {
      el.setAttribute('stroke-dasharray', `${trailLen} ${len + 10}`)
      el.setAttribute('stroke-dashoffset', `${-(d - trailLen)}`)
    }
    gsap.set(plane, { autoAlpha: 1 })
    setTrail(trailNear, 42, 0)
    setTrail(trailFar, 115, 0)
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
          // Grow as it nears the pin - the "flying toward you" depth read.
          const scale = 0.45 + 0.6 * prog.t
          plane.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${ang}) scale(${scale})`)
          setTrail(trailNear, 42, d)
          setTrail(trailFar, 115, d)
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

    // --- Beat 3 - hype (spoken by the referee, inside his bubble) ---
    tl.add(() => setBeat('hype'))
    tl.to({}, { duration: 0.5 }) // bubble + lines stagger in
    tl.to({}, { duration: 0.6 + 0.5 * hype.length }) // dwell long enough to read

    // --- Beat 4 - the referee owns the countdown, then the whistle + hard cut ---
    // COUNTDOWN NUMBER REMOVED - the referee raising the whistle IS the countdown,
    // so the 3-2-1 no longer flashes on screen. This single dwell preserves the
    // original beat's total length (3 * 0.6s) so the whistle still fires on the
    // exact same cue and the rest of the sequence timing is unchanged.
    tl.add(() => setBeat('count'))
    tl.to({}, { duration: 1.8 })
    // The whistle blow: referee reacts (beat → 'whistle'), audio fires, screen flash.
    tl.add(() => { setBeat('whistle'); playWhistle() })
    tl.to(q('.cut__flash'), { opacity: 1, duration: 0.14, ease: 'power2.in' })

    return () => tl.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const skip = () => {
    tlRef.current?.kill()
    finish()
  }

  // The referee narrates every beat from centre-bottom. During the hype beat his
  // bubble carries the hype lines themselves, so all pregame copy lives in one
  // place above his head rather than floating loose across the screen.
  // No line on the count beat: the referee raises the whistle in silence, so the
  // bubble is hidden and he alone owns the moment (there is no on-screen 3-2-1
  // number any more). His arm-raise is the focus; the whistle blow lands next beat.
  const refLine =
    beat === 'vs' ? `${homeCode} versus ${awayCode}. Let's have a clean game.`
      : beat === 'flight' ? `Next stop: ${venue.city}.`
        : null
  const refLines = beat === 'hype' ? hype : null

  return (
    <div className="cutscene" ref={rootRef} data-beat={beat} role="dialog" aria-label="Pregame sequence">
      {/* Beat 2 - vintage aeronautical chart */}
      <div className="cut__map" aria-hidden="true">
        <svg className="cut__chart" viewBox={MAP_VIEWBOX} preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="cut-grat" width="62.5" height="62.5" patternUnits="userSpaceOnUse">
              <path d="M62.5 0 H0 V62.5" fill="none" stroke="var(--cut-line)" strokeWidth="1" />
            </pattern>
            {/* Engraved-sea texture (Part 2 overhaul) - fine wave hatching under the
                land, the signature depth cue of a real vintage nautical/aeronautical
                chart: water reads as worked engraving, land as clean parchment. */}
            <pattern id="cut-sea" width="26" height="14" patternUnits="userSpaceOnUse">
              <path d="M0 7 Q6.5 2 13 7 T26 7" fill="none" stroke="var(--cut-line)" strokeWidth="0.8" />
            </pattern>
            <radialGradient id="cut-vignette" cx="50%" cy="46%" r="72%">
              <stop offset="55%" stopColor="transparent" />
              <stop offset="100%" stopColor="var(--cut-vignette)" />
            </radialGradient>
          </defs>

          <rect width="1000" height="600" fill="url(#cut-sea)" opacity="0.55" />
          <rect width="1000" height="600" fill="url(#cut-grat)" />

          {/* Host-nation coastlines (6a, Part 2 overhaul) - a sepia land layer under
              the route, each host washed with a faint tint of its own role colour
              (Canada red / USA blue / Mexico green - the same identity treatment as
              the Atlas globe, not a new use of the role-locked data channels) so the
              three hosts read at a glance without breaking the parchment mood. */}
          <g className="cut__geo" aria-hidden="true">
            <path className="cut__geo-land cut__geo-land--ca" d={GEO.canada} />
            <path className="cut__geo-land cut__geo-land--us" d={GEO.usa} />
            <path className="cut__geo-land cut__geo-land--mx" d={GEO.mexico} />
          </g>

          {/* Province/state borders (Part 2 overhaul) - very fine, low-opacity
              hairlines, clearly subordinate to the crisp coastline strokes below;
              an authentic touch real vintage atlases carried too. */}
          <g className="cut__borders" aria-hidden="true">
            <path d={GEO_BORDERS.canada} />
            <path d={GEO_BORDERS.usa} />
            <path d={GEO_BORDERS.mexico} />
          </g>

          {/* Coastline strokes on top of the tint/borders - crisp and confident. */}
          <g className="cut__coast" aria-hidden="true">
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
              the projected destination pin. No origin marker - it just arrives.
              A faint flight-plan preview, dashed, visible for the whole beat -
              the comet-tail (below) is what actually reads as "flown". */}
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
          {/* Comet-tail (Part 2 overhaul): two solid overlapping segments, driven
              by the same flight progress in the onUpdate above, giving a short
              fading trail that moves with the plane instead of a line that
              either snaps in fully or grows and stays solid forever. */}
          <path ref={trailFarRef} className="cut__route-trail cut__route-trail--far" d={routeD} fill="none" strokeLinecap="round" />
          <path ref={trailNearRef} className="cut__route-trail cut__route-trail--near" d={routeD} fill="none" strokeLinecap="round" />

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

      {/* Beat 1 - VS card */}
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

      {/* Beat 4 - COUNTDOWN REMOVED; the referee owns this moment (see Beat 4 above). */}
      {/* <div className="cut__count display" aria-hidden="true" /> */}
      <div className="cut__flash" aria-hidden="true" />

      {/* The referee narrates from centre-bottom, reacting to each beat. The hype
          lines ride inside his bubble during the hype beat. */}
      <RefereeNarrator beat={beat} line={refLine} lines={refLines} />

      <button className="cut__skip" type="button" onClick={skip}>Skip ›</button>
    </div>
  )
}
