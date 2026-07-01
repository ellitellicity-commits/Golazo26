import { Mark26 } from './BrandMarks'
import './LoadingScreen.css'

/**
 * Full-screen gate shown while tournament data resolves. Usually a brief flash
 * (static fallback resolves in one tick; a live fetch takes a moment). The
 * broadcast register: studio-black surface, the gold mark, a single sweeping
 * rule — "coming on air", not a generic spinner.
 */
function LoadingScreen({ failed = false }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="loading__inner">
        <Mark26 className="loading__mark" />
        <p className="loading__label">
          {failed ? 'Loading tournament data…' : 'Loading tournament data'}
        </p>
        <div className="loading__sweep" aria-hidden="true">
          <span className="loading__sweep-bar" />
        </div>
        <span className="visually-hidden">Loading the World Cup 2026 desk</span>
      </div>
    </div>
  )
}

export default LoadingScreen
