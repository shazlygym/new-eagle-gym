import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getSession, getSessionExercise } from '../db/repository'

// Every clock in the app derives from a stored instant and Date.now(), never
// from an incrementing counter. iOS suspends JavaScript the moment the app is
// backgrounded, so a tick-based clock silently freezes in your pocket and lies
// about how long the plank — or the whole workout — actually took.

/** Seconds elapsed since `from`, re-rendering once a second while mounted. */
export function useElapsed(from: number | undefined): number {
  const [, tick] = useState(0)

  useEffect(() => {
    if (from === undefined) return

    const bump = () => tick((n) => n + 1)
    const interval = window.setInterval(bump, 1000)
    // Recompute the instant the app is foregrounded, rather than waiting up to
    // a second for the next interval to land on a stale value.
    document.addEventListener('visibilitychange', bump)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', bump)
    }
  }, [from])

  if (from === undefined) return 0
  return Math.max(0, (Date.now() - from) / 1000)
}

interface ExerciseTimerState {
  /** The session exercise currently being timed, if any. */
  sessionExerciseId: string | null
  startedAt: number | null
  start: (sessionExerciseId: string) => void
  stop: () => number
  cancel: () => void
}

/**
 * The count-up timer for held or timed work. Persisted, so locking the phone
 * mid-plank — or the tab being evicted — doesn't lose the running clock.
 */
export const useExerciseTimerStore = create<ExerciseTimerState>()(
  persist(
    (set, get) => ({
      sessionExerciseId: null,
      startedAt: null,
      start: (sessionExerciseId) => set({ sessionExerciseId, startedAt: Date.now() }),
      stop: () => {
        const { startedAt } = get()
        const seconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0
        set({ sessionExerciseId: null, startedAt: null })
        return seconds
      },
      cancel: () => set({ sessionExerciseId: null, startedAt: null }),
    }),
    // Frozen at the app's original name: it's the localStorage key, so renaming
    // it drops any timer that was running when the member last closed the app.
    { name: 'eagle-gym-exercise-timer' }
  )
)

/**
 * Drops a persisted timer whose owner is gone — the exercise was removed, or
 * its session finished or was discarded, while the clock ran. The store
 * survives restarts, so without this the orphaned id would keep every other
 * exercise's Start button disabled forever. Called at boot and after any
 * operation that can delete the owning row.
 */
export async function reconcileExerciseTimer(): Promise<void> {
  const { sessionExerciseId, cancel } = useExerciseTimerStore.getState()
  if (!sessionExerciseId) return
  const entry = await getSessionExercise(sessionExerciseId)
  const session = entry ? await getSession(entry.sessionId) : undefined
  if (!entry || !session || session.status !== 'active') cancel()
}
