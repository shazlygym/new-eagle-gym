import type { SetType } from '../db/schema'
import type { TranslationKey } from '../i18n/en'

// Set types exist so the log says what actually happened. A warm-up single at
// 60kg and a drop set to failure at 60kg are not the same event, and treating
// them alike is how volume numbers stop meaning anything.

/** Badge shown in place of the set number. `null` means "show the number". */
export const SET_TYPE_BADGE: Record<SetType, string | null> = {
  warmup: 'W',
  working: null,
  drop: 'D',
  failure: 'F',
}

export const SET_TYPE_STYLE: Record<SetType, string> = {
  warmup: 'bg-sky-500/15 text-sky-300',
  working: 'text-ink-200',
  drop: 'bg-violet-500/15 text-violet-300',
  failure: 'bg-red-500/15 text-red-300',
}

export const SET_TYPE_LABEL: Record<SetType, TranslationKey> = {
  warmup: 'setType.warmup',
  working: 'setType.working',
  drop: 'setType.drop',
  failure: 'setType.failure',
}

/** Tapping the set number walks through the types — faster than a menu mid-set. */
const CYCLE: SetType[] = ['working', 'warmup', 'drop', 'failure']

export function nextSetType(current: SetType): SetType {
  return CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]
}

/** Warm-ups are excluded from volume, records and progression. */
export function countsAsWork(type: SetType): boolean {
  return type !== 'warmup'
}
