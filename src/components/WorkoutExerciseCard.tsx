import { useLiveQuery } from 'dexie-react-hooks'
import { Calculator, Check, ChevronDown, ChevronUp, History, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  addSet,
  deleteSet,
  getExercise,
  lastPerformance,
  removeSessionExercise,
  reorderSessionExercise,
  setSetDone,
  updateSet,
} from '../db/repository'
import type { SessionExercise, SetEntry, Units } from '../db/schema'
import { exerciseName, useT } from '../i18n'
import { formatNumber, toDisplayWeight, toStoredWeight, unitLabel } from '../lib/format'
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
}

export default function WorkoutExerciseCard({
  sessionExercise,
  sets,
  units,
  profileId,
  onSetCompleted,
  isFirst,
  isLast,
}: Props) {
  const { t, locale } = useT()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [platesOpen, setPlatesOpen] = useState(false)

  const exercise = useLiveQuery(
    () => getExercise(sessionExercise.exerciseId),
    [sessionExercise.exerciseId]
  )
  const previous =
    useLiveQuery(
      () => lastPerformance(profileId, sessionExercise.exerciseId, sessionExercise.sessionId),
      [profileId, sessionExercise.exerciseId, sessionExercise.sessionId]
    ) ?? []

  const ordered = [...sets].sort((a, b) => a.setNumber - b.setNumber)

  const toggleDone = async (entry: SetEntry) => {
    const nowDone = entry.done === 0
    await setSetDone(entry.id, nowDone)
    // Rest only starts on completion, never on un-ticking a mistake.
    if (nowDone) onSetCompleted(sessionExercise.restSeconds)
  }

  return (
    <article className="card overflow-hidden">
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
            <History size={13} className="ms-1.5 inline shrink-0 text-dark-300 align-baseline" />
          </h3>
          {sessionExercise.targetSets && sessionExercise.targetReps && (
            <p className="text-xs text-dark-300">
              {t('workout.target', {
                sets: sessionExercise.targetSets,
                reps: sessionExercise.targetReps,
              })}
            </p>
          )}
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

      <div className="px-3 py-2">
        <div className="grid grid-cols-[2rem_4.5rem_1fr_1fr_2.5rem] items-center gap-2 px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-dark-300">
          <span className="text-center">#</span>
          <span>{t('workout.previous')}</span>
          <span className="text-center">{unitLabel(units, locale)}</span>
          <span className="text-center">{t('common.reps')}</span>
          <span />
        </div>

        <ul className="space-y-1.5">
          {ordered.map((entry, index) => {
            const prior = previous[index]
            return (
              <li
                key={entry.id}
                className={`grid grid-cols-[2rem_4.5rem_1fr_1fr_2.5rem] items-center gap-2
                            rounded-xl px-1 py-1 transition-colors
                            ${entry.done ? 'bg-green-500/10' : ''}`}
              >
                {/* Tapping the set number flips it to a warm-up, which excludes
                    it from volume and PR maths. */}
                <button
                  type="button"
                  onClick={() => updateSet(entry.id, { isWarmup: entry.isWarmup ? 0 : 1 })}
                  title={t('workout.warmup')}
                  className={`tabular h-8 rounded-lg text-xs font-bold ${
                    entry.isWarmup ? 'bg-gold-500/20 text-gold-400' : 'text-dark-200'
                  }`}
                >
                  {entry.isWarmup ? 'W' : entry.setNumber}
                </button>

                <span className="tabular truncate text-xs text-dark-300">
                  {prior
                    ? `${formatNumber(toDisplayWeight(prior.weight, units))}×${prior.reps}`
                    : t('common.empty')}
                </span>

                <NumberField
                  value={toDisplayWeight(entry.weight, units)}
                  onChange={(value) =>
                    updateSet(entry.id, { weight: toStoredWeight(value, units) })
                  }
                  step={2.5}
                />
                <NumberField
                  value={entry.reps}
                  onChange={(value) => updateSet(entry.id, { reps: Math.round(value) })}
                />

                <div className="flex items-center justify-center gap-1">
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

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => addSet(sessionExercise.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-dark-600
                       py-2.5 text-xs font-semibold text-dark-100 active:bg-dark-500"
          >
            <Plus size={15} />
            {t('workout.addSet')}
          </button>
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
          initialTarget={toDisplayWeight(
            ordered.reduce((max, entry) => Math.max(max, entry.weight), 0),
            units
          )}
        />
      )}
    </article>
  )
}
