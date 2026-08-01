import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarRange, Check, ChevronLeft, Dumbbell, LibraryBig, Play, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
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
import { formatTimeAgo } from '../lib/format'
import { briefPath } from '../lib/routes'
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
  const session = useLiveQuery(
    () => (profileId ? getActiveSession(profileId) : undefined),
    [profileId]
  )

  if (!profile) return null

  const progress = active ? programProgress(active, sessions) : null
  const nextDay = active && progress ? active.days[progress.nextDayIndex] : undefined

  const startDay = async (dayIndex: number) => {
    if (!active || !progress) return
    const day = active.days[dayIndex]
    if (!day) return
    unlockAudio()
    const existing = await getActiveSession(profile.id)
    // Mid-workout there is nothing left to plan, so resuming skips the brief.
    if (existing) {
      navigate(`/workout/${existing.id}`)
      return
    }
    navigate(briefPath(day.routineId, active.id, progress.week, dayIndex))
  }

  // A tab called "Train" that couldn't start training was the one thing here
  // you'd expect to work and couldn't: every route on this screen led to
  // planning. Resuming, or starting from nothing, now lives on it too.
  const begin = async () => {
    unlockAudio()
    const existing = await getActiveSession(profile.id)
    const sessionId = existing?.id ?? (await startSession(profile.id))
    navigate(`/workout/${sessionId}`)
  }

  return (
    <div className="pb-6">
      <PageHeader title={t('train.title')} large />

      <div className="px-5 py-4">
        {session && (
          <button
            type="button"
            onClick={() => navigate(`/workout/${session.id}`)}
            className="mb-3 flex w-full animate-pulse-brand items-center gap-3 rounded-[20px]
                       bg-brand-gradient p-4 text-start text-ink-950 active:scale-[0.99]
                       transition-transform"
          >
            <Play size={22} className="shrink-0" fill="currentColor" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] opacity-70">
                {t('home.activeTitle')}
              </p>
              <p className="truncate text-lg font-extrabold leading-tight">{t('home.resume')}</p>
              <p className="text-xs font-medium opacity-80">
                {t('home.activeBody', { time: formatTimeAgo(session.startedAt, locale) })}
              </p>
            </div>
          </button>
        )}

        {/* The plan is the hero here for the same reason it is on Home: it is
            the only thing on the screen that answers "what now" rather than
            "where do I go to change something". */}
        {active && progress && !progress.complete && (
          <section className="card-hero mb-3">
            <button
              type="button"
              onClick={() => startDay(progress.nextDayIndex)}
              disabled={!nextDay}
              className="flex w-full items-start gap-3 p-4 text-start
                         active:bg-ink-50/[0.04] disabled:active:bg-transparent"
            >
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-brand-500">{t('train.activeProgram')}</p>
                <p className="mt-1.5 truncate text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink-50">
                  {nextDay ? (locale === 'ar' ? nextDay.labelAr : nextDay.labelEn) : routineName(active, locale)}
                </p>
                <p className="mt-1 truncate text-xs text-ink-300">
                  {routineName(active, locale)}
                  {' · '}
                  {t('programs.weekOf', { week: progress.week, total: progress.totalWeeks })}
                </p>
              </div>
              {nextDay && (
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full
                             bg-brand-gradient text-ink-950 shadow-brand"
                >
                  <Play size={20} fill="currentColor" className="ms-0.5 rtl-flip" />
                </span>
              )}
            </button>

            {active.days.length > 1 && (
              <div className="flex items-center gap-1.5 border-t border-ink-500/40 bg-ink-950/30 px-4 py-2.5">
                {active.days.map((day, index) => {
                  const done = progress.doneThisWeek.includes(index)
                  const isNext = index === progress.nextDayIndex
                  return (
                    <div
                      key={index}
                      title={locale === 'ar' ? day.labelAr : day.labelEn}
                      className={`flex h-5 flex-1 items-center justify-center rounded text-[10px] font-extrabold
                                  ${
                                    done
                                      ? 'bg-brand-500 text-ink-950'
                                      : isNext
                                        ? 'border border-brand-500 bg-brand-500/10 text-brand-400'
                                        : 'bg-ink-600 text-ink-400'
                                  }`}
                    >
                      {done ? <Check size={11} strokeWidth={3.5} /> : index + 1}
                    </div>
                  )
                })}
                <span className="tabular ps-1 text-[10px] font-bold text-ink-400">
                  {progress.doneThisWeek.length}/{active.days.length}
                </span>
              </div>
            )}
          </section>
        )}

        {/* Three doors into the same library. They were three cards with a 44px
            tinted icon tile each, which gave "where do I keep my exercises" the
            same weight as "start training" — they are navigation, so they get
            list weight. */}
        <h2 className="section-title mb-2.5 mt-6">{t('train.planning')}</h2>
        <div className="card divide-y divide-ink-500/30 overflow-hidden">
          <HubRow
            to="/programs"
            icon={CalendarRange}
            title={t('train.programs')}
            hint={t('train.programsHint')}
            count={programs.length}
          />
          <HubRow
            to="/routines"
            icon={Dumbbell}
            title={t('train.routines')}
            hint={t('train.routinesHint')}
            count={routines.length}
          />
          <HubRow
            to="/exercises"
            icon={LibraryBig}
            title={t('train.exercises')}
            hint={t('train.exercisesHint')}
            count={exercises.length}
          />
        </div>

        {!session && (
          <button
            type="button"
            onClick={begin}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border
                       border-dashed border-ink-500 py-3.5 text-sm font-medium
                       text-ink-200 active:bg-ink-700"
          >
            <Plus size={18} className="text-brand-500" />
            {t('home.startEmpty')}
          </button>
        )}
      </div>
    </div>
  )
}

/** One door into the library. Same row as Home's quick-start, on purpose. */
function HubRow({
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
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5 active:bg-ink-600/60">
      <Icon size={17} className="shrink-0 text-brand-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-50">{title}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-400">{hint}</p>
      </div>
      <span className="tabular font-numeric shrink-0 text-sm font-bold text-ink-200">{count}</span>
      <ChevronLeft size={16} className="shrink-0 text-ink-500 ltr:rotate-180" />
    </Link>
  )
}
