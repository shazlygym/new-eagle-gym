import type { ActivityLevel, NutritionGoal, Sex } from '../db/schema'

// Turning a body into a daily calorie number. Mifflin–St Jeor is the formula
// used here: it beats Harris–Benedict on modern populations and needs nothing
// more than what a member already knows about themselves.
//
// Everything below is a starting point, not a prescription — the honest use of
// it is "eat this for two weeks, then adjust by what the scale did".

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
}

const GOAL_FACTOR: Record<NutritionGoal, number> = {
  cut: 0.8,
  maintain: 1,
  bulk: 1.12,
}

/**
 * Grams of protein per kilogram of bodyweight. Higher on a cut, where protein
 * is what keeps the weight coming off muscle's expense rather than its own.
 */
const PROTEIN_PER_KG: Record<NutritionGoal, number> = {
  cut: 2.2,
  maintain: 1.8,
  bulk: 1.8,
}

export interface TargetInput {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: ActivityLevel
  goal: NutritionGoal
}

export interface SuggestedTargets {
  /** Resting rate — what the body burns doing nothing at all. */
  bmr: number
  /** Maintenance: resting rate scaled by how the day is spent. */
  tdee: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step

/** Null when an input is missing — the caller shows the form, not a wrong number. */
export function suggestTargets(input: TargetInput): SuggestedTargets | null {
  const { sex, age, heightCm, weightKg, activity, goal } = input
  if (age <= 0 || heightCm <= 0 || weightKg <= 0) return null

  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
  const tdee = bmr * ACTIVITY_FACTOR[activity]
  // A cut is floored at the resting rate. Below it the diet stops working —
  // training quality collapses long before the last kilo does.
  const kcal = Math.max(bmr, tdee * GOAL_FACTOR[goal])

  const protein = roundTo(PROTEIN_PER_KG[goal] * weightKg, 5)
  // A quarter of the energy from fat, floored at 0.6 g/kg: go under that and
  // hormones suffer for calories that carbs would have supplied better.
  const fat = roundTo(Math.max((kcal * 0.25) / 9, weightKg * 0.6), 5)
  // Carbs take whatever energy is left — they are the lever, not the target.
  const carbs = Math.max(0, roundTo((kcal - protein * 4 - fat * 9) / 4, 5))

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal: roundTo(kcal, 10),
    protein,
    carbs,
    fat,
  }
}

/** Age from a stored birth year, so the profile doesn't quietly go stale. */
export function ageFromBirthYear(birthYear: number | undefined, now = new Date()): number {
  if (!birthYear) return 0
  const age = now.getFullYear() - birthYear
  return age > 0 && age < 120 ? age : 0
}

export function birthYearFromAge(age: number, now = new Date()): number | undefined {
  return age > 0 && age < 120 ? now.getFullYear() - age : undefined
}

export const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'high']
export const NUTRITION_GOALS: NutritionGoal[] = ['cut', 'maintain', 'bulk']
