import type { Units } from '../db/schema'
import { DEFAULT_BAR } from './plates'

// A standard ramp to a working weight. Generating it beats typing four rows by
// hand every exercise, and it keeps warm-ups out of the volume numbers because
// they are created as warm-up sets rather than as working sets someone forgot
// to reclassify.

interface WarmupStep {
  /** Kilograms. */
  weight: number
  reps: number
}

const RAMP: Array<{ fraction: number; reps: number }> = [
  { fraction: 0.4, reps: 8 },
  { fraction: 0.6, reps: 5 },
  { fraction: 0.8, reps: 3 },
]

/**
 * Ramp up to `workingWeight`. Barbell lifts start with the empty bar; anything
 * lighter than the bar gets no ramp at all, which is the honest answer for
 * accessory work done with dumbbells.
 */
export function warmupSets(workingWeight: number, units: Units, isBarbell: boolean): WarmupStep[] {
  const bar = DEFAULT_BAR[units]
  const barKg = units === 'lb' ? bar / 2.2046226218 : bar

  if (workingWeight <= 0) return []

  const steps: WarmupStep[] = []
  if (isBarbell && workingWeight > barKg * 1.5) steps.push({ weight: barKg, reps: 10 })

  for (const { fraction, reps } of RAMP) {
    const weight = roundToHalf(workingWeight * fraction)
    // Skip anything at or below what we already ramped through, and anything
    // that would land on top of the working set itself.
    if (weight <= (steps.at(-1)?.weight ?? 0)) continue
    if (weight >= workingWeight) continue
    steps.push({ weight, reps })
  }

  return steps
}

function roundToHalf(weight: number): number {
  return Math.round(weight * 2) / 2
}
