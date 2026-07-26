import { Play, Square, X } from 'lucide-react'
import { useT } from '../i18n'
import { formatClock } from '../lib/format'
import { useElapsed, useExerciseTimerStore } from '../lib/useClock'

interface Props {
  sessionExerciseId: string
  /** Target seconds from the routine, shown as something to beat. */
  target?: number
  onFinish: (seconds: number) => void
}

/**
 * Count-up timer for held or timed work, at the card rather than the row. When
 * you are mid-plank you are not going to hit a 40px cell — one large button
 * starts it, one stops it, and stopping writes the time into the next un-ticked
 * set and marks it done.
 */
export default function DurationTimer({ sessionExerciseId, target, onFinish }: Props) {
  const { t } = useT()
  const { sessionExerciseId: runningId, startedAt, start, stop, cancel } = useExerciseTimerStore()

  const isRunning = runningId === sessionExerciseId
  const elapsed = useElapsed(isRunning ? (startedAt ?? undefined) : undefined)
  // Another exercise owns the clock; offering a second start would silently
  // discard the first.
  const busyElsewhere = runningId !== null && !isRunning

  const reachedTarget = target !== undefined && target > 0 && elapsed >= target

  if (!isRunning) {
    return (
      <button
        type="button"
        disabled={busyElsewhere}
        onClick={() => start(sessionExerciseId)}
        className="flex w-full items-center justify-center gap-2 border-b border-dark-500/40
                   bg-sky-500/10 py-3 text-sm font-semibold text-sky-300
                   active:bg-sky-500/20 disabled:opacity-40"
      >
        <Play size={16} fill="currentColor" />
        {t('workout.startTimer')}
        {target ? (
          <span className="tabular text-xs font-medium opacity-70">
            {t('workout.targetTime', { time: formatClock(target) })}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <div
      className={`flex items-center gap-3 border-b border-dark-500/40 px-4 py-3 transition-colors
                  ${reachedTarget ? 'bg-green-500/15' : 'bg-sky-500/10'}`}
    >
      <span
        className={`tabular font-numeric text-2xl font-bold ${
          reachedTarget ? 'text-green-400' : 'text-sky-300'
        }`}
      >
        {formatClock(elapsed)}
      </span>

      {target ? (
        <span className="tabular text-xs text-dark-300">/ {formatClock(target)}</span>
      ) : null}

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => onFinish(stop())}
        className="flex items-center gap-1.5 rounded-xl bg-green-500 px-3.5 py-2 text-sm font-bold
                   text-dark-900 active:scale-95 transition-transform"
      >
        <Square size={13} fill="currentColor" />
        {t('workout.stopTimer')}
      </button>

      {/* Abandoning a set is a real case — a failed hold shouldn't be logged. */}
      <button
        type="button"
        onClick={cancel}
        aria-label={t('common.cancel')}
        className="rounded-xl bg-dark-600 p-2 text-dark-200 active:bg-dark-500"
      >
        <X size={16} />
      </button>
    </div>
  )
}
