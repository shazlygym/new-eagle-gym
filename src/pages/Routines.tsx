import { useLiveQuery } from 'dexie-react-hooks'
import { Copy, ListPlus, Pencil, Play, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import { duplicateRoutine, getActiveSession, listRoutines, startSession } from '../db/repository'
import { routineName, useT } from '../i18n'
import { unlockAudio } from '../lib/audio'
import { useActiveProfile } from '../lib/useActiveProfile'

export default function Routines() {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile } = useActiveProfile()
  const profileId = profile?.id

  const routines = useLiveQuery(() => (profileId ? listRoutines(profileId) : []), [profileId]) ?? []

  if (!profile) return null

  const begin = async (routineId: string) => {
    unlockAudio()
    const existing = await getActiveSession(profile.id)
    const sessionId = existing?.id ?? (await startSession(profile.id, routineId))
    navigate(`/workout/${sessionId}`)
  }

  return (
    <div>
      <PageHeader
        title={t('routines.title')}
        onBack="history"
        action={
          <Link
            to="/routines/new"
            aria-label={t('routines.new')}
            className="rounded-xl bg-ink-700 p-2 text-brand-500 active:bg-ink-600"
          >
            <Plus size={20} />
          </Link>
        }
      />

      <div className="px-4 py-4">
        {routines.length === 0 ? (
          <EmptyState
            icon={ListPlus}
            title={t('routines.empty')}
            body={t('routines.emptyHint')}
            action={
              <Link to="/routines/new" className="btn-primary inline-flex items-center gap-2">
                <Plus size={18} />
                {t('routines.new')}
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {routines.map((routine) => (
              <li key={routine.id} className="card overflow-hidden">
                <div className="flex items-center gap-2 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-50">
                      {routineName(routine, locale)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-300">
                      {t('routines.exerciseCount', { count: routine.items.length })}
                    </p>
                  </div>

                  <button
                    type="button"
                    // Suffixes are record data, not UI copy — each name field
                    // gets its own language regardless of the current locale.
                    onClick={() => duplicateRoutine(routine.id, { ar: '(نسخة)', en: '(copy)' })}
                    aria-label={t('routines.duplicate')}
                    className="rounded-xl bg-ink-600 p-2.5 text-ink-100 active:bg-ink-500"
                  >
                    <Copy size={16} />
                  </button>
                  <Link
                    to={`/routines/${routine.id}`}
                    aria-label={t('common.edit')}
                    className="rounded-xl bg-ink-600 p-2.5 text-ink-100 active:bg-ink-500"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => begin(routine.id)}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2.5
                               text-sm font-semibold text-ink-950 active:scale-95 transition-transform"
                  >
                    <Play size={15} fill="currentColor" />
                    {t('routines.start')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
