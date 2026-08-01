import { useLiveQuery } from 'dexie-react-hooks'
import { Play, Table2, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import type { ExerciseSessionLog, RoutineBriefItem } from '../db/repository'
import { getActiveSession, getRoutine, routineBrief, startSession } from '../db/repository'
import type { Units } from '../db/schema'
import { exerciseName, routineName, useT } from '../i18n'
import { unlockAudio } from '../lib/audio'
import {
  formatClock,
  formatNumber,
  formatShortDay,
  ltrIsolate,
  toDisplayWeight,
  unitLabel,
} from '../lib/format'
import { SUGGESTION_REASON, suggestNextLoad } from '../lib/progression'
import { formatRepRange, isTimed } from '../lib/repRange'
import { sheetPath } from '../lib/routes'
import { countsAsWork } from '../lib/setTypes'
import { useActiveProfile } from '../lib/useActiveProfile'

/** How many past sessions to show per exercise. Three weeks is the shape of a trend. */
const SESSIONS_SHOWN = 3

/**
 * The screen between deciding to train and the first set.
 *
 * The plan already said "4 × 6–10"; what it never said was what you actually
 * pressed last week. That answer existed, but only inside a session you had
 * already started, one exercise at a time — which is too late to decide what to
 * load. This lays the whole routine out beforehand: the target, the last three
 * sessions, and what the progression rule makes of them.
 */
export default function RoutinePreview() {
  const { routineId } = useParams()
  const [params] = useSearchParams()
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile, units } = useActiveProfile()
  const profileId = profile?.id
  const [starting, setStarting] = useState(false)

  const routine = useLiveQuery(() => (routineId ? getRoutine(routineId) : undefined), [routineId])
  const brief = useLiveQuery(
    () => (profileId && routineId ? routineBrief(profileId, routineId, SESSIONS_SHOWN) : []),
    [profileId, routineId]
  )

  if (!profile || !routineId) return null

  // Carried through from the Train tab so starting here still counts against the
  // right day of the active program.
  const programId = params.get('program')
  const week = Number(params.get('week'))
  const dayIndex = Number(params.get('day'))
  const programContext =
    programId && Number.isFinite(week) && Number.isFinite(dayIndex)
      ? { id: programId, week, dayIndex }
      : undefined

  const begin = async () => {
    // Double-tapping the button would otherwise open two sessions.
    if (starting) return
    setStarting(true)
    unlockAudio()
    try {
      const existing = await getActiveSession(profile.id)
      const sessionId = existing?.id ?? (await startSession(profile.id, routineId, programContext))
      // `replace`, so the back gesture out of a workout returns to where the
      // member came from rather than to this screen, which would offer to start
      // a session that is already running.
      navigate(`/workout/${sessionId}`, { replace: true })
    } catch {
      setStarting(false)
    }
  }

  // pb-36 clears both the tab bar and the Start bar floating above it.
  return (
    <div className="pb-36">
      <PageHeader
        title={routine ? routineName(routine, locale) : t('routines.title')}
        onBack="history"
        action={
          routineId ? (
            // The brief shows the last three sessions one exercise at a time;
            // the sheet shows every week at once. Same data, other axis.
            <Link
              to={sheetPath(routineId)}
              className="flex items-center gap-1.5 rounded-xl bg-ink-700 px-3 py-2.5 text-xs
                         font-medium text-ink-100 active:bg-ink-600"
            >
              <Table2 size={15} />
              {t('sheet.open')}
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-3 px-5 py-4">
        <p className="px-1 text-xs leading-relaxed text-ink-300">{t('preview.intro')}</p>

        {(brief ?? []).map((entry, index) => (
          <BriefCard key={`${entry.item.exerciseId}-${index}`} entry={entry} units={units} />
        ))}
      </div>

      {/* Above the tab bar rather than replacing it — leaving this screen without
          starting has to stay one tap away. `bottom-tabbar` carries the home
          indicator inset; a plain `bottom-16` sits under the tab bar on any
          phone that has one. */}
      <div className="fixed inset-x-0 bottom-tabbar z-30 border-t border-ink-500/40 bg-ink-900/95 backdrop-blur">
        <div className="page-width px-4 py-3">
          <button
            type="button"
            onClick={begin}
            disabled={starting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5
                       text-base font-bold text-ink-950 active:scale-[0.98] transition-transform
                       disabled:opacity-60"
          >
            <Play size={19} fill="currentColor" />
            {t('routines.start')}
          </button>
        </div>
      </div>
    </div>
  )
}

function BriefCard({ entry, units }: { entry: RoutineBriefItem; units: Units }) {
  const { t, locale } = useT()
  const { item, exercise, history } = entry
  const timed = isTimed(exercise)

  const suggestion = timed
    ? null
    : suggestNextLoad(
        history.map((log) => log.sets),
        { reps: item.targetReps, repsMax: item.targetRepsMax, sets: item.targetSets },
        units
      )

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-2 p-4 pb-3">
        <h2 className="min-w-0 flex-1 truncate font-semibold text-ink-50">
          {exerciseName(exercise, locale)}
        </h2>
        {/* Digits and symbols only, so it needs the isolate to stop RTL reading
            "4 × 6–10" back to front. See lib/format.ts. */}
        <span className="tabular shrink-0 rounded-lg bg-ink-600 px-2.5 py-1 text-xs font-semibold text-ink-100">
          {ltrIsolate(
            timed
              ? `${item.targetSets} × ${formatClock(item.targetReps)}`
              : `${item.targetSets} × ${formatRepRange(item.targetReps, item.targetRepsMax)}`
          )}
        </span>
      </header>

      {suggestion && suggestion.kind !== 'hold' && (
        <div className="flex items-center gap-2 border-y border-ink-500/40 bg-brand-500/5 px-4 py-2.5">
          <TrendingUp size={14} className="shrink-0 text-brand-500" />
          <span className="min-w-0 flex-1 text-xs text-ink-200">
            {t(SUGGESTION_REASON[suggestion.reason])}
          </span>
          <span className="tabular shrink-0 text-xs font-bold text-brand-500">
            {formatNumber(toDisplayWeight(suggestion.weight, units))} {unitLabel(units, locale)}
          </span>
        </div>
      )}

      {history.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-ink-300">{t('preview.firstTime')}</p>
      ) : (
        <ul className="space-y-2 px-4 pb-4">
          {history.map((log, index) => (
            <SessionRow key={log.sessionId} log={log} units={units} isLast={index === 0} />
          ))}
        </ul>
      )}
    </section>
  )
}

/** One past session: when, and every set that was actually completed. */
function SessionRow({
  log,
  units,
  isLast,
}: {
  log: ExerciseSessionLog
  units: Units
  isLast: boolean
}) {
  const { t, locale } = useT()
  // Warm-ups are not what you are trying to beat.
  const working = log.sets.filter((set) => countsAsWork(set.setType))
  if (working.length === 0) return null

  return (
    <li>
      <p className="mb-1 text-[11px] text-ink-300">
        {isLast ? `${t('workout.previous')} · ` : ''}
        {formatShortDay(log.date, locale)}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {working.map((set) => (
          <span
            key={set.id}
            className={`tabular rounded-lg px-2.5 py-1 text-xs ${
              isLast ? 'bg-ink-600 text-ink-50' : 'bg-ink-700 text-ink-200'
            }`}
          >
            {/* Digits and an × with no strong character anywhere — in Arabic the
                paragraph direction would otherwise lay "70 × 10" out as
                "10 × 70", which reads as ten kilos for seventy reps. */}
            {ltrIsolate(
              set.durationSeconds
                ? formatClock(set.durationSeconds)
                : `${formatNumber(toDisplayWeight(set.weight, units))} × ${set.reps}`
            )}
          </span>
        ))}
      </div>
    </li>
  )
}
