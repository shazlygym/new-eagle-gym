import { useLiveQuery } from 'dexie-react-hooks'
import { Dumbbell, Plus } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import ExercisePicker from '../components/ExercisePicker'
import PageHeader from '../components/PageHeader'
import PrCelebration, { type PrEvent } from '../components/PrCelebration'
import RestTimerBar from '../components/RestTimerBar'
import WorkoutExerciseCard from '../components/WorkoutExerciseCard'
import {
  addExerciseToSession,
  addSet,
  deleteSession,
  finishSession,
  getSession,
  listSessionExercises,
  listSetsForSession,
  setSessionExerciseRest,
  setSessionRest,
  updateSession,
} from '../db/repository'
import { useT } from '../i18n'
import { formatClock } from '../lib/format'
import { useElapsed, useExerciseTimerStore } from '../lib/useClock'
import { useActiveProfile } from '../lib/useActiveProfile'
import { useRestTimer } from '../lib/useRestTimer'

export default function Workout() {
  const { sessionId = '' } = useParams()
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile, units } = useActiveProfile()
  const timer = useRestTimer()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [pr, setPr] = useState<PrEvent | null>(null)

  // Resolved to null on a miss: useLiveQuery yields undefined while loading, so
  // without the ?? a bad URL would render the blank loading div forever.
  const session = useLiveQuery(async () => (await getSession(sessionId)) ?? null, [sessionId])
  const sessionExercises = useLiveQuery(() => listSessionExercises(sessionId), [sessionId]) ?? []
  const sets = useLiveQuery(() => listSetsForSession(sessionId), [sessionId]) ?? []

  // Declared after the session query it reads from, and before the early
  // returns below — hooks must run unconditionally on every render.
  const elapsed = useElapsed(session?.startedAt)

  if (session === undefined) return <div className="min-h-dvh bg-ink-950" />
  if (!session || !profile) return <Navigate to="/" replace />

  const title = (locale === 'ar' ? session.titleAr : session.titleEn) || t('workout.untitled')
  const completedCount = sets.filter((s) => s.done === 1).length

  const addExercise = async (exerciseId: string) => {
    setPickerOpen(false)
    const sessionExerciseId = await addExerciseToSession(
      sessionId,
      exerciseId,
      profile.defaultRestSeconds ?? 90
    )
    // Every exercise starts with one empty set — otherwise the card lands as a
    // header with nothing to type into.
    await addSet(sessionExerciseId)
  }

  // A duration timer still running when the session ends would persist as an
  // orphan and disable every Start button in the next workout.
  const cancelOwnedExerciseTimer = () => {
    const exerciseTimer = useExerciseTimerStore.getState()
    if (sessionExercises.some((entry) => entry.id === exerciseTimer.sessionExerciseId)) {
      exerciseTimer.cancel()
    }
  }

  const finish = async () => {
    setConfirmFinish(false)
    timer.stop()
    cancelOwnedExerciseTimer()
    await finishSession(sessionId)
    navigate(`/workout/${sessionId}/summary`, { replace: true })
  }

  const discard = async () => {
    setConfirmDiscard(false)
    timer.stop()
    cancelOwnedExerciseTimer()
    await deleteSession(sessionId)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-ink-950">
      <PageHeader
        title={title}
        // A live stopwatch, not "less than a minute ago" — you want to know how
        // long you have actually been in the gym while you are still in it.
        subtitle={formatClock(elapsed)}
        onBack={() => navigate('/')}
        action={
          <button
            type="button"
            // Finishing with nothing ticked off would leave an empty workout in
            // History and a zero in every chart, so that path discards instead.
            onClick={() => (completedCount > 0 ? setConfirmFinish(true) : setConfirmDiscard(true))}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 active:scale-95 transition-transform"
          >
            {t('workout.finish')}
          </button>
        }
      />

      {/* Bottom padding clears the rest timer bar when it is showing. */}
      <div className={`space-y-3 px-4 py-4 ${timer.active ? 'pb-32' : 'pb-24'}`}>
        {sessionExercises.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title={t('workout.empty')}
            body={t('workout.emptyHint')}
            action={
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus size={18} />
                {t('workout.addExercise')}
              </button>
            }
          />
        ) : (
          <>
            {sessionExercises.map((sessionExercise, index) => (
              <WorkoutExerciseCard
                key={sessionExercise.id}
                sessionExercise={sessionExercise}
                sets={sets.filter((s) => s.sessionExerciseId === sessionExercise.id)}
                units={units}
                profileId={profile.id}
                onSetCompleted={(restSeconds) => restSeconds > 0 && timer.start(restSeconds)}
                // Takes effect from the next set. Rewriting the countdown that
                // is already running would either cut a rest short or hand back
                // time already spent; the bar's own ±15/+30 is for that.
                onRestChange={(seconds, applyToAll) =>
                  applyToAll
                    ? setSessionRest(sessionId, seconds)
                    : setSessionExerciseRest(sessionExercise.id, seconds)
                }
                onPr={setPr}
                isFirst={index === 0}
                isLast={index === sessionExercises.length - 1}
                // Rest is taken at the end of a superset, not between its parts.
                supersetContinues={Boolean(
                  sessionExercise.supersetGroup &&
                    sessionExercises[index + 1]?.supersetGroup === sessionExercise.supersetGroup
                )}
                trackRpe={profile.trackRpe === 1}
              />
            ))}

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border
                         border-dashed border-ink-400 py-3.5 text-sm font-medium
                         text-brand-500 active:bg-ink-700"
            >
              <Plus size={18} />
              {t('workout.addExercise')}
            </button>
          </>
        )}

        <div className="card p-4">
          <label className="mb-2 block text-xs font-medium text-ink-200" htmlFor="session-notes">
            {t('common.notes')}
          </label>
          <textarea
            id="session-notes"
            rows={2}
            defaultValue={session.notes ?? ''}
            // On change, not on blur — tapping "Finish" straight after typing
            // doesn't reliably blur on iOS, and the note went in the bin.
            onChange={(event) => updateSession(sessionId, { notes: event.target.value })}
            placeholder={t('workout.notesPlaceholder')}
            className="field resize-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setConfirmDiscard(true)}
          className="w-full py-3 text-sm font-medium text-red-400 active:opacity-60"
        >
          {t('workout.discard')}
        </button>
      </div>

      <RestTimerBar timer={timer} />

      <PrCelebration event={pr} onDone={() => setPr(null)} />

      <ExercisePicker
        open={pickerOpen}
        profileId={profile.id}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        selectedIds={sessionExercises.map((s) => s.exerciseId)}
      />

      <ConfirmDialog
        open={confirmFinish}
        title={t('workout.finishConfirm')}
        body={t('workout.finishConfirmBody')}
        confirmLabel={t('workout.finish')}
        onCancel={() => setConfirmFinish(false)}
        onConfirm={finish}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title={completedCount > 0 ? t('workout.discardConfirm') : t('workout.nothingLogged')}
        body={completedCount > 0 ? t('common.confirmDelete') : t('workout.nothingLoggedBody')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={discard}
      />
    </div>
  )
}
