import { useLiveQuery } from 'dexie-react-hooks'
import {
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  History,
  Link2,
  Play,
  Plus,
  Timer,
  Trash2,
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
import { formatClock, formatNumber, toDisplayWeight, toStoredWeight, unitLabel } from '../lib/format'
import { suggestNextLoad } from '../lib/progression'
import { SET_TYPE_BADGE, SET_TYPE_LABEL, SET_TYPE_STYLE, nextSetType } from '../lib/setTypes'
import { useExerciseTimerStore } from '../lib/useClock'
import { warmupSets } from '../lib/warmup'
import ConfirmDialog from './ConfirmDialog'
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
  readOnlyContext = false,
}: Props) {
  const { t, locale } = useT()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [platesOpen, setPlatesOpen] = useState(false)
  const [restOpen, setRestOpen] = useState(false)
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
          { reps: sessionExercise.targetReps, sets: sessionExercise.targetSets ?? 1 },
          units
        )

  const topWeight = ordered.reduce((max, entry) => Math.max(max, entry.weight), 0)

  const toggleDone = async (entry: SetEntry) => {
    const nowDone = entry.done === 0
    // A small physical tick on Android; Safari has no vibration API.
    if (nowDone) navigator.vibrate?.(30)
    await setSetDone(entry.id, nowDone)
    // Inside a superset you move straight to the next exercise, so rest only
    // starts once the group is finished.
    if (nowDone && !supersetContinues) onSetCompleted(sessionExercise.restSeconds)
    if (nowDone && entry.setType !== 'warmup') void celebrateIfRecord(entry)
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
  const gridClass = trackRpe
    ? 'grid-cols-[1.75rem_3.25rem_1fr_1fr_2.5rem_2.25rem]'
    : 'grid-cols-[2rem_4.5rem_1fr_1fr_2.5rem]'

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
    <article className={`card overflow-hidden ${inSuperset ? 'border-aqua-500/40' : ''}`}>
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
                  sets: sessionExercise.targetSets,
                  reps: isTimed
                    ? formatClock(sessionExercise.targetReps)
                    : String(sessionExercise.targetReps),
                })
              : null}
          </p>
        </button>

        {exercise?.videoUrl && (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t('exercises.watch')}
            className="rounded-lg p-1.5 text-red-400 active:bg-ink-600"
          >
            <Play size={17} fill="currentColor" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setPlatesOpen(true)}
          aria-label={t('plates.title')}
          className="rounded-lg p-1.5 text-ink-300 active:bg-ink-600"
        >
          <Calculator size={17} />
        </button>
        <button
          type="button"
          disabled={isFirst}
          onClick={() => reorderSessionExercise(sessionExercise.id, -1)}
          aria-label={t('workout.moveUp')}
          className="rounded-lg p-1.5 text-ink-300 active:bg-ink-600 disabled:opacity-25"
        >
          <ChevronUp size={18} />
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => reorderSessionExercise(sessionExercise.id, 1)}
          aria-label={t('workout.moveDown')}
          className="rounded-lg p-1.5 text-ink-300 active:bg-ink-600 disabled:opacity-25"
        >
          <ChevronDown size={18} />
        </button>
        <button
          type="button"
          onClick={() => setConfirmRemove(true)}
          aria-label={t('workout.removeExercise')}
          className="rounded-lg p-1.5 text-ink-300 active:bg-ink-600"
        >
          <Trash2 size={17} />
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
          className="flex w-full items-center gap-2 border-b border-ink-500/40 bg-brand-500/5
                     px-4 py-2.5 text-start active:bg-brand-500/10"
        >
          <TrendingUp size={14} className="shrink-0 text-brand-500" />
          <span className="min-w-0 flex-1 text-xs text-ink-200">
            {t(
              suggestion.reason === 'hit-target'
                ? 'workout.reasonHitTarget'
                : 'workout.reasonRepeatedMiss'
            )}
          </span>
          <span className="tabular shrink-0 text-xs font-bold text-brand-500">
            {formatNumber(toDisplayWeight(suggestion.weight, units))} {unitLabel(units, locale)}
          </span>
        </button>
      )}

      <div className="px-3 py-2">
        <div
          className={`grid ${gridClass} items-center gap-2 px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-300`}
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
                className={`grid ${gridClass} items-center gap-2 rounded-xl px-1 py-1
                            transition-colors ${entry.done ? 'bg-green-500/10' : ''}`}
              >
                {/* Tapping the number walks through working → warm-up → drop →
                    failure, which is faster mid-set than opening a menu. */}
                <button
                  type="button"
                  onClick={() => updateSet(entry.id, { setType: nextSetType(entry.setType) })}
                  title={t(SET_TYPE_LABEL[entry.setType])}
                  className={`tabular h-8 rounded-lg text-xs font-bold ${SET_TYPE_STYLE[entry.setType]}`}
                >
                  {badge ?? entry.setNumber}
                </button>

                <span className="tabular truncate text-xs text-ink-300">
                  {!prior
                    ? t('common.empty')
                    : isTimed
                      ? formatClock(prior.durationSeconds ?? 0)
                      : `${formatNumber(toDisplayWeight(prior.weight, units))}×${prior.reps}`}
                </span>

                <NumberField
                  value={toDisplayWeight(entry.weight, units)}
                  onChange={(value) => updateSet(entry.id, { weight: toStoredWeight(value, units) })}
                  step={2.5}
                />
                {isTimed ? (
                  // Editable in seconds so a mistimed hold can be corrected;
                  // the label above the column says what the unit is.
                  <NumberField
                    value={entry.durationSeconds ?? 0}
                    onChange={(value) =>
                      updateSet(entry.id, { durationSeconds: Math.round(value), reps: 0 })
                    }
                    step={5}
                  />
                ) : (
                  <NumberField
                    value={entry.reps}
                    onChange={(value) => updateSet(entry.id, { reps: Math.round(value) })}
                  />
                )}

                {trackRpe && (
                  <NumberField
                    value={entry.rpe ?? 0}
                    onChange={(value) =>
                      updateSet(entry.id, { rpe: value > 0 ? Math.min(10, value) : undefined })
                    }
                  />
                )}

                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => toggleDone(entry)}
                    aria-label={t('common.done')}
                    aria-pressed={entry.done === 1}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors
                                ${
                                  entry.done
                                    ? 'bg-green-500 text-ink-950'
                                    : 'bg-ink-600 text-ink-300 active:bg-ink-500'
                                }`}
                  >
                    <Check size={18} strokeWidth={3} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addSet(sessionExercise.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink-600
                       py-2.5 text-xs font-semibold text-ink-100 active:bg-ink-500"
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
              className="tabular flex items-center gap-1.5 rounded-xl bg-ink-600 px-3 py-2.5
                         text-xs font-semibold text-ink-100 active:bg-ink-500"
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
              className="rounded-xl bg-ink-600 px-3 text-sky-300 active:bg-ink-500"
            >
              <Flame size={15} />
            </button>
          )}

          {!isFirst && (
            <button
              type="button"
              onClick={() => toggleSuperset(sessionExercise.id)}
              aria-label={inSuperset ? t('workout.breakSuperset') : t('workout.makeSuperset')}
              className={`rounded-xl px-3 active:bg-ink-500 ${
                inSuperset ? 'bg-aqua-500/20 text-aqua-300' : 'bg-ink-600 text-ink-300'
              }`}
            >
              <Link2 size={15} />
            </button>
          )}

          {ordered.length > 0 && (
            <button
              type="button"
              onClick={() => deleteSet(ordered[ordered.length - 1].id)}
              aria-label={t('common.delete')}
              className="rounded-xl bg-ink-600 px-3 text-ink-300 active:bg-ink-500"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

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
