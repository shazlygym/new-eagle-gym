import { useLiveQuery } from 'dexie-react-hooks'
import { startOfWeek } from 'date-fns'
import {
  CalendarDays,
  CalendarClock,
  Dumbbell,
  Flame,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Weight,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import InstallHint from '../components/InstallHint'
import PageHeader from '../components/PageHeader'
import ProgressRing from '../components/ProgressRing'
import Reveal from '../components/Reveal'
import StatCard from '../components/StatCard'
import TodayPlanCard from '../components/TodayPlanCard'
import WeightCard from '../components/WeightCard'
import {
  getActiveProgram,
  getActiveSession,
  listCompletedSetsSince,
  listRoutines,
  listSessions,
  listSetsForSessions,
  repeatSession,
  startSession,
} from '../db/repository'
import { programProgress, sessionsThisWeek, volumeOf, volumeThisWeek, weekStreak } from '../db/queries'
import { routineName, useT } from '../i18n'
import { unlockAudio } from '../lib/audio'
import { formatShortDay, formatTimeAgo, formatVolume, unitLabel, volumeValue } from '../lib/format'
import { useActiveProfile } from '../lib/useActiveProfile'
import { useAppStore } from '../stores/appStore'

export default function Home() {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile, units } = useActiveProfile()
  const profileId = profile?.id

  const routines = useLiveQuery(() => (profileId ? listRoutines(profileId) : []), [profileId]) ?? []
  const sessions = useLiveQuery(() => (profileId ? listSessions(profileId) : []), [profileId]) ?? []
  const active = useLiveQuery(
    () => (profileId ? getActiveSession(profileId) : undefined),
    [profileId]
  )
  const program = useLiveQuery(
    () => (profileId ? getActiveProgram(profileId) : undefined),
    [profileId]
  )

  const recent = sessions.filter((s) => s.status === 'done').slice(0, 3)
  const recentIds = recent.map((s) => s.id)

  // Two scoped reads rather than a lifetime of sets: this week's totals, and the
  // handful of sessions actually shown below. Home is opened constantly, and
  // after a couple of years of training the unbounded query is thousands of rows.
  const weekSets =
    useLiveQuery(
      () =>
        profileId
          ? listCompletedSetsSince(profileId, startOfWeek(new Date(), { weekStartsOn: 6 }).getTime())
          : [],
      [profileId]
    ) ?? []
  const recentSets =
    useLiveQuery(
      () => (recentIds.length ? listSetsForSessions(recentIds) : []),
      [recentIds.join(',')]
    ) ?? []

  const lastBackupAt = useAppStore((state) => state.lastBackupAt)
  const backupNudgeSnoozedAt = useAppStore((state) => state.backupNudgeSnoozedAt)
  const snoozeBackupNudge = useAppStore((state) => state.snoozeBackupNudge)

  if (!profile) return null

  const streak = weekStreak(sessions)
  const doneThisWeek = sessionsThisWeek(sessions)
  const weeklyTarget = profile.weeklyWorkoutTarget ?? 0

  // Gentle, not nagging: only after a real gap, and never while a workout is
  // actually in progress.
  const daysSinceLast = recent[0]
    ? Math.floor((Date.now() - recent[0].startedAt) / 86_400_000)
    : 0
  const showInactiveNudge = !active && recent.length > 0 && daysSinceLast >= 4

  // Data lives on this phone only. Once there is something worth losing, nudge
  // until a backup exists — then again when the last one is three weeks old.
  const completedCount = sessions.filter((s) => s.status === 'done').length
  const backupStale = !lastBackupAt || Date.now() - lastBackupAt > 21 * 86_400_000
  const backupSnoozed =
    backupNudgeSnoozedAt !== null && Date.now() - backupNudgeSnoozedAt < 14 * 86_400_000
  const showBackupNudge = completedCount >= 5 && backupStale && !backupSnoozed

  const begin = async (routineId?: string) => {
    // Started from a tap, so this is a valid moment to unlock audio for the
    // rest-timer chime.
    unlockAudio()
    const existing = await getActiveSession(profile.id)
    // Never orphan a workout in progress — resume it rather than starting a second.
    const sessionId = existing?.id ?? (await startSession(profile.id, routineId))
    navigate(`/workout/${sessionId}`)
  }

  const startProgramDay = async (dayIndex: number) => {
    if (!program) return
    const day = program.days[dayIndex]
    if (!day) return
    unlockAudio()
    const existing = await getActiveSession(profile.id)
    const sessionId =
      existing?.id ??
      (await startSession(profile.id, day.routineId, {
        id: program.id,
        week: programProgress(program, sessions).week,
        dayIndex,
      }))
    navigate(`/workout/${sessionId}`)
  }

  const repeat = async (sourceId: string) => {
    unlockAudio()
    const existing = await getActiveSession(profile.id)
    const sessionId = existing?.id ?? (await repeatSession(profile.id, sourceId))
    navigate(`/workout/${sessionId}`)
  }

  return (
    <div className="pb-6">
      <PageHeader
        title={t('home.greeting', { name: profile.name })}
        subtitle={formatShortDay(Date.now(), locale)}
        large
      />

      {active && (
        <Reveal className="px-5 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/workout/${active.id}`)}
            className="flex w-full animate-pulse-brand items-center gap-3 rounded-2xl
                       bg-brand-gradient p-4 text-start text-ink-950 active:scale-[0.99]
                       transition-transform"
          >
            <Play size={20} className="shrink-0" fill="currentColor" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t('home.activeTitle')}</p>
              <p className="text-xs opacity-80">
                {t('home.activeBody', { time: formatTimeAgo(active.startedAt, locale) })}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold">{t('home.resume')}</span>
          </button>
        </Reveal>
      )}

      {program && (
        <Reveal index={1} className="px-5 pt-4">
          <TodayPlanCard
            program={program}
            progress={programProgress(program, sessions)}
            onStartDay={startProgramDay}
          />
        </Reveal>
      )}

      <Reveal index={2} className="grid grid-cols-3 gap-2.5 px-5 pt-4">
        <StatCard icon={Flame} label={t('home.streak')} value={String(streak)} />
        <StatCard
          icon={CalendarDays}
          label={t('home.thisWeek')}
          value={weeklyTarget > 0 ? `${doneThisWeek}/${weeklyTarget}` : String(doneThisWeek)}
          hint={t('home.workouts')}
        />
        <StatCard
          icon={Weight}
          label={t('common.volume')}
          // Compact from the first thousand, unit in the hint — the tile is a
          // third of a phone wide and can't hold both.
          value={volumeValue(volumeThisWeek(sessions, weekSets), units, { compact: true })}
          hint={unitLabel(units, locale)}
        />
      </Reveal>

      {weeklyTarget > 0 && (
        <Reveal index={3} className="px-5 pt-3">
          <div
            className={`card flex items-center gap-4 p-4 ${
              doneThisWeek >= weeklyTarget ? 'border-green-500/40' : ''
            }`}
          >
            <ProgressRing
              value={doneThisWeek / weeklyTarget}
              label={`${doneThisWeek}/${weeklyTarget}`}
              size={52}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-50">
                {doneThisWeek >= weeklyTarget ? t('home.goalMet') : t('home.weeklyGoal')}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-300">
                {doneThisWeek >= weeklyTarget
                  ? t('home.goalMetHint')
                  : t('home.goalHint', { count: weeklyTarget - doneThisWeek })}
              </p>
            </div>
          </div>
        </Reveal>
      )}

      {showInactiveNudge && (
        <Reveal index={3} className="px-5 pt-3">
          <div className="card flex items-center gap-3 border-amber-500/30 p-4">
            <CalendarClock size={20} className="shrink-0 text-amber-400" />
            <p className="min-w-0 flex-1 text-sm text-ink-100">
              {t('home.inactiveNudge', { days: daysSinceLast })}
            </p>
          </div>
        </Reveal>
      )}

      {showBackupNudge && (
        <Reveal index={3} className="px-5 pt-3">
          <div className="card flex items-center gap-3 border-amber-500/30 p-4">
            <ShieldAlert size={20} className="shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-50">{t('home.backupNudge')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-300">
                {t('home.backupNudgeHint')}
              </p>
              <div className="mt-2 flex gap-4">
                <Link to="/settings" className="text-xs font-semibold text-brand-500">
                  {t('settings.export')}
                </Link>
                <button
                  type="button"
                  onClick={snoozeBackupNudge}
                  className="text-xs font-medium text-ink-300"
                >
                  {t('common.later')}
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal index={4} className="px-5 pt-3">
        <WeightCard />
      </Reveal>

      <section className="px-5 pt-5">
        <InstallHint />
      </section>

      <Reveal index={4} className="px-5 pt-5">
        <h2 className="section-title mb-3">{t('home.quickStart')}</h2>

        {routines.length === 0 ? (
          <p className="mb-3 text-sm text-ink-300">{t('home.noRoutines')}</p>
        ) : (
          <ul className="mb-3 space-y-2">
            {routines.map((routine) => (
              <li key={routine.id}>
                <button
                  type="button"
                  onClick={() => begin(routine.id)}
                  className="card flex w-full items-center gap-3 p-4 text-start active:bg-ink-600"
                >
                  <div className="rounded-xl bg-ink-600 p-2.5 text-brand-500">
                    <Dumbbell size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-50">
                      {routineName(routine, locale)}
                    </p>
                    <p className="text-xs text-ink-300">
                      {t('routines.exerciseCount', { count: routine.items.length })}
                    </p>
                  </div>
                  <Play size={18} className="shrink-0 text-brand-500" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          {recent.length > 0 && (
            <button
              type="button"
              onClick={() => repeat(recent[0].id)}
              className="card flex w-full items-center gap-3 p-4 text-start active:bg-ink-600"
            >
              <div className="rounded-xl bg-ink-600 p-2.5 text-brand-500">
                <RotateCcw size={18} className="rtl-flip" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-50">{t('home.repeat')}</p>
                <p className="truncate text-xs text-ink-300">
                  {(locale === 'ar' ? recent[0].titleAr : recent[0].titleEn) ||
                    t('workout.untitled')}{' '}
                  · {formatTimeAgo(recent[0].startedAt, locale)}
                </p>
              </div>
              <Play size={18} className="shrink-0 text-brand-500" />
            </button>
          )}

          <button
            type="button"
            onClick={() => begin()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border
                       border-dashed border-ink-400 py-3.5 text-sm font-medium
                       text-brand-500 active:bg-ink-700"
          >
            <Plus size={18} />
            {t('home.startEmpty')}
          </button>
        </div>
      </Reveal>

      <Reveal index={5} className="px-5 pt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">{t('home.recent')}</h2>
          {recent.length > 0 && (
            <Link to="/history" className="text-xs font-medium text-brand-500">
              {t('common.viewAll')}
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title={t('home.noWorkouts')}
            body={t('home.noWorkoutsHint')}
          />
        ) : (
          <ul className="space-y-2">
            {recent.map((session) => (
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
                    <p className="text-xs text-ink-300">
                      {formatTimeAgo(session.startedAt, locale)}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-sm font-semibold text-brand-500">
                    {/* volumeOf, not a raw sum — warm-ups and timed work must
                        not read as tonnage here when they don't anywhere else. */}
                    {formatVolume(
                      volumeOf(
                        recentSets.filter((s) => s.sessionId === session.id && s.done === 1)
                      ),
                      units,
                      locale,
                      { compact: true }
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
    </div>
  )
}
