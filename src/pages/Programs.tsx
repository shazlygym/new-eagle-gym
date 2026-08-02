import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarRange, Check, Pencil, Play, Plus, RotateCcw, Square } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import ProgressRing from '../components/ProgressRing'
import { programProgress } from '../db/queries'
import {
  activateProgram,
  deactivateProgram,
  getActiveSession,
  listPrograms,
  listRoutines,
  listSessions,
  restartProgram,
} from '../db/repository'
import type { Program } from '../db/schema'
import { routineName, useT } from '../i18n'
import { unlockAudio } from '../lib/audio'
import { briefPath } from '../lib/routes'
import { useActiveProfile } from '../lib/useActiveProfile'

export default function Programs() {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile } = useActiveProfile()
  const profileId = profile?.id

  const programs = useLiveQuery(() => (profileId ? listPrograms(profileId) : []), [profileId]) ?? []
  const routines = useLiveQuery(() => (profileId ? listRoutines(profileId) : []), [profileId]) ?? []
  const sessions = useLiveQuery(() => (profileId ? listSessions(profileId) : []), [profileId]) ?? []

  if (!profile) return null

  const beginDay = async (program: Program, dayIndex: number, week: number) => {
    unlockAudio()
    const day = program.days[dayIndex]
    if (!day) return
    const existing = await getActiveSession(profile.id)
    // Mid-workout there is nothing left to plan, so resuming skips the brief.
    if (existing) {
      navigate(`/workout/${existing.id}`)
      return
    }
    // Through the brief, exactly as Home, Train and Routines do. This screen
    // used to call startSession directly, so starting the same program day was
    // shown last week's loads from three places and dropped straight into an
    // empty workout from the fourth.
    navigate(briefPath(day.routineId, program.id, week, dayIndex))
  }

  return (
    <div>
      <PageHeader
        title={t('programs.title')}
        onBack="history"
        action={
          <Link
            to="/programs/new"
            aria-label={t('programs.new')}
            className="icon-btn bg-ink-700 text-brand-500 active:bg-ink-600"
          >
            <Plus size={20} />
          </Link>
        }
      />

      <div className="px-5 py-4">
        {programs.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title={t('programs.empty')}
            body={t('programs.emptyHint')}
            action={
              <Link to="/programs/new" className="btn-primary inline-flex items-center gap-2">
                <Plus size={18} />
                {t('programs.new')}
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {programs.map((program) => {
              const progress = programProgress(program, sessions)
              const isActive = program.active === 1
              const adherence =
                progress.adherence.planned > 0
                  ? progress.adherence.done / progress.adherence.planned
                  : 0

              return (
                <li key={program.id} className="card overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    {isActive && (
                      <ProgressRing
                        value={Math.min(1, adherence)}
                        label={`${Math.round(Math.min(1, adherence) * 100)}%`}
                        size={52}
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-ink-50">
                          {routineName(program, locale)}
                        </p>
                        {isActive && (
                          <span className="shrink-0 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold text-brand-400">
                            {t('programs.active')}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-300">
                        {isActive && !progress.complete
                          ? t('programs.weekOf', {
                              week: progress.week,
                              total: progress.totalWeeks,
                            })
                          : t('programs.dayCount', { count: program.days.length })}
                      </p>
                      {isActive && (
                        <p className="mt-0.5 text-xs text-ink-300">
                          {t('programs.adherenceHint', {
                            done: progress.adherence.done,
                            planned: progress.adherence.planned,
                          })}
                        </p>
                      )}
                    </div>

                    <Link
                      to={`/programs/${program.id}`}
                      aria-label={t('common.edit')}
                      className="btn-soft icon-btn"
                    >
                      <Pencil size={16} />
                    </Link>
                  </div>

                  {/* The week's days, with the ones already logged ticked off. */}
                  {isActive && !progress.complete && (
                    <ul className="space-y-1.5 border-t border-ink-500/50 p-3">
                      {program.days.map((day, index) => {
                        const done = progress.doneThisWeek.includes(index)
                        const routine = routines.find((r) => r.id === day.routineId)
                        const isNext = index === progress.nextDayIndex && !done

                        return (
                          <li key={index}>
                            <button
                              type="button"
                              onClick={() => beginDay(program, index, progress.week)}
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start
                                          active:bg-ink-500 ${
                                            isNext ? 'bg-brand-500/10' : 'bg-ink-600'
                                          }`}
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold
                                            ${
                                              done
                                                ? 'bg-brand-500 text-ink-950'
                                                : 'bg-ink-500 text-ink-200'
                                            }`}
                              >
                                {done ? <Check size={13} strokeWidth={3} /> : index + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-ink-50">
                                  {locale === 'ar' ? day.labelAr : day.labelEn}
                                </p>
                                {routine && (
                                  <p className="truncate text-xs text-ink-300">
                                    {routineName(routine, locale)}
                                  </p>
                                )}
                              </div>
                              {!done && <Play size={15} className="shrink-0 text-brand-500" />}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {isActive && progress.complete && (
                    <div className="border-t border-ink-500/50 p-4">
                      <p className="text-sm font-semibold text-brand-500">{t('programs.complete')}</p>
                      <p className="mt-1 text-xs text-ink-300">
                        {t('programs.completeHint', { weeks: program.weeks })}
                      </p>
                      <button
                        type="button"
                        onClick={() => restartProgram(program.id)}
                        className="btn-ghost mt-3 flex w-full items-center justify-center gap-2 py-2.5 text-sm"
                      >
                        <RotateCcw size={15} className="rtl-flip" />
                        {t('programs.restart')}
                      </button>
                    </div>
                  )}

                  <div className="border-t border-ink-500/50 p-3">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => deactivateProgram(program.id)}
                        className="btn-soft flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium"
                      >
                        <Square size={14} />
                        {t('programs.stop')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => activateProgram(profile.id, program.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-ink-950 active:scale-[0.98] transition-transform"
                      >
                        <Play size={14} fill="currentColor" />
                        {t('programs.activate')}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
