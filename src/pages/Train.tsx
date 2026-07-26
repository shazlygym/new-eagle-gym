import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarRange, ChevronRight, Dumbbell, LibraryBig, Play } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProgressRing from '../components/ProgressRing'
import { programProgress } from '../db/queries'
import {
  getActiveProgram,
  getActiveSession,
  listExercises,
  listPrograms,
  listRoutines,
  listSessions,
  startSession,
} from '../db/repository'
import { routineName, useT } from '../i18n'
import { unlockAudio } from '../lib/audio'
import { useActiveProfile } from '../lib/useActiveProfile'

/**
 * The hub for everything you plan with. Programs previously lived two taps deep
 * behind Routines, which made the app's most capable feature invisible; the tab
 * bar now leads here instead.
 */
export default function Train() {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile } = useActiveProfile()
  const profileId = profile?.id

  const programs = useLiveQuery(() => (profileId ? listPrograms(profileId) : []), [profileId]) ?? []
  const routines = useLiveQuery(() => (profileId ? listRoutines(profileId) : []), [profileId]) ?? []
  const exercises = useLiveQuery(() => (profileId ? listExercises(profileId) : []), [profileId]) ?? []
  const sessions = useLiveQuery(() => (profileId ? listSessions(profileId) : []), [profileId]) ?? []
  const active = useLiveQuery(
    () => (profileId ? getActiveProgram(profileId) : undefined),
    [profileId]
  )

  if (!profile) return null

  const progress = active ? programProgress(active, sessions) : null

  const startDay = async (dayIndex: number) => {
    if (!active || !progress) return
    const day = active.days[dayIndex]
    if (!day) return
    unlockAudio()
    const existing = await getActiveSession(profile.id)
    const sessionId =
      existing?.id ??
      (await startSession(profile.id, day.routineId, {
        id: active.id,
        week: progress.week,
        dayIndex,
      }))
    navigate(`/workout/${sessionId}`)
  }

  return (
    <div className="pb-6">
      <PageHeader title={t('train.title')} large />

      <div className="space-y-3 px-4 py-4">
        {active && progress && !progress.complete && (
          <section className="card overflow-hidden border-gold-500/25">
            <div className="flex items-center gap-3 p-4">
              <ProgressRing
                value={
                  active.days.length > 0 ? progress.doneThisWeek.length / active.days.length : 0
                }
                label={`${progress.doneThisWeek.length}/${active.days.length}`}
                size={50}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-500">
                  {t('train.activeProgram')}
                </p>
                <p className="truncate font-semibold text-dark-50">
                  {routineName(active, locale)}
                </p>
                <p className="text-xs text-dark-300">
                  {t('programs.weekOf', { week: progress.week, total: progress.totalWeeks })}
                </p>
              </div>
            </div>

            {active.days[progress.nextDayIndex] && (
              <button
                type="button"
                onClick={() => startDay(progress.nextDayIndex)}
                className="flex w-full items-center gap-3 border-t border-dark-500/50 bg-gold-500/10
                           px-4 py-3 text-start active:bg-gold-500/20"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-dark-50">
                  {locale === 'ar'
                    ? active.days[progress.nextDayIndex].labelAr
                    : active.days[progress.nextDayIndex].labelEn}
                </span>
                <Play size={18} className="shrink-0 text-gold-500" fill="currentColor" />
              </button>
            )}
          </section>
        )}

        <HubLink
          to="/programs"
          icon={CalendarRange}
          title={t('train.programs')}
          hint={t('train.programsHint')}
          count={programs.length}
        />
        <HubLink
          to="/routines"
          icon={Dumbbell}
          title={t('train.routines')}
          hint={t('train.routinesHint')}
          count={routines.length}
        />
        <HubLink
          to="/exercises"
          icon={LibraryBig}
          title={t('train.exercises')}
          hint={t('train.exercisesHint')}
          count={exercises.length}
        />
      </div>
    </div>
  )
}

function HubLink({
  to,
  icon: Icon,
  title,
  hint,
  count,
}: {
  to: string
  icon: LucideIcon
  title: string
  hint: string
  count: number
}) {
  return (
    <Link to={to} className="card flex items-center gap-3.5 p-4 active:bg-dark-600">
      <div className="rounded-xl bg-dark-600 p-3 text-gold-500">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-dark-50">{title}</p>
        <p className="mt-0.5 truncate text-xs text-dark-300">{hint}</p>
      </div>
      <span className="tabular shrink-0 text-sm font-semibold text-dark-200">{count}</span>
      <ChevronRight size={18} className="rtl-flip shrink-0 text-dark-300" />
    </Link>
  )
}
