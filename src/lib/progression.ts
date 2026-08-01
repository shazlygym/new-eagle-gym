import type { SetEntry, Units } from '../db/schema'
import type { TranslationKey } from '../i18n/en'
import { countsAsWork } from './setTypes'

// Double progression, the rule most intermediate lifters actually run: hold the
// weight until you hit the top of the rep range on every working set, then add
// the smallest available jump and start again at the bottom of the range. It's
// conservative on purpose — suggesting a PR every session is how people stall
// and then quit.
//
// A plan with no range (`repsMax` absent) still works: the single target is
// both the floor and the ceiling, exactly as it behaved before ranges existed.

/** Smallest jump that can be loaded on a bar, per unit. */
const INCREMENT: Record<Units, number> = { kg: 2.5, lb: 5 }

/**
 * Reps left in the tank at which a completed target stops being evidence of
 * effort. Two is the usual line: at 2+ RIR the set is submaximal by design, so
 * hitting the top of the range says the weight was light, not that it was right.
 */
const EASY_RIR = 2

export interface Suggestion {
  kind: 'increase' | 'hold' | 'deload' | 'first-time'
  /** Kilograms. */
  weight: number
  reps: number
  /** Why, as a translation key argument set — rendered by the caller. */
  reason: 'hit-target' | 'easy-target' | 'missed-target' | 'repeated-miss' | 'no-history'
}

export interface ProgressionOptions {
  /**
   * The jump to add, in kilograms, overriding the default plate step. A program
   * block sets its own weekly increment; without this it was stored and never
   * read, so every block progressed at 2.5 kg whatever it said.
   */
  stepKg?: number
}

/** One place for the sentence each verdict gets, so all three callers agree. */
export const SUGGESTION_REASON: Record<Suggestion['reason'], TranslationKey> = {
  'hit-target': 'workout.reasonHitTarget',
  'easy-target': 'workout.reasonEasyTarget',
  'missed-target': 'workout.reasonMissedTarget',
  'repeated-miss': 'workout.reasonRepeatedMiss',
  'no-history': 'preview.firstTime',
}

export function suggestNextLoad(
  previousSessions: SetEntry[][],
  target: { reps: number; repsMax?: number; sets: number },
  units: Units,
  options: ProgressionOptions = {}
): Suggestion | null {
  const plateStep = units === 'lb' ? INCREMENT.lb / 2.2046226218 : INCREMENT.kg
  // Rounding still follows the plates: a 5 kg block increment on a bar that
  // loads in 2.5s is a real jump, but 1 kg is a number you cannot make.
  const step = options.stepKg && options.stepKg > 0 ? options.stepKg : plateStep
  // The weight only moves once the top of the range is hit on every set.
  const goal = target.repsMax && target.repsMax > target.reps ? target.repsMax : target.reps

  const last = previousSessions[0]?.filter((s) => countsAsWork(s.setType) && s.done === 1) ?? []
  if (last.length === 0) return null

  const topWeight = Math.max(...last.map((s) => s.weight))
  const atTopWeight = last.filter((s) => s.weight >= topWeight - 1e-9)
  const hitTarget = atTopWeight.length >= target.sets && atTopWeight.every((s) => s.reps >= goal)

  if (hitTarget) {
    // Every top set finished with reps to spare and still cleared the range:
    // one increment spends a week getting back to where the last one already
    // was. Only read when RIR is on every set — one blank turns this off rather
    // than averaging over a guess, since RPE is an optional field.
    const easy = atTopWeight.every((s) => s.rpe !== undefined && s.rpe >= EASY_RIR)
    return {
      kind: 'increase',
      weight: roundToStep(topWeight + (easy ? step * 2 : step), plateStep),
      reps: target.reps,
      reason: easy ? 'easy-target' : 'hit-target',
    }
  }

  // Two sessions stuck at the same weight without hitting the target is a stall,
  // not bad luck. Back off ~10% and build again rather than grinding.
  const previous =
    previousSessions[1]?.filter((s) => countsAsWork(s.setType) && s.done === 1) ?? []
  if (previous.length > 0) {
    const previousTop = Math.max(...previous.map((s) => s.weight))
    const stalled = Math.abs(previousTop - topWeight) < 1e-9
    const missedThen = !previous
      .filter((s) => s.weight >= previousTop - 1e-9)
      .every((s) => s.reps >= goal)

    if (stalled && missedThen) {
      return {
        kind: 'deload',
        weight: roundToStep(topWeight * 0.9, plateStep),
        reps: target.reps,
        reason: 'repeated-miss',
      }
    }
  }

  return { kind: 'hold', weight: topWeight, reps: target.reps, reason: 'missed-target' }
}

function roundToStep(weight: number, step: number): number {
  return Math.round(weight / step) * step
}
