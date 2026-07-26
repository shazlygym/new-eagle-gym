import type { Exercise, Locale, MuscleGroup } from '../db/schema'
import { exerciseName } from '../i18n'

// Arabic is written with several interchangeable letter forms and with optional
// diacritics that nobody types on a phone. Comparing raw strings means a member
// searching "رفعه" never finds "الرفعة", and "احماء" never finds "إحماء" —
// which reads as "the exercise isn't in the app". Normalising both sides fixes
// it, and is harmless for Latin text.
const ARABIC_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g

export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(ARABIC_MARKS, '') // harakat and the tatweel stretching character
    .replace(/[أإآٱ]/g, 'ا') // alef variants
    .replace(/[ىئ]/g, 'ي') // alef maqsura / hamza on ya
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه') // ta marbuta, routinely typed as ha
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Shared by the exercise library and the in-workout picker so the two can never
 * disagree about what matches. Names are searched in both languages regardless
 * of the UI locale — people type "bench" with the app in Arabic.
 */
export function filterExercises(
  exercises: Exercise[],
  options: { query: string; group: MuscleGroup | 'all'; locale: Locale }
): Exercise[] {
  const needle = normalizeSearch(options.query)

  return exercises
    .filter((exercise) => options.group === 'all' || exercise.muscleGroup === options.group)
    .filter(
      (exercise) =>
        !needle ||
        normalizeSearch(exercise.nameEn).includes(needle) ||
        normalizeSearch(exercise.nameAr).includes(needle)
    )
    .sort((a, b) =>
      exerciseName(a, options.locale).localeCompare(exerciseName(b, options.locale), options.locale)
    )
}
