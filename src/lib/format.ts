import { formatDistanceToNow, format as formatDate } from 'date-fns'
import { ar as arDateLocale, enUS } from 'date-fns/locale'
import type { Locale, Units } from '../db/schema'

// Weights are stored in kilograms everywhere (see db/schema.ts). These helpers
// are the only place that knows about the user's display unit.

const LB_PER_KG = 2.2046226218

export function toDisplayWeight(kg: number, units: Units): number {
  const value = units === 'lb' ? kg * LB_PER_KG : kg
  // Half-unit precision matches the smallest plate anyone actually loads.
  return Math.round(value * 2) / 2
}

export function toStoredWeight(displayValue: number, units: Units): number {
  return units === 'lb' ? displayValue / LB_PER_KG : displayValue
}

/** Western digits in both languages — they match the numbers printed on the plates. */
const NUMBER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const COMPACT_FORMAT = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value)
}

export function unitLabel(units: Units, locale: Locale): string {
  if (locale === 'ar') return units === 'kg' ? 'كجم' : 'رطل'
  return units
}

export function formatWeight(kg: number, units: Units, locale: Locale): string {
  return `${formatNumber(toDisplayWeight(kg, units))} ${unitLabel(units, locale)}`
}

/**
 * Tonnage, with the unit appended. Large numbers get compact notation; `compact`
 * forces it from the first thousand, which is what narrow stat tiles need to
 * avoid wrapping "12,450 كجم" onto two lines.
 */
export function formatVolume(
  kg: number,
  units: Units,
  locale: Locale,
  options: { compact?: boolean } = {}
): string {
  return `${volumeValue(kg, units, options)} ${unitLabel(units, locale)}`
}

/**
 * The tonnage number on its own. Stat tiles use this and carry the unit in their
 * label — a third of a phone's width isn't enough for "1.6K كجم" to fit.
 */
export function volumeValue(
  kg: number,
  units: Units,
  options: { compact?: boolean } = {}
): string {
  const value = units === 'lb' ? kg * LB_PER_KG : kg
  const threshold = options.compact ? 1_000 : 10_000
  return value >= threshold ? COMPACT_FORMAT.format(value) : NUMBER_FORMAT.format(value)
}

export function formatDuration(ms: number, locale: Locale): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const h = locale === 'ar' ? 'س' : 'h'
  const m = locale === 'ar' ? 'د' : 'm'
  return hours > 0 ? `${hours}${h} ${minutes}${m}` : `${minutes}${m}`
}

/** mm:ss for the rest timer. */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds))
  const minutes = Math.floor(safe / 60)
  return `${minutes}:${String(safe % 60).padStart(2, '0')}`
}

export function dateLocale(locale: Locale) {
  return locale === 'ar' ? arDateLocale : enUS
}

export function formatDay(date: Date | number, locale: Locale): string {
  return formatDate(date, 'EEEE d MMMM', { locale: dateLocale(locale) })
}

export function formatShortDay(date: Date | number, locale: Locale): string {
  return formatDate(date, 'd MMM', { locale: dateLocale(locale) })
}

export function formatTimeAgo(date: Date | number, locale: Locale): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale(locale) })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${NUMBER_FORMAT.format(value)} ${units[index]}`
}
