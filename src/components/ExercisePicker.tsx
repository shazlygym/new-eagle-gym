import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { createExercise, listExercises } from '../db/repository'
import type { MuscleGroup } from '../db/schema'
import { exerciseName, useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'
import { filterExercises } from '../lib/exerciseSearch'
import NewExerciseSheet, { MUSCLE_GROUPS } from './NewExerciseSheet'
import Sheet from './Sheet'

interface Props {
  open: boolean
  profileId: string
  onClose: () => void
  onPick: (exerciseId: string) => void
  /** Ids already in the workout/routine — shown ticked, still selectable. */
  selectedIds?: string[]
}

export default function ExercisePicker({
  open,
  profileId,
  onClose,
  onPick,
  selectedIds = [],
}: Props) {
  const { t, locale } = useT()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all')
  const [creating, setCreating] = useState(false)

  const exercises = useLiveQuery(() => listExercises(profileId), [profileId]) ?? []
  const selected = new Set(selectedIds)

  const results = useMemo(
    () => filterExercises(exercises, { query, group, locale }),
    [exercises, query, group, locale]
  )

  return (
    <>
      <Sheet open={open} onClose={onClose} title={t('workout.addExercise')} tall>
        <div className="sticky top-0 -mx-5 -mt-2 bg-dark-800 px-5 pb-3 pt-2">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute inset-y-0 start-3 my-auto text-dark-300"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('exercises.searchPlaceholder')}
              className="field ps-9"
            />
          </div>

          <div className="scroll-area -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            {(['all', ...MUSCLE_GROUPS] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setGroup(value)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors
                            ${
                              group === value
                                ? 'bg-gold-500 text-dark-900'
                                : 'bg-dark-700 text-dark-200'
                            }`}
              >
                {value === 'all' ? t('common.all') : t(`group.${value}` as TranslationKey)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mb-2 flex w-full items-center gap-3 rounded-xl border border-dashed
                     border-dark-400 px-4 py-3 text-sm font-medium text-gold-500 active:bg-dark-700"
        >
          <Plus size={18} />
          {t('exercises.new')}
        </button>

        {results.length === 0 ? (
          <p className="py-10 text-center text-sm text-dark-300">{t('exercises.none')}</p>
        ) : (
          <ul className="space-y-1.5">
            {results.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => onPick(exercise.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start
                              active:bg-dark-600 ${
                                selected.has(exercise.id) ? 'bg-dark-600' : 'bg-dark-700'
                              }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-dark-50">
                      {exerciseName(exercise, locale)}
                    </p>
                    <p className="mt-0.5 text-xs text-dark-300">
                      {t(`group.${exercise.muscleGroup}` as TranslationKey)} ·{' '}
                      {t(`equipment.${exercise.equipment}` as TranslationKey)}
                    </p>
                  </div>
                  {selected.has(exercise.id) && (
                    <span className="shrink-0 text-xs font-semibold text-gold-500">✓</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <NewExerciseSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (input) => {
          // Adding an exercise here is always in service of using it right now,
          // so it goes straight into the workout rather than back to the list.
          const exercise = await createExercise(profileId, input)
          setCreating(false)
          onPick(exercise.id)
        }}
      />
    </>
  )
}
