import { useId, useState } from 'react'
import { teamMeta, flagUrl } from '../lib/teams'
import TabHeader from './TabHeader'
import './ChampionshipOdds.css'

// Title odds round to nothing for the long tail; be honest about it rather than
// printing a false "0.0%". Exactly-zero (no title in 10k sims) reads as em-dash.
function fmtPct(v) {
  const p = v * 100
  if (p >= 0.1) return `${p.toFixed(1)}%`
  if (p > 0) return '<0.1%'
  return '—'
}

// The descending path to the trophy — every stage already lives in odds.json.
const STAGES = [
  { key: 'round_of_32_odds', label: 'R32' },
  { key: 'round_of_16_odds', label: 'R16' },
  { key: 'quarterfinalist_odds', label: 'QF' },
  { key: 'semifinalist_odds', label: 'SF' },
  { key: 'finalist_odds', label: 'Final' },
  { key: 'championship_odds', label: 'Title' },
]

function survivalLabel(team) {
  const parts = STAGES.map((s) => `${s.label} ${fmtPct(team[s.key])}`).join(', ')
  return `${team.team} run probability — ${parts}.`
}

function SurvivalCurve({ team }) {
  return (
    <div className="surv">
      <div className="surv__head">
        <span className="surv__title">Path to the title</span>
        <span className="surv__note">Chance of reaching each stage · 10,000 simulations</span>
      </div>
      <ol className="surv__steps" role="img" aria-label={survivalLabel(team)}>
        {STAGES.map((s) => {
          const v = team[s.key]
          const isTitle = s.key === 'championship_odds'
          return (
            <li className={`surv__step${isTitle ? ' surv__step--title' : ''}`} key={s.key}>
              <span className="surv__val tnum">{fmtPct(v)}</span>
              <span className="surv__bar" aria-hidden="true">
                <span
                  className={`surv__fill${isTitle ? ' surv__fill--title' : ''}`}
                  style={{ height: `${Math.max(v * 100, 1.5)}%` }}
                />
              </span>
              <span className="surv__label">{s.label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function OddsRow({ team, meta, rank, barPct, isLeader, open, onToggle, index }) {
  const panelId = useId()
  const pct = fmtPct(team.championship_odds)
  const flag = flagUrl(meta.iso)
  // Cap the entrance stagger so the foot of the table doesn't lag noticeably.
  const delay = `${Math.min(index * 14, 380)}ms`

  return (
    <li className={`odds-row${isLeader ? ' is-leader' : ''}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="odds-row__btn"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="odds-row__rank tnum" aria-hidden="true">
          {isLeader && (
            <svg className="odds-row__crown" viewBox="0 0 24 16" width="16" height="11" aria-hidden="true">
              <path
                d="M2 14h20M3 13L1 4l6 4 5-7 5 7 6-4-2 9z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {rank}
        </span>

        <span className="odds-row__team">
          {flag ? (
            <img className="odds-row__flag" src={flag} alt="" width="26" height="19" loading="lazy" decoding="async" />
          ) : (
            <span className="odds-row__flag odds-row__flag--none" aria-hidden="true" />
          )}
          <span className="odds-row__code tnum">{meta.code}</span>
          <span className="odds-row__name display">{team.team}</span>
          <span className="odds-row__group" aria-label={`Group ${meta.group}`}>
            <span className="odds-row__group-badge" aria-hidden="true">
              {meta.group}
            </span>
          </span>
        </span>

        <span className="odds-row__bar" aria-hidden="true">
          <span
            className="odds-row__fill"
            style={{ transform: `scaleX(${barPct / 100})`, animationDelay: delay }}
          />
        </span>

        <span className="odds-row__pct tnum">{pct}</span>

        <svg className="odds-row__chev" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div id={panelId} className={`odds-row__panel${open ? ' is-open' : ''}`}>
        <div className="odds-row__panel-inner">
          <SurvivalCurve team={team} />
        </div>
      </div>
    </li>
  )
}

/**
 * Championship Odds leaderboard — all 48 nations ranked by Monte Carlo title
 * probability. Bar length is relative to the favourite (legible across a long
 * tail); the percentage is the absolute title chance. Rows expand to the full
 * survival curve. American blue owns the bar (prediction channel); the single
 * trophy-gold moment is the favourite's title figure.
 *
 * @param {{simulations:number, generated:string, teams:object[]}} odds  odds.json
 */
function ChampionshipOdds({ odds }) {
  const [openSet, setOpenSet] = useState(() => new Set())
  const teams = odds.teams // already sorted by championship_odds, descending
  const leaderOdds = teams[0]?.championship_odds || 1

  const toggle = (name) =>
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  return (
    <section className="odds" aria-labelledby="odds-title">
      <TabHeader
        as="h2"
        titleId="odds-title"
        title="Championship Odds"
        description={`Every nation’s chance of lifting the trophy, from ${odds.simulations.toLocaleString('en-GB')} Monte Carlo runs of the full bracket. Bar length is relative to the favourite; the figure is the absolute title chance. Open a row for its path to the final.`}
      />

      <div className="odds__colhead" aria-hidden="true">
        <span className="odds__col odds__col--rank">#</span>
        <span className="odds__col odds__col--team">Team</span>
        <span className="odds__col odds__col--bar">Title odds</span>
        <span className="odds__col odds__col--pct">Chance</span>
        <span className="odds__col odds__col--chev" />
      </div>

      <ol className="odds__list">
        {teams.map((team, i) => (
          <OddsRow
            key={team.team}
            team={team}
            meta={teamMeta(team.team)}
            rank={i + 1}
            index={i}
            isLeader={i === 0}
            barPct={Math.max((team.championship_odds / leaderOdds) * 100, 0.6)}
            open={openSet.has(team.team)}
            onToggle={() => toggle(team.team)}
          />
        ))}
      </ol>
    </section>
  )
}

export default ChampionshipOdds
