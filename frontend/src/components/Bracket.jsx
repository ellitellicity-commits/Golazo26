import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LAYOUT,
  META,
  PARENT_OF,
  REVEAL_ORDER,
  buildViews,
  liveResults,
  titleOdds,
} from '../lib/bracket'
import { runFullSimulation } from '../lib/simulation'
import { liveClock } from '../lib/live'
import { useTournamentData } from '../lib/tournamentData'
import BracketMatchPreview from './BracketMatchPreview'
import Confetti from './Confetti'
import './Bracket.css'

// All fixture dates are stored as UTC instants; format in UTC so US-local
// timezones don't shift them back a day.
const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fmtDay = (iso) => DATE_FMT.format(new Date(`${iso}T00:00:00Z`))
const pct = (v) => `${Math.round(v * 100)}%`
const fmtOdds = (v) => {
  const p = v * 100
  if (p >= 0.1) return `${p.toFixed(1)}%`
  return p > 0 ? '<0.1%' : '—'
}

const ALL_IDS = [
  ...LAYOUT.left.r32, ...LAYOUT.right.r32,
  ...LAYOUT.left.r16, ...LAYOUT.right.r16,
  ...LAYOUT.left.qf, ...LAYOUT.right.qf,
  ...LAYOUT.left.sf, ...LAYOUT.right.sf,
  LAYOUT.finalId, LAYOUT.thirdId,
]

// Grid row span per round (16-row grid; centres always line up with feeders).
const SPAN = { r32: 2, r16: 4, qf: 8, sf: 16 }
const ROUND_LABEL = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF' }

function FlagOrDot({ c }) {
  if (c.flag) return <img className="bk-team__flag" src={c.flag} alt="" width="22" height="16" loading="lazy" decoding="async" />
  return <span className="bk-team__flag bk-team__flag--none" aria-hidden="true" />
}

function TeamLine({ c, prob, score, decided, isWinner, isLoser, championGold, host }) {
  if (!c || c.kind === 'placeholder') {
    return (
      <div className="bk-team is-tbd">
        <span className="bk-team__tbd">{c ? c.label : 'TBD'}</span>
      </div>
    )
  }
  const showScore = score != null
  const showProb = !showScore && prob != null
  const favored = showProb && prob >= 0.5
  const cls = [
    'bk-team',
    isWinner && 'is-winner',
    isLoser && 'is-loser',
    championGold && 'is-champ',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls}>
      <FlagOrDot c={c} />
      <span className="bk-team__code">{c.code}</span>
      <span className="bk-team__grp" style={{ color: c.color }} aria-hidden="true">
        {c.group}
      </span>
      {host && (
        <span className="bk-team__host" title="Host nation playing at home — venue advantage applied">
          <span className="visually-hidden">Host nation at home</span>
        </span>
      )}
      <span className="bk-team__val">
        {showScore ? (
          <span className="bk-team__score tnum">{score}</span>
        ) : showProb ? (
          <span className={`bk-team__prob tnum${favored ? ' is-fav' : ''}`}>{pct(prob)}</span>
        ) : null}
        {decided && isWinner && (
          <svg className="bk-team__adv" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </div>
  )
}

// Penalty-shootout note, e.g. "PAR win 4–3 pens". The team lines already show
// the regulation/extra-time score; this reports who won the shootout separately
// (never a combined number). Null when the tie wasn't decided on penalties.
function penNote(view) {
  const p = view.score?.penalties
  if (!p) return null
  const homeWon = p.home_score > p.away_score
  const winCode = homeWon ? view.home.code : view.away.code
  return `${winCode} win ${Math.max(p.home_score, p.away_score)}–${Math.min(p.home_score, p.away_score)} pens`
}

function MatchCaption({ view, mode }) {
  const pens = penNote(view)
  if (view.round === 'r32') {
    return (
      <div className="bk-match__cap">
        <span className="bk-match__no">M{view.id}</span>
        {mode === 'live' && view.status === 'live' ? (
          <span className="bk-match__live">
            <span className="bk-match__live-dot" aria-hidden="true" />
            {liveClock(view.live)}
          </span>
        ) : mode === 'live' && view.isToday ? (
          <span className="bk-match__today">
            <span className="bk-match__today-dot" aria-hidden="true" />
            Today
          </span>
        ) : view.status === 'completed' ? (
          <span className="bk-match__ft">{pens || 'Full time'}</span>
        ) : (
          <span className="bk-match__when">
            {fmtDay(view.date)} · {view.venue.city}
          </span>
        )}
      </div>
    )
  }
  return (
    <div className="bk-match__cap">
      <span className="bk-match__no">M{view.id}</span>
      {mode === 'live' && view.status === 'live' ? (
        <span className="bk-match__live">
          <span className="bk-match__live-dot" aria-hidden="true" />
          {liveClock(view.live)}
        </span>
      ) : pens ? (
        <span className="bk-match__ft">{pens}</span>
      ) : view.venue ? (
        <span className="bk-match__when">{view.venue.city}</span>
      ) : null}
    </div>
  )
}

function BracketMatch({ view, side, revealed, championName, style, hideCaption = false, outState = null, vertState = null }) {
  const decided = !!view.winner
  const live = view.status === 'live'
  // Any tie carrying a score shows goal digits — real R32 results, real knockout
  // results, and re-rolled ties alike. In-play ties keep the running score; a
  // finished tie (completed) gets the dimmed-loser / "Full time" treatment.
  const showScore = view.score != null
  const completed = showScore && !live
  const both = view.home.kind === 'team' && view.away.kind === 'team'
  const showProb = !decided && !completed && view.pHome != null
  const homeProb = both ? view.pHome : null
  const awayProb = both ? 1 - view.pHome : null
  const homeWinner = decided && view.winner === view.home.name
  const awayWinner = decided && view.winner === view.away.name
  const isFinal = view.round === 'final'
  const championGold = isFinal && !!championName

  // Every match owns a vertical merge, R32 included: at R32 the two group-stage
  // teams share one box, so the join brackets that pairing; at later rounds it
  // merges the two feeder matches. The Final/Third have no merge bar (finalists
  // converge horizontally; third place is off the tree).
  const hasJoin = view.round === 'r32' || view.round === 'r16' || view.round === 'qf' || view.round === 'sf'
  const justRevealed = revealed?.has?.(view.id)

  // Live/finished R32 ties (real tournament only) reveal a compact hover/tap
  // preview — state, score and a short line-up — without expanding the tree.
  const previewable = revealed === null && view.round === 'r32' && (live || completed) && both

  const outClass = outState ? ` is-out-${outState}` : ''
  const className = `bk-match bk-match--${view.round}${decided ? ' is-decided' : ''}${
    live ? ' is-live' : ''
  }${outClass}${justRevealed ? ' is-pop' : ''}${previewable ? ' is-previewable' : ''}`

  const inner = (
    <>
      {!hideCaption && <MatchCaption view={view} mode={revealed === null ? 'live' : 'sim'} />}
      <div className="bk-match__box">
        <TeamLine
          c={view.home}
          prob={showProb ? homeProb : decided ? homeProb : null}
          score={showScore ? view.score.home_score : null}
          decided={decided}
          isWinner={homeWinner}
          isLoser={(decided || completed) && !homeWinner && view.home.kind === 'team'}
          championGold={championGold && homeWinner}
          host={view.homeHost}
        />
        <span className="bk-match__vs" aria-hidden="true" />
        <TeamLine
          c={view.away}
          prob={showProb ? awayProb : decided ? awayProb : null}
          score={showScore ? view.score.away_score : null}
          decided={decided}
          isWinner={awayWinner}
          isLoser={(decided || completed) && !awayWinner && view.away.kind === 'team'}
          championGold={championGold && awayWinner}
          host={view.awayHost}
        />
      </div>
      {hasJoin && (
        <i
          className={`bk-match__join bk-match__join--${side} bk-match__join--${view.round}${vertState ? ` is-vert-${vertState}` : ''}`}
          aria-hidden="true"
        />
      )}
    </>
  )

  if (previewable) {
    return (
      <BracketMatchPreview view={view} className={className} style={style}>
        {inner}
      </BracketMatchPreview>
    )
  }

  return (
    <div className={className} style={style}>
      {inner}
    </div>
  )
}

function GroupRail({ groups, header }) {
  return (
    <div className="bk-rail">
      <div className="bk-rail__head">{header}</div>
      <div className="bk-rail__list">
        {groups.map((g) => (
          <div className="bk-group" key={g.letter} style={{ '--grp': g.color }}>
            <div className="bk-group__head">
              <span className="bk-group__badge" style={{ background: g.color, color: g.textColor }}>
                {g.letter}
              </span>
              <span className="bk-group__label" style={{ color: g.color }}>
                Group {g.letter}
              </span>
            </div>
            <ul className="bk-group__teams">
              {g.teams.map((t) => (
                <li className="bk-group__team" key={t.name}>
                  {t.flag ? (
                    <img className="bk-group__flag" src={t.flag} alt="" width="18" height="13" loading="lazy" decoding="async" />
                  ) : (
                    <span className="bk-group__flag bk-group__flag--none" aria-hidden="true" />
                  )}
                  <span className="bk-group__code">{t.code}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function Trophy({ lit }) {
  return (
    <img
      className={`bk-trophy${lit ? ' is-lit' : ''}`}
      src="/trophy.png"
      alt="FIFA World Cup trophy"
      width="130"
      height="130"
      decoding="async"
    />
  )
}

function Bracket({ groups }) {
  const { fixtures } = useTournamentData()
  // Two modes only: 'live' (the real tournament — real results + model
  // probabilities, the default that respects reality) and 'reimagine' (a
  // full from-scratch re-roll what-if). The old respect-reality "simulate"
  // playout was removed: the live view already respects reality.
  const [mode, setMode] = useState('live')
  const [simResults, setSimResults] = useState(null)
  const [simR32, setSimR32] = useState(null)
  const [revealed, setRevealed] = useState(() => new Set())
  const [running, setRunning] = useState(false)
  const [champion, setChampion] = useState(null)
  const [runId, setRunId] = useState(0)
  const timers = useRef([])

  const liveRes = useMemo(() => liveResults(fixtures.knockout), [fixtures])

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const views = useMemo(() => {
    if (mode === 'live') return buildViews(liveRes, 'live', fixtures.knockout.r32, fixtures.knockout.liveByPair)
    const partial = {}
    if (simResults) for (const id of revealed) partial[id] = simResults[id]
    return buildViews(partial, 'simulate', simR32 || undefined)
  }, [mode, liveRes, fixtures, simResults, revealed, simR32])

  const switchMode = (next) => {
    if (next === mode) return
    clearTimers()
    setMode(next)
    setSimResults(null)
    setSimR32(null)
    setRevealed(new Set())
    setRunning(false)
    setChampion(null)
    // Reimagine runs a full from-scratch re-roll on selection; "Run again"
    // re-randomises. Real Tournament is the static live view and needs no run.
    if (next === 'reimagine') runSimulation(true)
  }

  const runSimulation = (fromScratch = false) => {
    clearTimers()
    const { r32, results } = runFullSimulation(fixtures, fromScratch)
    setSimR32(r32)
    setSimResults(results)
    setChampion(null)
    setRunning(true)
    setRunId((n) => n + 1)

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setRevealed(new Set(ALL_IDS))
      setRunning(false)
      setChampion(results[LAYOUT.finalId].winner)
      return
    }

    setRevealed(new Set())
    let delay = 260
    const perItem = 60
    const roundPause = 380
    REVEAL_ORDER.forEach((round) => {
      round.forEach((id) => {
        const d = delay
        timers.current.push(
          setTimeout(() => {
            setRevealed((prev) => {
              const n = new Set(prev)
              n.add(id)
              return n
            })
          }, d),
        )
        delay += perItem
      })
      delay += roundPause
    })
    timers.current.push(
      setTimeout(() => {
        setRunning(false)
        setChampion(results[LAYOUT.finalId].winner)
      }, delay),
    )
  }

  // Render-time helpers ------------------------------------------------------
  const isSim = mode === 'reimagine'
  const revealedForMatch = isSim ? revealed : null
  const finalView = views[LAYOUT.finalId]
  const thirdView = views[LAYOUT.thirdId]
  const championTeam = champion ? views[LAYOUT.finalId].home.name === champion ? views[LAYOUT.finalId].home : views[LAYOUT.finalId].away : null

  // A team stays "alive" until it loses a decided match (its name shows up as a
  // loser somewhere). The champion is the only team that never loses, so their
  // path is the only one still glowing in a finished bracket. Derived fresh from
  // the current results every render, so re-simulating any match recomputes the
  // whole tree — no stale state carried forward. Every connector is the same
  // thickness; only brightness (and length) tells paths apart.
  const eliminated = useMemo(() => {
    const s = new Set()
    for (const id of ALL_IDS) {
      const l = views[id]?.loser
      if (l) s.add(l)
    }
    return s
  }, [views])

  const actualChampion = views[LAYOUT.finalId]?.winner ?? null

  // Two segment types, three states (default / glowing `win` / dimmed `elim`):
  //
  // • Vertical (a match's merge): glows the moment the match is won — while that
  //   winner is still alive — and dims, all at once, once that winner is knocked
  //   out. Owned by the match's winner (one colour for the whole join), so a
  //   beaten team's earned verticals dim together while the champion's stay lit.
  //
  // • Outgoing horizontal (winner carries forward into PARENT_OF[id]): only
  //   "earned" — and lit — once that winner ALSO wins the next match. A horizontal
  //   into a match the team lost was never earned, so it stays default forever
  //   (never dims), and nothing renders past it for that team.
  const stateAlive = (name) => (name ? (eliminated.has(name) ? 'elim' : 'win') : null)
  const vertStateOf = (v) => (v?.winner ? stateAlive(v.winner) : null)
  const outStateOf = (v) => {
    const w = v?.winner
    if (!w) return null
    const parent = views[PARENT_OF[v.id]]
    return parent?.winner === w ? stateAlive(w) : null
  }

  const renderRound = (side, round) => {
    const ids = LAYOUT[side][round]
    const col = side === 'left'
      ? { r32: 1, r16: 2, qf: 3, sf: 4 }[round]
      : { r32: 4, r16: 3, qf: 2, sf: 1 }[round]
    const span = SPAN[round]
    return (
      <>
        <div className="bk-stage" style={{ gridColumn: col, gridRow: 1 }}>
          {ROUND_LABEL[round]}
        </div>
        {ids.map((id, i) => (
          <BracketMatch
            key={id}
            view={views[id]}
            side={side}
            revealed={revealedForMatch}
            championName={champion}
            outState={outStateOf(views[id])}
            vertState={vertStateOf(views[id])}
            style={{ gridColumn: col, gridRow: `${2 + i * span} / span ${span}` }}
          />
        ))}
      </>
    )
  }

  return (
    <section className="bk" aria-labelledby="bk-title">
      <div className="bk__bar">
        <div className="bk__heading">
          <h2 id="bk-title" className="bk__title display">
            Tournament Bracket
          </h2>
          <p className="bk__sub">
            {mode === 'live'
              ? `The real tournament — ${META.final.stadium} final on ${fmtDay(META.final.date)}. Played matches show the result; upcoming ties show the model’s win probability.`
              : 'A from-scratch re-roll: every match — including the group games already played — is randomised, so the whole tournament diverges from what really happened. Run it again for a new what-if.'}
          </p>
        </div>

        <div className="bk__controls">
          <div className="bk__modes" role="tablist" aria-label="Bracket mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'live'}
              className={`bk__mode${mode === 'live' ? ' is-on' : ''}`}
              onClick={() => switchMode('live')}
            >
              Real Tournament
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'reimagine'}
              className={`bk__mode${mode === 'reimagine' ? ' is-on' : ''}`}
              onClick={() => (mode === 'reimagine' ? runSimulation(true) : switchMode('reimagine'))}
            >
              Reimagine Tournament
            </button>
          </div>
          {isSim && (
            <button type="button" className="bk__run" onClick={() => runSimulation(true)} disabled={running}>
              {running ? 'Simulating…' : simResults ? 'Run again' : 'Run simulation'}
            </button>
          )}
        </div>
      </div>

      {isSim && champion && championTeam && (
        <div className="bk__champ" role="status">
          <span className="bk__champ-label">Simulated champion</span>
          <span className="bk__champ-team">
            {championTeam.flag && (
              <img src={championTeam.flag} alt="" width="30" height="22" className="bk__champ-flag" />
            )}
            <span className="bk__champ-name display">{champion}</span>
          </span>
          <span className="bk__champ-odds tnum">Title odds {fmtOdds(titleOdds(champion))}</span>
        </div>
      )}

      <p className="bk__legend">
        <span className="bk__legend-dot" aria-hidden="true" />
        Gold dot marks a match played in the host nation’s own country (USA · Canada · Mexico) — where the venue advantage applies.
      </p>

      {/* Narrow viewports pan the full tree horizontally; announce the gesture so
          the off-screen rounds are discoverable (desktop shows the whole tree). */}
      <p className="bk__swipe">
        Swipe across to follow every round
        <svg className="bk__swipe-arrow" viewBox="0 0 24 12" width="24" height="12" aria-hidden="true">
          <path d="M2 6h18m0 0-5-4m5 4-5 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </p>

      <div className="bk__scroller">
        <div className="bk__canvas">
          <BracketTexture />

          <GroupRail groups={groups.slice(0, 6)} header="Groups A–F" />

          <div className="bk-grid bk-grid--left">
            {renderRound('left', 'r32')}
            {renderRound('left', 'r16')}
            {renderRound('left', 'qf')}
            {renderRound('left', 'sf')}
          </div>

          <div className="bk-center">
            <div className="bk-stage bk-stage--final">Final</div>
            <div className="bk-center__body">
              <div
                className={`bk-final-wrap${
                  actualChampion && finalView.home.name === actualChampion ? ' is-left-win' : ''
                }${actualChampion && finalView.away.name === actualChampion ? ' is-right-win' : ''}`}
              >
                <div className="bk-final-head">
                  <span className="bk-final-head__label">Final</span>
                  <span className="bk-final-head__meta">
                    {META.final.city} · {fmtDay(META.final.date)}
                  </span>
                </div>
                <BracketMatch
                  view={finalView}
                  side="center"
                  revealed={revealedForMatch}
                  championName={champion}
                  hideCaption
                />
              </div>
              <div className={`bk-trophy-wrap${champion ? ' is-won' : ''}`}>
                <Trophy lit={!!champion} />
              </div>
              <div className="bk-third">
                <div className="bk-third__head">
                  <span className="bk-third__label">Third place</span>
                  <span className="bk-third__meta">
                    {META.thirdPlace.city} · {fmtDay(META.thirdPlace.date)}
                  </span>
                </div>
                <BracketMatch
                  view={thirdView}
                  side="center"
                  revealed={revealedForMatch}
                  championName={null}
                  hideCaption
                />
              </div>
            </div>
          </div>

          <div className="bk-grid bk-grid--right">
            {renderRound('right', 'r32')}
            {renderRound('right', 'r16')}
            {renderRound('right', 'qf')}
            {renderRound('right', 'sf')}
          </div>

          <GroupRail groups={groups.slice(6, 12)} header="Groups G–L" />

          <Confetti fire={champion ? runId : 0} />
        </div>
      </div>

      <p className="bk__foot-note">
        Probabilities are head-to-head estimates derived from the model’s 10,000-simulation title odds. Knockout ties are
        decided outright (no draws). Group colour identifies the group; the letter carries it for colour-blind reading.
      </p>
    </section>
  )
}

// Subtle FIFA-style geometric field: rounded squares + quarter-circles, very low
// contrast, purely atmospheric behind the bracket.
function BracketTexture() {
  return (
    <svg className="bk-texture" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="bk-geo" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
          <rect x="14" y="14" width="44" height="44" rx="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M62 14 a44 44 0 0 1 44 44 H62 Z" fill="currentColor" opacity="0.5" />
          <circle cx="92" cy="92" r="10" fill="currentColor" opacity="0.6" />
          <path d="M14 106 a20 20 0 0 1 20 -20 V106 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bk-geo)" />
    </svg>
  )
}

export default Bracket
