import {
  differenceInCalendarWeeks,
  eachWeekOfInterval,
  endOfWeek,
  format,
  isSameWeek,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import type {
  Exercise,
  Movement,
  MuscleGroup,
  Program,
  Session,
  SetEntry,
} from './schema'

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
  return sets.reduce(
    (total, s) => (s.setType === 'warmup' ? total : total + s.weight * s.reps),
    0
  )
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
    if (set.done !== 1 || set.setType === 'warmup') continue

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
        .filter((s) => s.exerciseId === exerciseId && s.done === 1 && s.setType !== 'warmup')
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
    (s) => s.exerciseId === exerciseId && s.done === 1 && s.setType !== 'warmup' && s.completedAt
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

// ─── Deeper analytics ─────────────────────────────────────────────────────────

/** Falls back to the muscle group where an exercise has no explicit pattern. */
export function movementOf(exercise: Exercise | undefined): Movement {
  if (!exercise) return 'other'
  if (exercise.movement) return exercise.movement
  switch (exercise.muscleGroup) {
    case 'chest':
    case 'shoulders':
      return 'push'
    case 'back':
      return 'pull'
    case 'legs':
      return 'legs'
    default:
      return 'other'
  }
}

export interface MuscleVolume {
  muscleGroup: MuscleGroup
  volume: number
  sets: number
}

/** Where the work actually went, descending. Reveals the neglected muscle group. */
export function volumeByMuscle(sets: SetEntry[], exercises: Exercise[]): MuscleVolume[] {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const totals = new Map<MuscleGroup, MuscleVolume>()

  for (const set of sets) {
    if (set.done !== 1 || set.setType === 'warmup') continue
    const group = byId.get(set.exerciseId)?.muscleGroup
    if (!group) continue
    const bucket = totals.get(group) ?? { muscleGroup: group, volume: 0, sets: 0 }
    bucket.volume += set.weight * set.reps
    bucket.sets += 1
    totals.set(group, bucket)
  }

  return [...totals.values()].sort((a, b) => b.volume - a.volume)
}

export type BalanceKey = 'push' | 'pull' | 'legs' | 'other'

/**
 * Working sets per movement pattern. Counted in sets rather than tonnage,
 * because a leg press moves far more weight than a row and would swamp the
 * comparison — sets are the unit training programs are actually written in.
 */
export function movementBalance(
  sets: SetEntry[],
  exercises: Exercise[]
): Record<BalanceKey, number> {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const totals: Record<BalanceKey, number> = { push: 0, pull: 0, legs: 0, other: 0 }

  for (const set of sets) {
    if (set.done !== 1 || set.setType === 'warmup') continue
    totals[movementOf(byId.get(set.exerciseId))] += 1
  }

  return totals
}

export interface LoadRatio {
  /** This week's tonnage. */
  acute: number
  /** Average weekly tonnage over the preceding four weeks. */
  chronic: number
  /** acute ÷ chronic. Null until there is enough history to mean anything. */
  ratio: number | null
  status: 'spike' | 'steady' | 'easing' | 'unknown'
}

/**
 * This week's load against the recent baseline — the acute:chronic workload
 * ratio used in sports science. A sudden jump is the best available warning
 * sign for overuse injury; a sustained dip means you are detraining.
 */
export function loadRatio(sessions: Session[], sets: SetEntry[]): LoadRatio {
  const points = weeklyVolume(sessions, sets, 5)
  const acute = points.at(-1)?.volume ?? 0
  const previous = points.slice(0, -1)
  const weeksWithWork = previous.filter((p) => p.volume > 0)

  if (weeksWithWork.length < 2) {
    return { acute, chronic: 0, ratio: null, status: 'unknown' }
  }

  const chronic = previous.reduce((total, p) => total + p.volume, 0) / previous.length
  if (chronic <= 0) return { acute, chronic: 0, ratio: null, status: 'unknown' }

  const ratio = acute / chronic
  return {
    acute,
    chronic,
    ratio,
    status: ratio > 1.5 ? 'spike' : ratio < 0.8 ? 'easing' : 'steady',
  }
}

export interface RecordEvent {
  exerciseId: string
  date: number
  weight: number
  reps: number
  e1rm: number
}

/**
 * Every set that beat the best estimated 1RM for its exercise at the time, newest
 * first — the log of moments the training actually worked.
 */
export function recordTimeline(sets: SetEntry[], limit = 20): RecordEvent[] {
  const chronological = sets
    .filter((s) => s.done === 1 && s.setType !== 'warmup' && s.completedAt)
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))

  const best = new Map<string, number>()
  const events: RecordEvent[] = []

  for (const set of chronological) {
    const value = e1rm(set.weight, set.reps)
    if (value > (best.get(set.exerciseId) ?? 0)) {
      best.set(set.exerciseId, value)
      events.push({
        exerciseId: set.exerciseId,
        date: set.completedAt ?? 0,
        weight: set.weight,
        reps: set.reps,
        e1rm: value,
      })
    }
  }

  return events.reverse().slice(0, limit)
}

export interface PeriodComparison {
  sessions: { current: number; previous: number }
  volume: { current: number; previous: number }
  perSession: { current: number; previous: number }
}

/** The last four weeks against the four before them. */
export function comparePeriods(sessions: Session[], sets: SetEntry[]): PeriodComparison {
  const now = Date.now()
  const fourWeeks = subWeeks(new Date(now), 4).getTime()
  const eightWeeks = subWeeks(new Date(now), 8).getTime()

  const summarise = (from: number, to: number) => {
    const inRange = sessions.filter(
      (s) => s.status === 'done' && s.startedAt >= from && s.startedAt < to
    )
    const ids = new Set(inRange.map((s) => s.id))
    const volume = volumeOf(sets.filter((s) => ids.has(s.sessionId) && s.done === 1))
    return { count: inRange.length, volume }
  }

  const current = summarise(fourWeeks, now + 1)
  const previous = summarise(eightWeeks, fourWeeks)

  return {
    sessions: { current: current.count, previous: previous.count },
    volume: { current: current.volume, previous: previous.volume },
    perSession: {
      current: current.count > 0 ? current.volume / current.count : 0,
      previous: previous.count > 0 ? previous.volume / previous.count : 0,
    },
  }
}

// ─── Program progress ─────────────────────────────────────────────────────────

export interface ProgramProgress {
  /** 1-based, clamped to the block length. */
  week: number
  totalWeeks: number
  complete: boolean
  /** Day indices completed in the current week. */
  doneThisWeek: number[]
  nextDayIndex: number
  adherence: { done: number; planned: number }
}

export function programProgress(program: Program, sessions: Session[]): ProgramProgress {
  const startedAt = program.startedAt ?? Date.now()
  const elapsedWeeks = Math.floor(differenceInCalendarWeeks(new Date(), new Date(startedAt), WEEK_OPTIONS))
  const rawWeek = elapsedWeeks + 1
  const complete = rawWeek > program.weeks
  const week = Math.min(Math.max(1, rawWeek), program.weeks)

  const fromProgram = sessions.filter((s) => s.programId === program.id && s.status === 'done')
  const doneThisWeek = fromProgram
    .filter((s) => s.programWeek === week)
    .map((s) => s.programDayIndex ?? -1)
    .filter((index) => index >= 0)

  // The first scheduled day not yet completed this week; wraps to day 0 once the
  // week is fully logged, ready for the next one.
  const nextDayIndex =
    program.days.findIndex((_, index) => !doneThisWeek.includes(index)) === -1
      ? 0
      : program.days.findIndex((_, index) => !doneThisWeek.includes(index))

  const weeksElapsed = Math.min(Math.max(1, rawWeek), program.weeks)
  return {
    week,
    totalWeeks: program.weeks,
    complete,
    doneThisWeek,
    nextDayIndex,
    adherence: {
      done: fromProgram.length,
      planned: program.days.length * weeksElapsed,
    },
  }
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
