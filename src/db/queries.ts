import {
  eachWeekOfInterval,
  endOfWeek,
  format,
  isSameWeek,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import type { Session, SetEntry } from './schema'

// Derived numbers — PRs, tonnage, streaks — are computed from the set log rather
// than stored. A denormalised PR table would need invalidating on every edit,
// delete and import; recomputing over a few thousand rows is instant and can
// never drift out of sync with the sets it describes.

/** Weeks start on Saturday — the Egyptian/Gulf convention. */
const WEEK_OPTIONS = { weekStartsOn: 6 } as const

/**
 * Estimated one-rep max, Epley formula. Reps above ~12 make any 1RM estimate
 * unreliable, so they are capped rather than extrapolated into fantasy numbers.
 */
export function e1rm(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + Math.min(reps, 12) / 30)
}

/** Tonnage: the sum of weight × reps across sets. Warm-ups don't count. */
export function volumeOf(sets: SetEntry[]): number {
  return sets.reduce((total, s) => (s.isWarmup ? total : total + s.weight * s.reps), 0)
}

export interface SessionStats {
  sets: number
  reps: number
  volume: number
  durationMs: number
}

export function sessionStats(session: Session, sets: SetEntry[]): SessionStats {
  const working = sets.filter((s) => s.done === 1)
  return {
    sets: working.length,
    reps: working.reduce((total, s) => total + s.reps, 0),
    volume: volumeOf(working),
    durationMs: (session.endedAt ?? Date.now()) - session.startedAt,
  }
}

export interface ExerciseRecord {
  exerciseId: string
  /** Heaviest single set. */
  bestWeight: number
  bestWeightReps: number
  /** Highest estimated 1RM across all sets. */
  bestE1rm: number
  /** Most reps at any weight. */
  bestReps: number
  bestVolume: number
  lastPerformedAt: number
  totalSets: number
}

export function personalRecords(sets: SetEntry[]): Map<string, ExerciseRecord> {
  const records = new Map<string, ExerciseRecord>()

  for (const set of sets) {
    if (set.done !== 1 || set.isWarmup === 1) continue

    const current = records.get(set.exerciseId) ?? {
      exerciseId: set.exerciseId,
      bestWeight: 0,
      bestWeightReps: 0,
      bestE1rm: 0,
      bestReps: 0,
      bestVolume: 0,
      lastPerformedAt: 0,
      totalSets: 0,
    }

    if (set.weight > current.bestWeight) {
      current.bestWeight = set.weight
      current.bestWeightReps = set.reps
    }
    current.bestE1rm = Math.max(current.bestE1rm, e1rm(set.weight, set.reps))
    current.bestReps = Math.max(current.bestReps, set.reps)
    current.bestVolume = Math.max(current.bestVolume, set.weight * set.reps)
    current.lastPerformedAt = Math.max(current.lastPerformedAt, set.completedAt ?? 0)
    current.totalSets += 1

    records.set(set.exerciseId, current)
  }

  return records
}

/**
 * Which of `sets` beat every earlier set of the same exercise. Used to badge new
 * PRs on the finish-workout summary.
 */
export function newRecordsIn(
  sessionSets: SetEntry[],
  allSets: SetEntry[]
): Array<{ exerciseId: string; weight: number; reps: number; e1rm: number }> {
  const sessionIds = new Set(sessionSets.map((s) => s.id))
  const priorBest = personalRecords(allSets.filter((s) => !sessionIds.has(s.id)))
  const results: Array<{ exerciseId: string; weight: number; reps: number; e1rm: number }> = []

  for (const [exerciseId, record] of personalRecords(sessionSets)) {
    const before = priorBest.get(exerciseId)
    if (!before || record.bestE1rm > before.bestE1rm) {
      const best = sessionSets
        .filter((s) => s.exerciseId === exerciseId && s.done === 1 && s.isWarmup === 0)
        .sort((a, b) => e1rm(b.weight, b.reps) - e1rm(a.weight, a.reps))[0]
      if (best) {
        results.push({
          exerciseId,
          weight: best.weight,
          reps: best.reps,
          e1rm: e1rm(best.weight, best.reps),
        })
      }
    }
  }

  return results
}

export interface WeekPoint {
  weekStart: Date
  label: string
  volume: number
  sessions: number
}

/** Tonnage per week for the last `weeks` weeks, oldest first, gaps included. */
export function weeklyVolume(sessions: Session[], sets: SetEntry[], weeks = 8): WeekPoint[] {
  const now = new Date()
  const buckets = eachWeekOfInterval(
    { start: startOfWeek(subWeeks(now, weeks - 1), WEEK_OPTIONS), end: now },
    WEEK_OPTIONS
  )

  const done = sessions.filter((s) => s.status === 'done')
  const setsBySession = groupBy(sets, (s) => s.sessionId)

  return buckets.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, WEEK_OPTIONS)
    const inWeek = done.filter((s) => s.startedAt >= weekStart.getTime() && s.startedAt <= weekEnd.getTime())
    const weekSets = inWeek.flatMap((s) => setsBySession.get(s.id) ?? [])

    return {
      weekStart,
      label: format(weekStart, 'd MMM'),
      volume: Math.round(volumeOf(weekSets.filter((s) => s.done === 1))),
      sessions: inWeek.length,
    }
  })
}

export interface ExercisePoint {
  date: number
  label: string
  e1rm: number
  topWeight: number
  volume: number
}

/** One point per session in which the exercise was trained, oldest first. */
export function exerciseProgress(exerciseId: string, sets: SetEntry[]): ExercisePoint[] {
  const relevant = sets.filter(
    (s) => s.exerciseId === exerciseId && s.done === 1 && s.isWarmup === 0 && s.completedAt
  )

  return [...groupBy(relevant, (s) => s.sessionId).values()]
    .map((sessionSets) => {
      const date = Math.min(...sessionSets.map((s) => s.completedAt ?? 0))
      return {
        date,
        label: format(new Date(date), 'd MMM'),
        e1rm: Math.round(Math.max(...sessionSets.map((s) => e1rm(s.weight, s.reps)))),
        topWeight: Math.max(...sessionSets.map((s) => s.weight)),
        volume: Math.round(volumeOf(sessionSets)),
      }
    })
    .sort((a, b) => a.date - b.date)
}

/**
 * Consecutive weeks containing at least one workout, counting back from the
 * current week. Weeks rather than days: almost nobody trains seven days a week,
 * so a day streak would read as zero for a perfectly consistent lifter.
 */
export function weekStreak(sessions: Session[]): number {
  const done = sessions.filter((s) => s.status === 'done')
  if (done.length === 0) return 0

  const weeks = new Set(
    done.map((s) => format(startOfWeek(new Date(s.startedAt), WEEK_OPTIONS), 'yyyy-MM-dd'))
  )

  let streak = 0
  let cursor = startOfWeek(new Date(), WEEK_OPTIONS)

  // An empty current week doesn't break a streak that's still alive — the user
  // may simply not have trained yet this week.
  if (!weeks.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor = subWeeks(cursor, 1)
    if (!weeks.has(format(cursor, 'yyyy-MM-dd'))) return 0
  }

  while (weeks.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1
    cursor = subWeeks(cursor, 1)
  }

  return streak
}

export function volumeThisWeek(sessions: Session[], sets: SetEntry[]): number {
  const now = new Date()
  const ids = new Set(
    sessions
      .filter((s) => s.status === 'done' && isSameWeek(new Date(s.startedAt), now, WEEK_OPTIONS))
      .map((s) => s.id)
  )
  return volumeOf(sets.filter((s) => ids.has(s.sessionId) && s.done === 1))
}

export function sessionsThisWeek(sessions: Session[]): number {
  const now = new Date()
  return sessions.filter(
    (s) => s.status === 'done' && isSameWeek(new Date(s.startedAt), now, WEEK_OPTIONS)
  ).length
}

/** 'yyyy-MM-dd' → number of completed sessions, for the history calendar. */
export function sessionsByDay(sessions: Session[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const session of sessions) {
    if (session.status !== 'done') continue
    const key = format(new Date(session.startedAt), 'yyyy-MM-dd')
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

export function bodyWeightSeries(
  stats: Array<{ date: string; weight?: number }>
): Array<{ date: number; label: string; weight: number }> {
  return stats
    .filter((s): s is { date: string; weight: number } => typeof s.weight === 'number')
    .map((s) => ({
      date: parseISO(s.date).getTime(),
      label: format(parseISO(s.date), 'd MMM'),
      weight: s.weight,
    }))
    .sort((a, b) => a.date - b.date)
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const bucket = map.get(k)
    if (bucket) bucket.push(item)
    else map.set(k, [item])
  }
  return map
}
