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
        // Extend from now if it already elapsed, so "+30s" always means 30
        // more. Negative adjustments are clamped: "−15s" near zero just ends
        // the rest now instead of producing a timer that finished in the past.
        const base = Math.max(endsAt, Date.now())
        set({
          endsAt: Math.max(base + seconds * 1000, Date.now()),
          totalSeconds: Math.max(1, totalSeconds + seconds),
        })
      },
      stop: () => set({ endsAt: null, totalSeconds: 0 }),
    }),
    // Persisted so a reload — or iOS evicting the tab mid-rest — resumes the
    // countdown instead of losing it.
    { name: 'eagle-gym-rest-timer' }
  )
)

/** Which deadline already chimed — one cue per countdown, however it fires. */
let chimedEndsAt: number | null = null

function chimeOnce(endsAt: number): void {
  if (chimedEndsAt === endsAt) return
  chimedEndsAt = endsAt
  playRestChime()
  // Android only — Safari has no vibration API, which is why the cue is audio.
  navigator.vibrate?.(200)
}

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

  // Chime once, on the transition to zero. The deadline marker means neither a
  // remount nor a visibility flap can re-trigger it for the same countdown.
  useEffect(() => {
    if (!endsAt) return
    const delay = endsAt - Date.now()
    if (delay <= 0) return
    const timeout = window.setTimeout(() => chimeOnce(endsAt), delay)

    // iOS suspends JavaScript in the background, so a timer that expired while
    // the phone was pocketed never fired its timeout. Cue on return instead —
    // but only if the deadline passed recently enough to still be useful.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const overdueMs = Date.now() - endsAt
      if (overdueMs >= 0 && overdueMs < 30_000) chimeOnce(endsAt)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', onVisible)
    }
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
