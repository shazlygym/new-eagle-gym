import { useLiveQuery } from 'dexie-react-hooks'
import {
  Calculator,
  Check,
  Flame,
  History,
  Link2,
  Minus,
  MoreHorizontal,
  Play,
  Plus,
  Repeat,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { e1rm } from '../db/queries'
import {
  addSet,
  addWarmupSets,
  deleteSet,
  getExercise,
  listSetsForExercise,
  logDurationSet,
  recentSessionsForExercise,
  removeSessionExercise,
  reorderSessionExercise,
  setSetDone,
  toggleSuperset,
  updateSet,
} from '../db/repository'
import type { SessionExercise, SetEntry, Units } from '../db/schema'
import { exerciseName, useT } from '../i18n'
import {
  formatClock,
  formatNumber,
  formatVolume,
  ltrIsolate,
  toDisplayWeight,
  toStoredWeight,
  unitLabel,
} from '../lib/format'
import { SUGGESTION_REASON, suggestNextLoad } from '../lib/progression'
import { formatRepRange } from '../lib/repRange'
import {
  SET_TYPE_BADGE,
  SET_TYPE_LABEL,
  SET_TYPE_STYLE,
  countsAsWork,
  nextSetType,
} from '../lib/setTypes'
import { useExerciseTimerStore } from '../lib/useClock'
import { warmupSets } from '../lib/warmup'
import ConfirmDialog from './ConfirmDialog'
import ExerciseActionsSheet from './ExerciseActionsSheet'
import DurationTimer from './DurationTimer'
import ExerciseHistorySheet from './ExerciseHistorySheet'
import NumberField from './NumberField'
import PlateCalculatorSheet from './PlateCalculatorSheet'
import RestSheet from './RestSheet'

interface Props {
  sessionExercise: SessionExercise
  sets: SetEntry[]
  units: Units
  profileId: string
  /** Called when a set is ticked, so the page can kick off the rest timer. */
  onSetCompleted: (restSeconds: number) => void
  /** Called when the member changes how long the rest countdown should run. */
  onRestChange?: (seconds: number, applyToAll: boolean) => void
  /** Called when a completed set beats every previous session — a live PR. */
  onPr?: (event: { exerciseName: string; display: string }) => void
  isFirst: boolean
  isLast: boolean
  /** True when the next exercise is in the same superset group as this one. */
  supersetContinues?: boolean
  trackRpe?: boolean
  /** The active program's weekly jump, when this session belongs to one. */
  progressionStepKg?: number
  /** Edit mode on a past workout: no rest timer, no progression nudges. */
  readOnlyContext?: boolean
}

export default function WorkoutExerciseCard({
  sessionExercise,
  sets,
  units,
  profileId,
  onSetCompleted,
  onRestChange,
  onPr,
  isFirst,
  isLast,
  supersetContinues,
  trackRpe = false,
  progressionStepKg,
  readOnlyContext = false,
}: Props) {
  const { t, locale } = useT()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [platesOpen, setPlatesOpen] = useState(false)
  const [restOpen, setRestOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  // The best value already celebrated this session, so a heavier set later in
  // the same workout celebrates again but re-ticking the same set doesn't.
  const celebrated = useRef(0)

  const exercise = useLiveQuery(
    () => getExercise(sessionExercise.exerciseId),
    [sessionExercise.exerciseId]
  )
  const recent =
    useLiveQuery(
      () =>
        recentSessionsForExercise(profileId, sessionExercise.exerciseId, 2, sessionExercise.sessionId),
      [profileId, sessionExercise.exerciseId, sessionExercise.sessionId]
    ) ?? []

  const previous = recent[0] ?? []
  const ordered = [...sets].sort((a, b) => a.setNumber - b.setNumber)
  const inSuperset = Boolean(sessionExercise.supersetGroup)
  const isTimed = exercise?.tracking === 'duration'

  const suggestion =
    readOnlyContext || isTimed || !sessionExercise.targetReps
      ? null
      : suggestNextLoad(
          recent,
          {
            reps: sessionExercise.targetReps,
            repsMax: sessionExercise.targetRepsMax,
            sets: sessionExercise.targetSets ?? 1,
          },
          units,
          { stepKg: progressionStepKg }
        )

  const topWeight = ordered.reduce((max, entry) => Math.max(max, entry.weight), 0)

  // How far through the exercise you are. The plan's set count wins when there
  // is one, so an exercise written as 3 sets reads "1/3" from the first tick
  // rather than "1/1" until you remember to add the next row.
  const workingSets = ordered.filter((entry) => countsAsWork(entry.setType))
  const doneSets = workingSets.filter((entry) => entry.done === 1).length
  const totalSets = Math.max(sessionExercise.targetSets ?? 0, workingSets.length)
  const allDone = totalSets > 0 && doneSets >= totalSets
  const volume = workingSets.reduce(
    (sum, entry) => (entry.done === 1 ? sum + entry.weight * entry.reps : sum),
    0
  )

  /**
   * What an empty box should take from last session when the row is ticked.
   *
   * The last session's numbers sit in the empty boxes as grey placeholders, so
   * ticking a row you never typed into means "same as last time" — the most
   * common set there is. Taking the placeholder at its word is what makes it a
   * real default instead of a hint: without this the set would save as 0 × 0
   * and read as a broken tick. A box you *did* type into is never touched.
   */
  const adoptPrior = (entry: SetEntry, prior: SetEntry) => {
    const patch: Partial<SetEntry> = {}
    if (entry.weight <= 0 && prior.weight > 0) patch.weight = prior.weight
    if (isTimed) {
      if (!entry.durationSeconds && prior.durationSeconds)
        patch.durationSeconds = prior.durationSeconds
    } else if (entry.reps <= 0 && prior.reps > 0) {
      patch.reps = prior.reps
    }
    return patch
  }

  const toggleDone = async (entry: SetEntry, prior?: SetEntry) => {
    const nowDone = entry.done === 0
    // A small physical tick on Android; Safari has no vibration API.
    if (nowDone) navigator.vibrate?.(30)

    let saved = entry
    if (nowDone && prior) {
      const patch = adoptPrior(entry, prior)
      if (Object.keys(patch).length > 0) {
        await updateSet(entry.id, patch)
        saved = { ...entry, ...patch }
      }
    }

    await setSetDone(entry.id, nowDone)
    // Inside a superset you move straight to the next exercise, so rest only
    // starts once the group is finished.
    if (nowDone && !supersetContinues) onSetCompleted(sessionExercise.restSeconds)
    if (nowDone && countsAsWork(saved.setType)) void celebrateIfRecord(saved)
  }

  /** One tap on last session's numbers copies them into the row beside them. */
  const copyPrevious = (entry: SetEntry, prior: SetEntry) =>
    updateSet(
      entry.id,
      isTimed
        ? { durationSeconds: prior.durationSeconds ?? 0, reps: 0 }
        : { weight: prior.weight, reps: prior.reps }
    )

  /**
   * Finish the exercise the way last session went, in one tap.
   *
   * Row by row that is eight taps for four sets, and on the days you match last
   * week — most days — not one of them decides anything. Anything you already
   * typed stands: only the empty boxes take last session's number, exactly as a
   * single tick would, so this is "tick the rest of them for me" and never an
   * overwrite of a weight you chose today.
   *
   * No rest timer either: this is a backfill of work already done, not the
   * moment you racked the bar, and a countdown here would be a lie about when.
   */
  const repeatCount = readOnlyContext
    ? 0
    : workingSets.filter((entry, index) => entry.done === 0 && previous[index]).length

  const repeatLast = async () => {
    const filled: SetEntry[] = []
    for (const [index, entry] of workingSets.entries()) {
      const prior = previous[index]
      if (entry.done === 1 || !prior) continue
      const patch = adoptPrior(entry, prior)
      if (Object.keys(patch).length > 0) await updateSet(entry.id, patch)
      await setSetDone(entry.id, true)
      filled.push({ ...entry, ...patch })
    }
    if (filled.length === 0) return
    navigator.vibrate?.(30)
    // Every filled set is offered for a record; the check keeps its own high
    // water mark, so a four-set repeat still raises at most one celebration.
    for (const entry of filled) await celebrateIfRecord(entry)
  }

  /**
   * A live PR: this set's estimated 1RM beats every previous session. Only
   * checked against real history — the first time an exercise is ever done,
   * everything would be a "record", which celebrates nothing.
   */
  const celebrateIfRecord = async (entry: SetEntry) => {
    if (!onPr || readOnlyContext || isTimed) return
    if (entry.weight <= 0 || entry.reps <= 0) return
    const history = await listSetsForExercise(profileId, sessionExercise.exerciseId)
    const prior = history.filter((s) => s.sessionId !== sessionExercise.sessionId)
    if (prior.length === 0) return
    const priorBest = Math.max(...prior.map((s) => e1rm(s.weight, s.reps)))
    const value = e1rm(entry.weight, entry.reps)
    if (value <= priorBest || value <= celebrated.current) return
    celebrated.current = value
    onPr({
      exerciseName: exerciseName(exercise, locale),
      display: `${formatNumber(toDisplayWeight(entry.weight, units))} ${unitLabel(units, locale)} × ${entry.reps}`,
    })
  }

  const applySuggestion = async () => {
    if (!suggestion) return
    const working = ordered.filter((entry) => entry.setType !== 'warmup' && entry.done === 0)
    await Promise.all(
      working.map((entry) => updateSet(entry.id, { weight: suggestion.weight }))
    )
  }

  const addWarmup = async () => {
    const working = ordered.find((entry) => entry.setType !== 'warmup')
    const target = working?.weight || suggestion?.weight || topWeight
    await addWarmupSets(
      sessionExercise.id,
      warmupSets(target, units, exercise?.equipment === 'barbell')
    )
  }

  // RPE adds a sixth column; without it the two number fields get more room.
  // The weight and rep boxes are the ones being typed into with one thumb, so
  // every millimetre the fixed columns give up goes to them — except the tick,
  // which is the most-tapped control in the app and gets its full 44px back.
  const gridClass = trackRpe
    ? 'grid-cols-[1.75rem_3rem_1fr_1fr_2.25rem_2.75rem]'
    : 'grid-cols-[1.75rem_4rem_1fr_1fr_2.75rem]'

  const finishTimedSet = async (seconds: number) => {
    if (seconds <= 0) return
    await logDurationSet(sessionExercise.id, seconds)
    if (!supersetContinues) onSetCompleted(sessionExercise.restSeconds)

    // Longest-hold PR — duration work has no e1rm to compare.
    if (onPr && !readOnlyContext) {
      const history = await listSetsForExercise(profileId, sessionExercise.exerciseId)
      const prior = history.filter((s) => s.sessionId !== sessionExercise.sessionId)
      const priorBest = Math.max(0, ...prior.map((s) => s.durationSeconds ?? 0))
      if (prior.length > 0 && seconds > priorBest && seconds > celebrated.current) {
        celebrated.current = seconds
        onPr({ exerciseName: exerciseName(exercise, locale), display: formatClock(seconds) })
      }
    }
  }

  return (
    // Superset members stay as separate cards — the list has a gap between them,
    // so merging their borders would just look broken. A cyan edge and a chip
    // carry the grouping instead.
    <article
      className={`card overflow-hidden ${
        inSuperset ? 'border-aqua-500/40' : allDone ? 'border-brand-500/35' : ''
      }`}
    >
      {/* How much of this exercise is behind you, read at a glance from the top
          of the card. Scrolling a workout is mostly scanning for the next thing
          that isn't finished, and a card whose only "done" signal was inside
          the rows made that a reading exercise. It fills from the leading edge,
          so it runs right-to-left in Arabic without being told to. */}
      {totalSets > 0 && (
        <div className="h-[3px] w-full bg-ink-600/60" aria-hidden>
          <div
            className="h-full rounded-e-full bg-brand-gradient transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(100, (doneSets / totalSets) * 100)}%` }}
          />
        </div>
      )}

      <header className="flex items-center gap-2 border-b border-ink-500/50 px-4 py-3">
        {/* The name is a button: tapping it answers "what did I lift last time?"
            without leaving the workout. */}
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="min-w-0 flex-1 text-start active:opacity-60"
        >
          <h3 className="truncate font-semibold text-ink-50">
            {exerciseName(exercise, locale)}
            <History size={13} className="ms-1.5 inline shrink-0 align-baseline text-ink-300" />
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-ink-300">
            {inSuperset && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-aqua-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-aqua-300">
                <Link2 size={10} />
                {t('workout.superset')}
              </span>
            )}
            {sessionExercise.targetSets && sessionExercise.targetReps
              ? t('workout.target', {
                  // One isolated expression rather than two placeholders: in
                  // Arabic the ×, the dash and each number are separate runs,
                  // and "3×6–10" came out laid backwards as "10–6×3".
                  value: ltrIsolate(
                    `${sessionExercise.targetSets}×${
                      isTimed
                        ? formatClock(sessionExercise.targetReps)
                        : formatRepRange(
                            sessionExercise.targetReps,
                            sessionExercise.targetRepsMax
                          )
                    }`
                  ),
                })
              : null}
            {totalSets > 0 && (
              <span
                className={`tabular shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  allDone ? 'bg-brand-500/15 text-brand-400' : 'bg-ink-600 text-ink-200'
                }`}
              >
                {ltrIsolate(`${doneSets}/${totalSets}`)}
              </span>
            )}
          </p>
        </button>

        {/* Only two icons left beside the name, both at a real 44pt target:
            the form video and the plate maths. Reordering, superset linking
            and removal moved into the ⋯ sheet — rare actions that were taking
            up three of the five slots in this row. */}
        {exercise?.videoUrl && (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t('exercises.watch')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                       text-danger-400 active:bg-ink-600"
          >
            <Play size={18} fill="currentColor" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setPlatesOpen(true)}
          aria-label={t('plates.title')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                     text-ink-300 active:bg-ink-600"
        >
          <Calculator size={18} />
        </button>
        <button
          type="button"
          onClick={() => setActionsOpen(true)}
          aria-label={t('workout.exerciseActions')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                     text-ink-300 active:bg-ink-600"
        >
          <MoreHorizontal size={20} />
        </button>
      </header>

      {isTimed && !readOnlyContext && (
        <DurationTimer
          sessionExerciseId={sessionExercise.id}
          target={sessionExercise.targetReps}
          onFinish={finishTimedSet}
        />
      )}

      {suggestion && suggestion.kind !== 'hold' && (
        <button
          type="button"
          onClick={applySuggestion}
          className="flex w-full items-center gap-2 border-b border-ink-500/40 bg-brand-soft
                     px-4 py-2.5 text-start active:bg-brand-500/15"
        >
          <TrendingUp size={14} className="shrink-0 text-brand-500" />
          <span className="min-w-0 flex-1 text-xs text-ink-100">
            {t(SUGGESTION_REASON[suggestion.reason])}
          </span>
          {/* The weight reads as a chip rather than as more text, because it is
              what the tap does: put this number in every set below. */}
          <span className="tabular shrink-0 rounded-lg bg-brand-500 px-2 py-1 text-[11px] font-bold text-ink-950">
            {formatNumber(toDisplayWeight(suggestion.weight, units))} {unitLabel(units, locale)}
          </span>
        </button>
      )}

      <div className="px-3 py-2">
        <div
          className={`grid ${gridClass} items-center gap-1.5 px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-300`}
        >
          <span className="text-center">#</span>
          <span>{t('workout.previous')}</span>
          <span className="text-center">{unitLabel(units, locale)}</span>
          <span className="text-center">{isTimed ? t('common.time') : t('common.reps')}</span>
          {trackRpe && <span className="text-center">{t('workout.rpe')}</span>}
          <span />
        </div>

        <ul className="space-y-1.5">
          {ordered.map((entry, index) => {
            // "Previous" aligns working set to working set — a warm-up row has
            // no counterpart in last week's log.
            const workingIndex = ordered
              .slice(0, index + 1)
              .filter((s) => s.setType !== 'warmup').length - 1
            const prior = entry.setType === 'warmup' ? undefined : previous[workingIndex]
            const badge = SET_TYPE_BADGE[entry.setType]

            return (
              <li
                key={entry.id}
                // A ring rather than a leading rail: box-shadow has no logical
                // form, so a rail would sit on the left in Arabic too, and an
                // actual border would shift every column by 3px the moment a
                // set was ticked.
                className={`grid ${gridClass} items-center gap-1.5 rounded-xl px-1 py-1
                            ring-1 ring-inset transition-colors ${
                              entry.done
                                ? 'bg-brand-500/[0.07] ring-brand-500/25'
                                : 'ring-transparent'
                            }`}
              >
                {/* Tapping the number walks through working → warm-up → drop →
                    failure, which is faster mid-set than opening a menu. */}
                <button
                  type="button"
                  onClick={() => updateSet(entry.id, { setType: nextSetType(entry.setType) })}
                  title={t(SET_TYPE_LABEL[entry.setType])}
                  // self-stretch, not a fixed h-8: the column is only 28px wide
                  // and cannot grow without stealing from the weight and reps
                  // inputs, so the target grows the other way and fills the
                  // row's 50px instead of floating at 32 in the middle of it.
                  className={`tabular min-h-8 self-stretch rounded-lg text-xs font-bold ${SET_TYPE_STYLE[entry.setType]}`}
                >
                  {badge ?? entry.setNumber}
                </button>

                {/* Last session's numbers, and a button: tapping them copies
                    them into this row. The column used to be four characters of
                    grey text you could only read — which is the answer to "what
                    did I do last time?" but not to "log that again", the thing
                    you actually want most sets of most exercises.

                    Isolated for the same reason as the target line above: bare
                    in Arabic "77.5×10" lays out as "10×77.5", and the sheet and
                    the pre-workout brief already print the isolated form — the
                    same set read two different ways on two screens. */}
                <button
                  type="button"
                  disabled={!prior}
                  onClick={() => prior && void copyPrevious(entry, prior)}
                  aria-label={prior ? t('workout.copyPrevious') : undefined}
                  className="tabular min-h-8 self-stretch truncate rounded-lg px-1 text-start
                             text-xs text-ink-300 transition-colors enabled:active:bg-ink-600
                             enabled:active:text-ink-50 disabled:text-ink-400"
                >
                  {!prior
                    ? t('common.empty')
                    : isTimed
                      ? formatClock(prior.durationSeconds ?? 0)
                      : ltrIsolate(
                          `${formatNumber(toDisplayWeight(prior.weight, units))}×${prior.reps}`
                        )}
                </button>

                {/* The placeholders are last session's numbers, not "0". An
                    empty row therefore already reads as the set you are about
                    to do, and `toggleDone` commits exactly what is showing. */}
                <NumberField
                  variant="cell"
                  done={entry.done === 1}
                  ariaLabel={unitLabel(units, locale)}
                  value={toDisplayWeight(entry.weight, units)}
                  onChange={(value) => updateSet(entry.id, { weight: toStoredWeight(value, units) })}
                  placeholder={
                    prior ? formatNumber(toDisplayWeight(prior.weight, units)) : '0'
                  }
                  step={2.5}
                />
                {isTimed ? (
                  // Editable in seconds so a mistimed hold can be corrected;
                  // the label above the column says what the unit is.
                  <NumberField
                    variant="cell"
                    done={entry.done === 1}
                    ariaLabel={t('common.time')}
                    value={entry.durationSeconds ?? 0}
                    onChange={(value) =>
                      updateSet(entry.id, { durationSeconds: Math.round(value), reps: 0 })
                    }
                    placeholder={String(
                      prior?.durationSeconds ?? sessionExercise.targetReps ?? 0
                    )}
                    step={5}
                  />
                ) : (
                  <NumberField
                    variant="cell"
                    done={entry.done === 1}
                    ariaLabel={t('common.reps')}
                    value={entry.reps}
                    onChange={(value) => updateSet(entry.id, { reps: Math.round(value) })}
                    placeholder={String(prior?.reps ?? sessionExercise.targetReps ?? 0)}
                  />
                )}

                {trackRpe && (
                  <NumberField
                    variant="cell"
                    done={entry.done === 1}
                    ariaLabel={t('workout.rpe')}
                    value={entry.rpe ?? 0}
                    onChange={(value) =>
                      updateSet(entry.id, { rpe: value > 0 ? Math.min(10, value) : undefined })
                    }
                    placeholder="–"
                  />
                )}

                {/* 44px, the same floor `.icon-btn` documents. This is the
                    single most-tapped control in the app and it was the one
                    control still under it — missed at 36 while holding a bar,
                    it either ticks the row above or nothing at all. */}
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => toggleDone(entry, prior)}
                    aria-label={t('common.done')}
                    aria-pressed={entry.done === 1}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl
                                transition-transform active:scale-90
                                ${
                                  entry.done
                                    ? 'bg-brand-gradient text-ink-950 shadow-brand'
                                    : 'border border-ink-500/60 bg-ink-600 text-ink-300 active:bg-ink-500'
                                }`}
                  >
                    <Check size={18} strokeWidth={3} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        {/* What this exercise has actually put on the bar today. Sets ticked is
            effort; tonnage is work, and it is the number that tells you whether
            a session where you dropped the weight and added reps went forwards
            or backwards. Hidden until there is something to count. */}
        {volume > 0 && (
          <p className="mt-2 flex items-center justify-between px-1 text-[11px]">
            <span className="text-ink-400">{t('workout.volumeToday')}</span>
            <span className="tabular font-bold text-ink-100">
              {formatVolume(volume, units, locale, { compact: true })}
            </span>
          </p>
        )}

        {/* The day you match last week — which is most days — this is the whole
            exercise in one tap instead of eight. It is only offered while there
            is something to fill, so a finished exercise goes quiet again. */}
        {repeatCount > 0 && (
          <button
            type="button"
            onClick={() => void repeatLast()}
            className="btn-soft mt-2 flex w-full items-center gap-2.5 px-3 py-2.5 text-start"
          >
            <Repeat size={16} className="shrink-0 text-brand-500" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-ink-50">
                {t('workout.repeatLast')}
              </span>
              <span className="mt-0.5 block text-[11px] text-ink-300">
                {t('workout.repeatLastHint')}
              </span>
            </span>
            {/* How many rows the tap fills, as a figure rather than a sentence —
                Arabic agrees its plurals with the number and this i18n layer
                interpolates, so "1 مجموعات" is the sentence version's fate. */}
            <span className="tabular shrink-0 rounded-lg bg-ink-600 px-2 py-1 text-[11px] font-bold text-ink-100">
              {formatNumber(repeatCount)}
            </span>
          </button>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addSet(sessionExercise.id)}
            className="btn-soft flex flex-1 items-center justify-center gap-1.5 py-2.5
                       text-xs font-semibold"
          >
            <Plus size={15} />
            {t('workout.addSet')}
          </button>

          {/* The rest length lives on the card, not just in the routine editor:
              it is the number people want to change while standing at the rack,
              and it shows its current value so there is nothing to remember. */}
          {!readOnlyContext && onRestChange && (
            <button
              type="button"
              onClick={() => setRestOpen(true)}
              aria-label={t('workout.restLength')}
              className="btn-soft tabular flex items-center gap-1.5 px-3 py-2.5
                         text-xs font-semibold"
            >
              <Timer size={15} className="text-brand-400" />
              {sessionExercise.restSeconds > 0
                ? formatClock(sessionExercise.restSeconds)
                : t('workout.restOff')}
            </button>
          )}

          {!readOnlyContext && !isTimed && (
            <button
              type="button"
              onClick={addWarmup}
              aria-label={t('workout.addWarmup')}
              className="btn-soft px-3.5 text-aqua-300"
            >
              <Flame size={16} />
            </button>
          )}

          {/* Removes the last row, not the exercise — the exercise itself is
              removed from the ⋯ sheet, where the label says so. */}
          {ordered.length > 0 && (
            <button
              type="button"
              onClick={() => deleteSet(ordered[ordered.length - 1].id)}
              aria-label={t('workout.removeSet')}
              className="btn-soft px-3.5 text-ink-300"
            >
              <Minus size={16} />
            </button>
          )}
        </div>
      </div>

      <ExerciseActionsSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        isFirst={isFirst}
        isLast={isLast}
        inSuperset={inSuperset}
        onMove={(direction) => void reorderSessionExercise(sessionExercise.id, direction)}
        onToggleSuperset={() => void toggleSuperset(sessionExercise.id)}
        onRemove={() => setConfirmRemove(true)}
      />

      <ConfirmDialog
        open={confirmRemove}
        title={t('workout.removeExercise')}
        body={t('common.confirmDelete')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false)
          // A running duration timer owned by this exercise would otherwise
          // survive as an orphan and lock out every other Start button.
          const timer = useExerciseTimerStore.getState()
          if (timer.sessionExerciseId === sessionExercise.id) timer.cancel()
          void removeSessionExercise(sessionExercise.id)
        }}
      />

      {historyOpen && (
        <ExerciseHistorySheet
          open
          onClose={() => setHistoryOpen(false)}
          profileId={profileId}
          exerciseId={sessionExercise.exerciseId}
          units={units}
        />
      )}

      {onRestChange && (
        <RestSheet
          open={restOpen}
          seconds={sessionExercise.restSeconds}
          onClose={() => setRestOpen(false)}
          onSave={(seconds, applyToAll) => {
            onRestChange(seconds, applyToAll)
            setRestOpen(false)
          }}
        />
      )}

      {/* Mounted only while open so the sheet's internal state is seeded from
          the current weight each time. Kept mounted, useState would capture
          whatever the weight was when the card first rendered — normally zero. */}
      {platesOpen && (
        <PlateCalculatorSheet
          open
          onClose={() => setPlatesOpen(false)}
          units={units}
          initialTarget={toDisplayWeight(topWeight, units)}
        />
      )}
    </article>
  )
}
