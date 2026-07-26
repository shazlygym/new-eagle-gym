import type { CSSProperties, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Position in the list; each step delays the entrance a little further. */
  index?: number
  className?: string
}

/** Milliseconds between successive items. Long enough to read as a sequence,
 *  short enough that the last item is on screen well inside a third of a second. */
const STEP = 45
const MAX_DELAY = 260

/**
 * Staggered entrance for a list or a stack of cards. `prefers-reduced-motion`
 * disables the animation entirely in index.css, so this stays safe to use
 * anywhere without a second code path.
 */
export default function Reveal({ children, index = 0, className = '' }: Props) {
  const style = { '--enter-delay': `${Math.min(index * STEP, MAX_DELAY)}ms` } as CSSProperties

  return (
    <div className={`enter ${className}`} style={style}>
      {children}
    </div>
  )
}
