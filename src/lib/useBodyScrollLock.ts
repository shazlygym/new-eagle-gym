import { useEffect } from 'react'

/**
 * Holds the page still while an overlay is open.
 *
 * Each sheet used to do this for itself: save `document.body.style.overflow` on
 * open, put the saved value back on close. That is correct for one overlay and
 * silently wrong for two. The exercise picker and its "new exercise" sheet are
 * open at the same time, and creating an exercise closes both in the same
 * commit — React runs the outer cleanup first, which restores `''`, and then the
 * inner one, which restores the `'hidden'` it had captured. The page is left
 * permanently unscrollable with nothing on screen to explain why.
 *
 * A count cannot get that wrong. The first overlay in locks, the last one out
 * unlocks, and the order they close in stops mattering.
 */
let holders = 0

/** The page's own overflow, captured once before the first overlay touched it. */
let restore = ''

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return

    if (holders === 0) {
      restore = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    holders += 1

    return () => {
      // Never below zero: a stuck negative count would mean the next overlay to
      // close unlocks nothing, which is the bug this exists to prevent.
      holders = Math.max(0, holders - 1)
      if (holders === 0) document.body.style.overflow = restore
    }
  }, [active])
}
