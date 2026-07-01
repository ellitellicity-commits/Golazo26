import { createContext, useContext, useEffect, useState } from 'react'
import { loadFixtures, loadOdds } from './data'
import LoadingScreen from '../components/LoadingScreen'

// App-wide tournament data. Fixtures may resolve live (football-data.org) or
// static; odds are always static. The provider loads both once on mount and
// gates the app on their arrival, so every downstream view reads ready,
// synchronous data — no per-component fetching, one seam, one loading state.
const TournamentDataContext = createContext(null)

export function TournamentDataProvider({ children }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    Promise.all([loadFixtures(), loadOdds()])
      .then(([fixtures, odds]) => {
        if (cancelled) return
        setState({ status: 'ready', fixtures, odds, source: fixtures.source })
      })
      .catch(() => {
        // loadFixtures/loadOdds already fall back internally; this only guards
        // against an unexpected throw so the app never hangs on the loader.
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status !== 'ready') return <LoadingScreen failed={state.status === 'error'} />

  return <TournamentDataContext.Provider value={state}>{children}</TournamentDataContext.Provider>
}

/**
 * @returns {{ fixtures: {generated:string, fixtures:object[]}, odds: object, source: 'live'|'static' }}
 */
export function useTournamentData() {
  const ctx = useContext(TournamentDataContext)
  if (!ctx) throw new Error('useTournamentData must be used within TournamentDataProvider')
  return ctx
}
