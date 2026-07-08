import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Outlet, useLocation } from 'react-router-dom'
import AppNav from './components/AppNav'
import Home from './pages/Home'
import Odds from './pages/Odds'
import Predictor from './pages/Predictor'
import BracketView from './pages/BracketView'
import Groups from './pages/Groups'
import './App.css'

// The globe routes pull in Three.js + the world outline — a heavy, self-contained
// chunk that the core pages never touch. Lazy-load them so none of that weight
// lands in the home/bracket bundle; it only downloads when a globe route opens.
const Simulator = lazy(() => import('./pages/Simulator'))
const Encyclopedia = lazy(() => import('./pages/Encyclopedia'))

function RouteFallback() {
  return <div className="route-fallback" role="status" aria-live="polite">Loading…</div>
}

// Reset scroll on navigation (a fresh route should open at the top, not inherit
// the previous page's scroll). Skipped when the user prefers reduced motion is
// irrelevant here — this is an instant jump, not an animation.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Layout() {
  return (
    <div className="page">
      <a className="skip-link" href="#main">Skip to content</a>
      <AppNav />
      <main id="main" className="page__main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="page__foot">
        <p>
          Predictions are model estimates from historical results, Elo ratings, and recent form. For analysis, not
          wagering.
        </p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="odds" element={<Odds />} />
          <Route path="predictor" element={<Predictor />} />
          <Route path="bracket" element={<BracketView />} />
          <Route path="groups" element={<Groups />} />
          <Route path="simulator" element={<Suspense fallback={<RouteFallback />}><Simulator /></Suspense>} />
          <Route path="encyclopedia" element={<Suspense fallback={<RouteFallback />}><Encyclopedia /></Suspense>} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
