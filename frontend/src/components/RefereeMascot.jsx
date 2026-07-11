import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import './RefereeMascot.css'

// The Referee - the pregame cutscene's narrator (Part 4). A bespoke inline SVG,
// same craft standard as the host mascots: stocky, authoritative, black kit,
// silver whistle on a lanyard, a card in the raised hand. Every moving part is a
// named group so GSAP can drive it. He is NOT wired into the main cutscene
// timeline (that choreography is tuned) - instead he reacts to the `beat` the
// Cutscene already publishes, running his own gsap.context (StrictMode-safe via
// revert). Two uses: `variant="cutscene"` (animated narrator, centre-bottom) and
// `variant="verdict"` (a still pose that shows the post-result card).
//
// Card colours are literal football semantics (red/yellow/green cards), not the
// app's role-locked data channels - a domain-appropriate use, per DESIGN.md.
const SKIN = '#d4956a'
const SKIN_DK = '#b97b52'
const KIT = '#1a1a1a'
const KIT_HI = '#262626'
const HAIR = '#20242a'
const SILVER = '#c0c0c0'

function RefereeArt({ hand = 'card' }) {
  const whistle = hand === 'whistle'
  return (
    <g className="ref-char">
      <g className="ref-legs">
        <rect x="80" y="182" width="17" height="52" rx="7" fill={KIT} />
        <rect x="103" y="182" width="17" height="52" rx="7" fill={KIT} />
        <ellipse cx="86" cy="236" rx="14" ry="6" fill="#0c0c0c" />
        <ellipse cx="114" cy="236" rx="14" ry="6" fill="#0c0c0c" />
        {/* referee sock trim */}
        <rect x="80" y="196" width="17" height="4" fill={KIT_HI} />
        <rect x="103" y="196" width="17" height="4" fill={KIT_HI} />
      </g>

      {/* black shorts */}
      <path d="M72 168 H128 L124 192 H104 L100 176 L96 192 H76 Z" fill={KIT} />

      <g className="ref-torso">
        {/* jersey */}
        <path d="M66 124 Q64 112 78 108 L88 116 H112 L122 108 Q136 112 134 124 L130 170 Q100 180 70 170 Z" fill={KIT} />
        <path d="M66 124 Q64 112 78 108 L82 118 Q74 122 72 134 Z" fill={KIT_HI} />
        {/* white collar */}
        <path d="M88 116 L100 128 L112 116 L108 110 H92 Z" fill="#f4f4f4" />
        {/* number patch */}
        <rect x="90" y="134" width="20" height="22" rx="2" fill={KIT_HI} />
        <text x="100" y="151" className="ref-num" textAnchor="middle">R</text>
        {/* whistle on a lanyard */}
        <path className="ref-lanyard" d="M92 118 Q96 140 100 150 Q104 140 108 118" fill="none" stroke="#0d0d0d" strokeWidth="2" />
        <g className="ref-whistle">
          <ellipse cx="100" cy="152" rx="7" ry="5" fill={SILVER} stroke="#8a8a8a" strokeWidth="1" />
          <circle cx="104" cy="152" r="2" fill="#7a7a7a" />
        </g>
      </g>

      {/* Head is drawn BEFORE the arms (SVG paint order = document order) so the
          raised whistle-hand - a child of ref-arm-r - always paints in front of
          the face/neck, at every frame of the count/whistle beats, not just the
          resting pose. See ref-arm-r below for the whistle group itself. */}
      <g className="ref-head">
        {/* neck - widened to span the jersey collar opening (88-112) instead of
            a narrow 14px column, so it reads as bridging a stocky neck into the
            shoulders rather than a thin stalk under the head. */}
        <rect x="88" y="100" width="24" height="17" fill={SKIN_DK} />
        {/* head */}
        <ellipse cx="100" cy="82" rx="29" ry="31" fill={SKIN} />
        <path d="M100 111 Q114 110 118 100 Q112 113 100 113 Q88 113 82 100 Q86 110 100 111 Z" fill={SKIN_DK} opacity="0.5" />
        {/* short dark hair */}
        <path d="M72 74 Q70 46 100 44 Q130 46 128 74 Q124 60 112 58 Q100 52 88 58 Q76 60 72 74 Z" fill={HAIR} />
        <path d="M72 74 Q74 66 80 62 L84 72 Z" fill={HAIR} />
        {/* ears */}
        <ellipse cx="71" cy="84" rx="5" ry="8" fill={SKIN} />
        <ellipse cx="129" cy="84" rx="5" ry="8" fill={SKIN} />
        {/* heavy furrowed brows */}
        <path className="ref-brow ref-brow-l" d="M80 72 Q90 66 98 71" stroke={HAIR} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path className="ref-brow ref-brow-r" d="M102 71 Q110 66 120 72" stroke={HAIR} strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* stern eyes */}
        <g className="ref-eyes">
          <ellipse cx="89" cy="80" rx="6" ry="6.5" fill="#fff" /><circle cx="90" cy="81" r="3.2" fill="#20242a" />
          <ellipse cx="111" cy="80" rx="6" ry="6.5" fill="#fff" /><circle cx="110" cy="81" r="3.2" fill="#20242a" />
        </g>
        {/* nose */}
        <path d="M100 82 Q97 90 100 94" fill="none" stroke={SKIN_DK} strokeWidth="2" strokeLinecap="round" />
        {/* cheeks - same skin tone so they're invisible at rest, only reading as a
            puff once scaled up past the head's silhouette on the whistle blow */}
        <ellipse className="ref-cheek ref-cheek-l" cx="82" cy="92" rx="9" ry="7" fill={SKIN} />
        <ellipse className="ref-cheek ref-cheek-r" cx="118" cy="92" rx="9" ry="7" fill={SKIN} />
        {/* thin serious mouth - scales to an "O" on the whistle blow */}
        <path className="ref-mouth" d="M91 100 Q100 103 109 100" stroke="#7a3b2a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      {/* left arm on hip - drawn after the head; never overlaps the face at rest. */}
      <g className="ref-arm-l">
        <path d="M70 128 Q54 138 60 158 Q64 170 78 166" fill="none" stroke={SKIN} strokeWidth="13" strokeLinecap="round" />
        <circle cx="78" cy="166" r="8" fill={SKIN} />
        <path d="M70 128 Q58 134 58 150" fill="none" stroke={KIT} strokeWidth="15" strokeLinecap="round" opacity="0.9" />
      </g>

      {/* Right arm raised, holding the card/whistle - drawn AFTER ref-head so it
          (and the whistle grouped inside it) always paints in front of the face
          and neck, including every frame of the count/whistle beats when the fist
          swings up to mouth level. */}
      <g className="ref-arm-r">
        <path className="ref-sleeve" d="M130 126 Q150 122 158 104" fill="none" stroke={KIT} strokeWidth="16" strokeLinecap="round" />
        {/* Elbow joint (Part: whistle-in-mouth) - the forearm, hand, cards and
            whistle live in their own nested group so the count/whistle beats can
            bend the elbow independently of the shoulder. A single rigid rotation
            about the shoulder can never bring the fist onto the mouth: the whole
            arm (shoulder→hand) measures ~65 units, but the shoulder is only ~39
            units from the mouth, so any one-bone swing bottoms out ~20-26 units
            short - which is exactly why the whistle used to land at the cheek/
            jaw instead of the lips. Rotating the shoulder a little (about its own
            exact attach point 130,126, so it never gapes) and the elbow (about
            154,106) a lot reaches the mouth precisely with a natural bent-elbow
            silhouette, not a straight arm slicing across the face. */}
        <g className="ref-forearm">
          <path d="M150 108 Q162 92 166 74" fill="none" stroke={SKIN} strokeWidth="12" strokeLinecap="round" />
          <circle cx="166" cy="72" r="8" fill={SKIN} />
          {/* the three cards share the hand; only one shows at a time */}
          <g className="ref-cards" transform="translate(166 72) rotate(12)">
            <rect className="ref-card ref-card-red" x="-8" y="-34" width="17" height="26" rx="2" fill="#cc0000" stroke="#8f0000" strokeWidth="1" opacity={whistle ? 0 : 1} />
            <rect className="ref-card ref-card-yellow" x="-8" y="-34" width="17" height="26" rx="2" fill="#ffd700" stroke="#b89600" strokeWidth="1" opacity="0" />
            <rect className="ref-card ref-card-green" x="-8" y="-34" width="17" height="26" rx="2" fill="#2dc26b" stroke="#1c8a49" strokeWidth="1" opacity="0" />
          </g>
          {/* Cutscene variant: a silver whistle in the raised hand instead of a card -
              rounded body, a mouthpiece nib, and a lanyard-loop ring. Grouped so the
              per-beat blow tween can raise and settle it. Local rotation is tuned
              for the FULL shoulder+elbow swing (see ref-forearm above), not the old
              single-rotation angle, so the mouthpiece nib still points at the lips
              once both joints are bent. */}
          {/* Body centred on the fist's own origin (0,0, r 8) so it reads as gripped
              inside the closed hand rather than floating above it. */}
          {whistle && (
            <g className="ref-whistle-hand" transform="translate(166 72) rotate(108)">
              <rect x="-9" y="-6" width="18" height="12" rx="5" fill={SILVER} stroke="#8a8a8a" strokeWidth="1.5" />
              <rect x="-13" y="-3" width="5" height="6" rx="2" fill={SILVER} stroke="#8a8a8a" strokeWidth="1.5" />
              <circle cx="6" cy="0" r="2.4" fill="#7a7a7a" />
              <circle cx="9" cy="-7" r="2.6" fill="none" stroke="#9a9a9a" strokeWidth="1.5" />
            </g>
          )}
        </g>
      </g>
    </g>
  )
}

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// --- Cutscene narrator ------------------------------------------------------
// Reacts to the Cutscene's published beat: mount → walk in from the right; 'vs'
// → point at the two teams; 'count' → raise the whistle to his mouth; 'whistle'
// → mouth snaps to an "O". Speech bubble carries a short narration line.
export function RefereeNarrator({ beat, line, lines }) {
  const rootRef = useRef(null)

  // Entrance + idle, scoped so StrictMode remount reverts cleanly.
  useEffect(() => {
    const root = rootRef.current
    if (!root || reduced()) return undefined
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root)
      gsap.from(q('.ref-char'), { x: 240, opacity: 0, duration: 0.5, ease: 'power2.out' })
      gsap.to(q('.ref-char'), { y: -4, duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.6 })
    }, root)
    return () => ctx.revert()
  }, [])

  // Speech-bubble copy staggers in whenever the narration changes. fromTo ends on
  // the natural (visible) state, so it is StrictMode-safe without a revert.
  useEffect(() => {
    const root = rootRef.current
    if (!root || reduced()) return undefined
    const q = gsap.utils.selector(root)
    const items = q('.referee__line')
    if (items.length) {
      gsap.fromTo(
        items,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.42, ease: 'power2.out' },
      )
    }
    return undefined
  }, [line, lines])

  // Per-beat reactions.
  useEffect(() => {
    const root = rootRef.current
    if (!root || reduced() || !beat) return undefined
    const q = gsap.utils.selector(root)
    const kill = () => gsap.killTweensOf([q('.ref-arm-r'), q('.ref-forearm'), q('.ref-mouth'), q('.ref-head'), q('.ref-whistle-hand'), q('.ref-eyes'), q('.ref-cheek')])
    if (beat === 'vs') {
      // Point at each team in turn.
      gsap.fromTo(q('.ref-arm-r'), { rotation: 0 }, { rotation: -22, duration: 0.32, yoyo: true, repeat: 3, svgOrigin: '134 124', ease: 'power2.inOut' })
    } else if (beat === 'count') {
      // Whistle to the mouth, held - a real two-bone reach (shoulder + elbow,
      // see the ref-forearm comment above), not a straight-arm swing. The
      // shoulder rotates about its own exact attach point (130 126) so it
      // never gapes from the sleeve; the elbow does the rest of the work
      // about the joint (154 106), landing the fist ON the lips instead of
      // at the cheek.
      gsap.to(q('.ref-arm-r'), { rotation: -38, duration: 0.42, svgOrigin: '130 126', ease: 'power2.out' })
      gsap.to(q('.ref-forearm'), { rotation: -80, duration: 0.44, svgOrigin: '154 106', ease: 'power2.out', delay: 0.02 })
      gsap.to(q('.ref-head'), { rotation: 0, duration: 0.2, svgOrigin: '100 88' })
      // A light touch-of-the-lips puff as the whistle settles into the mouth -
      // distinct from (and smaller than) the full blow puff below.
      gsap.to(q('.ref-cheek'), { scaleX: 1.06, scaleY: 1.04, duration: 0.22, delay: 0.4, ease: 'power2.out', transformOrigin: '50% 50%' })
    } else if (beat === 'whistle') {
      // The blow: mouth snaps open, eyes squint shut, cheeks puff further from
      // their count-beat touch - all at once, the instant the audio fires.
      gsap.to(q('.ref-mouth'), { scaleY: 2.6, scaleX: 0.7, duration: 0.1, transformOrigin: '50% 50%', svgOrigin: '100 100' })
      gsap.to(q('.ref-eyes'), { scaleY: 0.3, duration: 0.1, ease: 'power2.in', transformOrigin: '50% 50%' })
      gsap.to(q('.ref-cheek'), { scaleX: 1.3, scaleY: 1.2, duration: 0.1, ease: 'power2.out', transformOrigin: '50% 50%' })
      gsap.fromTo(q('.ref-char'), { scale: 1 }, { scale: 1.04, duration: 0.1, yoyo: true, repeat: 1, svgOrigin: '100 220' })
      // Whistle blow: a short raise-and-settle on the whistle as the audio fires.
      gsap.fromTo(q('.ref-whistle-hand'), { y: 0, rotation: 108 }, { y: -3, rotation: 98, duration: 0.12, yoyo: true, repeat: 1, transformOrigin: '50% 100%', ease: 'power2.inOut' })
    }
    return kill
  }, [beat])

  return (
    <div className="referee referee--cutscene" ref={rootRef} data-beat={beat}>
      {(line || (lines && lines.length > 0)) && (
        <div className="referee__bubble" aria-live="polite">
          {lines && lines.length > 0
            ? lines.map((l, i) => <p className="referee__line" key={i}>{l}</p>)
            : <p className="referee__line">{line}</p>}
        </div>
      )}
      <svg className="referee__svg" viewBox="0 0 200 250" width="150" height="188" role="img" aria-label="Match referee">
        <RefereeArt hand="whistle" />
      </svg>
    </div>
  )
}

// --- Post-result verdict ----------------------------------------------------
// Shown beside the ResultCard (Part 4, beat 6). `called` → the model's predicted
// winner won (green card, "Called it!"); otherwise an upset (yellow card). The
// card scales in with a slight overshoot.
export function RefereeVerdict({ called }) {
  const rootRef = useRef(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root || reduced()) return undefined
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root)
      gsap.from(q('.referee__svg'), { x: 40, opacity: 0, duration: 0.4, ease: 'power2.out' })
      const shown = called ? '.ref-card-green' : '.ref-card-yellow'
      gsap.set([q('.ref-card-red'), q('.ref-card-yellow'), q('.ref-card-green')], { opacity: 0 })
      gsap.fromTo(q(shown), { scale: 0, opacity: 1 }, { scale: 1, duration: 0.5, ease: 'back.out(2)', svgOrigin: '166 60', delay: 0.15 })
      gsap.fromTo(q('.referee__verdict'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, delay: 0.3, ease: 'power2.out' })
    }, root)
    return () => ctx.revert()
  }, [called])

  return (
    <div className={`referee referee--verdict${called ? ' is-called' : ' is-upset'}`} ref={rootRef}>
      <svg className="referee__svg" viewBox="0 0 200 250" width="86" height="108" role="img" aria-hidden="true">
        <RefereeArt />
      </svg>
      <p className="referee__verdict">
        {called ? (
          <><span className="referee__verdict-head">Called it</span> The model had this one right.</>
        ) : (
          <><span className="referee__verdict-head">Upset!</span> The model didn’t see this coming.</>
        )}
      </p>
    </div>
  )
}
