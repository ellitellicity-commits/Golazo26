import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import Typewriter from './Typewriter'
import './HostMascot.css'

// Original host-nation mascots for the Atlas (Part 2). Bespoke inline SVGs —
// NOT scraped clipart — so every body part is a clean, named group that GSAP can
// drive: entrance, a looping idle, blinking eyes, and a species-specific burst
// with a facial expression on poke. Three characters, one per 2026 host, each
// wearing its nation's identity colour (the same host-identity treatment the
// globe HOST_TINTS and CountryEmblem already use — distinct from the role-locked
// data channels). They pop in on the LEFT of the Atlas stage when a host nation
// is opened; the 45 non-host nations get none. Everything degrades to a static
// pose under prefers-reduced-motion, and all timelines are killed on unmount.
//
//   Canada  — Maple, a moose in a Canadian-red kit, palmate antlers.
//   USA     — Clutch, a bison in an American-blue kit, shaggy mane + horns.
//   Mexico  — Zayu, an armadillo in a Mexican-green kit, sombrero + curl tail.

// A tiny football, shared by all three (at the mascot's feet).
function Ball({ x, y }) {
  return (
    <g className="m-ball" transform={`translate(${x} ${y})`}>
      <circle r="15" fill="#f6f6f6" stroke="#20242a" strokeWidth="1.4" />
      <path d="M0 -7 6.7 -2.2 4.1 5.7 -4.1 5.7 -6.7 -2.2Z" fill="#20242a" />
      <path d="M0 -7V-15M6.7 -2.2 14 -5M4.1 5.7 9 12M-4.1 5.7 -9 12M-6.7 -2.2 -14 -5"
        fill="none" stroke="#20242a" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  )
}

// --- Maple — moose (Canada) ---------------------------------------------------
function Maple() {
  const fur = '#7d5a3f', furDark = '#5f4530', antler = '#cbab7d', kit = 'var(--canadian-red)'
  return (
    <g className="m-mascot">
      <Ball x={152} y={224} />
      <g className="m-legs">
        <rect className="m-leg-l" x="78" y="192" width="20" height="46" rx="9" fill={fur} />
        <rect className="m-leg-r" x="104" y="192" width="20" height="46" rx="9" fill={fur} />
        <ellipse cx="88" cy="236" rx="13" ry="6" fill={furDark} />
        <ellipse cx="114" cy="236" rx="13" ry="6" fill={furDark} />
      </g>
      <g className="m-torso">
        <path d="M62 150 Q60 118 101 116 Q142 118 140 150 L138 196 Q101 210 64 196Z" fill={kit} />
        <path d="M101 118 L101 200" stroke="#00000022" strokeWidth="3" />
        <text x="101" y="176" className="m-num" textAnchor="middle">26</text>
        <g className="m-arm-l"><path d="M64 150 Q40 138 34 108" stroke={fur} strokeWidth="15" strokeLinecap="round" fill="none" /><circle cx="34" cy="106" r="9" fill={fur} /></g>
        <g className="m-arm-r"><path d="M138 152 Q160 160 162 186" stroke={fur} strokeWidth="15" strokeLinecap="round" fill="none" /><circle cx="162" cy="188" r="9" fill={fur} /></g>
      </g>
      <g className="m-head">
        <g className="m-antlers">
          <path d="M70 62 Q44 52 40 30 Q56 40 58 26 Q66 40 66 22 Q74 40 80 34 L84 58Z" fill={antler} stroke={furDark} strokeWidth="1.5" />
          <path d="M132 62 Q158 52 162 30 Q146 40 144 26 Q136 40 136 22 Q128 40 122 34 L118 58Z" fill={antler} stroke={furDark} strokeWidth="1.5" />
        </g>
        <ellipse className="m-ear m-ear-l" cx="66" cy="70" rx="12" ry="18" fill={fur} transform="rotate(-24 66 70)" />
        <ellipse className="m-ear m-ear-r" cx="136" cy="70" rx="12" ry="18" fill={fur} transform="rotate(24 136 70)" />
        <ellipse cx="101" cy="86" rx="42" ry="38" fill={fur} />
        <ellipse cx="101" cy="112" rx="30" ry="24" fill="#a3805e" />
        <g className="m-eyes">
          <ellipse cx="86" cy="80" rx="8.5" ry="9.5" fill="#fff" /><circle cx="87" cy="82" r="4.2" fill="#20242a" />
          <ellipse cx="116" cy="80" rx="8.5" ry="9.5" fill="#fff" /><circle cx="115" cy="82" r="4.2" fill="#20242a" />
        </g>
        <path className="m-brow m-brow-l" d="M78 66 Q86 62 95 66" stroke={furDark} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path className="m-brow m-brow-r" d="M107 66 Q116 62 124 66" stroke={furDark} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="92" cy="108" rx="4" ry="3" fill={furDark} /><ellipse cx="110" cy="108" rx="4" ry="3" fill={furDark} />
        <path className="m-mouth" d="M90 118 Q101 128 112 118" stroke={furDark} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </g>
  )
}

// --- Clutch — bison (USA) -----------------------------------------------------
function Clutch() {
  const fur = '#5a4536', furDark = '#402f24', mane = '#6e5642', horn = '#e7dcc4', kit = 'var(--american-blue)'
  return (
    <g className="m-mascot">
      <Ball x={150} y={224} />
      <g className="m-legs">
        <rect className="m-leg-l" x="80" y="194" width="21" height="44" rx="9" fill={fur} />
        <rect className="m-leg-r" x="106" y="194" width="21" height="44" rx="9" fill={fur} />
        <ellipse cx="90" cy="236" rx="14" ry="6" fill={furDark} />
        <ellipse cx="116" cy="236" rx="14" ry="6" fill={furDark} />
      </g>
      <g className="m-torso">
        <path d="M60 152 Q58 120 103 118 Q148 120 146 152 L143 198 Q103 212 63 198Z" fill={kit} />
        <text x="103" y="178" className="m-num" textAnchor="middle">USA</text>
        <g className="m-arm-l"><path d="M63 152 Q38 140 32 110" stroke={fur} strokeWidth="16" strokeLinecap="round" fill="none" /><circle cx="32" cy="108" r="10" fill={fur} /></g>
        <g className="m-arm-r"><path d="M143 154 Q168 162 170 188" stroke={fur} strokeWidth="16" strokeLinecap="round" fill="none" /><circle cx="170" cy="190" r="10" fill={fur} /></g>
      </g>
      <g className="m-head">
        {/* shaggy mane behind the head */}
        <path d="M52 96 Q44 60 74 52 Q103 40 132 52 Q162 60 154 96 Q150 120 103 122 Q56 120 52 96Z" fill={mane} />
        <g className="m-horns">
          <path d="M64 70 Q46 66 44 80 Q52 78 58 82" fill="none" stroke={horn} strokeWidth="6" strokeLinecap="round" />
          <path d="M138 70 Q156 66 158 80 Q150 78 144 82" fill="none" stroke={horn} strokeWidth="6" strokeLinecap="round" />
        </g>
        <ellipse className="m-ear m-ear-l" cx="66" cy="82" rx="9" ry="7" fill={fur} />
        <ellipse className="m-ear m-ear-r" cx="140" cy="82" rx="9" ry="7" fill={fur} />
        <ellipse cx="103" cy="92" rx="40" ry="36" fill={fur} />
        <ellipse cx="103" cy="112" rx="26" ry="20" fill="#3b2c22" />
        <path d="M95 64 Q103 58 111 64" fill="none" stroke={mane} strokeWidth="5" strokeLinecap="round" />
        <g className="m-eyes">
          <ellipse cx="89" cy="86" rx="8" ry="9" fill="#fff" /><circle cx="90" cy="88" r="4" fill="#20242a" />
          <ellipse cx="117" cy="86" rx="8" ry="9" fill="#fff" /><circle cx="116" cy="88" r="4" fill="#20242a" />
        </g>
        <path className="m-brow m-brow-l" d="M80 72 Q89 68 98 73" stroke={furDark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path className="m-brow m-brow-r" d="M108 73 Q117 68 126 72" stroke={furDark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <ellipse cx="95" cy="110" rx="4.2" ry="3" fill="#20242a" /><ellipse cx="111" cy="110" rx="4.2" ry="3" fill="#20242a" />
        <path className="m-mouth" d="M91 120 Q103 130 115 120" stroke={furDark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      </g>
    </g>
  )
}

// --- Zayu — armadillo (Mexico) ------------------------------------------------
function Zayu() {
  const body = '#c6a074', shell = '#9d7546', shellDark = '#7c5a34', kit = 'var(--mexican-green)'
  const straw = '#e0c07e', strawDark = '#c39a4e'
  return (
    <g className="m-mascot">
      <Ball x={150} y={224} />
      <g className="m-tail"><path d="M132 200 Q168 200 170 168 Q162 174 158 168 Q160 188 132 190Z" fill={shell} stroke={shellDark} strokeWidth="1.5" /></g>
      <g className="m-legs">
        <rect className="m-leg-l" x="80" y="194" width="20" height="44" rx="9" fill={body} />
        <rect className="m-leg-r" x="104" y="194" width="20" height="44" rx="9" fill={body} />
        <ellipse cx="90" cy="236" rx="13" ry="6" fill={shellDark} />
        <ellipse cx="114" cy="236" rx="13" ry="6" fill={shellDark} />
      </g>
      <g className="m-torso">
        <path d="M62 152 Q60 120 102 118 Q144 120 142 152 L139 198 Q102 212 65 198Z" fill={kit} />
        {/* banded armadillo shell over one shoulder */}
        <path d="M100 118 Q146 120 143 154 L141 178 Q120 190 100 190Z" fill={shell} opacity="0.92" />
        <path d="M104 128 H140M104 142 H141M104 156 H140M106 170 H136" stroke={shellDark} strokeWidth="2" strokeLinecap="round" />
        <text x="86" y="176" className="m-num" textAnchor="middle">10</text>
        <g className="m-arm-l"><path d="M64 152 Q40 140 34 112" stroke={body} strokeWidth="14" strokeLinecap="round" fill="none" /><circle cx="34" cy="110" r="9" fill={body} /></g>
        <g className="m-arm-r"><path d="M140 156 Q162 164 164 188" stroke={body} strokeWidth="14" strokeLinecap="round" fill="none" /><circle cx="164" cy="190" r="9" fill={body} /></g>
      </g>
      <g className="m-head">
        <ellipse className="m-ear m-ear-l" cx="72" cy="72" rx="7" ry="14" fill={body} transform="rotate(-18 72 72)" />
        <ellipse className="m-ear m-ear-r" cx="128" cy="72" rx="7" ry="14" fill={body} transform="rotate(18 128 72)" />
        <ellipse cx="100" cy="92" rx="38" ry="35" fill={body} />
        <path d="M100 100 Q78 104 74 122 Q100 132 126 122 Q122 104 100 100Z" fill="#d8b98d" />
        <g className="m-eyes">
          <ellipse cx="87" cy="86" rx="8" ry="9" fill="#fff" /><circle cx="88" cy="88" r="4" fill="#20242a" />
          <ellipse cx="113" cy="86" rx="8" ry="9" fill="#fff" /><circle cx="112" cy="88" r="4" fill="#20242a" />
        </g>
        <path className="m-brow m-brow-l" d="M79 72 Q87 68 96 72" stroke={shellDark} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path className="m-brow m-brow-r" d="M104 72 Q113 68 121 72" stroke={shellDark} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="100" cy="116" rx="6" ry="4.5" fill="#20242a" />
        <path className="m-mouth" d="M88 124 Q100 133 112 124" stroke={shellDark} strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* sombrero */}
        <g className="m-hat">
          <ellipse cx="100" cy="58" rx="58" ry="13" fill={straw} stroke={strawDark} strokeWidth="1.5" />
          <path d="M74 58 Q78 26 100 24 Q122 26 126 58Z" fill={straw} stroke={strawDark} strokeWidth="1.5" />
          <ellipse cx="100" cy="58" rx="26" ry="6" fill="var(--mexican-green)" />
        </g>
      </g>
    </g>
  )
}

// Per-mascot SVG pivots (svgOrigin) for the shared tour-beat animations, plus the
// full nation name for the "Explore …" hand-off button.
const ORIGINS = {
  CA: { country: 'Canada', armL: '64 150', armR: '138 152', center: '101 124' },
  US: { country: 'United States', armL: '63 152', armR: '143 154', center: '103 122' },
  MX: { country: 'Mexico', armL: '64 152', armR: '140 156', center: '100 124' },
}

// Guided-tour scripts (Part 2a) — real, confirmed WC2026 facts only. Each beat
// names the mascot animation it plays. The mascot speaks directly to the user.
const TOURS = {
  CA: [
    { line: "Welcome to Canada! 🍁 Co-hosting our very first men's World Cup!", anim: 'wave' },
    { line: 'Three cities in the mix — Toronto, Vancouver, and Edmonton!', anim: 'jump' },
    { line: "BC Place in Vancouver has one of the world's largest retractable roofs!", anim: 'point' },
    { line: 'We thrashed Qatar 6-0 for our first ever World Cup win. History made!', anim: 'celebrate' },
  ],
  US: [
    { line: "Welcome to the USA! 🦅 We're hosting 11 of the 16 venues — biggest share!", anim: 'wave' },
    { line: 'MetLife Stadium in New Jersey hosts the Final on 19 July 2026!', anim: 'point' },
    { line: "Our first men's World Cup since 1994 — and this time we're IN it!", anim: 'jump' },
    { line: 'From Seattle to Miami, the whole country is a football pitch right now!', anim: 'celebrate' },
  ],
  MX: [
    { line: '¡Bienvenidos a México! 🌵 First nation to host or co-host THREE World Cups!', anim: 'wave' },
    { line: 'Estadio Azteca has seen two World Cup finals — 1970 AND 1986!', anim: 'point' },
    { line: 'Guadalajara and Monterrey join Mexico City — three iconic football cities!', anim: 'jump' },
    { line: 'The atmosphere here? Unmatched. The whole country bleeds football!', anim: 'celebrate' },
  ],
}

// The four tour-beat animations (Part 2b). Each takes the scoped selector + the
// mascot's pivots; they drive the existing named SVG groups only (no path edits),
// so they survive the Part 6 redraw untouched.
const BEAT_ANIM = {
  wave: (q, o) => {
    gsap.fromTo(q('.m-arm-l'), { rotation: 0 }, { rotation: -34, duration: 0.32, yoyo: true, repeat: 3, svgOrigin: o.armL, ease: 'sine.inOut' })
    gsap.fromTo(q('.m-head'), { rotation: 0 }, { rotation: 7, duration: 0.42, yoyo: true, repeat: 1, svgOrigin: o.center, ease: 'sine.inOut' })
  },
  jump: (q) => {
    gsap.fromTo(q('.m-mascot'), { y: 0 }, { y: -28, duration: 0.28, yoyo: true, repeat: 1, ease: 'power2.out' })
    gsap.fromTo(q('.m-mascot'), { scaleY: 1 }, { scaleY: 0.9, duration: 0.12, delay: 0.56, yoyo: true, repeat: 1, transformOrigin: '50% 100%', ease: 'power2.out' })
  },
  point: (q, o) => {
    gsap.fromTo(q('.m-arm-r'), { rotation: 0 }, { rotation: 42, duration: 0.34, yoyo: true, repeat: 1, repeatDelay: 0.7, svgOrigin: o.armR, ease: 'power2.out' })
  },
  celebrate: (q, o) => {
    gsap.fromTo(q('.m-arm-l'), { rotation: 0 }, { rotation: -48, duration: 0.3, yoyo: true, repeat: 1, repeatDelay: 0.6, svgOrigin: o.armL, ease: 'back.out(2)' })
    gsap.fromTo(q('.m-arm-r'), { rotation: 0 }, { rotation: 48, duration: 0.3, yoyo: true, repeat: 1, repeatDelay: 0.6, svgOrigin: o.armR, ease: 'back.out(2)' })
    gsap.fromTo(q('.m-mascot'), { rotation: 0 }, { rotation: 360, duration: 0.72, ease: 'power2.inOut', svgOrigin: o.center })
  },
}

// iso → mascot definition. Facts are real, checkable World Cup 2026 / host notes.
const MASCOTS = {
  CA: {
    name: 'Maple', kind: 'the Moose', Art: Maple,
    facts: [
      'Canada co-hosts its first men’s World Cup in 2026.',
      'Toronto’s BMO Field and Vancouver’s BC Place stage the Canadian matches.',
      'BC Place has one of the world’s largest cable-supported retractable roofs.',
    ],
    // Antlers wiggle + a happy jump.
    poke: (q) => {
      gsap.fromTo(q('.m-antlers'), { rotation: 0 }, { rotation: 14, duration: 0.14, yoyo: true, repeat: 5, transformOrigin: '50% 100%', svgOrigin: '101 58', ease: 'sine.inOut' })
      gsap.fromTo(q('.m-mascot'), { y: 0 }, { y: -22, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.out' })
    },
  },
  US: {
    name: 'Clutch', kind: 'the Bison', Art: Clutch,
    facts: [
      'The USA stages 11 of the 16 tournament venues.',
      'MetLife Stadium in New Jersey hosts the Final on 19 July 2026.',
      'It is the USA’s first men’s World Cup since 1994.',
    ],
    // Head lowers to charge + a hoof stomp.
    poke: (q) => {
      gsap.fromTo(q('.m-head'), { rotation: 0 }, { rotation: -12, duration: 0.16, yoyo: true, repeat: 3, svgOrigin: '103 122', ease: 'power2.inOut' })
      gsap.fromTo(q('.m-leg-r'), { rotation: 0 }, { rotation: 18, duration: 0.12, yoyo: true, repeat: 5, svgOrigin: '116 196', ease: 'sine.inOut' })
    },
  },
  MX: {
    name: 'Zayu', kind: 'the Armadillo', Art: Zayu,
    facts: [
      'Mexico is the first nation to host or co-host three men’s World Cups.',
      'Estadio Azteca has staged two World Cup finals: 1970 and 1986.',
      'Guadalajara and Monterrey join Mexico City as 2026 host cities.',
    ],
    // Tail swings up + a quick sideways curl-squash.
    poke: (q) => {
      gsap.fromTo(q('.m-tail'), { rotation: 0 }, { rotation: -55, duration: 0.24, yoyo: true, repeat: 3, svgOrigin: '132 195', ease: 'sine.inOut' })
      gsap.fromTo(q('.m-mascot'), { scaleX: 1 }, { scaleX: 0.86, duration: 0.18, yoyo: true, repeat: 1, transformOrigin: '50% 100%', ease: 'power2.out' })
    },
  },
}

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// A short CSS-only confetti burst for the tour's 'celebrate' beat (Part 2b) —
// small coloured dots that fling out from the mascot and fade. Keyed on `fire`
// so each celebrate remounts and replays. Host identity + gold, restrained count.
const BURST_COLORS = ['var(--host-colour, var(--ink))', '#f6f6f6', 'var(--trophy-gold)']
function ConfettiBurst({ fire }) {
  if (!fire || reduced()) return null
  const dots = Array.from({ length: 14 }, (_, i) => {
    const ang = (i / 14) * Math.PI * 2 + (i % 2) * 0.4
    const dist = 46 + (i % 4) * 12
    return {
      key: `${fire}-${i}`,
      '--tx': `${Math.cos(ang) * dist}px`,
      '--ty': `${Math.sin(ang) * dist - 14}px`,
      background: BURST_COLORS[i % BURST_COLORS.length],
      animationDelay: `${(i % 5) * 18}ms`,
    }
  })
  return (
    <span className="mascot__confetti" aria-hidden="true">
      {dots.map(({ key, ...style }) => (
        <span key={key} className="mascot__confetti-dot" style={style} />
      ))}
    </span>
  )
}

export default function HostMascot({ iso, variant = 'panel', onExplore }) {
  const code = (iso || '').toUpperCase()
  const def = MASCOTS[code]
  const origins = ORIGINS[code]
  const tour = TOURS[code]
  const isTour = variant === 'tour' && !!tour
  const rootRef = useRef(null)
  const [factIdx, setFactIdx] = useState(0)
  // Tour progression: 'tour' walks the beats; 'idle' is the post-tour resting
  // state where poking cycles fun facts. Non-tour (panel) variant starts idle.
  const [phase, setPhase] = useState(isTour ? 'tour' : 'idle')
  const [beat, setBeat] = useState(0)
  const [burst, setBurst] = useState(0)

  // Play one tour beat's animation against the live SVG.
  const playBeat = (i) => {
    const root = rootRef.current
    if (!root || !origins || reduced()) return
    const q = gsap.utils.selector(root)
    const anim = tour[i]?.anim
    if (anim && BEAT_ANIM[anim]) BEAT_ANIM[anim](q, origins)
    if (anim === 'celebrate') setBurst((b) => b + 1)
  }

  // Entrance + looping idle + blink. Rebuilds when the host nation changes.
  //
  // Scoped to a gsap.context and torn down with ctx.revert() (not a bare kill).
  // Under React StrictMode the effect mounts → cleans up → remounts, and a killed
  // gsap.from() leaves its targets frozen at the from-state (opacity 0, off to the
  // left) — so on remount a fresh gsap.from({opacity:0}) reads that 0 as its END
  // value and animates 0→0, leaving the character permanently invisible while the
  // un-animated bubble still shows. revert() restores the original inline styles,
  // so every (re)mount animates in from a clean, visible baseline.
  useEffect(() => {
    setFactIdx(0)
    setPhase(isTour ? 'tour' : 'idle')
    setBeat(0)
    const root = rootRef.current
    if (!def || !root || reduced()) return undefined
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root)
      gsap.from(q('.m-torso'), { x: -240, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' })
      gsap.from(q('.m-head'), { x: -240, opacity: 0, duration: 0.5, delay: 0.08, ease: 'back.out(1.7)' })
      gsap.from([q('.m-legs'), q('.m-ball'), q('.m-tail')], { y: 46, opacity: 0, duration: 0.42, delay: 0.22, stagger: 0.05, ease: 'power2.out' })
      // Idle: body bob + head sway, starting once the entrance has landed.
      gsap.to(q('.m-torso'), { y: -6, duration: 0.95, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.75 })
      gsap.to(q('.m-head'), { rotation: 3, duration: 1.4, repeat: -1, yoyo: true, ease: 'sine.inOut', svgOrigin: origins?.center || '101 124', delay: 0.75 })
      // Blink.
      gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: 1.4 })
        .to(q('.m-eyes'), { scaleY: 0.12, duration: 0.08, transformOrigin: '50% 50%' })
        .to(q('.m-eyes'), { scaleY: 1, duration: 0.09 })
      // Tour: play the first beat's animation once the character has landed.
      if (isTour) gsap.delayedCall(0.85, () => playBeat(0))
    }, root)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, isTour])

  if (!def) return null

  // Advance the guided tour one beat; the last beat's button hands off to the
  // panel (onExplore) and drops the mascot into its idle resting state.
  const nextBeat = () => {
    if (beat >= tour.length - 1) {
      setPhase('idle')
      onExplore?.()
      return
    }
    const i = beat + 1
    setBeat(i)
    playBeat(i)
  }

  // Poke (idle): an excited expression (mouth grins, brows lift) plus the species
  // burst, then advance to the next fun fact.
  const poke = () => {
    const root = rootRef.current
    if (!root || reduced()) {
      setFactIdx((i) => (i + 1) % def.facts.length)
      return
    }
    const q = gsap.utils.selector(root)
    gsap.fromTo(q('.m-mouth'), { scaleY: 1 }, { scaleY: 2, duration: 0.2, yoyo: true, repeat: 1, transformOrigin: '50% 0%', ease: 'power2.out' })
    gsap.fromTo(q('.m-brow'), { y: 0 }, { y: -4, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' })
    def.poke(q)
    setFactIdx((i) => (i + 1) % def.facts.length)
  }

  const { Art, name, kind, facts } = def
  const inTour = isTour && phase === 'tour'
  const bubbleText = inTour ? tour[beat].line : facts[factIdx]
  const bubbleKey = inTour ? `${code}-beat-${beat}` : `${code}-fact-${factIdx}`
  const lastBeat = beat >= tour?.length - 1
  const figureLabel = inTour
    ? `${name} ${kind}. Tap to continue the tour.`
    : `${name} ${kind}, the ${origins?.country || ''} mascot. Activate for a fun fact.`

  return (
    <div className={`mascot${isTour ? ' mascot--tour' : ''}`} ref={rootRef} data-mascot={code} data-phase={phase}>
      <div className="mascot__bubble" aria-live="polite">
        <p className="mascot__hi">
          <span className="mascot__name">{name}</span> {kind}
        </p>
        <Typewriter key={bubbleKey} text={bubbleText} className="mascot__fact" />
        {inTour && (
          <div className="mascot__tour-controls">
            <span className="mascot__tour-dots" aria-hidden="true">
              {tour.map((_, i) => (
                <span key={i} className={`mascot__tour-dot${i === beat ? ' is-active' : ''}`} />
              ))}
            </span>
            <button type="button" className="mascot__next" onClick={nextBeat}>
              {lastBeat ? `Explore ${origins.country} →` : 'Next →'}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        className="mascot__figure"
        onClick={inTour ? nextBeat : poke}
        aria-label={figureLabel}
      >
        <svg viewBox="0 0 200 250" width="150" height="188" role="img" aria-hidden="true">
          <Art />
        </svg>
        <ConfettiBurst fire={burst} />
      </button>
    </div>
  )
}
