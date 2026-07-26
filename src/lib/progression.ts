import type { SetEntry, Units } from '../db/schema'
import { countsAsWork } from './setTypes'

// Double progression, the rule most intermediate lifters actually run: hold the
// weight until you hit the target reps on every working set, then add the
// smallest available jump and start again. It's conservative on purpose —
// suggesting a PR every session is how people stall and then quit.

/** Smallest jump that can be loaded on a bar, per unit. */
const INCREMENT: Record<Units, number> = { kg: 2.5, lb: 5 }

export interface Suggestion {
  kind: 'increase' | 'hold' | 'deload' | 'first-time'
  /** Kilograms. */
  weight: number
  reps: number
  /** Why, as a translation key argument set — rendered by the caller. */
  reason: 'hit-target' | 'missed-target' | 'repeated-miss' | 'no-history'
}

export function suggestNextLoad(
  previousSessions: SetEntry[][],
  target: { reps: number; sets: number },
  units: Units
): Suggestion | null {
  const step = units === 'lb' ? INCREMENT.lb / 2.2046226218 : INCREMENT.kg

  const last = previousSessions[0]?.filter((s) => countsAsWork(s.setType) && s.done === 1) ?? []
  if (last.length === 0) return null

  const topWeight = Math.max(...last.map((s) => s.weight))
  const atTopWeight = last.filter((s) => s.weight >= topWeight - 1e-9)
  const hitTarget =
    atTopWeight.length >= target.sets && atTopWeight.every((s) => s.reps >= target.reps)

  if (hitTarget) {
    return {
      kind: 'increase',
      weight: roundToStep(topWeight + step, step),
      reps: target.reps,
      reason: 'hit-target',
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
      .every((s) => s.reps >= target.reps)

    if (stalled && missedThen) {
      return {
        kind: 'deload',
        weight: roundToStep(topWeight * 0.9, step),
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
