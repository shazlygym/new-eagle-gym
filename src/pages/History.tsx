import { useLiveQuery } from 'dexie-react-hooks'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import { sessionsByDay, volumeOf } from '../db/queries'
import { listCompletedSets, listSessions } from '../db/repository'
import { useT } from '../i18n'
import { dateLocale, formatShortDay, formatVolume } from '../lib/format'
import { useActiveProfile } from '../lib/useActiveProfile'

/** Saturday — the Egyptian/Gulf week start, matching db/queries.ts. */
const WEEK_OPTIONS = { weekStartsOn: 6 } as const

export default function History() {
  const { t, locale } = useT()
  const { profile, units } = useActiveProfile()
  const profileId = profile?.id

  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  const sessions = useLiveQuery(() => (profileId ? listSessions(profileId) : []), [profileId]) ?? []
  const sets = useLiveQuery(() => (profileId ? listCompletedSets(profileId) : []), [profileId]) ?? []

  if (!profile) return null

  const dayCounts = sessionsByDay(sessions)
  const done = sessions.filter((session) => session.status === 'done')

  // Pad to whole weeks so the grid always has aligned columns.
  const gridStart = startOfWeek(startOfMonth(month), WEEK_OPTIONS)
  const gridEnd = addDays(startOfWeek(endOfMonth(month), WEEK_OPTIONS), 6)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weekdays = Array.from({ length: 7 }, (_, i) => addDays(gridStart, i))

  return (
    <div>
      <PageHeader title={t('history.title')} large />

      <section className="px-4 py-4">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, -1))}
              aria-label={t('common.previous')}
              className="rounded-lg p-1.5 text-ink-200 active:bg-ink-600"
            >
              <ChevronLeft size={20} className="rtl-flip" />
            </button>
            <h2 className="text-sm font-semibold text-ink-50">
              {format(month, 'MMMM yyyy', { locale: dateLocale(locale) })}
            </h2>
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, 1))}
              aria-label={t('common.next')}
              className="rounded-lg p-1.5 text-ink-200 active:bg-ink-600"
            >
              <ChevronRight size={20} className="rtl-flip" />
            </button>
          </div>

          {/* The grid inherits the document direction, so in Arabic the first
              column lands on the right without any extra handling. */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((day) => (
              <span key={day.toISOString()} className="pb-1 text-[10px] font-medium text-ink-300">
                {format(day, 'EEEEE', { locale: dateLocale(locale) })}
              </span>
            ))}

            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const count = dayCounts.get(key) ?? 0
              const outside = !isSameMonth(day, month)

              return (
                <div
                  key={key}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg
                              text-xs ${outside ? 'text-ink-400' : 'text-ink-100'}
                              ${count > 0 ? 'bg-brand-500/15 font-semibold text-brand-400' : ''}
                              ${isToday(day) ? 'ring-1 ring-inset ring-brand-500/60' : ''}`}
                >
                  <span className="tabular">{format(day, 'd')}</span>
                  {count > 0 && <span className="mt-0.5 h-1 w-1 rounded-full bg-brand-500" />}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-4">
        {done.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t('history.empty')} body={t('history.emptyHint')} />
        ) : (
          <ul className="space-y-2">
            {done.map((session) => {
              const sessionSets = sets.filter((s) => s.sessionId === session.id)
              const exerciseCount = new Set(sessionSets.map((s) => s.exerciseId)).size

              return (
                <li key={session.id}>
                  <Link
                    to={`/history/${session.id}`}
                    className="card flex items-center gap-3 p-4 active:bg-ink-600"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-50">
                        {(locale === 'ar' ? session.titleAr : session.titleEn) ||
                          t('workout.untitled')}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-300">
                        {formatShortDay(session.startedAt, locale)} ·{' '}
                        {t('history.exercisesCount', { count: exerciseCount })}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm font-semibold text-brand-500">
                      {/* volumeOf, not a raw sum. A raw sum counts the warm-up
                          ramp as tonnage, so the same workout read heavier here
                          than on Home — two different numbers for one session,
                          with nothing on screen to say which one is the truth. */}
                      {formatVolume(volumeOf(sessionSets), units, locale)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
