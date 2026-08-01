import { useLiveQuery } from 'dexie-react-hooks'
import { startOfWeek } from 'date-fns'
import {
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  Dumbbell,
  Flame,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Weight,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import InstallHint from '../components/InstallHint'
import PageHeader from '../components/PageHeader'
import ProgressRing from '../components/ProgressRing'
import Reveal from '../components/Reveal'
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
import { briefPath } from '../lib/routes'
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
    // Resuming also skips the brief: you are already past the point of deciding
    // what to load.
    if (existing) {
      navigate(`/workout/${existing.id}`)
      return
    }
    // A routine has a plan and a history worth reading before the first set.
    // Starting from nothing has neither, so it goes straight in.
    if (routineId) {
      navigate(`/routines/${routineId}/start`)
      return
    }
    navigate(`/workout/${await startSession(profile.id)}`)
  }

  const startProgramDay = async (dayIndex: number) => {
    if (!program) return
    const day = program.days[dayIndex]
    if (!day) return
    unlockAudio()
    const existing = await getActiveSession(profile.id)
    if (existing) {
      navigate(`/workout/${existing.id}`)
      return
    }
    // The program context rides along in the query string, so a session started
    // from the brief still counts against the right week and day.
    navigate(briefPath(day.routineId, program.id, programProgress(program, sessions).week, dayIndex))
  }

  const repeat = async (sourceId: string) => {
    unlockAudio()
    const existing = await getActiveSession(profile.id)
    const sessionId = existing?.id ?? (await repeatSession(profile.id, sourceId))
    navigate(`/workout/${sessionId}`)
  }

  // Exactly one hero per screen, picked in the order the question is actually
  // urgent: a workout already running beats the plan, the plan beats a routine
  // you might pick, and a routine beats an empty start. Everything not chosen
  // drops into the list below at list weight — which is what stopped the home
  // screen being four identical cards with no answer among them.
  const heroRoutine = !active && !program ? routines[0] : undefined
  const listRoutines_ = heroRoutine ? routines.slice(1) : routines

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
            className="flex w-full animate-pulse-brand items-center gap-3 rounded-[20px]
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
                {t('home.activeBody', { time: formatTimeAgo(active.startedAt, locale) })}
              </p>
            </div>
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

      {heroRoutine && (
        <Reveal index={1} className="px-5 pt-4">
          <button
            type="button"
            onClick={() => begin(heroRoutine.id)}
            className="card-hero flex w-full items-start gap-3 p-4 text-start active:bg-ink-50/[0.04]"
          >
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-brand-500">{t('home.nextUp')}</p>
              <p className="mt-1.5 truncate text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink-50">
                {routineName(heroRoutine, locale)}
              </p>
              <p className="mt-1 truncate text-xs text-ink-300">
                {t('routines.exerciseCount', { count: heroRoutine.items.length })}
              </p>
            </div>
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full
                         bg-brand-gradient text-ink-950 shadow-brand"
            >
              <Play size={20} fill="currentColor" className="ms-0.5 rtl-flip" />
            </span>
          </button>
        </Reveal>
      )}

      {/* One card, hairline rows. Four separate cards each 68px tall with a
          20px icon and two short lines was a lot of scroll for very little —
          a list of choices should look like a list, not like four decisions. */}
      <Reveal index={2} className="px-5 pt-6">
        <h2 className="section-title mb-2.5">{t('home.quickStart')}</h2>

        <div className="card divide-y divide-ink-500/30 overflow-hidden">
          {listRoutines_.length === 0 && !heroRoutine && (
            <p className="px-4 py-3.5 text-sm text-ink-300">{t('home.noRoutines')}</p>
          )}

          {listRoutines_.map((routine) => (
            <QuickRow
              key={routine.id}
              icon={Dumbbell}
              title={routineName(routine, locale)}
              meta={t('routines.exerciseCount', { count: routine.items.length })}
              onClick={() => begin(routine.id)}
            />
          ))}

          {recent.length > 0 && (
            <QuickRow
              icon={RotateCcw}
              title={t('home.repeat')}
              meta={`${
                (locale === 'ar' ? recent[0].titleAr : recent[0].titleEn) || t('workout.untitled')
              } · ${formatTimeAgo(recent[0].startedAt, locale)}`}
              onClick={() => repeat(recent[0].id)}
            />
          )}

          <QuickRow icon={Plus} title={t('home.startEmpty')} muted onClick={() => begin()} />
        </div>
      </Reveal>

      {/* One object, three readings — the three floating tiles read as three
          unrelated facts, and at a third of a phone wide none of them had room
          to say what it was. */}
      <Reveal index={3} className="px-5 pt-3">
        <div className="card flex divide-x divide-ink-500/30">
          <Stat icon={Flame} label={t('home.streak')} value={String(streak)} />
          <Stat
            icon={CalendarDays}
            label={t('home.thisWeek')}
            value={String(doneThisWeek)}
            hint={t('home.workouts')}
          />
          <Stat
            icon={Weight}
            label={t('common.volume')}
            // Compact from the first thousand, unit in the hint — the column is
            // a third of a phone wide and can't hold both.
            value={volumeValue(volumeThisWeek(sessions, weekSets), units, { compact: true })}
            hint={unitLabel(units, locale)}
          />
        </div>
      </Reveal>

      {weeklyTarget > 0 && (
        <Reveal index={4} className="px-5 pt-3">
          <div
            className={`card flex items-center gap-4 p-4 ${
              doneThisWeek >= weeklyTarget ? 'border-brand-500/40' : ''
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
        <Reveal index={5} className="px-5 pt-3">
          <div className="card flex items-center gap-3 border-flame-500/30 p-4">
            <CalendarClock size={20} className="shrink-0 text-flame-400" />
            <p className="min-w-0 flex-1 text-sm text-ink-100">
              {t('home.inactiveNudge', { days: daysSinceLast })}
            </p>
          </div>
        </Reveal>
      )}

      {showBackupNudge && (
        <Reveal index={6} className="px-5 pt-3">
          <div className="card flex items-center gap-3 border-flame-500/30 p-4">
            <ShieldAlert size={20} className="shrink-0 text-flame-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-50">{t('home.backupNudge')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-300">
                {t('home.backupNudgeHint')}
              </p>
              {/* -mx-2 keeps the labels optically flush with the text above
                  while the padding gives both a 36px-tall target — "Later" was
                  23×16, which is a miss waiting to happen. */}
              <div className="-mx-2 mt-1 flex gap-2">
                <Link
                  to="/settings"
                  className="rounded-lg px-2 py-2.5 text-xs font-semibold text-brand-500 active:bg-ink-600"
                >
                  {t('settings.export')}
                </Link>
                <button
                  type="button"
                  onClick={snoozeBackupNudge}
                  className="rounded-lg px-2 py-2.5 text-xs font-medium text-ink-300 active:bg-ink-600"
                >
                  {t('common.later')}
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal index={7} className="px-5 pt-3">
        <WeightCard />
      </Reveal>

      <section className="px-5 pt-5">
        <InstallHint />
      </section>

      <Reveal index={8} className="px-5 pt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">{t('home.recent')}</h2>
          {recent.length > 0 && (
            <Link
              to="/history"
              className="-me-2 rounded-lg px-2 py-2.5 text-xs font-medium text-brand-500 active:bg-ink-600"
            >
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
          <ul className="card divide-y divide-ink-500/30 overflow-hidden">
            {recent.map((session) => (
              <li key={session.id}>
                <Link
                  to={`/history/${session.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-ink-600/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-50">
                      {(locale === 'ar' ? session.titleAr : session.titleEn) ||
                        t('workout.untitled')}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {formatTimeAgo(session.startedAt, locale)}
                    </p>
                  </div>
                  <span className="tabular font-numeric shrink-0 text-sm font-bold text-ink-100">
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

/**
 * One line of the quick-start list. Deliberately not a card: these are choices
 * inside one decision, and giving each its own surface made the screen read as
 * four unrelated offers with nothing to pick between them.
 */
function QuickRow({
  icon: Icon,
  title,
  meta,
  muted,
  onClick,
}: {
  icon: LucideIcon
  title: string
  meta?: string
  /** The escape hatch at the bottom of the list — present, not promoted. */
  muted?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-start active:bg-ink-600/60"
    >
      <Icon
        size={17}
        className={`shrink-0 rtl-flip ${muted ? 'text-ink-400' : 'text-brand-500'}`}
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm font-semibold ${muted ? 'text-ink-200' : 'text-ink-50'}`}
        >
          {title}
        </span>
        {meta && <span className="mt-0.5 block truncate text-[11px] text-ink-400">{meta}</span>}
      </span>
      <ChevronLeft size={16} className="shrink-0 text-ink-500 ltr:rotate-180" />
    </button>
  )
}

/** One reading in the week's strip. Three of these share a single card. */
function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="min-w-0 flex-1 px-3 py-3.5 text-center">
      <Icon size={13} strokeWidth={2.2} className="mx-auto text-ink-400" />
      <p className="num-lg mt-1.5 truncate text-ink-50">{value}</p>
      {/* The label wraps rather than clips: Arabic "أسابيع متتالية" came out as
          "أسابيع متت…", which names nothing. */}
      <p className="mt-1 text-[10px] font-medium leading-tight text-ink-300">{label}</p>
      {hint && <p className="text-[10px] leading-tight text-ink-500">{hint}</p>}
    </div>
  )
}
