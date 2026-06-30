import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LAYOUT,
  META,
  REVEAL_ORDER,
  buildViews,
  liveResults,
  simulate,
  titleOdds,
} from '../lib/bracket'
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

function MatchCaption({ view, mode }) {
  if (view.round === 'r32') {
    return (
      <div className="bk-match__cap">
        <span className="bk-match__no">M{view.id}</span>
        {mode === 'live' && view.isToday ? (
          <span className="bk-match__today">
            <span className="bk-match__today-dot" aria-hidden="true" />
            Today
          </span>
        ) : view.status === 'completed' ? (
          <span className="bk-match__ft">Full time</span>
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
      {view.venue && <span className="bk-match__when">{view.venue.city}</span>}
    </div>
  )
}

function BracketMatch({ view, side, revealed, championName, style, hideCaption = false }) {
  const decided = !!view.winner
  const completed = view.round === 'r32' && view.score != null
  const both = view.home.kind === 'team' && view.away.kind === 'team'
  const showProb = !decided && !completed && view.pHome != null
  const homeProb = both ? view.pHome : null
  const awayProb = both ? 1 - view.pHome : null
  const homeWinner = decided && view.winner === view.home.name
  const awayWinner = decided && view.winner === view.away.name
  const isFinal = view.round === 'final'
  const championGold = isFinal && !!championName

  const hasJoin = view.round === 'r16' || view.round === 'qf' || view.round === 'sf'
  const justRevealed = revealed?.has?.(view.id)

  return (
    <div
      className={`bk-match bk-match--${view.round}${decided ? ' is-decided' : ''}${
        justRevealed ? ' is-pop' : ''
      }`}
      style={style}
    >
      {!hideCaption && <MatchCaption view={view} mode={revealed === null ? 'live' : 'sim'} />}
      <div className="bk-match__box">
        <TeamLine
          c={view.home}
          prob={showProb ? homeProb : decided ? homeProb : null}
          score={completed ? view.score.home_score : null}
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
          score={completed ? view.score.away_score : null}
          decided={decided}
          isWinner={awayWinner}
          isLoser={(decided || completed) && !awayWinner && view.away.kind === 'team'}
          championGold={championGold && awayWinner}
          host={view.awayHost}
        />
      </div>
      {hasJoin && <i className={`bk-match__join bk-match__join--${side}`} aria-hidden="true" />}
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

function Bracket({ groups, initialMode = 'live', autoSimulate = false }) {
  const [mode, setMode] = useState(initialMode)
  const [simResults, setSimResults] = useState(null)
  const [revealed, setRevealed] = useState(() => new Set())
  const [running, setRunning] = useState(false)
  const [champion, setChampion] = useState(null)
  const [runId, setRunId] = useState(0)
  const timers = useRef([])

  const liveRes = useMemo(() => liveResults(), [])

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const views = useMemo(() => {
    if (mode === 'live') return buildViews(liveRes, 'live')
    const partial = {}
    if (simResults) for (const id of revealed) partial[id] = simResults[id]
    return buildViews(partial, 'simulate')
  }, [mode, liveRes, simResults, revealed])

  const switchMode = (next) => {
    if (next === mode) return
    clearTimers()
    setMode(next)
    setSimResults(null)
    setRevealed(new Set())
    setRunning(false)
    setChampion(null)
  }

  const runSimulation = () => {
    clearTimers()
    const results = simulate()
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

  // Deep-link from the Groups view: land in Simulate mode and play one bracket
  // out automatically on mount. No ref guard here — under StrictMode the mount
  // effects run twice with the clearTimers cleanup firing BETWEEN them, which
  // cancels the first run's reveal timers. A persistent guard would then block
  // re-scheduling on the second mount and leave the bracket stuck "Simulating…"
  // forever. Re-running after the cleanup is correct and costs ~0.01ms.
  useEffect(() => {
    if (autoSimulate && initialMode === 'simulate') runSimulation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Render-time helpers ------------------------------------------------------
  const revealedForMatch = mode === 'simulate' ? revealed : null
  const finalView = views[LAYOUT.finalId]
  const thirdView = views[LAYOUT.thirdId]
  const championTeam = champion ? views[LAYOUT.finalId].home.name === champion ? views[LAYOUT.finalId].home : views[LAYOUT.finalId].away : null

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
            The locked 32-team knockout, {META.final.stadium} final on {fmtDay(META.final.date)}.{' '}
            {mode === 'live'
              ? 'Played matches show the result; upcoming ties show the model’s win probability.'
              : 'Run the model to play out every tie from the Round of 32 to the trophy — a different bracket each time.'}
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
              Live bracket
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'simulate'}
              className={`bk__mode${mode === 'simulate' ? ' is-on' : ''}`}
              onClick={() => switchMode('simulate')}
            >
              Simulate
            </button>
          </div>
          {mode === 'simulate' && (
            <button type="button" className="bk__run" onClick={runSimulation} disabled={running}>
              {running ? 'Simulating…' : simResults ? 'Run again' : 'Run simulation'}
            </button>
          )}
        </div>
      </div>

      {mode === 'simulate' && champion && championTeam && (
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
              <div className="bk-final-wrap">
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
