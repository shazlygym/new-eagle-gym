import { format, parseISO, subDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { listMealEntriesBetween } from '../db/repository'
import { useT } from '../i18n'
import { dateLocale } from '../lib/format'

interface Props {
  profileId: string
  /** The day the page is showing; the strip ends here. */
  date: string
  kcalTarget?: number
  onPickDate: (date: string) => void
}

/**
 * Seven days of calories as a row of bars. Drawn with plain divs rather than the
 * chart library — recharts is a 380 kB chunk, and a bar whose height is a
 * percentage does not need it.
 */
export default function WeekCalories({ profileId, date, kcalTarget, onPickDate }: Props) {
  const { t, locale } = useT()

  const from = format(subDays(parseISO(date), 6), 'yyyy-MM-dd')
  const entries = useLiveQuery(
    () => listMealEntriesBetween(profileId, from, date),
    [profileId, from, date]
  )

  const days = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const entry of entries ?? []) {
      byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.kcal)
    }
    return Array.from({ length: 7 }, (_, index) => {
      const day = subDays(parseISO(date), 6 - index)
      const key = format(day, 'yyyy-MM-dd')
      return { key, day, kcal: byDate.get(key) ?? 0 }
    })
  }, [entries, date])

  const logged = days.filter((day) => day.kcal > 0)
  if (logged.length < 2) return null

  // Scaled against the target so the bars read as "over or under", falling back
  // to the biggest day when no target is set.
  const peak = Math.max(kcalTarget ?? 0, ...days.map((day) => day.kcal), 1)
  const average = Math.round(logged.reduce((sum, day) => sum + day.kcal, 0) / logged.length)

  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-title">{t('nutrition.weekChart')}</h2>
        <span className="tabular text-xs text-ink-300">
          {t('nutrition.dailyAverage', { kcal: average })}
        </span>
      </div>

      <div className="mt-3 flex h-24 items-end gap-1.5">
        {days.map((day) => {
          const selected = day.key === date
          const over = kcalTarget ? day.kcal > kcalTarget : false
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onPickDate(day.key)}
              className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-1"
              aria-label={`${format(day.day, 'd MMM', { locale: dateLocale(locale) })} — ${Math.round(day.kcal)}`}
            >
              {/* 10px, not 9: below 10 a four-digit calorie count stops being
                  legible at arm's length, and this is the only text in the app
                  that was under it. Four digits still fit a 39px bar. */}
              <span className="tabular text-[10px] font-semibold text-ink-300" dir="ltr">
                {day.kcal > 0 ? Math.round(day.kcal) : ''}
              </span>
              <span
                className={`w-full rounded-md transition-[height,background-color] duration-300
                            ${
                              day.kcal === 0
                                ? 'bg-ink-600'
                                : over
                                  ? 'bg-flame-400'
                                  : selected
                                    ? 'bg-brand-400'
                                    : 'bg-brand-500/60'
                            }`}
                // A logged day always shows something, even a tiny one.
                style={{ height: `${day.kcal > 0 ? Math.max(6, (day.kcal / peak) * 100) : 3}%` }}
              />
              <span
                className={`truncate text-[10px] ${selected ? 'font-bold text-brand-400' : 'text-ink-400'}`}
              >
                {format(day.day, 'EEEEEE', { locale: dateLocale(locale) })}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
