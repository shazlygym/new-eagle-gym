import type { Units } from '../db/schema'

// What to actually load on the bar. Working this out in your head between sets
// is the small, constant friction of barbell training — especially in kg, where
// the useful jumps aren't round numbers.

export interface PlateStack {
  /** Plate denomination, in the user's display unit. */
  weight: number
  count: number
}

export interface PlatePlan {
  perSide: PlateStack[]
  /** Weight per side that no combination of plates can make. */
  remainder: number
  /** True when the target is below the bar itself. */
  belowBar: boolean
}

/** Denominations found in a typical commercial gym, heaviest first. */
export const PLATE_SIZES: Record<Units, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
}

export const DEFAULT_BAR: Record<Units, number> = { kg: 20, lb: 45 }

export function planPlates(target: number, bar: number, units: Units): PlatePlan {
  if (target < bar) return { perSide: [], remainder: 0, belowBar: true }

  let perSide = (target - bar) / 2
  const stacks: PlateStack[] = []

  // Greedy works here because every denomination divides evenly into the ones
  // above it — there is no case where taking a smaller plate first does better.
  for (const size of PLATE_SIZES[units]) {
    const count = Math.floor((perSide + 1e-9) / size)
    if (count > 0) {
      stacks.push({ weight: size, count })
      perSide -= count * size
    }
  }

  return {
    perSide: stacks,
    // Rounded away from floating-point dust so 0.30000000000000004 reads as 0.3.
    remainder: Math.round(perSide * 100) / 100,
    belowBar: false,
  }
}

/** Total the plan actually makes, for showing what you'd really be lifting. */
export function plannedTotal(plan: PlatePlan, bar: number): number {
  const perSide = plan.perSide.reduce((total, stack) => total + stack.weight * stack.count, 0)
  return bar + perSide * 2
}
