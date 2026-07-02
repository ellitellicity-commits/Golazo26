import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { loadMatchSummaryByTeams } from '../lib/espn'
import './BracketMatchPreview.css'

// Compact match preview for a bracket node. The bracket tree stays readable — it
// never expands inline — so live/finished ties reveal a small popup on hover,
// focus or tap: state + minute/FT, the score, and a compact line-up (5 a side).
// Rendered through a portal with fixed positioning so it escapes the bracket
// scroller's clip (.bk__scroller is overflow-hidden vertically). ESPN data
// (lib/espn.js) is fetched once on open and degrades to a score-only card.

function anchorRect(el) {
  const r = el.getBoundingClientRect()
  const below = r.bottom < window.innerHeight * 0.6
  return {
    left: Math.min(Math.max(r.left + r.width / 2, 140), window.innerWidth - 140),
    y: below ? r.bottom + 8 : r.top - 8,
    place: below ? 'below' : 'above',
  }
}

function LineupColumn({ team, lineup }) {
  const starters = (lineup?.starters || []).slice(0, 5)
  if (starters.length === 0) return null
  return (
    <div className="bmp__lineup">
      <span className="bmp__lineup-team">{team}</span>
      <ul className="bmp__lineup-list">
        {starters.map((p) => (
          <li key={`${p.jersey}-${p.name}`} className="bmp__lineup-player">
            <span className="bmp__lineup-jersey tnum">{p.jersey || '–'}</span>
            {p.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

function BracketMatchPreview({ view, className, style, children }) {
  const ref = useRef(null)
  const fetched = useRef(false)
  const [pos, setPos] = useState(null)
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const live = view.status === 'live'
  const stateLabel = live ? 'Live' : 'Final'

  const open = () => {
    if (ref.current) setPos(anchorRect(ref.current))
    if (fetched.current) return
    fetched.current = true
    loadMatchSummaryByTeams(view.home.name, view.away.name, view.date).then((d) => {
      setData(d)
      setLoaded(true)
    })
  }
  const close = () => setPos(null)

  // Close if the page scrolls (a fixed popup would otherwise detach from its node).
  useEffect(() => {
    if (!pos) return
    const onScroll = () => setPos(null)
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [pos])

  const score = view.score
  const popup = pos && (
    <div
      className={`bmp bmp--${pos.place}`}
      role="tooltip"
      style={{
        left: pos.left,
        [pos.place === 'below' ? 'top' : 'bottom']: pos.place === 'below' ? pos.y : window.innerHeight - pos.y,
      }}
    >
      <div className="bmp__head">
        <span className={`bmp__state${live ? ' bmp__state--live' : ''}`}>
          {live && <span className="bmp__state-dot" aria-hidden="true" />}
          {stateLabel}
          {live && loaded && data?.minute ? ` · ${data.minute}` : ''}
        </span>
      </div>
      {score && (
        <div className="bmp__score">
          <span className="bmp__score-code">{view.home.code}</span>
          <span className="bmp__score-num display tnum">
            {score.home_score}<span className="bmp__score-dash">–</span>{score.away_score}
          </span>
          <span className="bmp__score-code">{view.away.code}</span>
        </div>
      )}
      {!loaded ? (
        <p className="bmp__note">Loading…</p>
      ) : data?.hasLineups ? (
        <div className="bmp__lineups">
          <LineupColumn team={view.home.code} lineup={data.lineups.home} />
          <LineupColumn team={view.away.code} lineup={data.lineups.away} />
        </div>
      ) : null}
      {loaded && data && <p className="bmp__credit">{live ? 'Live data · ESPN' : 'Final data · ESPN'}</p>}
    </div>
  )

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      tabIndex={0}
      onPointerEnter={open}
      onPointerLeave={close}
      onFocus={open}
      onBlur={close}
      onClick={() => (pos ? close() : open())}
      aria-label={`${view.home.name} versus ${view.away.name} — match details`}
    >
      {children}
      {popup && createPortal(popup, document.body)}
    </div>
  )
}

export default BracketMatchPreview
