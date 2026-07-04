import { useEffect, useRef, useState } from 'react'
import './Typewriter.css'

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Broadcast-style typewriter reveal. Characters land progressively at a snappy
 * cadence (~1.5s for the whole line, clamped so short lines still read as typed
 * and long ones never drag).
 *
 * Zero layout shift: the FULL text is always in the DOM — the not-yet-typed tail
 * is rendered transparent as a "ghost" that reserves the final box, so nothing
 * reflows as characters appear. The visible layer is aria-hidden; a visually
 * hidden copy carries the full sentence to assistive tech (no per-keystroke
 * announcements). Under prefers-reduced-motion the line is shown instantly.
 */
export default function Typewriter({ text = '', className = '', startDelay = 160 }) {
  const [count, setCount] = useState(0)
  const [done, setDone] = useState(false)
  const rafRef = useRef(0)

  useEffect(() => {
    const full = text || ''
    setCount(0)
    setDone(false)
    if (!full) return undefined

    if (reducedMotion()) {
      setCount(full.length)
      setDone(true)
      return undefined
    }

    const perChar = Math.max(9, Math.min(22, 1500 / full.length))
    let startAt = 0
    let cancelled = false

    const tick = (now) => {
      if (cancelled) return
      if (!startAt) startAt = now + startDelay
      const elapsed = now - startAt
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const n = Math.min(full.length, Math.floor(elapsed / perChar))
      setCount(n)
      if (n < full.length) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDone(true)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [text, startDelay])

  const full = text || ''
  const typed = full.slice(0, count)
  const rest = full.slice(count)

  return (
    <p className={`typewriter${done ? ' is-done' : ''}${className ? ` ${className}` : ''}`}>
      <span className="visually-hidden">{full}</span>
      <span className="typewriter__visual" aria-hidden="true">
        <span className="typewriter__typed">{typed}</span>
        <span className="typewriter__caret" />
        <span className="typewriter__ghost">{rest}</span>
      </span>
    </p>
  )
}
