import { Fragment, useId, useState } from 'react'
import {
  getGroupStandings,
  getThirdPlaceRace,
  QUALIFY_SLOTS,
  THIRD_PLACE_QUALIFIERS,
} from '../lib/standings'
import { teamMeta } from '../lib/teams'
import './Groups.css'

const groups = getGroupStandings()
const thirdRace = getThirdPlaceRace()

const fmtGD = (gd) => (gd > 0 ? `+${gd}` : String(gd))

// Maps a derived qualification status to its position-chip class. Status comes
// from the live data, never hardcoded — see lib/standings.js.
const POS_CLASS = { q: 'is-q', q3in: 'is-q3', q3out: 'is-out', out: 'is-out' }

function StandingsTable({ rows, caption }) {
  return (
    <table className="gtable">
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th className="gtable__pos" scope="col">#</th>
          <th className="gtable__team" scope="col">Team</th>
          <th scope="col"><abbr title="Played">P</abbr></th>
          <th className="gtable__opt" scope="col"><abbr title="Won">W</abbr></th>
          <th className="gtable__opt" scope="col"><abbr title="Drawn">D</abbr></th>
          <th className="gtable__opt" scope="col"><abbr title="Lost">L</abbr></th>
          <th className="gtable__opt" scope="col"><abbr title="Goals for">GF</abbr></th>
          <th className="gtable__opt" scope="col"><abbr title="Goals against">GA</abbr></th>
          <th scope="col"><abbr title="Goal difference">GD</abbr></th>
          <th className="gtable__pts" scope="col"><abbr title="Points">Pts</abbr></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className={`is-${r.status}`}>
            <td className="gtable__pos">
              <span
                className={`gpos ${POS_CLASS[r.status]}`}
                title={
                  r.status === 'q'
                    ? 'Qualified'
                    : r.status === 'q3in'
                      ? `3rd — provisionally through (${r.thirdRank} of 12 in the third-place race)`
                      : r.status === 'q3out'
                        ? `3rd — provisionally out (${r.thirdRank} of 12 in the third-place race)`
                        : 'Eliminated'
                }
              >
                {r.position}
              </span>
            </td>
            <td className="gtable__team">
              {r.flag && <img className="gtable__flag" src={r.flag} alt="" width="22" height="16" loading="lazy" decoding="async" />}
              <span className="gtable__code tnum">{r.code}</span>
              <span className="gtable__name">{r.name}</span>
            </td>
            <td className="tnum">{r.p}</td>
            <td className="gtable__opt tnum">{r.w}</td>
            <td className="gtable__opt tnum">{r.d}</td>
            <td className="gtable__opt tnum">{r.l}</td>
            <td className="gtable__opt tnum">{r.gf}</td>
            <td className="gtable__opt tnum">{r.ga}</td>
            <td className="tnum">{fmtGD(r.gd)}</td>
            <td className="gtable__pts tnum">{r.pts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GroupRow({ group, open, onToggle }) {
  const panelId = useId()
  const leaders = group.rows.slice(0, QUALIFY_SLOTS)
  return (
    <li className={`grow${open ? ' is-open' : ''}`}>
      <button type="button" className="grow__btn" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className="grow__badge" style={{ background: group.color, color: group.textColor }} aria-hidden="true">
          {group.letter}
        </span>
        <span className="grow__id">Group {group.letter}</span>
        <span className="grow__lead">
          {leaders.map((t, i) => (
            <span className="grow__lead-team" key={t.name}>
              <span className="grow__lead-code tnum">{t.code}</span>
              <span className="grow__lead-pts tnum">{t.pts}</span>
              {i === 0 && <span className="grow__lead-sep" aria-hidden="true">·</span>}
            </span>
          ))}
        </span>
        <span className="grow__played tnum">{group.played}/{group.total}</span>
        <svg className="grow__chev" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={panelId} className={`grow__panel${open ? ' is-open' : ''}`}>
        <div className="grow__panel-inner">
          <StandingsTable rows={group.rows} caption={`Group ${group.letter} standings`} />
        </div>
      </div>
    </li>
  )
}

function ThirdPlaceRace({ open, onToggle }) {
  const panelId = useId()
  const { rows, slots, complete } = thirdRace
  return (
    <section className={`third${open ? ' is-open' : ''}`} aria-label="Third-place race">
      <button type="button" className="third__btn" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className="third__heading">
          <span className="third__title">Third-place race</span>
          <span className="third__note">
            Best {slots} of the 12 third-placed teams advance{complete ? '' : ' — provisional'}
          </span>
        </span>
        <svg className="grow__chev" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={panelId} className={`grow__panel${open ? ' is-open' : ''}`}>
        <div className="grow__panel-inner">
          <table className="gtable third__table">
            <caption className="visually-hidden">Ranking of the twelve third-placed teams</caption>
            <thead>
              <tr>
                <th className="gtable__pos" scope="col">#</th>
                <th className="third__grp" scope="col">Grp</th>
                <th className="gtable__team" scope="col">Team</th>
                <th scope="col"><abbr title="Played">P</abbr></th>
                <th className="gtable__opt" scope="col"><abbr title="Goals for">GF</abbr></th>
                <th scope="col"><abbr title="Goal difference">GD</abbr></th>
                <th className="gtable__pts" scope="col"><abbr title="Points">Pts</abbr></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const meta = teamMeta(r.name)
                return (
                  <Fragment key={r.name}>
                    {i === slots && (
                      <tr className="third__cut" aria-hidden="true">
                        <td colSpan={7}>Qualification cut — top {slots} advance</td>
                      </tr>
                    )}
                    <tr className={r.qualified ? 'is-q3in' : 'is-out'}>
                      <td className="gtable__pos">
                        <span className={`gpos ${r.qualified ? 'is-q3' : 'is-out'}`}>{r.thirdRank}</span>
                      </td>
                      <td className="third__grp tnum">{r.group}</td>
                      <td className="gtable__team">
                        {r.flag && <img className="gtable__flag" src={r.flag} alt="" width="22" height="16" loading="lazy" decoding="async" />}
                        <span className="gtable__code tnum">{meta.code}</span>
                        <span className="gtable__name">{r.name}</span>
                      </td>
                      <td className="tnum">{r.p}</td>
                      <td className="gtable__opt tnum">{r.gf}</td>
                      <td className="tnum">{fmtGD(r.gd)}</td>
                      <td className="gtable__pts tnum">{r.pts}</td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function Groups() {
  const [openSet, setOpenSet] = useState(() => new Set([groups[0]?.letter]))
  const [thirdOpen, setThirdOpen] = useState(false)
  const allOpen = openSet.size === groups.length

  const toggle = (letter) =>
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(letter)) next.delete(letter)
      else next.add(letter)
      return next
    })

  const toggleAll = () => setOpenSet(allOpen ? new Set() : new Set(groups.map((g) => g.letter)))

  return (
    <section className="groups" aria-labelledby="groups-title">
      <header className="groups__head">
        <div className="groups__heading">
          <h1 id="groups-title" className="groups__title display">Group Tables</h1>
          <p className="groups__sub">
            Live standings across the twelve groups, with FIFA tiebreakers applied. The top {QUALIFY_SLOTS} of
            each group qualify automatically; the best {THIRD_PLACE_QUALIFIERS} of the twelve third-placed teams
            join them.
          </p>
        </div>
        <div className="groups__actions">
          <button type="button" className="btn btn--ghost" onClick={toggleAll} aria-pressed={allOpen}>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      </header>

      <ul className="legend" aria-label="Key">
        <li><span className="gpos gpos--key is-q" aria-hidden="true" /> Qualified — top {QUALIFY_SLOTS} in group</li>
        <li><span className="gpos gpos--key is-q3" aria-hidden="true" /> 3rd, in the top {THIRD_PLACE_QUALIFIERS} — provisionally through</li>
        <li><span className="gpos gpos--key is-out" aria-hidden="true" /> 3rd, below the cut — provisionally out</li>
      </ul>

      <ul className="groups__list">
        {groups.map((g) => (
          <GroupRow key={g.letter} group={g} open={openSet.has(g.letter)} onToggle={() => toggle(g.letter)} />
        ))}
      </ul>

      <ThirdPlaceRace open={thirdOpen} onToggle={() => setThirdOpen((v) => !v)} />

      <p className="groups__foot">
        Statuses are derived from completed results only and shift as remaining matches are played. To play
        the rest of the tournament out, use “Run Your Own Simulation” on the Bracket.
      </p>
    </section>
  )
}

export default Groups
