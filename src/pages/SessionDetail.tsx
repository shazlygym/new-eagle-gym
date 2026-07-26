import { useLiveQuery } from 'dexie-react-hooks'
import { Clock, Layers, Weight } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { sessionStats } from '../db/queries'
import {
  deleteSession,
  getSession,
  listExercises,
  listSessionExercises,
  listSetsForSession,
} from '../db/repository'
import { exerciseName, useT } from '../i18n'
import {
  formatDay,
  formatDuration,
  formatNumber,
  toDisplayWeight,
  unitLabel,
  volumeValue,
} from '../lib/format'
import { useActiveProfile } from '../lib/useActiveProfile'

export default function SessionDetail() {
  const { sessionId = '' } = useParams()
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile, units } = useActiveProfile()

  const [confirmDelete, setConfirmDelete] = useState(false)

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

        {sessionExercises.map((sessionExercise) => {
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
                      {row.isWarmup ? 'W' : row.setNumber}
                    </span>
                    <span className="tabular flex-1">
                      {formatNumber(toDisplayWeight(row.weight, units))} {unitLabel(units, locale)}
                    </span>
                    <span className="tabular text-dark-200">
                      {row.reps} {t('common.reps')}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          )
        })}

        {session.notes && (
          <div className="card p-4">
            <h2 className="mb-1.5 text-xs font-medium text-dark-200">{t('common.notes')}</h2>
            <p data-selectable className="whitespace-pre-wrap text-sm text-dark-100">
              {session.notes}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="w-full py-3 text-sm font-medium text-red-400 active:opacity-60"
        >
          {t('common.delete')}
        </button>
      </div>

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
