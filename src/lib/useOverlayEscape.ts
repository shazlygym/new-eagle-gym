import { useEffect, useRef } from 'react'

// Every sheet and dialog listens for Escape on `window`, so with two of them
// open — the food picker with "add a new food" on top of it, the exercise card
// with its confirm dialog — one keypress reached both listeners and closed the
// lot. This keeps a stack of what is open and lets only the topmost overlay
// answer, which is what "Escape goes back one step" has to mean.
const stack: symbol[] = []

export function useOverlayEscape(open: boolean, onEscape: () => void): void {
  // Held in a ref, not a dependency: callers pass an inline arrow, so a
  // dependency would re-run the effect on every render and shuffle this
  // overlay back to the top of the stack even when something opened above it.
  const handler = useRef(onEscape)
  handler.current = onEscape

  useEffect(() => {
    if (!open) return

    const token = Symbol('overlay')
    stack.push(token)

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (stack[stack.length - 1] !== token) return
      handler.current()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      const index = stack.indexOf(token)
      if (index !== -1) stack.splice(index, 1)
    }
  }, [open])
}
