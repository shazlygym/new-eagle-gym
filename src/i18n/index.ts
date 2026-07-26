import { useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import type { Exercise, Locale, Routine } from '../db/schema'
import { ar } from './ar'
import { en, type TranslationKey } from './en'

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { ar, en }

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string

export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const template = DICTIONARIES[locale][key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  )
}

export function useT(): { t: Translate; locale: Locale; isRTL: boolean } {
  const locale = useAppStore((state) => state.locale)
  const t = useCallback<Translate>((key, vars) => translate(locale, key, vars), [locale])
  return { t, locale, isRTL: locale === 'ar' }
}

/**
 * Exercise and routine names are stored per-language on the record itself, not
 * in the dictionary — users add their own, and a custom exercise created in one
 * language still has to render in the other.
 */
export function exerciseName(exercise: Exercise | undefined, locale: Locale): string {
  if (!exercise) return '—'
  const preferred = locale === 'ar' ? exercise.nameAr : exercise.nameEn
  return preferred || exercise.nameEn || exercise.nameAr
}

export function routineName(routine: Pick<Routine, 'nameAr' | 'nameEn'>, locale: Locale): string {
  const preferred = locale === 'ar' ? routine.nameAr : routine.nameEn
  return preferred || routine.nameEn || routine.nameAr
}
