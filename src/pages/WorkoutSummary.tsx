import { useLiveQuery } from 'dexie-react-hooks'
import { Clock, Trophy, Weight } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import StatCard from '../components/StatCard'
import { newRecordsIn, sessionStats } from '../db/queries'
import { getExercise, getSession, listCompletedSets, listSetsForSession } from '../db/repository'
import { exerciseName, useT } from '../i18n'
import { formatDuration, formatWeight, unitLabel, volumeValue } from '../lib/format'
import { useActiveProfile } from '../lib/useActiveProfile'

export default function WorkoutSummary() {
  const { sessionId = '' } = useParams()
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile, units } = useActiveProfile()

  const session = useLiveQuery(() => getSession(sessionId), [sessionId])
  const sets = useLiveQuery(() => listSetsForSession(sessionId), [sessionId]) ?? []
  const allSets =
    useLiveQuery(() => (profile ? listCompletedSets(profile.id) : []), [profile?.id]) ?? []

  if (session === undefined) return <div className="min-h-dvh bg-dark-900" />
  if (!session || !profile) return <Navigate to="/" replace />

  const stats = sessionStats(session, sets)
  const records = newRecordsIn(sets, allSets)

  return (
    <div className="flex min-h-dvh flex-col bg-dark-900 px-5 pb-10 pt-safe-t">
      <div className="flex-1 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 w-fit rounded-2xl bg-gold-500/15 p-4 text-gold-500">
            <Trophy size={32} />
          </div>
          <h1 className="text-2xl font-bold text-dark-50">{t('summary.title')}</h1>
          <p className="mt-1 text-sm text-dark-300">
            {(locale === 'ar' ? session.titleAr : session.titleEn) || t('workout.untitled')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={Clock}
            label={t('summary.duration')}
            value={formatDuration(stats.durationMs, locale)}
          />
          <StatCard icon={Weight} label={t('summary.sets')} value={String(stats.sets)} />
          <StatCard
            icon={Trophy}
            label={t('summary.volume')}
            value={volumeValue(stats.volume, units, { compact: true })}
            hint={unitLabel(units, locale)}
          />
        </div>

        {records.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-500">
              <Trophy size={15} />
              {t('summary.newRecords')}
            </h2>
            <ul className="space-y-2">
              {records.map((record) => (
                <RecordRow
                  key={record.exerciseId}
                  exerciseId={record.exerciseId}
                  weight={record.weight}
                  reps={record.reps}
                  units={units}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      <button type="button" onClick={() => navigate('/', { replace: true })} className="btn-primary">
        {t('summary.backHome')}
      </button>
    </div>
  )
}

function RecordRow({
  exerciseId,
  weight,
  reps,
  units,
}: {
  exerciseId: string
  weight: number
  reps: number
  units: 'kg' | 'lb'
}) {
  const { locale } = useT()
  const exercise = useLiveQuery(() => getExercise(exerciseId), [exerciseId])

  return (
    <li className="card flex items-center gap-3 border-gold-500/25 p-4">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-dark-50">
        {exerciseName(exercise, locale)}
      </span>
      <span className="tabular shrink-0 text-sm font-bold text-gold-500">
        {formatWeight(weight, units, locale)} × {reps}
      </span>
    </li>
  )
}
