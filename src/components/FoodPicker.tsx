import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createFood, listFoods, recentFoodIds, scaleFood } from '../db/repository'
import { FOOD_CATEGORIES } from '../db/foods'
import type { Food, FoodCategory } from '../db/schema'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'
import { normalizeSearch } from '../lib/exerciseSearch'
import MacroLine from './MacroLine'
import NewFoodSheet from './NewFoodSheet'
import NumberField from './NumberField'
import Sheet from './Sheet'

interface Props {
  open: boolean
  profileId: string
  onClose: () => void
  onPick: (food: Food, grams: number) => void
}

/**
 * Search the table, pick a household portion, log it. The portion step matters:
 * asking someone to estimate that a plate of koshari is 400 grams is how a food
 * log stops getting filled in.
 */
export default function FoodPicker({ open, profileId, onClose, onPick }: Props) {
  const { t, locale } = useT()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FoodCategory | 'all'>('all')
  const [selected, setSelected] = useState<Food | null>(null)
  const [creating, setCreating] = useState(false)

  const foods = useLiveQuery(() => listFoods(profileId), [profileId]) ?? []
  const recent = useLiveQuery(() => recentFoodIds(profileId), [profileId])

  const recentRank = useMemo(() => {
    const rank = new Map<string, number>()
    ;(recent ?? []).forEach((id, index) => rank.set(id, index))
    return rank
  }, [recent])

  const results = useMemo(() => {
    const needle = normalizeSearch(query)
    return foods
      .filter((food) => category === 'all' || food.category === category)
      .filter(
        (food) =>
          !needle ||
          normalizeSearch(food.nameAr).includes(needle) ||
          normalizeSearch(food.nameEn).includes(needle)
      )
      .sort((a, b) => {
        // What this member actually eats comes first, in the order they eat it.
        const rankA = recentRank.get(a.id) ?? Infinity
        const rankB = recentRank.get(b.id) ?? Infinity
        if (rankA !== rankB) return rankA - rankB
        // Then their own foods — added on purpose, so worth surfacing.
        if (a.isCustom !== b.isCustom) return b.isCustom - a.isCustom
        return foodName(a, locale).localeCompare(foodName(b, locale), locale)
      })
      .slice(0, 80)
  }, [foods, query, category, locale, recentRank])

  return (
    <>
      <Sheet open={open && !selected} onClose={onClose} title={t('nutrition.addFood')} tall>
        <div className="sticky top-0 -mx-5 -mt-2 bg-ink-700 px-5 pb-3 pt-2">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute inset-y-0 start-3 my-auto text-ink-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('nutrition.searchFood')}
              className="field ps-9"
            />
          </div>

          <div className="scroll-area -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            {(['all', ...FOOD_CATEGORIES] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`shrink-0 rounded-full px-3.5 py-2.5 text-xs font-medium transition-colors
                            ${
                              category === value
                                ? 'bg-brand-500 text-ink-950'
                                : 'bg-ink-600 text-ink-200'
                            }`}
              >
                {value === 'all' ? t('common.all') : t(`foodCat.${value}` as TranslationKey)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mb-2 flex w-full items-center gap-3 rounded-xl border border-dashed
                     border-ink-500 px-4 py-3 text-sm font-medium text-brand-400 active:bg-ink-600"
        >
          <Plus size={18} />
          {t('nutrition.newFood')}
        </button>

        {results.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-300">{t('nutrition.noResults')}</p>
        ) : (
          <ul className="space-y-1.5">
            {results.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => setSelected(food)}
                  className="flex w-full items-center gap-3 rounded-xl bg-ink-600 px-4 py-3 text-start active:bg-ink-500"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-50">
                      {foodName(food, locale)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-300">
                      <MacroLine
                        prefix={`${food.kcal} ${t('nutrition.kcalUnit')}`}
                        protein={food.protein}
                        carbs={food.carbs}
                        fat={food.fat}
                      />{' '}
                      · {t('nutrition.per100')}
                    </p>
                  </div>
                  {food.isCustom === 1 ? (
                    <span className="shrink-0 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold text-brand-400">
                      {t('exercises.custom')}
                    </span>
                  ) : recentRank.has(food.id) ? (
                    <span className="shrink-0 rounded-full bg-ink-500/60 px-2 py-0.5 text-[10px] font-semibold text-ink-200">
                      {t('nutrition.frequent')}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      {selected && (
        <PortionSheet
          food={selected}
          onClose={() => setSelected(null)}
          onConfirm={(grams) => {
            onPick(selected, grams)
            setSelected(null)
            setQuery('')
          }}
        />
      )}

      <NewFoodSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (input) => {
          const food = await createFood(profileId, input)
          setCreating(false)
          setSelected(food)
        }}
      />
    </>
  )
}

function PortionSheet({
  food,
  onClose,
  onConfirm,
}: {
  food: Food
  onClose: () => void
  onConfirm: (grams: number) => void
}) {
  const { t, locale } = useT()
  // Default to the first household portion when the food has one, because a
  // plate is what people know and 100 g is not.
  const [grams, setGrams] = useState(food.portions?.[0]?.grams ?? 100)

  const macros = scaleFood(food, grams)

  return (
    <Sheet open onClose={onClose} title={foodName(food, locale)}>
      <div className="space-y-4">
        {food.portions && food.portions.length > 0 && (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-200">
              {t('nutrition.portion')}
            </span>
            <div className="flex flex-wrap gap-2">
              {food.portions.map((portion) => (
                <button
                  key={portion.nameEn + portion.grams}
                  type="button"
                  onClick={() => setGrams(portion.grams)}
                  className={`rounded-full px-3.5 py-2.5 text-xs font-medium transition-colors
                              ${
                                grams === portion.grams
                                  ? 'bg-brand-500 text-ink-950'
                                  : 'bg-ink-600 text-ink-200'
                              }`}
                >
                  {locale === 'ar' ? portion.nameAr : portion.nameEn}
                  <span className="tabular ms-1 opacity-70" dir="ltr">
                    {portion.grams}
                    {t('common.g')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <NumberField label={t('nutrition.grams')} value={grams} onChange={setGrams} step={10} steppers />

        <div className="grid grid-cols-4 gap-2 rounded-xl bg-ink-800 p-3 text-center">
          <Macro label={t('nutrition.calories')} value={macros.kcal} accent />
          <Macro label={t('nutrition.protein')} value={macros.protein} />
          <Macro label={t('nutrition.carbs')} value={macros.carbs} />
          <Macro label={t('nutrition.fat')} value={macros.fat} />
        </div>

        <button
          type="button"
          disabled={grams <= 0}
          onClick={() => onConfirm(grams)}
          className="btn-primary w-full"
        >
          {t('nutrition.log')}
        </button>
      </div>
    </Sheet>
  )
}

function Macro({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] text-ink-300">{label}</p>
      <p className={`tabular text-base font-bold ${accent ? 'text-brand-400' : 'text-ink-50'}`}>
        {value}
      </p>
    </div>
  )
}

export function foodName(food: Food | undefined, locale: 'ar' | 'en'): string {
  if (!food) return '—'
  const preferred = locale === 'ar' ? food.nameAr : food.nameEn
  return preferred || food.nameEn || food.nameAr
}
