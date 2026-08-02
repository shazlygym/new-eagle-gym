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
  /**
   * True when the numbers for this set are in and the only thing left is to log
   * it: the row is still unticked and this is not the first box in it. The bar
   * turns its "next" into a tick, so a row ends where you are already looking
   * instead of at a target somewhere behind the keyboard.
   */
  canLog: boolean
  /**
   * Writes an absolute value rather than a delta. A held −/+ fires faster than
   * the number can come back around through Dexie, so the bar keeps its own
   * running total and states it outright; a delta would land on whatever stale
   * value happened to have arrived by then.
   */
  set: (value: number) => void
}

interface SetInputBarState {
  target: SetInputTarget | null
  focus: (target: SetInputTarget) => void
  blur: (key: string) => void
  /**
   * How much of the bottom edge the bar is occupying, keyboard included — 0
   * when it is not showing. The rest timer lives at that same edge, and it
   * starts counting at the exact moment the bar appears over the next set, so
   * without this the countdown would begin its life hidden.
   */
  bottomInset: number
  setBottomInset: (px: number) => void
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
  bottomInset: 0,
  setBottomInset: (px) => {
    if (get().bottomInset !== px) set({ bottomInset: px })
  },
}))

/** One set: its number boxes and the tick that commits them. */
const ROW = '[data-set-row]'

/**
 * Every workout number cell on the page, in reading order. The bar walks this
 * list rather than being handed its neighbours, so it keeps working across
 * cards, supersets and exercises added mid-session without any wiring.
 */
export function setInputCells(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>('input[data-set-cell]')]
}

/**
 * Roughly how tall the bar is, for the one moment it has not rendered yet: the
 * first cell of a session is focused before the bar exists, so there is nothing
 * to measure, and guessing low would park that cell underneath it.
 */
const BAR_HEIGHT = 68

/**
 * Scrolls a cell clear of the bar, the keyboard and the pinned page header.
 *
 * `focus()` scrolls an element into the *layout* viewport, which on iOS counts
 * every pixel the keyboard is covering — so walking down a workout kept landing
 * on a box that was technically in view and actually behind the keys. The
 * visual viewport is the part you can see, and the bar stands inside it, so the
 * real floor is whichever of the two is higher up the screen.
 */
export function revealSetCell(el: HTMLElement) {
  const viewport = window.visualViewport
  const seen = viewport ? viewport.offsetTop + viewport.height : window.innerHeight
  // Everything pinned to the bottom edge, not just the bar: mid-workout the
  // rest timer is stacked on top of it and covers two more set rows.
  const bars = [...document.querySelectorAll('[data-set-input-bar], [data-rest-timer-bar]')]
  const floor = bars.length
    ? Math.min(...bars.map((bar) => bar.getBoundingClientRect().top))
    : seen - BAR_HEIGHT

  // Whichever header is pinned to the top, if any — not the first <header> in
  // the document, which on the workout screen belongs to an exercise card.
  const pinned = [...document.querySelectorAll('header')].find((node) => {
    const position = getComputedStyle(node).position
    return position === 'sticky' || position === 'fixed'
  })
  const ceiling = Math.max(0, pinned ? pinned.getBoundingClientRect().bottom : 0)

  const rect = el.getBoundingClientRect()
  const margin = 12
  const below = rect.bottom + margin - floor
  const above = ceiling + margin - rect.top
  if (below > 0) window.scrollBy({ top: below, behavior: 'smooth' })
  else if (above > 0) window.scrollBy({ top: -above, behavior: 'smooth' })
}

/**
 * Focus without the browser's own scrolling — the bar does that itself, once it
 * knows how much room the keyboard has left.
 */
function focusCell(cell: HTMLInputElement | undefined): boolean {
  if (!cell) return false
  cell.focus({ preventScroll: true })
  cell.select()
  return true
}

/** Moves focus to the next cell in the workout. Returns false at the last one. */
export function focusNextSetCell(): boolean {
  const cells = setInputCells()
  return focusCell(cells[cells.indexOf(document.activeElement as HTMLInputElement) + 1])
}

/**
 * Ticks the set the focused cell belongs to, then opens the next set's first
 * box — the two things that always happen together at the end of a row, minus
 * the reach down to the tick and the hunt for where to type next.
 *
 * Returns false when the cell is not inside a tickable row, so the caller can
 * fall back to plain "next".
 */
export function logCurrentRow(): boolean {
  const cell = document.activeElement as HTMLInputElement | null
  const row = cell?.closest?.(ROW)
  const tick = row?.querySelector<HTMLButtonElement>('[data-set-tick]')
  if (!cell || !row || !tick) return false

  tick.click()
  const cells = setInputCells()
  const next = cells.slice(cells.indexOf(cell) + 1).find((other) => other.closest(ROW) !== row)
  // The last set of the workout has nowhere to go, so the keyboard goes away.
  if (!focusCell(next)) cell.blur()
  return true
}
