import type { Exercise } from './schema'

// The exercise list is the member's own. A built-in library sounded helpful but
// meant scrolling past seventy machines you have never touched to reach the five
// lifts you actually train — so the app now starts empty and you add what you do,
// with your own naming and your own form video attached.
//
// Nutrition is the opposite case: nobody can be expected to know the calories in
// a plate of koshari, so that table ships with the app. See db/foods.ts.

export const SEED_EXERCISES: Exercise[] = []
