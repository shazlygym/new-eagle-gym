import { useState } from 'react'
import { FOOD_CATEGORIES } from '../db/foods'
import type { FoodCategory } from '../db/schema'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'
import NumberField from './NumberField'
import Sheet from './Sheet'

export interface NewFoodInput {
  nameAr: string
  nameEn: string
  category: FoodCategory
  kcal: number
  protein: number
  carbs: number
  fat: number
}

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (input: NewFoodInput) => Promise<void>
}

/**
 * For anything the built-in table doesn't cover — your mother's cooking, a
 * supplement, a packaged product whose label you can read off the back.
 */
export default function NewFoodSheet({ open, onClose, onCreate }: Props) {
  const { t } = useT()
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [category, setCategory] = useState<FoodCategory>('egyptian')
  const [kcal, setKcal] = useState(0)
  const [protein, setProtein] = useState(0)
  const [carbs, setCarbs] = useState(0)
  const [fat, setFat] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!nameAr.trim() && !nameEn.trim()) {
      setError(t('exercises.nameRequired'))
      return
    }
    await onCreate({
      nameAr: nameAr.trim() || nameEn.trim(),
      nameEn: nameEn.trim() || nameAr.trim(),
      category,
      kcal,
      protein,
      carbs,
      fat,
    })
    setNameAr('')
    setNameEn('')
    setKcal(0)
    setProtein(0)
    setCarbs(0)
    setFat(0)
    setError(null)
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('nutrition.newFood')} tall>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="food-ar">
            {t('nutrition.foodName')}
          </label>
          <input
            id="food-ar"
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
          <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="food-en">
            {t('exercises.nameEn')}
          </label>
          <input
            id="food-en"
            value={nameEn}
            onChange={(event) => setNameEn(event.target.value)}
            dir="ltr"
            className="field"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-200">
            {t('nutrition.foodCategory')}
          </span>
          <div className="flex flex-wrap gap-2">
            {FOOD_CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors
                            ${category === value ? 'bg-brand-500 text-white' : 'bg-ink-600 text-ink-200'}`}
              >
                {t(`foodCat.${value}` as TranslationKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Everything is per 100 g so the numbers can be copied straight off a
            package label without any conversion. */}
        <div className="grid grid-cols-2 gap-3">
          <NumberField label={t('nutrition.kcalPer100')} value={kcal} onChange={setKcal} step={10} />
          <NumberField label={t('nutrition.proteinPer100')} value={protein} onChange={setProtein} />
          <NumberField label={t('nutrition.carbsPer100')} value={carbs} onChange={setCarbs} />
          <NumberField label={t('nutrition.fatPer100')} value={fat} onChange={setFat} />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button type="button" onClick={submit} className="btn-primary w-full">
          {t('nutrition.createFood')}
        </button>
      </div>
    </Sheet>
  )
}
