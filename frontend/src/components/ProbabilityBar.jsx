import './ProbabilityBar.css'

/**
 * Three-segment win/draw/win probability bar.
 * Home win = American Blue (the model's prediction channel); draw + away are
 * neutrals. Every segment is labelled with its tabular percentage (inline when
 * wide enough, always in the legend) so the bar is never color-only — the
 * Color-Blind Contract from DESIGN.md.
 *
 * @param {{homeWin:number, draw:number, awayWin:number}} prediction  probabilities 0..1
 * @param {string} homeCode  home FIFA code (legend label)
 * @param {string} awayCode  away FIFA code (legend label)
 * @param {'home'|'draw'|'away'|null} [actual]  the outcome that happened (completed matches)
 */
function ProbabilityBar({ prediction, homeCode, awayCode, actual = null }) {
  const segments = [
    { key: 'home', label: homeCode, value: prediction.homeWin, cls: 'home' },
    { key: 'draw', label: 'DRAW', value: prediction.draw, cls: 'draw' },
    { key: 'away', label: awayCode, value: prediction.awayWin, cls: 'away' },
  ]
  const pct = (v) => `${Math.round(v * 100)}%`

  return (
    <div className="prob">
      <div
        className="prob__track"
        role="img"
        aria-label={`Model prediction — ${homeCode} win ${pct(prediction.homeWin)}, draw ${pct(
          prediction.draw,
        )}, ${awayCode} win ${pct(prediction.awayWin)}.${
          actual ? ` Result: ${actual === 'draw' ? 'draw' : (actual === 'home' ? homeCode : awayCode) + ' won'}.` : ''
        }`}
      >
        {segments.map((s) => (
          <div
            key={s.key}
            className={`prob__seg prob__seg--${s.cls}${actual === s.key ? ' is-actual' : ''}${
              actual && actual !== s.key ? ' is-dimmed' : ''
            }`}
            style={{ flexGrow: Math.max(s.value, 0.001) }}
          >
            {s.value >= 0.16 && <span className="prob__seg-pct tnum">{pct(s.value)}</span>}
          </div>
        ))}
      </div>

      <ul className="prob__legend">
        {segments.map((s) => (
          <li key={s.key} className={`prob__legend-item${actual === s.key ? ' is-actual' : ''}`}>
            <span className={`prob__swatch prob__swatch--${s.cls}`} aria-hidden="true" />
            <span className="prob__legend-label">{s.label}</span>
            <span className="prob__legend-pct tnum">{pct(s.value)}</span>
            {actual === s.key && (
              <svg className="prob__check" viewBox="0 0 16 16" aria-hidden="true" width="13" height="13">
                <path
                  d="M3.5 8.5l3 3 6-6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ProbabilityBar
