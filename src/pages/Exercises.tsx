import { useLiveQuery } from 'dexie-react-hooks'
import { Dumbbell, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import NewExerciseSheet, { MUSCLE_GROUPS } from '../components/NewExerciseSheet'
import PageHeader from '../components/PageHeader'
import { createExercise, deleteExercise, listExercises, updateExercise } from '../db/repository'
import type { Exercise, MuscleGroup } from '../db/schema'
import { exerciseName, useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'
import { filterExercises } from '../lib/exerciseSearch'
import { useActiveProfile } from '../lib/useActiveProfile'

export default function Exercises() {
  const { t, locale } = useT()
  const { profile } = useActiveProfile()
  const profileId = profile?.id

  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const exercises = useLiveQuery(() => (profileId ? listExercises(profileId) : []), [profileId]) ?? []

  const results = useMemo(
    () => filterExercises(exercises, { query, group, locale }),
    [exercises, query, group, locale]
  )

  if (!profile) return null

  return (
    <div>
      <PageHeader
        title={t('exercises.title')}
        onBack="history"
        action={
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            aria-label={t('exercises.new')}
            className="rounded-xl bg-ink-700 p-2 text-brand-500 active:bg-ink-600"
          >
            <Plus size={20} />
          </button>
        }
      />

      <div className="sticky top-header z-20 space-y-3 bg-ink-950/95 px-4 py-3 backdrop-blur-xl">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute inset-y-0 start-3 my-auto text-ink-300"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('exercises.searchPlaceholder')}
            className="field ps-9"
          />
        </div>

        <div className="scroll-area -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {(['all', ...MUSCLE_GROUPS] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setGroup(value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors
                          ${group === value ? 'bg-brand-500 text-white' : 'bg-ink-700 text-ink-200'}`}
            >
              {value === 'all' ? t('common.all') : t(`group.${value}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        {results.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title={exercises.length === 0 ? t('exercises.empty') : t('exercises.none')}
            body={exercises.length === 0 ? t('exercises.emptyHint') : undefined}
            action={
              exercises.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus size={18} />
                  {t('exercises.addFirst')}
                </button>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-1.5">
            {results.map((exercise) => (
              <li key={exercise.id} className="card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-50">
                    {exerciseName(exercise, locale)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-300">
                    {t(`group.${exercise.muscleGroup}` as TranslationKey)} ·{' '}
                    {t(`equipment.${exercise.equipment}` as TranslationKey)}
                  </p>
                </div>

                {exercise.videoUrl && (
                  <a
                    href={exercise.videoUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={t('exercises.watch')}
                    className="shrink-0 rounded-lg p-1.5 text-red-400 active:bg-ink-600"
                  >
                    <Play size={16} fill="currentColor" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(exercise)}
                  aria-label={t('common.edit')}
                  className="shrink-0 rounded-lg p-1.5 text-ink-300 active:bg-ink-600"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(exercise.id)}
                  aria-label={t('common.delete')}
                  className="shrink-0 rounded-lg p-1.5 text-ink-300 active:bg-ink-600"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NewExerciseSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreate={async (input) => {
          await createExercise(profile.id, input)
          setFormOpen(false)
        }}
      />

      {editing && (
        <NewExerciseSheet
          open
          onClose={() => setEditing(null)}
          initial={{
            nameAr: editing.nameAr,
            nameEn: editing.nameEn,
            muscleGroup: editing.muscleGroup,
            equipment: editing.equipment,
            tracking: editing.tracking ?? 'reps',
            videoUrl: editing.videoUrl,
          }}
          onCreate={async (input) => {
            await updateExercise(editing.id, input)
            setEditing(null)
          }}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('exercises.deleteConfirm')}
        body={t('common.confirmDelete')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void deleteExercise(pendingDelete)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
