import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import './TabHeader.css'

// The one place the balloon-inflate entrance lives. Every tab (Odds, Predictor,
// Bracket, Groups, Matchup Sandbox, Atlas) renders its title + description
// through this component, so the motion is defined once and never copy-pasted.
//
// Motion: the inner block scales up from nothing, overshoots once, then settles —
// "inflate then settle." back.out(1.7) gives that single overshoot; elastic.out
// oscillates (spring/wobble), which the brief explicitly rules out, so back wins.
// Only transform + opacity animate, so the layout box stays at its natural size
// the whole time — no reflow, no post-settle shift. If GSAP never runs (reduced
// motion, JS-off, headless), the natural state is already the finished state, so
// the header ships visible either way.
function TabHeader({ title, description, titleId, as: Tag = 'h1', children, className = '' }) {
  const root = useRef(null)

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) return
      gsap.from('.tabhead__inner', {
        scale: 0,
        opacity: 0,
        duration: 0.62,
        ease: 'back.out(1.7)',
        transformOrigin: '50% 55%',
        clearProps: 'transform,opacity',
      })
    },
    { scope: root },
  )

  return (
    <header ref={root} className={`tabhead ${className}`.trim()}>
      <div className="tabhead__inner">
        <Tag id={titleId} className="tabhead__title display">
          {title}
        </Tag>
        {description && <p className="tabhead__desc">{description}</p>}
        {children && <div className="tabhead__extra">{children}</div>}
      </div>
    </header>
  )
}

export default TabHeader
