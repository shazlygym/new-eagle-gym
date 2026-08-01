import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import ExercisePicker from '../components/ExercisePicker'
import NumberField from '../components/NumberField'
import PageHeader from '../components/PageHeader'
import { deleteRoutine, getRoutine, listExercises, saveRoutine } from '../db/repository'
import type { RoutineItem } from '../db/schema'
import { exerciseName, useT } from '../i18n'
import { useActiveProfile } from '../lib/useActiveProfile'

export default function RoutineEdit() {
  const { routineId } = useParams()
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile } = useActiveProfile()
  const profileId = profile?.id

  const [nameEn, setNameEn] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [items, setItems] = useState<RoutineItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const routine = useLiveQuery(() => (routineId ? getRoutine(routineId) : undefined), [routineId])
  const exercises = useLiveQuery(() => (profileId ? listExercises(profileId) : []), [profileId]) ?? []

  // Seed the form once. Re-syncing on every liveQuery emission would throw away
  // whatever the user is currently typing.
  useEffect(() => {
    if (loaded || !routineId || !routine) return
    setNameEn(routine.nameEn)
    setNameAr(routine.nameAr)
    setItems(routine.items)
    setLoaded(true)
  }, [routine, routineId, loaded])

  if (!profile) return null

  const save = async () => {
    if (!nameEn.trim() && !nameAr.trim()) {
      setError(t('routines.nameRequired'))
      return
    }
    if (items.length === 0) {
      setError(t('routines.needExercise'))
      return
    }

    // Mirror a single-language name across both fields, so the routine still has
    // something to show when the app is switched to the other language.
    await saveRoutine(profile.id, {
      id: routineId,
      nameEn: nameEn.trim() || nameAr.trim(),
      nameAr: nameAr.trim() || nameEn.trim(),
      items,
    })
    navigate('/routines', { replace: true })
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
  }

  const patch = (index: number, changes: Partial<RoutineItem>) => {
    setItems(items.map((item, i) => (i === index ? { ...item, ...changes } : item)))
  }

  return (
    <div>
      <PageHeader
        title={routineId ? t('routines.edit') : t('routines.new')}
        onBack="history"
        action={
          <button
            type="button"
            onClick={save}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 active:scale-95 transition-transform"
          >
            {t('common.save')}
          </button>
        }
      />

      <div className="space-y-4 px-4 py-4">
        <div className="card space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="name-ar">
              {t('routines.nameAr')}
            </label>
            <input
              id="name-ar"
              value={nameAr}
              onChange={(event) => {
                setNameAr(event.target.value)
                setError(null)
              }}
              dir="rtl"
              className="field"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="name-en">
              {t('routines.nameEn')}
            </label>
            <input
              id="name-en"
              value={nameEn}
              onChange={(event) => {
                setNameEn(event.target.value)
                setError(null)
              }}
              dir="ltr"
              className="field"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <section>
          <h2 className="section-title mb-2 px-1">
            {t('routines.exercises')}
          </h2>

          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={`${item.exerciseId}-${index}`} className="card p-4">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-50">
                    {exerciseName(
                      exercises.find((e) => e.id === item.exerciseId),
                      locale
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={t('workout.moveUp')}
                    className="rounded-lg p-1.5 text-ink-300 active:bg-ink-600 disabled:opacity-25"
                  >
                    <ChevronUp size={18} />
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={t('workout.moveDown')}
                    className="rounded-lg p-1.5 text-ink-300 active:bg-ink-600 disabled:opacity-25"
                  >
                    <ChevronDown size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                    aria-label={t('common.delete')}
                    className="rounded-lg p-1.5 text-ink-300 active:bg-ink-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <NumberField
                    label={t('routines.targetSets')}
                    value={item.targetSets}
                    onChange={(value) => patch(index, { targetSets: Math.round(value) })}
                  />
                  <NumberField
                    label={t('routines.targetReps')}
                    value={item.targetReps}
                    onChange={(value) => patch(index, { targetReps: Math.round(value) })}
                  />
                  <NumberField
                    label={t('routines.rest')}
                    value={item.restSeconds}
                    step={15}
                    onChange={(value) => patch(index, { restSeconds: Math.round(value) })}
                  />
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border
                       border-dashed border-ink-400 py-3.5 text-sm font-medium
                       text-brand-500 active:bg-ink-700"
          >
            <Plus size={18} />
            {t('routines.addExercise')}
          </button>
        </section>

        {routineId && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full py-3 text-sm font-medium text-red-400 active:opacity-60"
          >
            {t('common.delete')}
          </button>
        )}
      </div>

      <ExercisePicker
        open={pickerOpen}
        profileId={profile.id}
        onClose={() => setPickerOpen(false)}
        selectedIds={items.map((item) => item.exerciseId)}
        onPick={(exerciseId) => {
          setPickerOpen(false)
          setError(null)
          setItems([...items, { exerciseId, targetSets: 3, targetReps: 10, restSeconds: 90 }])
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t('routines.deleteConfirm')}
        body={t('common.confirmDelete')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false)
          if (routineId) await deleteRoutine(routineId)
          navigate('/routines', { replace: true })
        }}
      />
    </div>
  )
}
