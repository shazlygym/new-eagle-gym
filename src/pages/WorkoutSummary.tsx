import { useLiveQuery } from 'dexie-react-hooks'
import { Clock, Share2, Trophy, Weight } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import StatCard from '../components/StatCard'
import { newRecordsIn, sessionStats, type NewRecord } from '../db/queries'
import { getExercise, getSession, listCompletedSets, listSetsForSession } from '../db/repository'
import { exerciseName, useT } from '../i18n'
import {
  formatClock,
  formatDay,
  formatDuration,
  formatVolume,
  formatWeight,
  unitLabel,
  volumeValue,
} from '../lib/format'
import { renderShareCard } from '../lib/shareCard'
import { useActiveProfile } from '../lib/useActiveProfile'

export default function WorkoutSummary() {
  const { sessionId = '' } = useParams()
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile, units } = useActiveProfile()

  // Null on a miss so a bad URL redirects instead of loading forever.
  const session = useLiveQuery(async () => (await getSession(sessionId)) ?? null, [sessionId])
  const sets = useLiveQuery(() => listSetsForSession(sessionId), [sessionId]) ?? []
  const allSets =
    useLiveQuery(() => (profile ? listCompletedSets(profile.id) : []), [profile?.id]) ?? []
  const [sharing, setSharing] = useState(false)

  if (session === undefined) return <div className="min-h-dvh bg-ink-950" />
  if (!session || !profile) return <Navigate to="/" replace />

  const stats = sessionStats(session, sets)
  const records = newRecordsIn(sets, allSets)

  const share = async () => {
    setSharing(true)
    try {
      // The card needs the names up front — no async lookups mid-draw.
      const names = new Map<string, string>()
      await Promise.all(
        records.map(async (record) => {
          const exercise = await getExercise(record.exerciseId)
          names.set(record.exerciseId, exerciseName(exercise, locale))
        })
      )

      const blob = await renderShareCard({
        appName: t('app.name'),
        title: (locale === 'ar' ? session.titleAr : session.titleEn) || t('workout.untitled'),
        dateLabel: formatDay(session.startedAt, locale),
        stats: [
          { label: t('summary.duration'), value: formatDuration(stats.durationMs, locale) },
          { label: t('summary.sets'), value: String(stats.sets) },
          {
            label: t('summary.volume'),
            value: formatVolume(stats.volume, units, locale, { compact: true }),
          },
        ],
        recordsTitle: t('summary.newRecords'),
        records: records.map((record) => ({
          name: names.get(record.exerciseId) ?? '',
          value:
            record.kind === 'duration'
              ? formatClock(record.durationSeconds ?? 0)
              : `${formatWeight(record.weight, units, locale)} × ${record.reps}`,
        })),
        tagline: t('app.tagline'),
        rtl: locale === 'ar',
      })

      const file = new File([blob], 'eagle-gym-workout.png', { type: 'image/png' })
      // Same dance as the backup export: on iOS only the Share sheet actually
      // lets the user keep the file.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          return
        } catch {
          // Cancelled — fall through to a plain download.
        }
      }
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.name
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink-950 px-5 pb-10 pt-safe-t">
      <div className="flex-1 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 w-fit rounded-2xl bg-brand-500/15 p-4 text-brand-500">
            <Trophy size={32} />
          </div>
          <h1 className="text-2xl font-bold text-ink-50">{t('summary.title')}</h1>
          <p className="mt-1 text-sm text-ink-300">
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
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-500">
              <Trophy size={15} />
              {t('summary.newRecords')}
            </h2>
            <ul className="space-y-2">
              {records.map((record) => (
                <RecordRow key={record.exerciseId} record={record} units={units} />
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled={sharing}
          onClick={share}
          className="btn-ghost flex w-full items-center justify-center gap-2"
        >
          <Share2 size={18} />
          {t('summary.share')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="btn-primary w-full"
        >
          {t('summary.backHome')}
        </button>
      </div>
    </div>
  )
}

function RecordRow({ record, units }: { record: NewRecord; units: 'kg' | 'lb' }) {
  const { locale } = useT()
  const exercise = useLiveQuery(() => getExercise(record.exerciseId), [record.exerciseId])

  return (
    <li className="card flex items-center gap-3 border-brand-500/25 p-4">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-50">
        {exerciseName(exercise, locale)}
      </span>
      <span className="tabular shrink-0 text-sm font-bold text-brand-500" dir="ltr">
        {record.kind === 'duration'
          ? formatClock(record.durationSeconds ?? 0)
          : `${formatWeight(record.weight, units, locale)} × ${record.reps}`}
      </span>
    </li>
  )
}
