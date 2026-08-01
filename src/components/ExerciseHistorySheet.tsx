import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useMemo } from 'react'
import { e1rm } from '../db/queries'
import { getExercise, listSetsForExercise } from '../db/repository'
import type { SetEntry, Units } from '../db/schema'
import { exerciseName, useT } from '../i18n'
import {
  formatClock,
  formatNumber,
  formatShortDay,
  ltrIsolate,
  toDisplayWeight,
  unitLabel,
} from '../lib/format'
import Sheet from './Sheet'

// Recharts stays out of the workout bundle; it loads the first time a history
// sheet with enough data actually opens.
const TrendCharts = lazy(() => import('./ExerciseTrendCharts'))

interface Props {
  open: boolean
  onClose: () => void
  profileId: string
  exerciseId: string
  units: Units
}

/**
 * Everything logged for one exercise, newest first. Reachable from the workout
 * screen because the question "what did I do last time, and the time before?" is
 * the one you ask standing at the machine — and answering it by paging through
 * History one session at a time is hopeless.
 */
export default function ExerciseHistorySheet({
  open,
  onClose,
  profileId,
  exerciseId,
  units,
}: Props) {
  const { t, locale } = useT()
  const unit = unitLabel(units, locale)

  const exercise = useLiveQuery(() => getExercise(exerciseId), [exerciseId])
  const sets = useLiveQuery(
    () => (open ? listSetsForExercise(profileId, exerciseId) : []),
    [profileId, exerciseId, open]
  )

  const sessions = useMemo(() => groupBySession(sets ?? []), [sets])
  const isTimed = exercise?.tracking === 'duration'
  const best = useMemo(() => {
    const rows = sets ?? []
    if (rows.length === 0) return null
    const heaviest = rows.reduce((a, b) => (b.weight > a.weight ? b : a))
    const strongest = rows.reduce((a, b) => (e1rm(b.weight, b.reps) > e1rm(a.weight, a.reps) ? b : a))
    const longest = rows.reduce((a, b) =>
      (b.durationSeconds ?? 0) > (a.durationSeconds ?? 0) ? b : a
    )
    return {
      heaviest,
      e1rm: e1rm(strongest.weight, strongest.reps),
      longest: longest.durationSeconds ?? 0,
    }
  }, [sets])

  return (
    <Sheet open={open} onClose={onClose} title={exerciseName(exercise, locale)} tall>
      {sessions.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-300">{t('exerciseHistory.empty')}</p>
      ) : (
        <>
          {best && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {isTimed ? (
                <div className="col-span-2 rounded-xl bg-ink-700 p-3">
                  <p className="text-[11px] text-ink-300">{t('progress.bestHold')}</p>
                  <p className="tabular mt-1 text-base font-bold text-brand-500">
                    {formatClock(best.longest)}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-ink-700 p-3">
                    <p className="text-[11px] text-ink-300">{t('progress.topSet')}</p>
                    <p className="tabular mt-1 text-base font-bold text-brand-500">
                      {formatNumber(toDisplayWeight(best.heaviest.weight, units))} {unit} ×{' '}
                      {best.heaviest.reps}
                    </p>
                  </div>
                  <div className="rounded-xl bg-ink-700 p-3">
                    <p className="text-[11px] text-ink-300">{t('progress.e1rm')}</p>
                    <p className="tabular mt-1 text-base font-bold text-brand-500">
                      {formatNumber(toDisplayWeight(best.e1rm, units))} {unit}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <Suspense fallback={<div className="mb-4 h-40 rounded-xl bg-ink-700/50" />}>
            <TrendCharts sets={sets ?? []} units={units} isTimed={isTimed} />
          </Suspense>

          <ul className="space-y-2">
            {sessions.map((session) => (
              <li key={session.sessionId} className="rounded-xl bg-ink-700 p-3">
                <p className="mb-2 text-xs font-medium text-ink-200">
                  {formatShortDay(session.date, locale)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {session.sets.map((set) => (
                    <span
                      key={set.id}
                      className="tabular rounded-lg bg-ink-600 px-2.5 py-1 text-xs text-ink-50"
                    >
                      {/* Digits and an × with no strong character anywhere, so
                          bare in Arabic "70 × 10" lays out as "10 × 70" — ten
                          kilos for seventy reps. */}
                      {set.durationSeconds
                        ? formatClock(set.durationSeconds)
                        : ltrIsolate(
                            `${formatNumber(toDisplayWeight(set.weight, units))} × ${set.reps}`
                          )}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}

function groupBySession(sets: SetEntry[]): Array<{ sessionId: string; date: number; sets: SetEntry[] }> {
  const map = new Map<string, SetEntry[]>()
  for (const set of sets) {
    const bucket = map.get(set.sessionId)
    if (bucket) bucket.push(set)
    else map.set(set.sessionId, [set])
  }

  return [...map.entries()]
    .map(([sessionId, rows]) => ({
      sessionId,
      date: Math.min(...rows.map((r) => r.completedAt ?? 0)),
      sets: rows.sort((a, b) => a.setNumber - b.setNumber),
    }))
    .sort((a, b) => b.date - a.date)
}
