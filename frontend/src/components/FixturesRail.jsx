import MatchCard from './MatchCard'
import './FixturesRail.css'

/**
 * Horizontal, scroll-snapped rail of match cards. Composes (doesn't shrink) on
 * small screens by becoming a single-column swipe lane.
 * @param {string} [todayDate]  fixtures with this date + scheduled status get the Today marker
 */
function FixturesRail({ title, eyebrow, fixtures, todayDate }) {
  return (
    <section className="rail" aria-label={title}>
      <div className="rail__head">
        <h2 className="rail__title display">{title}</h2>
        {eyebrow && <span className="rail__eyebrow">{eyebrow}</span>}
      </div>
      <ul className="rail__track">
        {fixtures.map((f) => (
          <li className="rail__item" key={f.id}>
            <MatchCard fixture={f} isToday={f.status === 'scheduled' && f.date === todayDate} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default FixturesRail
