import { useLiveQuery } from 'dexie-react-hooks'
import { Dumbbell, Plus } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import ExercisePicker from '../components/ExercisePicker'
import PageHeader from '../components/PageHeader'
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
  updateSession,
} from '../db/repository'
import { useT } from '../i18n'
import { formatTimeAgo } from '../lib/format'
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

  const session = useLiveQuery(() => getSession(sessionId), [sessionId])
  const sessionExercises = useLiveQuery(() => listSessionExercises(sessionId), [sessionId]) ?? []
  const sets = useLiveQuery(() => listSetsForSession(sessionId), [sessionId]) ?? []

  if (session === undefined) return <div className="min-h-dvh bg-dark-900" />
  if (session === null || !session || !profile) return <Navigate to="/" replace />

  const title = (locale === 'ar' ? session.titleAr : session.titleEn) || t('workout.untitled')
  const completedCount = sets.filter((s) => s.done === 1).length

  const addExercise = async (exerciseId: string) => {
    setPickerOpen(false)
    const sessionExerciseId = await addExerciseToSession(sessionId, exerciseId)
    // Every exercise starts with one empty set — otherwise the card lands as a
    // header with nothing to type into.
    await addSet(sessionExerciseId)
  }

  const finish = async () => {
    setConfirmFinish(false)
    timer.stop()
    await finishSession(sessionId)
    navigate(`/workout/${sessionId}/summary`, { replace: true })
  }

  const discard = async () => {
    setConfirmDiscard(false)
    timer.stop()
    await deleteSession(sessionId)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-dark-900">
      <PageHeader
        title={title}
        subtitle={formatTimeAgo(session.startedAt, locale)}
        onBack={() => navigate('/')}
        action={
          <button
            type="button"
            // Finishing with nothing ticked off would leave an empty workout in
            // History and a zero in every chart, so that path discards instead.
            onClick={() => (completedCount > 0 ? setConfirmFinish(true) : setConfirmDiscard(true))}
            className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-dark-900 active:scale-95 transition-transform"
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
                         border-dashed border-dark-400 py-3.5 text-sm font-medium
                         text-gold-500 active:bg-dark-700"
            >
              <Plus size={18} />
              {t('workout.addExercise')}
            </button>
          </>
        )}

        <div className="card p-4">
          <label className="mb-2 block text-xs font-medium text-dark-200" htmlFor="session-notes">
            {t('common.notes')}
          </label>
          <textarea
            id="session-notes"
            rows={2}
            defaultValue={session.notes ?? ''}
            onBlur={(event) => updateSession(sessionId, { notes: event.target.value })}
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
