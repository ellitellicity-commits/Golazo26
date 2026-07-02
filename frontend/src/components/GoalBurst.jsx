import { useEffect, useRef, useState } from 'react'
import './GoalBurst.css'

// A goal animation for a live match card: a soccer ball flies in toward the goal
// when the score ticks up. Home goals fly left→right, away goals right→left. It's
// purely decorative (pointer-events: none) and self-clears on animation end.

/**
 * Watch a live scoreline and surface a one-shot burst descriptor when a goal is
 * scored. Returns [burst, clear] — burst is { side, key } or null. The score at
 * mount is the baseline, so an already-in-progress match never false-fires; only
 * a subsequent increment (from live polling) triggers.
 */
export function useGoalBurst({ live, homeScore, awayScore }) {
  const prev = useRef({ h: homeScore, a: awayScore })
  const [burst, setBurst] = useState(null)
  useEffect(() => {
    const p = prev.current
    let side = null
    if (live) {
      if (typeof p.h === 'number' && typeof homeScore === 'number' && homeScore > p.h) side = 'home'
      else if (typeof p.a === 'number' && typeof awayScore === 'number' && awayScore > p.a) side = 'away'
    }
    prev.current = { h: homeScore, a: awayScore }
    if (side) setBurst({ side, key: Date.now() })
  }, [live, homeScore, awayScore])
  return [burst, () => setBurst(null)]
}

export default function GoalBurst({ side, onDone }) {
  return (
    <span className={`goal-burst goal-burst--${side}`} aria-hidden="true" onAnimationEnd={onDone}>
      <svg className="goal-burst__ball" viewBox="0 0 16 16" width="34" height="34">
        <circle cx="8" cy="8" r="6.4" fill="var(--studio-black)" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 5.7 10.19 7.29 9.35 9.86 6.65 9.86 5.81 7.29Z" fill="currentColor" />
        <path
          d="M8 5.7V1.9M10.19 7.29 13.8 6.12M9.35 9.86 11.59 12.93M6.65 9.86 4.41 12.93M5.81 7.29 2.2 6.12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
