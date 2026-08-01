import type { Exercise } from '../db/schema'

// A rep target is a range, not a number. "3×10" tells you nothing about what to
// do when you get 11 — whereas "3×8–12" says: stay at this weight until all
// three sets reach 12, then add the smallest jump and start again at 8. That is
// the rule the progression engine already runs; it just had no top of the range
// to aim at, so it treated the single number as both floor and ceiling.

/** What a new rep-tracked exercise gets when nothing more specific is known. */
export const DEFAULT_REP_RANGE = { min: 8, max: 12 } as const

/** Timed work is seconds, not reps, and gets a single figure to hold for. */
export const DEFAULT_HOLD_SECONDS = 30

export interface RepTarget {
  /** Bottom of the range — or the number of seconds on a timed exercise. */
  targetReps: number
  /** Top of the range. Absent on timed work, and whenever it isn't above the floor. */
  targetRepsMax?: number
}

export function isTimed(exercise: Pick<Exercise, 'tracking'> | undefined): boolean {
  return exercise?.tracking === 'duration'
}

/**
 * The rep target a plan should start from for this exercise: its own library
 * default if it has one, otherwise the house default. Set once on the exercise,
 * inherited by every routine that picks it up.
 */
export function repTargetFor(exercise: Exercise | undefined): RepTarget {
  if (isTimed(exercise)) {
    return { targetReps: exercise?.defaultRepsMin || DEFAULT_HOLD_SECONDS, targetRepsMax: undefined }
  }
  const min = exercise?.defaultRepsMin || DEFAULT_REP_RANGE.min
  const max = exercise?.defaultRepsMax || DEFAULT_REP_RANGE.max
  return normalizeRepTarget(min, max)
}

/**
 * Keeps the pair honest: the floor is at least one rep, and a maximum that
 * isn't actually above it is dropped rather than stored as "8–8", which would
 * read as a range while behaving like a single number.
 */
export function normalizeRepTarget(min: number, max?: number): RepTarget {
  const targetReps = Math.max(1, Math.round(min || 0))
  const top = Math.round(max || 0)
  // The key is always present, never merely omitted: callers spread this over
  // an existing item, and an omitted key would leave a stale maximum behind
  // when the range is narrowed back to a single number.
  return { targetReps, targetRepsMax: top > targetReps ? top : undefined }
}

/** "8–12", or "8" when there is no top. An en dash, so it reads as a range. */
export function formatRepRange(min: number, max?: number): string {
  return max && max > min ? `${min}–${max}` : String(min)
}
