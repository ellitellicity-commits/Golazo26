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
// Forward-leaning and eager: oversized, slightly asymmetric palmate antlers, huge
// warm eyes (left larger), a long droopy snout, and one hoof raising the ball
// aloft like a trophy. Thick hand-drawn outlines throughout.
function Maple() {
  const fur = '#8a6440', furDark = '#5a3f2b', snout = '#a6825d', antler = '#d9bd8f', kit = 'var(--canadian-red)'
  const OL = '#20242a', OLW = 2.5
  return (
    <g className="m-mascot">
      <g className="m-legs">
        <rect className="m-leg-l" x="80" y="198" width="19" height="40" rx="9" fill={fur} stroke={OL} strokeWidth={OLW} />
        <rect className="m-leg-r" x="105" y="198" width="19" height="40" rx="9" fill={fur} stroke={OL} strokeWidth={OLW} />
        <ellipse cx="89" cy="238" rx="13" ry="6" fill={furDark} stroke={OL} strokeWidth="2" />
        <ellipse cx="115" cy="238" rx="13" ry="6" fill={furDark} stroke={OL} strokeWidth="2" />
      </g>
      {/* torso leans forward — its top edge sits right of the base */}
      <g className="m-torso">
        <path d="M64 150 Q66 116 108 116 Q150 118 144 152 L138 198 Q100 210 62 196Z" fill={kit} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
        <text x="103" y="178" className="m-num" textAnchor="middle">26</text>
        {/* left arm swings free (drives the wave) */}
        <g className="m-arm-l"><path d="M66 152 Q40 148 32 118" stroke={fur} strokeWidth="15" strokeLinecap="round" fill="none" /><circle cx="32" cy="115" r="10" fill={fur} stroke={OL} strokeWidth={OLW} /></g>
        {/* right arm raised, holding the ball aloft like a trophy */}
        <g className="m-arm-r"><path d="M142 152 Q168 142 170 108" stroke={fur} strokeWidth="15" strokeLinecap="round" fill="none" /><circle cx="170" cy="106" r="10" fill={fur} stroke={OL} strokeWidth={OLW} /></g>
      </g>
      <Ball x={170} y={88} />
      <g className="m-head">
        {/* big, branching, slightly asymmetric antlers */}
        <g className="m-antlers">
          <path d="M74 54 Q46 44 38 18 Q54 30 56 16 Q66 32 66 12 Q76 30 84 26 L88 52Z" fill={antler} stroke={furDark} strokeWidth="2" strokeLinejoin="round" />
          <path d="M128 54 Q160 40 172 12 Q152 28 150 12 Q140 30 138 10 Q130 30 120 24 L116 52Z" fill={antler} stroke={furDark} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <ellipse className="m-ear m-ear-l" cx="66" cy="72" rx="12" ry="18" fill={fur} stroke={OL} strokeWidth={OLW} transform="rotate(-26 66 72)" />
        <ellipse className="m-ear m-ear-r" cx="138" cy="72" rx="12" ry="18" fill={fur} stroke={OL} strokeWidth={OLW} transform="rotate(26 138 72)" />
        {/* head — pushed slightly forward of centre for the eager lean */}
        <ellipse cx="103" cy="86" rx="46" ry="40" fill={fur} stroke={OL} strokeWidth={OLW} />
        {/* long droopy snout */}
        <path d="M103 96 Q74 100 72 124 Q80 140 103 140 Q126 140 134 124 Q132 100 103 96Z" fill={snout} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
        {/* huge warm eyes, left larger (asymmetry) */}
        <g className="m-eyes">
          <ellipse cx="86" cy="80" rx="11" ry="12" fill="#fff" stroke={OL} strokeWidth="2" /><circle cx="88" cy="82" r="5.4" fill="#20242a" /><circle cx="90.4" cy="79.6" r="1.7" fill="#fff" />
          <ellipse cx="118" cy="81" rx="9" ry="10" fill="#fff" stroke={OL} strokeWidth="2" /><circle cx="119" cy="83" r="4.4" fill="#20242a" /><circle cx="121" cy="80.6" r="1.4" fill="#fff" />
        </g>
        <path className="m-brow m-brow-l" d="M76 62 Q86 56 97 62" stroke={furDark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path className="m-brow m-brow-r" d="M109 63 Q118 58 127 64" stroke={furDark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <ellipse cx="92" cy="120" rx="4" ry="3" fill={furDark} /><ellipse cx="114" cy="120" rx="4" ry="3" fill={furDark} />
        <path className="m-mouth" d="M88 128 Q103 140 118 128" stroke={furDark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      </g>
    </g>
  )
}

// --- Clutch — bison (USA) -----------------------------------------------------
// Wide, low and powerful: a massive shaggy mane, thick curved horns, a head set
// low and forward, and small, narrowed, determined eyes. Legs planted in a broad
// power stance with a low centre of gravity.
function Clutch() {
  const fur = '#6b4f3c', furDark = '#3f2e22', mane = '#7d6047', horn = '#eadfca', kit = 'var(--american-blue)'
  const OL = '#20242a', OLW = 2.5
  return (
    <g className="m-mascot">
      <Ball x={150} y={226} />
      <g className="m-legs">
        <rect className="m-leg-l" x="70" y="200" width="22" height="38" rx="9" fill={fur} stroke={OL} strokeWidth={OLW} />
        <rect className="m-leg-r" x="112" y="200" width="22" height="38" rx="9" fill={fur} stroke={OL} strokeWidth={OLW} />
        <ellipse cx="81" cy="238" rx="15" ry="6.5" fill={furDark} stroke={OL} strokeWidth="2" />
        <ellipse cx="123" cy="238" rx="15" ry="6.5" fill={furDark} stroke={OL} strokeWidth="2" />
      </g>
      <g className="m-torso">
        {/* broad, heavy torso */}
        <path d="M52 156 Q50 122 103 120 Q156 122 154 156 L148 200 Q103 214 58 200Z" fill={kit} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
        <text x="103" y="182" className="m-num" textAnchor="middle">USA</text>
        <g className="m-arm-l"><path d="M56 156 Q30 150 26 122" stroke={fur} strokeWidth="18" strokeLinecap="round" fill="none" /><circle cx="26" cy="120" r="11" fill={fur} stroke={OL} strokeWidth={OLW} /></g>
        <g className="m-arm-r"><path d="M150 156 Q176 150 180 122" stroke={fur} strokeWidth="18" strokeLinecap="round" fill="none" /><circle cx="180" cy="120" r="11" fill={fur} stroke={OL} strokeWidth={OLW} /></g>
      </g>
      <g className="m-head">
        {/* massive shaggy mane behind everything */}
        <path d="M46 96 Q34 52 72 44 Q103 30 134 44 Q172 52 160 96 Q156 130 103 132 Q50 130 46 96Z" fill={mane} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
        <g className="m-horns">
          <path d="M62 74 Q40 66 34 84 Q46 80 56 86" fill="none" stroke={horn} strokeWidth="8" strokeLinecap="round" />
          <path d="M144 74 Q166 66 172 84 Q160 80 150 86" fill="none" stroke={horn} strokeWidth="8" strokeLinecap="round" />
        </g>
        <ellipse className="m-ear m-ear-l" cx="64" cy="86" rx="10" ry="7" fill={fur} stroke={OL} strokeWidth="2" />
        <ellipse className="m-ear m-ear-r" cx="142" cy="86" rx="10" ry="7" fill={fur} stroke={OL} strokeWidth="2" />
        {/* head, set low */}
        <ellipse cx="103" cy="98" rx="44" ry="38" fill={fur} stroke={OL} strokeWidth={OLW} />
        {/* broad dark muzzle */}
        <ellipse cx="103" cy="118" rx="28" ry="20" fill="#4a382b" stroke={OL} strokeWidth={OLW} />
        {/* forelock tuft between the horns */}
        <path d="M92 62 Q103 50 114 62 Q108 74 103 74 Q98 74 92 62Z" fill={mane} stroke={OL} strokeWidth="2" strokeLinejoin="round" />
        {/* small, narrowed, determined eyes */}
        <g className="m-eyes">
          <ellipse cx="88" cy="90" rx="7" ry="6" fill="#fff" stroke={OL} strokeWidth="2" /><circle cx="89" cy="91" r="3.4" fill="#20242a" />
          <ellipse cx="118" cy="90" rx="7" ry="6" fill="#fff" stroke={OL} strokeWidth="2" /><circle cx="117" cy="91" r="3.4" fill="#20242a" />
        </g>
        <path className="m-brow m-brow-l" d="M78 80 Q88 74 99 81" stroke={furDark} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path className="m-brow m-brow-r" d="M107 81 Q118 74 128 80" stroke={furDark} strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="94" cy="115" rx="4.5" ry="3.2" fill="#20242a" /><ellipse cx="112" cy="115" rx="4.5" ry="3.2" fill="#20242a" />
        <path className="m-mouth" d="M90 126 Q103 136 116 126" stroke={furDark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      </g>
    </g>
  )
}

// --- Zayu — armadillo (Mexico) ------------------------------------------------
// Peeking and playful: head turned toward the viewer (nudged left of centre), a
// prominent banded shell over one shoulder, a long tail curled up behind like a
// question mark, big round curious eyes, and an oversized rakishly-tilted sombrero.
function Zayu() {
  const body = '#cba473', bodyLt = '#ddc196', shell = '#9d7546', shellDark = '#6f5030', kit = 'var(--mexican-green)'
  const straw = '#e6c884', strawDark = '#bd9346', OL = '#20242a', OLW = 2.5
  return (
    <g className="m-mascot">
      {/* tail curled up behind like a question mark */}
      <g className="m-tail"><path d="M132 200 Q176 202 178 160 Q176 140 158 140 Q168 150 162 160 Q166 186 132 190Z" fill={shell} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" /></g>
      <g className="m-legs">
        <rect className="m-leg-l" x="82" y="198" width="19" height="40" rx="9" fill={body} stroke={OL} strokeWidth={OLW} />
        <rect className="m-leg-r" x="105" y="198" width="19" height="40" rx="9" fill={body} stroke={OL} strokeWidth={OLW} />
        <ellipse cx="91" cy="238" rx="13" ry="6" fill={shellDark} stroke={OL} strokeWidth="2" />
        <ellipse cx="114" cy="238" rx="13" ry="6" fill={shellDark} stroke={OL} strokeWidth="2" />
      </g>
      <g className="m-torso">
        <path d="M62 152 Q60 120 102 118 Q144 120 142 152 L139 198 Q102 212 65 198Z" fill={kit} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
        {/* prominent banded shell over one shoulder */}
        <path d="M100 118 Q146 120 143 154 L141 182 Q120 196 100 194Z" fill={shell} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
        <path d="M104 130 Q124 128 140 134M104 146 Q124 144 141 150M104 162 Q123 160 138 166M107 178 Q122 176 134 180" stroke={shellDark} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <text x="84" y="176" className="m-num" textAnchor="middle">10</text>
        <g className="m-arm-l"><path d="M64 152 Q40 148 34 122" stroke={body} strokeWidth="14" strokeLinecap="round" fill="none" /><circle cx="34" cy="120" r="9" fill={body} stroke={OL} strokeWidth={OLW} /></g>
        <g className="m-arm-r"><path d="M140 154 Q160 158 162 182" stroke={body} strokeWidth="14" strokeLinecap="round" fill="none" /><circle cx="162" cy="184" r="9" fill={body} stroke={OL} strokeWidth={OLW} /></g>
      </g>
      <Ball x={150} y={226} />
      <g className="m-head">
        <ellipse className="m-ear m-ear-l" cx="74" cy="70" rx="7" ry="13" fill={body} stroke={OL} strokeWidth="2" transform="rotate(-20 74 70)" />
        <ellipse className="m-ear m-ear-r" cx="126" cy="70" rx="7" ry="13" fill={body} stroke={OL} strokeWidth="2" transform="rotate(20 126 70)" />
        {/* head turned slightly toward the viewer — nudged left of centre */}
        <ellipse cx="96" cy="90" rx="40" ry="37" fill={body} stroke={OL} strokeWidth={OLW} />
        {/* long snout */}
        <path d="M96 98 Q72 102 68 122 Q78 136 96 136 Q114 136 122 122 Q120 102 96 98Z" fill={bodyLt} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
        {/* big round curious eyes */}
        <g className="m-eyes">
          <ellipse cx="83" cy="86" rx="10" ry="11" fill="#fff" stroke={OL} strokeWidth="2" /><circle cx="85" cy="88" r="5" fill="#20242a" /><circle cx="87" cy="85.6" r="1.6" fill="#fff" />
          <ellipse cx="110" cy="87" rx="9" ry="10" fill="#fff" stroke={OL} strokeWidth="2" /><circle cx="111" cy="89" r="4.6" fill="#20242a" /><circle cx="113" cy="86.6" r="1.4" fill="#fff" />
        </g>
        <path className="m-brow m-brow-l" d="M73 70 Q83 64 93 70" stroke={shellDark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path className="m-brow m-brow-r" d="M101 71 Q110 65 120 71" stroke={shellDark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <ellipse cx="96" cy="118" rx="6" ry="4.5" fill="#20242a" />
        <path className="m-mouth" d="M84 126 Q96 135 108 126" stroke={shellDark} strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* oversized sombrero, tilted rakishly */}
        <g className="m-hat" transform="rotate(-9 100 52)">
          <ellipse cx="100" cy="56" rx="64" ry="15" fill={straw} stroke={OL} strokeWidth={OLW} />
          <path d="M70 56 Q74 20 100 18 Q126 20 130 56Z" fill={straw} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
          <ellipse cx="100" cy="56" rx="30" ry="7" fill="var(--mexican-green)" stroke={strawDark} strokeWidth="1.5" />
          <path d="M40 56 Q100 66 160 56" fill="none" stroke={strawDark} strokeWidth="1.5" />
        </g>
      </g>
    </g>
  )
}

// Per-mascot SVG pivots (svgOrigin) for the shared tour-beat animations, plus the
// full nation name for the "Explore …" hand-off button.
const ORIGINS = {
  CA: { country: 'Canada', armL: '66 152', armR: '142 152', center: '103 118' },
  US: { country: 'United States', armL: '56 156', armR: '150 156', center: '103 128' },
  MX: { country: 'Mexico', armL: '64 152', armR: '140 154', center: '96 118' },
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
      gsap.fromTo(q('.m-antlers'), { rotation: 0 }, { rotation: 14, duration: 0.14, yoyo: true, repeat: 5, transformOrigin: '50% 100%', svgOrigin: '103 52', ease: 'sine.inOut' })
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
      gsap.fromTo(q('.m-head'), { rotation: 0 }, { rotation: -12, duration: 0.16, yoyo: true, repeat: 3, svgOrigin: '103 128', ease: 'power2.inOut' })
      gsap.fromTo(q('.m-leg-r'), { rotation: 0 }, { rotation: 18, duration: 0.12, yoyo: true, repeat: 5, svgOrigin: '123 202', ease: 'sine.inOut' })
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
