import { useLiveQuery } from 'dexie-react-hooks'
import { Clock, Layers, Plus, Weight } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import ExercisePicker from '../components/ExercisePicker'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import WorkoutExerciseCard from '../components/WorkoutExerciseCard'
import { sessionStats } from '../db/queries'
import {
  addExerciseToSession,
  addSet,
  deleteSession,
  getSession,
  listExercises,
  listSessionExercises,
  listSetsForSession,
  updateSession,
} from '../db/repository'
import { exerciseName, useT } from '../i18n'
import {
  formatClock,
  formatDay,
  formatDuration,
  formatNumber,
  toDisplayWeight,
  unitLabel,
  volumeValue,
} from '../lib/format'
import { SET_TYPE_BADGE } from '../lib/setTypes'
import { useActiveProfile } from '../lib/useActiveProfile'

export default function SessionDetail() {
  const { sessionId = '' } = useParams()
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile, units } = useActiveProfile()

  const [confirmDelete, setConfirmDelete] = useState(false)
  // Forgetting to log a set, or fat-fingering a weight, is routine. Without an
  // edit mode the only remedy was deleting the whole workout.
  const [editing, setEditing] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const session = useLiveQuery(() => getSession(sessionId), [sessionId])
  const sessionExercises = useLiveQuery(() => listSessionExercises(sessionId), [sessionId]) ?? []
  const sets = useLiveQuery(() => listSetsForSession(sessionId), [sessionId]) ?? []
  const exercises =
    useLiveQuery(() => (profile ? listExercises(profile.id) : []), [profile?.id]) ?? []

  if (session === undefined) return <div className="min-h-dvh bg-dark-900" />
  if (!session) return <Navigate to="/history" replace />

  const stats = sessionStats(session, sets)

  return (
    <div>
      <PageHeader
        title={(locale === 'ar' ? session.titleAr : session.titleEn) || t('workout.untitled')}
        subtitle={formatDay(session.startedAt, locale)}
        onBack="history"
        action={
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold active:scale-95 transition-transform
                        ${editing ? 'bg-gold-500 text-dark-900' : 'bg-dark-700 text-dark-100'}`}
          >
            {editing ? t('session.doneEditing') : t('common.edit')}
          </button>
        }
      />

      <div className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={Clock}
            label={t('summary.duration')}
            value={formatDuration(stats.durationMs, locale)}
          />
          <StatCard icon={Layers} label={t('summary.sets')} value={String(stats.sets)} />
          <StatCard
            icon={Weight}
            label={t('summary.volume')}
            value={volumeValue(stats.volume, units, { compact: true })}
            hint={unitLabel(units, locale)}
          />
        </div>

        {editing &&
          profile &&
          sessionExercises.map((sessionExercise, index) => (
            // The live workout card already does all of this correctly, down to
            // renumbering after a delete — reusing it keeps one implementation
            // of set editing rather than a second, subtly different one.
            <WorkoutExerciseCard
              key={sessionExercise.id}
              sessionExercise={sessionExercise}
              sets={sets.filter((s) => s.sessionExerciseId === sessionExercise.id)}
              units={units}
              profileId={profile.id}
              onSetCompleted={() => {}} // no rest timer when editing after the fact
              isFirst={index === 0}
              isLast={index === sessionExercises.length - 1}
              trackRpe={profile.trackRpe === 1}
              readOnlyContext
            />
          ))}

        {editing && profile && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border
                       border-dashed border-dark-400 py-3.5 text-sm font-medium
                       text-gold-500 active:bg-dark-700"
          >
            <Plus size={18} />
            {t('session.addExercise')}
          </button>
        )}

        {!editing &&
          sessionExercises.map((sessionExercise) => {
            const rows = sets
              .filter((s) => s.sessionExerciseId === sessionExercise.id)
              .sort((a, b) => a.setNumber - b.setNumber)
            if (rows.length === 0) return null

            return (
              <article key={sessionExercise.id} className="card overflow-hidden">
                <h2 className="border-b border-dark-500/50 px-4 py-3 font-semibold text-dark-50">
                  {exerciseName(
                    exercises.find((e) => e.id === sessionExercise.exerciseId),
                    locale
                  )}
                </h2>
                <ul className="divide-y divide-dark-500/40">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-dark-100"
                    >
                      <span className="tabular w-6 text-xs font-semibold text-dark-300">
                        {SET_TYPE_BADGE[row.setType] ?? row.setNumber}
                      </span>
                      <span className="tabular flex-1">
                        {row.weight > 0
                          ? `${formatNumber(toDisplayWeight(row.weight, units))} ${unitLabel(units, locale)}`
                          : t('common.empty')}
                      </span>
                      <span className="tabular text-dark-200">
                        {row.durationSeconds
                          ? formatClock(row.durationSeconds)
                          : `${row.reps} ${t('common.reps')}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}

        {editing ? (
          <div className="card p-4">
            <label className="mb-2 block text-xs font-medium text-dark-200" htmlFor="notes">
              {t('common.notes')}
            </label>
            <textarea
              id="notes"
              rows={2}
              defaultValue={session.notes ?? ''}
              onBlur={(event) => updateSession(sessionId, { notes: event.target.value })}
              placeholder={t('workout.notesPlaceholder')}
              className="field resize-none"
            />
          </div>
        ) : (
          session.notes && (
            <div className="card p-4">
              <h2 className="mb-1.5 text-xs font-medium text-dark-200">{t('common.notes')}</h2>
              <p data-selectable className="whitespace-pre-wrap text-sm text-dark-100">
                {session.notes}
              </p>
            </div>
          )
        )}

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="w-full py-3 text-sm font-medium text-red-400 active:opacity-60"
        >
          {t('common.delete')}
        </button>
      </div>

      {profile && (
        <ExercisePicker
          open={pickerOpen}
          profileId={profile.id}
          onClose={() => setPickerOpen(false)}
          selectedIds={sessionExercises.map((s) => s.exerciseId)}
          onPick={async (exerciseId) => {
            setPickerOpen(false)
            const sessionExerciseId = await addExerciseToSession(sessionId, exerciseId)
            await addSet(sessionExerciseId)
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t('history.deleteConfirm')}
        body={t('common.confirmDelete')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false)
          await deleteSession(sessionId)
          navigate('/history', { replace: true })
        }}
      />
    </div>
  )
}
