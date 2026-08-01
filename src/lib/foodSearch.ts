import type { Food } from '../db/schema'
import { normalizeSearch } from './exerciseSearch'

/**
 * Words that mean the same plate. `normalizeSearch` already folds hamza, ya and
 * ta-marbuta, so this is only for the cases spelling rules cannot reach: what a
 * dish is called here versus what it is called in the dictionary, and the
 * English name someone types with an Arabic keyboard off.
 *
 * Deliberately absent: بطاطس / بطاطا. They look like a spelling variant and are
 * two different vegetables with different macros — aliasing them would quietly
 * log the wrong food.
 */
const SYNONYM_GROUPS: string[][] = [
  ['فراخ', 'دجاج', 'chicken'],
  ['لحمه', 'لحم', 'beef', 'meat'],
  ['كبده', 'كبد', 'liver'],
  ['رومي', 'تركي', 'turkey'],
  ['سمك', 'fish'],
  ['جمبري', 'روبيان', 'shrimp'],
  ['تونه', 'تونا', 'tuna'],
  ['بيض', 'egg'],
  ['لبن', 'حليب', 'milk'],
  ['زبادي', 'روب', 'yoghurt', 'yogurt'],
  ['جبنه', 'جبن', 'cheese'],
  ['زبده', 'butter'],
  ['سمنه', 'ghee'],
  ['عيش', 'خبز', 'bread'],
  ['رز', 'ارز', 'rice'],
  ['مكرونه', 'باستا', 'pasta'],
  ['شوفان', 'oats'],
  ['طعميه', 'فلافل', 'falafel'],
  ['فول', 'foul', 'fava'],
  ['عدس', 'lentil'],
  ['حمص', 'chickpea', 'hummus'],
  ['فاصوليا', 'beans'],
  ['كشري', 'koshari'],
  ['ملوخيه', 'molokhia'],
  ['محشي', 'stuffed'],
  ['مسقعه', 'mesa'],
  ['بامية', 'okra'],
  ['طماطم', 'اوطه', 'بندوره', 'tomato'],
  ['خيار', 'cucumber'],
  ['بصل', 'onion'],
  ['ثوم', 'garlic'],
  ['جزر', 'carrot'],
  ['خس', 'lettuce'],
  ['سبانخ', 'spinach'],
  ['كرنب', 'ملفوف', 'cabbage'],
  ['قرنبيط', 'زهره', 'cauliflower'],
  ['مشروم', 'فطر', 'mushroom'],
  ['تفاح', 'apple'],
  ['موز', 'banana'],
  ['برتقال', 'orange'],
  ['مانجا', 'مانجو', 'mango'],
  ['عنب', 'grape'],
  ['بطيخ', 'watermelon'],
  ['فراوله', 'فريز', 'strawberry'],
  ['بلح', 'تمر', 'عجوه', 'date'],
  ['ليمون', 'لمون', 'lemon'],
  ['رمان', 'pomegranate'],
  ['لوز', 'almond'],
  ['عين جمل', 'جوز', 'walnut'],
  ['كاجو', 'cashew'],
  ['فستق', 'pistachio'],
  ['سوداني', 'peanut'],
  ['زيت', 'oil'],
  ['عسل', 'honey'],
  ['سكر', 'sugar'],
  ['شيكولاته', 'شوكولاته', 'chocolate'],
  ['بسكوت', 'بسكويت', 'biscuit'],
  ['قهوه', 'كافيه', 'coffee'],
  ['شاي', 'tea'],
  ['عصير', 'juice'],
  ['مياه', 'ميه', 'ماء', 'water'],
  ['برجر', 'برغر', 'همبرجر', 'burger'],
  ['بيتزا', 'pizza'],
  ['شاورما', 'shawarma'],
  ['بروتين', 'واي', 'whey', 'protein'],
  ['مكمل', 'supplement'],
]

/** Normalised term → every term it should also match, itself included. */
const ALIASES = (() => {
  const map = new Map<string, string[]>()
  for (const group of SYNONYM_GROUPS) {
    const terms = [...new Set(group.map(normalizeSearch))]
    for (const term of terms) {
      const existing = map.get(term)
      if (existing) existing.push(...terms.filter((other) => !existing.includes(other)))
      else map.set(term, terms)
    }
  }
  return map
})()

/** Everything one food can be found by, normalised once and cached by caller. */
export function foodHaystack(food: Food): string {
  return `${normalizeSearch(food.nameAr)} ${normalizeSearch(food.nameEn)}`
}

/**
 * Each word the member typed, expanded to its synonyms. Splitting into words is
 * what makes "فراخ صدور" find the same food as "صدور فراخ" — a single substring
 * test makes word order matter, which nobody expects from a search box.
 */
export function foodQueryTerms(query: string): string[][] {
  const needle = normalizeSearch(query)
  if (!needle) return []
  return needle
    .split(' ')
    .filter(Boolean)
    .map((token) => ALIASES.get(token) ?? [token])
}

/** Every word must match something; each word may match by any of its synonyms. */
export function matchesFoodQuery(haystack: string, terms: string[][]): boolean {
  return terms.every((alternatives) => alternatives.some((term) => haystack.includes(term)))
}

/**
 * 0 for a name that starts with what was typed, 1 for one that merely contains
 * it. With 479 foods, "فول" has to put فول مدمس above فول سوداني بالزبدة.
 */
export function foodMatchRank(haystack: string, terms: string[][]): number {
  const first = terms[0]
  if (!first) return 1
  return first.some((term) => haystack.startsWith(term)) ? 0 : 1
}
