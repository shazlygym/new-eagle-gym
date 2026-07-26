import { useState } from 'react'
import type { Equipment, MuscleGroup } from '../db/schema'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'
import Sheet from './Sheet'

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'cardio',
  'fullBody',
]

export const EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'other',
]

export interface NewExerciseInput {
  nameEn: string
  nameAr: string
  muscleGroup: MuscleGroup
  equipment: Equipment
}

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (input: NewExerciseInput) => Promise<void>
}

/**
 * Shared by the Exercises library and the in-workout picker — hitting an
 * exercise the app doesn't know about happens mid-session, at the rack, and
 * shouldn't mean abandoning the workout to go and add it.
 */
export default function NewExerciseSheet({ open, onClose, onCreate }: Props) {
  const { t } = useT()
  const [nameEn, setNameEn] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('chest')
  const [equipment, setEquipment] = useState<Equipment>('barbell')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!nameEn.trim() && !nameAr.trim()) {
      setError(t('exercises.nameRequired'))
      return
    }
    // One name is enough — it stands in for the other language rather than
    // leaving a blank row after a language switch.
    await onCreate({
      nameEn: nameEn.trim() || nameAr.trim(),
      nameAr: nameAr.trim() || nameEn.trim(),
      muscleGroup,
      equipment,
    })
    setNameEn('')
    setNameAr('')
    setError(null)
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('exercises.new')}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-dark-200" htmlFor="ex-ar">
            {t('exercises.nameAr')}
          </label>
          <input
            id="ex-ar"
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
          <label className="mb-1.5 block text-xs font-medium text-dark-200" htmlFor="ex-en">
            {t('exercises.nameEn')}
          </label>
          <input
            id="ex-en"
            value={nameEn}
            onChange={(event) => {
              setNameEn(event.target.value)
              setError(null)
            }}
            dir="ltr"
            className="field"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-dark-200">
            {t('exercises.group')}
          </span>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMuscleGroup(value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors
                            ${muscleGroup === value ? 'bg-gold-500 text-dark-900' : 'bg-dark-700 text-dark-200'}`}
              >
                {t(`group.${value}` as TranslationKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-dark-200">
            {t('exercises.equipment')}
          </span>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setEquipment(value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors
                            ${equipment === value ? 'bg-gold-500 text-dark-900' : 'bg-dark-700 text-dark-200'}`}
              >
                {t(`equipment.${value}` as TranslationKey)}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button type="button" onClick={submit} className="btn-primary w-full">
          {t('exercises.create')}
        </button>
      </div>
    </Sheet>
  )
}
