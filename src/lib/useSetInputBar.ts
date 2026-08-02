import { create } from 'zustand'

/** The workout number cell that currently has focus, as the input bar sees it. */
export interface SetInputTarget {
  /** Identifies the field, so a stale blur cannot close a newer one. */
  key: string
  value: number
  /** One tap of −/+: a plate for weight, a rep for reps, five seconds for holds. */
  step: number
  min: number
  /** "kg", "reps", "RPE" — what the number on the bar is. */
  label: string
  /** True while another cell follows this one, so the bar can offer "next". */
  hasNext: boolean
  nudge: (delta: number) => void
}

interface SetInputBarState {
  target: SetInputTarget | null
  focus: (target: SetInputTarget) => void
  blur: (key: string) => void
}

/**
 * One bar, one focused cell. The set grid has six columns inside about 300px,
 * which leaves no room for −/+ beside a number — but the strip directly above
 * the on-screen keyboard is empty whenever you are typing, and that is exactly
 * when you want them. The focused cell publishes itself here; the bar renders
 * whatever is published.
 */
export const useSetInputBar = create<SetInputBarState>((set, get) => ({
  target: null,
  focus: (target) => set({ target }),
  // Only the field that is actually leaving may clear the bar. Moving between
  // cells fires the old field's blur and the new field's focus in one batch,
  // and an unconditional clear would race the arrival of the new target.
  blur: (key) => {
    if (get().target?.key === key) set({ target: null })
  },
}))

/**
 * Every workout number cell on the page, in reading order. The bar walks this
 * list rather than being handed its neighbours, so it keeps working across
 * cards, supersets and exercises added mid-session without any wiring.
 */
export function setInputCells(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>('input[data-set-cell]')]
}

/** Moves focus to the next cell in the workout. Returns false at the last one. */
export function focusNextSetCell(): boolean {
  const cells = setInputCells()
  const next = cells[cells.indexOf(document.activeElement as HTMLInputElement) + 1]
  if (!next) return false
  next.focus()
  next.select()
  return true
}
