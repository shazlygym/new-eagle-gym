import { useLiveQuery } from 'dexie-react-hooks'
import {
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  History,
  Link2,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import {
  addSet,
  addWarmupSets,
  deleteSet,
  getExercise,
  recentSessionsForExercise,
  removeSessionExercise,
  reorderSessionExercise,
  setSetDone,
  toggleSuperset,
  updateSet,
} from '../db/repository'
import type { SessionExercise, SetEntry, Units } from '../db/schema'
import { exerciseName, useT } from '../i18n'
import { formatNumber, toDisplayWeight, toStoredWeight, unitLabel } from '../lib/format'
import { suggestNextLoad } from '../lib/progression'
import { SET_TYPE_BADGE, SET_TYPE_STYLE, nextSetType } from '../lib/setTypes'
import { warmupSets } from '../lib/warmup'
import ConfirmDialog from './ConfirmDialog'
import ExerciseHistorySheet from './ExerciseHistorySheet'
import NumberField from './NumberField'
import PlateCalculatorSheet from './PlateCalculatorSheet'

interface Props {
  sessionExercise: SessionExercise
  sets: SetEntry[]
  units: Units
  profileId: string
  /** Called when a set is ticked, so the page can kick off the rest timer. */
  onSetCompleted: (restSeconds: number) => void
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

  const suggestion =
    readOnlyContext || !sessionExercise.targetReps
      ? null
      : suggestNextLoad(
          recent,
          { reps: sessionExercise.targetReps, sets: sessionExercise.targetSets ?? 1 },
          units
        )

  const topWeight = ordered.reduce((max, entry) => Math.max(max, entry.weight), 0)

  const toggleDone = async (entry: SetEntry) => {
    const nowDone = entry.done === 0
    await setSetDone(entry.id, nowDone)
    // Inside a superset you move straight to the next exercise, so rest only
    // starts once the group is finished.
    if (nowDone && !supersetContinues) onSetCompleted(sessionExercise.restSeconds)
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

  return (
    // Superset members stay as separate cards — the list has a gap between them,
    // so merging their borders would just look broken. A violet edge and a chip
    // carry the grouping instead.
    <article className={`card overflow-hidden ${inSuperset ? 'border-violet-500/40' : ''}`}>
      <header className="flex items-center gap-2 border-b border-dark-500/50 px-4 py-3">
        {/* The name is a button: tapping it answers "what did I lift last time?"
            without leaving the workout. */}
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="min-w-0 flex-1 text-start active:opacity-60"
        >
          <h3 className="truncate font-semibold text-dark-50">
            {exerciseName(exercise, locale)}
            <History size={13} className="ms-1.5 inline shrink-0 align-baseline text-dark-300" />
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-dark-300">
            {inSuperset && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">
                <Link2 size={10} />
                {t('workout.superset')}
              </span>
            )}
            {sessionExercise.targetSets && sessionExercise.targetReps
              ? t('workout.target', {
                  sets: sessionExercise.targetSets,
                  reps: sessionExercise.targetReps,
                })
              : null}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setPlatesOpen(true)}
          aria-label={t('plates.title')}
          className="rounded-lg p-1.5 text-dark-300 active:bg-dark-600"
        >
          <Calculator size={17} />
        </button>
        <button
          type="button"
          disabled={isFirst}
          onClick={() => reorderSessionExercise(sessionExercise.id, -1)}
          aria-label={t('workout.moveUp')}
          className="rounded-lg p-1.5 text-dark-300 active:bg-dark-600 disabled:opacity-25"
        >
          <ChevronUp size={18} />
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => reorderSessionExercise(sessionExercise.id, 1)}
          aria-label={t('workout.moveDown')}
          className="rounded-lg p-1.5 text-dark-300 active:bg-dark-600 disabled:opacity-25"
        >
          <ChevronDown size={18} />
        </button>
        <button
          type="button"
          onClick={() => setConfirmRemove(true)}
          aria-label={t('workout.removeExercise')}
          className="rounded-lg p-1.5 text-dark-300 active:bg-dark-600"
        >
          <Trash2 size={17} />
        </button>
      </header>

      {suggestion && suggestion.kind !== 'hold' && (
        <button
          type="button"
          onClick={applySuggestion}
          className="flex w-full items-center gap-2 border-b border-dark-500/40 bg-gold-500/5
                     px-4 py-2.5 text-start active:bg-gold-500/10"
        >
          <TrendingUp size={14} className="shrink-0 text-gold-500" />
          <span className="min-w-0 flex-1 text-xs text-dark-200">
            {t(
              suggestion.reason === 'hit-target'
                ? 'workout.reasonHitTarget'
                : 'workout.reasonRepeatedMiss'
            )}
          </span>
          <span className="tabular shrink-0 text-xs font-bold text-gold-500">
            {formatNumber(toDisplayWeight(suggestion.weight, units))} {unitLabel(units, locale)}
          </span>
        </button>
      )}

      <div className="px-3 py-2">
        <div
          className={`grid ${gridClass} items-center gap-2 px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-dark-300`}
        >
          <span className="text-center">#</span>
          <span>{t('workout.previous')}</span>
          <span className="text-center">{unitLabel(units, locale)}</span>
          <span className="text-center">{t('common.reps')}</span>
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
                  title={t('setType.working')}
                  className={`tabular h-8 rounded-lg text-xs font-bold ${SET_TYPE_STYLE[entry.setType]}`}
                >
                  {badge ?? entry.setNumber}
                </button>

                <span className="tabular truncate text-xs text-dark-300">
                  {prior
                    ? `${formatNumber(toDisplayWeight(prior.weight, units))}×${prior.reps}`
                    : t('common.empty')}
                </span>

                <NumberField
                  value={toDisplayWeight(entry.weight, units)}
                  onChange={(value) => updateSet(entry.id, { weight: toStoredWeight(value, units) })}
                  step={2.5}
                />
                <NumberField
                  value={entry.reps}
                  onChange={(value) => updateSet(entry.id, { reps: Math.round(value) })}
                />

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
                                    ? 'bg-green-500 text-dark-900'
                                    : 'bg-dark-600 text-dark-300 active:bg-dark-500'
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
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-dark-600
                       py-2.5 text-xs font-semibold text-dark-100 active:bg-dark-500"
          >
            <Plus size={15} />
            {t('workout.addSet')}
          </button>

          {!readOnlyContext && (
            <button
              type="button"
              onClick={addWarmup}
              aria-label={t('workout.addWarmup')}
              className="rounded-xl bg-dark-600 px-3 text-sky-300 active:bg-dark-500"
            >
              <Flame size={15} />
            </button>
          )}

          {!isFirst && (
            <button
              type="button"
              onClick={() => toggleSuperset(sessionExercise.id)}
              aria-label={inSuperset ? t('workout.breakSuperset') : t('workout.makeSuperset')}
              className={`rounded-xl px-3 active:bg-dark-500 ${
                inSuperset ? 'bg-violet-500/20 text-violet-300' : 'bg-dark-600 text-dark-300'
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
              className="rounded-xl bg-dark-600 px-3 text-dark-300 active:bg-dark-500"
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
