import { Suspense, lazy } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import { useActiveProfile } from './lib/useActiveProfile'
import Exercises from './pages/Exercises'
import History from './pages/History'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import RoutineEdit from './pages/RoutineEdit'
import Routines from './pages/Routines'
import SessionDetail from './pages/SessionDetail'
import Settings from './pages/Settings'
import Workout from './pages/Workout'
import WorkoutSummary from './pages/WorkoutSummary'

// Recharts is roughly half the bundle and only these two screens need it.
// Splitting them keeps the logging flow — the thing you open mid-set, often on
// gym wifi — small and fast. The service worker precaches both chunks anyway, so
// after the first visit they load instantly and work offline.
const Progress = lazy(() => import('./pages/Progress'))
const Body = lazy(() => import('./pages/Body'))

export default function App() {
  const { profile, loading } = useActiveProfile()

  // Dexie reads are fast but not synchronous; painting the onboarding screen
  // during that gap would flash it at every returning user.
  if (loading) return <div className="min-h-dvh bg-dark-900" />

  if (!profile) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<Onboarding />} />
        </Routes>
      </Router>
    )
  }

  return (
    <Router>
      <Routes>
        {/* The workout screen is deliberately outside the tab shell: while you
            are training, the only ways out should be Finish and Discard. */}
        <Route path="/workout/:sessionId" element={<Workout />} />
        <Route path="/workout/:sessionId/summary" element={<WorkoutSummary />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/routines/new" element={<RoutineEdit />} />
          <Route path="/routines/:routineId" element={<RoutineEdit />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:sessionId" element={<SessionDetail />} />
          <Route
            path="/progress"
            element={
              <Suspense fallback={<ChartsLoading />}>
                <Progress />
              </Suspense>
            }
          />
          <Route
            path="/body"
            element={
              <Suspense fallback={<ChartsLoading />}>
                <Body />
              </Suspense>
            }
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

/** Matches the page background so the split chunk never flashes white. */
function ChartsLoading() {
  return <div className="min-h-dvh bg-dark-900" />
}
