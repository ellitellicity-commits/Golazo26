import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import Typewriter from './Typewriter'
import './HostMascot.css'

// Original host-nation mascots for the Atlas (Part 2). Bespoke inline SVGs -
// NOT scraped clipart - so every body part is a clean, named group that GSAP can
// drive: entrance, a looping idle, blinking eyes, and a species-specific burst
// with a facial expression on poke. Three characters, one per 2026 host, each
// wearing its nation's identity colour (the same host-identity treatment the
// globe HOST_TINTS and CountryEmblem already use - distinct from the role-locked
// data channels). They pop in on the LEFT of the Atlas stage when a host nation
// is opened; the 45 non-host nations get none. Everything degrades to a static
// pose under prefers-reduced-motion, and all timelines are killed on unmount.
//
// Each is one cohesive silhouette (a single body mass with internal detail
// linework) built around a landmark that reads at thumbnail size, not a pile of
// primitives. GSAP drives organic idle breathing, a hover lift, and the tour:
//   Canada  - Moswa, a moose in a Canadian-red kit; palmate antlers landmark.
//   USA     - Tatanka, a bison in an American-blue kit; shaggy shoulder-hump landmark.
//   Mexico  - Ayotoch, an armadillo in a Mexican-green kit; banded shell landmark + curled tail.

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

// --- Moswa - moose (Canada) ---------------------------------------------------
// The chill host: broad palmate antlers frame the head (the landmark), a hip-cocked
// stance with one arm relaxed at the side and an easy head-tilt, huge warm eyes
// (left larger), and a long droopy moose snout. One cohesive fur-and-kit mass.
function Moswa() {
  const fur = '#7c5836', furDark = '#4d3722', snout = '#9c7850', antler = '#d9c39a', antlerDark = '#a98f63', kit = 'var(--canadian-red)'
  const OL = '#171a1e', OLW = 3
  return (
    <g className="m-mascot">
      <ellipse className="m-shadow" cx="100" cy="241" rx="48" ry="8" fill="var(--studio-black)" opacity="0.34" />
      <g className="m-breath">
        {/* Legs - hip-cocked, weight planted on the left; hooves tuck under the hem */}
        <g className="m-legs">
          <rect className="m-leg-l" x="80" y="190" width="22" height="48" rx="10" fill={fur} stroke={OL} strokeWidth={OLW} />
          <rect className="m-leg-r" x="105" y="196" width="21" height="42" rx="10" fill={fur} stroke={OL} strokeWidth={OLW} />
          <ellipse cx="91" cy="237" rx="14" ry="6" fill={furDark} stroke={OL} strokeWidth="2" />
          <ellipse cx="115" cy="237" rx="13" ry="6" fill={furDark} stroke={OL} strokeWidth="2" />
        </g>
        {/* Left arm hangs relaxed at the side - the laid-back read */}
        <g className="m-arm-l">
          <path d="M67 141 Q52 159 55 183" fill="none" stroke={fur} strokeWidth="16" strokeLinecap="round" />
          <circle cx="56" cy="185" r="10" fill={fur} stroke={OL} strokeWidth={OLW} />
        </g>
        {/* Right arm loosely bent - the gesturing arm (drives point / celebrate) */}
        <g className="m-arm-r">
          <path d="M137 141 Q155 151 151 177" fill="none" stroke={fur} strokeWidth="16" strokeLinecap="round" />
          <circle cx="150" cy="179" r="10" fill={fur} stroke={OL} strokeWidth={OLW} />
        </g>
        {/* Body: fur neck bridges head to the red kit so the outline reads as one
            continuous mass; the hem tilts with the cocked hip. */}
        <g className="m-torso">
          <path d="M85 112 H115 V131 H85 Z" fill={fur} />
          <path d="M63 141 Q61 126 82 123 Q100 120 118 123 Q139 126 137 141 L133 197 Q100 209 67 195 Z" fill={kit} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
          <text x="100" y="177" className="m-num" textAnchor="middle">26</text>
        </g>
        {/* Antlers - the landmark. Broad palmate blades framing the head, behind it. */}
        <g className="m-antlers">
          <path d="M83 70 Q59 66 45 50 Q37 41 33 30 Q40 31 45 38 Q42 25 51 27 Q53 36 58 41 Q56 23 65 27 Q67 37 71 43 Q75 34 81 41 Q87 56 83 70 Z" fill={antler} stroke={antlerDark} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M117 70 Q141 66 155 50 Q163 41 167 30 Q160 31 155 38 Q158 25 149 27 Q147 36 142 41 Q144 23 135 27 Q133 37 129 43 Q125 34 119 41 Q113 56 117 70 Z" fill={antler} stroke={antlerDark} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="m-head">
          {/* A permanent easy head-tilt lives on an inner static group so GSAP can
              still drive .m-head rotation without wiping the resting lean. */}
          <g className="m-head-tilt" transform="rotate(4 100 96)">
            <ellipse className="m-ear m-ear-l" cx="63" cy="79" rx="11" ry="17" fill={fur} stroke={OL} strokeWidth={OLW} transform="rotate(-28 63 79)" />
            <ellipse className="m-ear m-ear-r" cx="137" cy="79" rx="11" ry="17" fill={fur} stroke={OL} strokeWidth={OLW} transform="rotate(28 137 79)" />
            <ellipse cx="100" cy="90" rx="44" ry="39" fill={fur} stroke={OL} strokeWidth={OLW} />
            {/* Long, droopy moose snout - the species read */}
            <path d="M100 100 Q71 104 69 130 Q73 149 100 151 Q127 149 131 130 Q129 104 100 100 Z" fill={snout} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
            <ellipse cx="90" cy="136" rx="4" ry="3" fill={furDark} />
            <ellipse cx="110" cy="136" rx="4" ry="3" fill={furDark} />
            <path className="m-mouth" d="M86 141 Q100 151 114 141" fill="none" stroke={furDark} strokeWidth="3.4" strokeLinecap="round" />
            {/* Big warm eyes, left a touch larger (character asymmetry) */}
            <g className="m-eyes">
              <g className="m-eye-l"><ellipse cx="83" cy="85" rx="11" ry="12" fill="#fff" stroke={OL} strokeWidth="2.4" /><circle className="m-pupil-l" cx="85" cy="87" r="5.4" fill="#171a1e" /><circle cx="87.4" cy="84.4" r="1.8" fill="#fff" /></g>
              <g className="m-eye-r"><ellipse cx="117" cy="86" rx="9.5" ry="11" fill="#fff" stroke={OL} strokeWidth="2.4" /><circle className="m-pupil-r" cx="118" cy="88" r="4.8" fill="#171a1e" /><circle cx="120" cy="85.4" r="1.5" fill="#fff" /></g>
            </g>
            <path className="m-brow m-brow-l" d="M73 69 Q84 63 95 68" fill="none" stroke={furDark} strokeWidth="3.6" strokeLinecap="round" />
            <path className="m-brow m-brow-r" d="M107 68 Q118 63 127 70" fill="none" stroke={furDark} strokeWidth="3.6" strokeLinecap="round" />
          </g>
        </g>
        <Ball x={150} y={221} />
      </g>
    </g>
  )
}

// --- Tatanka - bison (USA) -----------------------------------------------------
// The hype man: a massive shaggy shoulder-hump dominates the upper silhouette
// (the landmark), with the small determined face peeking from it, thick curved
// horns, a shaggy beard, arms flung wide, and legs planted in a broad power stance.
function Tatanka() {
  const fur = '#6b4f3c', furDark = '#372a1f', mane = '#4a3628', muzzle = '#8a6a4e', horn = '#e6dbc2', kit = 'var(--american-blue)'
  const OL = '#171a1e', OLW = 3
  return (
    <g className="m-mascot">
      <ellipse className="m-shadow" cx="100" cy="241" rx="55" ry="8.5" fill="var(--studio-black)" opacity="0.34" />
      <g className="m-breath">
        {/* Legs planted wide - the power stance */}
        <g className="m-legs">
          <rect className="m-leg-l" x="66" y="198" width="24" height="40" rx="10" fill={fur} stroke={OL} strokeWidth={OLW} />
          <rect className="m-leg-r" x="110" y="198" width="24" height="40" rx="10" fill={fur} stroke={OL} strokeWidth={OLW} />
          <ellipse cx="78" cy="237" rx="15" ry="6.5" fill={furDark} stroke={OL} strokeWidth="2" />
          <ellipse cx="122" cy="237" rx="15" ry="6.5" fill={furDark} stroke={OL} strokeWidth="2" />
        </g>
        {/* Arms hang relaxed at the sides at rest - the tour beats (wave / point /
            celebrate) raise them from the shoulder pivot, so idle stays calm. */}
        <g className="m-arm-l">
          <path d="M62 156 Q46 176 52 197" fill="none" stroke={fur} strokeWidth="18" strokeLinecap="round" />
          <circle cx="53" cy="199" r="11" fill={fur} stroke={OL} strokeWidth={OLW} />
        </g>
        <g className="m-arm-r">
          <path d="M138 156 Q154 176 148 197" fill="none" stroke={fur} strokeWidth="18" strokeLinecap="round" />
          <circle cx="147" cy="199" r="11" fill={fur} stroke={OL} strokeWidth={OLW} />
        </g>
        {/* The hump - a massive shaggy mane/shoulder mass that is the DOMINANT
            upper form, peaking well above the small face that peeks from it. This
            is the landmark: it reads as a bison at thumbnail size. */}
        <g className="m-hump">
          <path d="M46 158 Q38 96 56 72 Q62 54 80 51 Q90 43 100 47 Q110 43 120 51 Q138 54 144 72 Q162 96 154 158 Q154 162 148 163 L52 163 Q46 162 46 158 Z" fill={mane} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
          <path d="M70 74 Q74 98 67 120 M100 58 Q100 88 100 118 M130 74 Q126 98 133 120" fill="none" stroke={furDark} strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
        </g>
        {/* Broad blue kit */}
        <g className="m-torso">
          <path d="M58 160 Q56 143 80 140 Q100 137 120 140 Q144 143 142 160 L138 202 Q100 214 62 202 Z" fill={kit} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
          <text x="100" y="185" className="m-num" textAnchor="middle">USA</text>
        </g>
        {/* Curved horns sprouting from the upper sides of the head. Filled tapered
            shapes with the base tucked UNDER the head ellipse (rendered before it)
            so each reads as firmly attached, not floating. */}
        <g className="m-horns">
          <path d="M80 98 Q56 90 35 104 L32 110 Q52 110 78 109 Z" fill={horn} stroke={OL} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M120 98 Q144 90 165 104 L168 110 Q148 110 122 109 Z" fill={horn} stroke={OL} strokeWidth="2.5" strokeLinejoin="round" />
        </g>
        <g className="m-head">
          <ellipse className="m-ear m-ear-l" cx="70" cy="112" rx="9" ry="6" fill={fur} stroke={OL} strokeWidth="2" />
          <ellipse className="m-ear m-ear-r" cx="130" cy="112" rx="9" ry="6" fill={fur} stroke={OL} strokeWidth="2" />
          {/* Head - sized so it reads ~30% of the silhouette, clearly smaller than
              the shaggy hump above it (the landmark) and the torso below. */}
          <ellipse cx="100" cy="116" rx="33" ry="29" fill={fur} stroke={OL} strokeWidth={OLW} />
          {/* Shaggy bison beard hanging from the chin */}
          <path d="M79 137 Q80 168 92 178 Q100 168 108 178 Q121 168 122 137 Z" fill={mane} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
          {/* Broad muzzle - lightened so the snout and features read against the fur */}
          <ellipse cx="100" cy="130" rx="21" ry="14" fill={muzzle} stroke={OL} strokeWidth={OLW} />
          <ellipse cx="91" cy="127" rx="3.2" ry="2.6" fill="#171a1e" />
          <ellipse cx="109" cy="127" rx="3.2" ry="2.6" fill="#171a1e" />
          <path className="m-mouth" d="M90 137 Q100 144 110 137" fill="none" stroke="#171a1e" strokeWidth="3.2" strokeLinecap="round" />
          {/* Small, narrowed, determined eyes */}
          <g className="m-eyes">
            <g className="m-eye-l"><ellipse cx="89" cy="110" rx="7" ry="7" fill="#fff" stroke={OL} strokeWidth="2.2" /><circle className="m-pupil-l" cx="90" cy="111" r="3.4" fill="#171a1e" /><circle cx="91.4" cy="109" r="1.2" fill="#fff" /></g>
            <g className="m-eye-r"><ellipse cx="111" cy="110" rx="7" ry="7" fill="#fff" stroke={OL} strokeWidth="2.2" /><circle className="m-pupil-r" cx="112" cy="111" r="3.4" fill="#171a1e" /><circle cx="113.4" cy="109" r="1.2" fill="#fff" /></g>
          </g>
          {/* Determined, inward-angled brows */}
          <path className="m-brow m-brow-l" d="M79 100 Q88 98 97 105" fill="none" stroke={furDark} strokeWidth="4" strokeLinecap="round" />
          <path className="m-brow m-brow-r" d="M103 105 Q112 98 121 100" fill="none" stroke={furDark} strokeWidth="4" strokeLinecap="round" />
        </g>
        <Ball x={150} y={224} />
      </g>
    </g>
  )
}

// --- Ayotoch - armadillo (Mexico) ------------------------------------------------
// Peeking and playful: head turned toward the viewer (nudged left of centre), a
// prominent banded shell over one shoulder, a long tail curled up behind like a
// question mark, big round curious eyes, and an oversized rakishly-tilted sombrero.
// (Restored old hat model. Reconnected to the current idle system - .m-breath /
// .m-shadow wrappers and the .m-shell hover landmark - without touching its paths.)
function Ayotoch() {
  const body = '#cba473', bodyLt = '#ddc196', shell = '#9d7546', shellDark = '#6f5030', kit = 'var(--mexican-green)'
  const straw = '#e6c884', strawDark = '#bd9346', OL = '#20242a', OLW = 2.5
  return (
    <g className="m-mascot">
      <ellipse className="m-shadow" cx="100" cy="242" rx="50" ry="8" fill="var(--studio-black)" opacity="0.34" />
      <g className="m-breath">
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
          {/* prominent banded shell over one shoulder (the hover landmark) */}
          <g className="m-shell">
            <path d="M100 118 Q146 120 143 154 L141 182 Q120 196 100 194Z" fill={shell} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
            <path d="M104 130 Q124 128 140 134M104 146 Q124 144 141 150M104 162 Q123 160 138 166M107 178 Q122 176 134 180" stroke={shellDark} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </g>
          <text x="84" y="176" className="m-num" textAnchor="middle">10</text>
          <g className="m-arm-l"><path d="M64 152 Q40 148 34 122" stroke={body} strokeWidth="14" strokeLinecap="round" fill="none" /><circle cx="34" cy="120" r="9" fill={body} stroke={OL} strokeWidth={OLW} /></g>
          <g className="m-arm-r"><path d="M140 154 Q160 158 162 182" stroke={body} strokeWidth="14" strokeLinecap="round" fill="none" /><circle cx="162" cy="184" r="9" fill={body} stroke={OL} strokeWidth={OLW} /></g>
        </g>
        <Ball x={150} y={226} />
        <g className="m-head">
          <ellipse className="m-ear m-ear-l" cx="74" cy="70" rx="7" ry="13" fill={body} stroke={OL} strokeWidth="2" transform="rotate(-20 74 70)" />
          <ellipse className="m-ear m-ear-r" cx="126" cy="70" rx="7" ry="13" fill={body} stroke={OL} strokeWidth="2" transform="rotate(20 126 70)" />
          {/* head turned slightly toward the viewer - nudged left of centre */}
          <ellipse cx="96" cy="90" rx="40" ry="37" fill={body} stroke={OL} strokeWidth={OLW} />
          {/* long snout */}
          <path d="M96 98 Q72 102 68 122 Q78 136 96 136 Q114 136 122 122 Q120 102 96 98Z" fill={bodyLt} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
          {/* big round curious eyes */}
          <g className="m-eyes">
            <g className="m-eye-l"><ellipse cx="83" cy="86" rx="10" ry="11" fill="#fff" stroke={OL} strokeWidth="2" /><circle className="m-pupil-l" cx="85" cy="88" r="5" fill="#20242a" /><circle cx="87" cy="85.6" r="1.6" fill="#fff" /></g>
            <g className="m-eye-r"><ellipse cx="110" cy="87" rx="9" ry="10" fill="#fff" stroke={OL} strokeWidth="2" /><circle className="m-pupil-r" cx="111" cy="89" r="4.6" fill="#20242a" /><circle cx="113" cy="86.6" r="1.4" fill="#fff" /></g>
          </g>
          <path className="m-brow m-brow-l" d="M73 70 Q83 64 93 70" stroke={shellDark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path className="m-brow m-brow-r" d="M101 71 Q110 65 120 71" stroke={shellDark} strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <ellipse cx="96" cy="118" rx="6" ry="4.5" fill="#20242a" />
          <path className="m-mouth" d="M81 125 Q96 140 111 125" stroke={shellDark} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {/* oversized sombrero, tilted rakishly */}
          <g className="m-hat" transform="rotate(-9 100 52)">
            <ellipse cx="100" cy="56" rx="64" ry="15" fill={straw} stroke={OL} strokeWidth={OLW} />
            <path d="M70 56 Q74 20 100 18 Q126 20 130 56Z" fill={straw} stroke={OL} strokeWidth={OLW} strokeLinejoin="round" />
            <ellipse cx="100" cy="56" rx="30" ry="7" fill="var(--mexican-green)" stroke={strawDark} strokeWidth="1.5" />
            <path d="M40 56 Q100 66 160 56" fill="none" stroke={strawDark} strokeWidth="1.5" />
          </g>
        </g>
      </g>
    </g>
  )
}

// Per-mascot SVG pivots (svgOrigin) for the shared tour-beat animations, plus the
// full nation name for the "Explore …" hand-off button.
const ORIGINS = {
  CA: { country: 'Canada', explore: 'Explore Canada', armL: '67 141', armR: '137 141', center: '100 120' },
  US: { country: 'United States', explore: 'Explore the US', armL: '62 152', armR: '138 152', center: '100 128' },
  MX: { country: 'Mexico', explore: 'Explore Mexico', armL: '64 150', armR: '136 150', center: '100 130' },
}

// Guided-tour scripts (Part 2a) - real, confirmed WC2026 facts only. Each beat
// names the mascot animation it plays. The mascot speaks directly to the user.
const TOURS = {
  CA: [
    { line: "Welcome to Canada! Co-hosting our very first men's World Cup!", anim: 'wave' },
    { line: 'Two host cities carry us - Toronto in the east, Vancouver on the west coast!', anim: 'jump' },
    { line: "BC Place in Vancouver has one of the world's largest retractable roofs!", anim: 'point' },
    { line: "Alphonso Davies scored our first ever men's World Cup goal in 2022. History made!", anim: 'celebrate' },
  ],
  US: [
    { line: "Welcome to the USA! We're hosting 11 of the 16 venues - biggest share!", anim: 'wave' },
    { line: 'MetLife Stadium in New Jersey hosts the Final on 19 July 2026!', anim: 'point' },
    { line: "Our first men's World Cup since 1994 - and this time we're IN it!", anim: 'jump' },
    { line: 'From Seattle to Miami, the whole country is a football pitch right now!', anim: 'celebrate' },
  ],
  MX: [
    { line: '¡Bienvenidos a México! First nation to host or co-host THREE World Cups!', anim: 'wave' },
    { line: 'Estadio Azteca has seen two World Cup finals - 1970 AND 1986!', anim: 'point' },
    { line: 'Guadalajara and Monterrey join Mexico City - three iconic football cities!', anim: 'jump' },
    { line: 'The atmosphere here? Unmatched. The whole country bleeds football!', anim: 'celebrate' },
  ],
}

// The four tour-beat animations (Part 2b). Each takes the scoped selector + the
// mascot's pivots; they drive the existing named SVG groups only (no path edits),
// so they survive the Part 6 redraw untouched.
const BEAT_ANIM = {
  // Full arm wave, body tilts toward the user, head nods along.
  wave: (q, o) => {
    gsap.fromTo(q('.m-arm-l'), { rotation: 0 }, { rotation: -46, duration: 0.24, yoyo: true, repeat: 5, svgOrigin: o.armL, ease: 'sine.inOut' })
    gsap.fromTo(q('.m-mascot'), { rotation: 0 }, { rotation: -4, duration: 0.42, yoyo: true, repeat: 1, svgOrigin: o.center, ease: 'sine.inOut' })
    gsap.fromTo(q('.m-head'), { rotation: 0 }, { rotation: 9, duration: 0.3, yoyo: true, repeat: 3, svgOrigin: o.center, ease: 'sine.inOut' })
  },
  // Full squash-and-stretch jump with a landing impact, grounded at the feet.
  jump: (q) => {
    gsap.timeline({ defaults: { transformOrigin: '50% 100%' } })
      .to(q('.m-mascot'), { scaleY: 0.84, scaleX: 1.12, duration: 0.14, ease: 'power2.in' })
      .to(q('.m-mascot'), { y: -44, scaleY: 1.14, scaleX: 0.9, duration: 0.26, ease: 'power2.out' })
      .to(q('.m-mascot'), { y: 0, scaleY: 0.8, scaleX: 1.16, duration: 0.16, ease: 'power2.in' })
      .to(q('.m-mascot'), { scaleY: 1, scaleX: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
  },
  // Arm shoots out dramatically, the body leans into the point.
  point: (q, o) => {
    gsap.timeline({ svgOrigin: o.armR })
      .fromTo(q('.m-arm-r'), { rotation: 0 }, { rotation: 52, duration: 0.22, ease: 'back.out(3)' })
      .to(q('.m-arm-r'), { rotation: 44, duration: 0.7 })
      .to(q('.m-arm-r'), { rotation: 0, duration: 0.3, ease: 'power2.inOut' })
    gsap.fromTo(q('.m-mascot'), { rotation: 0 }, { rotation: 5, duration: 0.24, yoyo: true, repeat: 1, repeatDelay: 0.7, svgOrigin: o.center, ease: 'power2.out' })
  },
  // Both arms up, a spinning jump, landing with a settle.
  celebrate: (q, o) => {
    gsap.fromTo(q('.m-arm-l'), { rotation: 0 }, { rotation: -58, duration: 0.28, yoyo: true, repeat: 1, repeatDelay: 0.7, svgOrigin: o.armL, ease: 'back.out(2.5)' })
    gsap.fromTo(q('.m-arm-r'), { rotation: 0 }, { rotation: 58, duration: 0.28, yoyo: true, repeat: 1, repeatDelay: 0.7, svgOrigin: o.armR, ease: 'back.out(2.5)' })
    gsap.timeline({ defaults: { svgOrigin: o.center } })
      .to(q('.m-mascot'), { y: -36, duration: 0.34, ease: 'power2.out' })
      .to(q('.m-mascot'), { rotation: 360, duration: 0.66, ease: 'power1.inOut' }, '<')
      .to(q('.m-mascot'), { y: 0, duration: 0.22, ease: 'power2.in' }, '>-0.2')
      .fromTo(q('.m-mascot'), { scaleY: 1 }, { scaleY: 0.86, scaleX: 1.12, duration: 0.12, transformOrigin: '50% 100%', yoyo: true, repeat: 1, ease: 'power2.out' })
  },
}

// iso → mascot definition. Facts are real, checkable World Cup 2026 / host notes.
const MASCOTS = {
  CA: {
    name: 'Moswa', kind: 'the Moose', Art: Moswa,
    facts: [
      'Canada co-hosts its first men’s World Cup in 2026.',
      'Toronto’s BMO Field and Vancouver’s BC Place stage the Canadian matches.',
      'BC Place has one of the world’s largest cable-supported retractable roofs.',
    ],
    landmark: '.m-antlers',
    // Hover: the antlers give a small proud tilt-back overshoot.
    hover: (q) => gsap.fromTo(q('.m-antlers'), { rotation: 0 }, { rotation: 3, duration: 0.5, yoyo: true, repeat: 1, svgOrigin: '100 66', ease: 'sine.inOut' }),
    // Antlers wiggle + a happy jump.
    poke: (q) => {
      gsap.fromTo(q('.m-antlers'), { rotation: 0 }, { rotation: 12, duration: 0.14, yoyo: true, repeat: 5, svgOrigin: '100 66', ease: 'sine.inOut' })
      gsap.fromTo(q('.m-mascot'), { y: 0 }, { y: -22, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.out' })
    },
  },
  US: {
    name: 'Tatanka', kind: 'the Bison', Art: Tatanka,
    facts: [
      'The USA stages 11 of the 16 tournament venues.',
      'MetLife Stadium in New Jersey hosts the Final on 19 July 2026.',
      'It is the USA’s first men’s World Cup since 1994.',
    ],
    landmark: '.m-hump',
    // Hover: the shaggy hump pops up, like the bison rolling its shoulders.
    hover: (q) => gsap.fromTo(q('.m-hump'), { y: 0 }, { y: -4, duration: 0.24, yoyo: true, repeat: 1, ease: 'power2.out' }),
    // Head lowers to charge + a hoof stomp.
    poke: (q) => {
      gsap.fromTo(q('.m-head'), { rotation: 0 }, { rotation: -12, duration: 0.16, yoyo: true, repeat: 3, svgOrigin: '100 118', ease: 'power2.inOut' })
      gsap.fromTo(q('.m-leg-r'), { rotation: 0 }, { rotation: 18, duration: 0.12, yoyo: true, repeat: 5, svgOrigin: '122 200', ease: 'sine.inOut' })
    },
  },
  MX: {
    name: 'Ayotoch', kind: 'the Armadillo', Art: Ayotoch,
    facts: [
      'Mexico is the first nation to host or co-host three men’s World Cups.',
      'Estadio Azteca has staged two World Cup finals: 1970 and 1986.',
      'Guadalajara and Monterrey join Mexico City as 2026 host cities.',
    ],
    landmark: '.m-shell',
    // Hover: the armoured shell gives a quick flex - the plates shimmer to life.
    hover: (q) => gsap.fromTo(q('.m-shell'), { scale: 1 }, { scale: 1.04, duration: 0.3, yoyo: true, repeat: 1, transformOrigin: '50% 100%', ease: 'sine.inOut' }),
    // Tail swings up + a quick sideways curl-squash.
    poke: (q) => {
      gsap.fromTo(q('.m-tail'), { rotation: 0 }, { rotation: -48, duration: 0.24, yoyo: true, repeat: 3, svgOrigin: '138 192', ease: 'sine.inOut' })
      gsap.fromTo(q('.m-mascot'), { scaleX: 1 }, { scaleX: 0.88, duration: 0.18, yoyo: true, repeat: 1, transformOrigin: '50% 100%', ease: 'power2.out' })
    },
  },
}

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// A short CSS-only confetti burst for the tour's 'celebrate' beat (Part 2b) -
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
  // left) - so on remount a fresh gsap.from({opacity:0}) reads that 0 as its END
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
      // Cohesive entrance: the whole silhouette rises and settles as one mass
      // (no parts sliding in from opposite edges), so the character reads as a
      // single form the instant it lands. Mascots without the new .m-breath
      // wrapper (mid-overhaul) still animate here - .m-mascot is always present.
      gsap.from(q('.m-mascot'), { y: 26, scale: 0.92, opacity: 0, transformOrigin: '50% 100%', duration: 0.52, ease: 'back.out(1.4)' })

      // Idle breathing: the body mass swells a hair on a slow sine, pivoting at
      // the planted feet - alive, never a bobbing puppet. The ground shadow
      // breathes in counterpoint (widens as the body settles, narrows as it lifts).
      // Each tween is gated on its target existing so a mascot mid-overhaul (art
      // not yet carrying .m-breath/.m-shadow) never logs a GSAP "target not found".
      if (q('.m-breath').length) gsap.to(q('.m-breath'), { scaleY: 1.014, duration: 2.4, transformOrigin: '50% 100%', ease: 'sine.inOut', repeat: -1, yoyo: true })
      if (q('.m-shadow').length) gsap.to(q('.m-shadow'), { scaleX: 1.035, duration: 2.4, transformOrigin: '50% 50%', ease: 'sine.inOut', repeat: -1, yoyo: true })

      // Blink loop with a wink on every third blink. A single repeating timeline
      // (blink, blink, wink) keeps it deterministic and fully inside the context,
      // so revert() tears it down with no stray delayedCalls left running.
      const blink = (tl, sel) => tl
        .to(q(sel), { scaleY: 0.1, duration: 0.08, transformOrigin: '50% 50%' })
        .to(q(sel), { scaleY: 1, duration: 0.09 })
        .to({}, { duration: 2.6 })
      const bt = gsap.timeline({ repeat: -1, delay: 1.4 })
      blink(bt, '.m-eyes')
      blink(bt, '.m-eyes')
      blink(bt, '.m-eye-l') // the wink

      // Pupil micro-drift: the eyes wander a couple of px on a long loop - the
      // "looking around" tell, kept tiny so it never crosses into googly. Gated on
      // the pupils existing (mascots mid-overhaul don't carry .m-pupil-* yet).
      const pupils = q('.m-pupil-l, .m-pupil-r')
      if (pupils.length) {
        gsap.timeline({ repeat: -1, delay: 1 })
          .to(pupils, { x: 1.6, y: -1, duration: 1.1, ease: 'sine.inOut' })
          .to(pupils, { x: 1.6, y: -1, duration: 1.7 })
          .to(pupils, { x: -1.8, y: 0.7, duration: 1.3, ease: 'sine.inOut' })
          .to(pupils, { x: -1.8, y: 0.7, duration: 1.7 })
          .to(pupils, { x: 0, y: 0, duration: 1.0, ease: 'sine.inOut' })
          .to({}, { duration: 1.8 })
      }

      // Tour: play the first beat's animation once the character has landed.
      if (isTour) gsap.delayedCall(0.85, () => playBeat(0))
    }, root)
    return () => {
      ctx.revert()
      // Kill any transient tour-beat / poke tweens that may still be mid-flight,
      // so nothing keeps animating a detached node after unmount.
      gsap.killTweensOf(root.querySelectorAll('*'))
    }
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

  // Hover / focus (State 2): the whole character lifts off its shadow, the brows
  // raise (alert, engaged), and the landmark feature reacts. Reduced-motion and
  // touch (no hover) fall back to the static pose. Uses .to (not .from), so an
  // unmount mid-hover strands nothing.
  const setHover = (on) => {
    const root = rootRef.current
    if (!root || reduced()) return
    const q = gsap.utils.selector(root)
    gsap.to(q('.m-mascot'), { y: on ? -6 : 0, duration: on ? 0.25 : 0.32, ease: on ? 'back.out(1.4)' : 'power2.out', overwrite: 'auto' })
    // Shadow fades as the body lifts (breathing owns its scaleX, so touch only opacity).
    if (q('.m-shadow').length) gsap.to(q('.m-shadow'), { opacity: on ? 0.16 : 0.34, duration: 0.28, overwrite: 'auto' })
    gsap.to(q('.m-brow'), { y: on ? -2.4 : 0, duration: 0.22, overwrite: 'auto' })
    if (on && def.hover) def.hover(q)
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
              {lastBeat ? origins.explore : 'Next →'}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        className="mascot__figure"
        onClick={inTour ? nextBeat : poke}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
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
