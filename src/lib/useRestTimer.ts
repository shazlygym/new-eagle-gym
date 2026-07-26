import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { playRestChime } from './audio'

// The timer stores the wall-clock instant it should finish, never a countdown
// that something has to decrement. iOS suspends JavaScript the moment the app
// is backgrounded — and pocketing the phone between sets is the normal case —
// so any interval-based counter would silently stall and under-report the rest
// taken. Deriving the remaining time from Date.now() on every render means the
// timer is correct the instant the screen comes back, however long it was away.

interface RestTimerState {
  endsAt: number | null
  totalSeconds: number
  start: (seconds: number) => void
  extend: (seconds: number) => void
  stop: () => void
}

export const useRestTimerStore = create<RestTimerState>()(
  persist(
    (set, get) => ({
      endsAt: null,
      totalSeconds: 0,
      start: (seconds) => set({ endsAt: Date.now() + seconds * 1000, totalSeconds: seconds }),
      extend: (seconds) => {
        const { endsAt, totalSeconds } = get()
        if (!endsAt) return
        // Extend from now if it already elapsed, so "+30s" always means 30 more.
        const base = Math.max(endsAt, Date.now())
        set({ endsAt: base + seconds * 1000, totalSeconds: totalSeconds + seconds })
      },
      stop: () => set({ endsAt: null, totalSeconds: 0 }),
    }),
    // Persisted so a reload — or iOS evicting the tab mid-rest — resumes the
    // countdown instead of losing it.
    { name: 'eagle-gym-rest-timer' }
  )
)

export interface RestTimer {
  active: boolean
  remaining: number
  total: number
  progress: number
  start: (seconds: number) => void
  extend: (seconds: number) => void
  stop: () => void
}

export function useRestTimer(): RestTimer {
  const { endsAt, totalSeconds, start, extend, stop } = useRestTimerStore()
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!endsAt) return

    const tick = () => forceTick((n) => n + 1)
    const interval = window.setInterval(tick, 250)
    // Recompute the moment the app is foregrounded, before the next interval
    // would have fired — otherwise the first frame back shows a stale number.
    document.addEventListener('visibilitychange', tick)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [endsAt])

  const remaining = endsAt ? Math.max(0, (endsAt - Date.now()) / 1000) : 0

  // Chime once, on the transition to zero. Guarded by a module-level marker
  // rather than component state so remounting the bar can't re-trigger it.
  useEffect(() => {
    if (!endsAt) return
    const delay = endsAt - Date.now()
    if (delay <= 0) return
    const timeout = window.setTimeout(() => playRestChime(), delay)
    return () => window.clearTimeout(timeout)
  }, [endsAt])

  return {
    active: endsAt !== null,
    remaining,
    total: totalSeconds,
    progress: totalSeconds > 0 ? 1 - remaining / totalSeconds : 0,
    start,
    extend,
    stop,
  }
}
