// Fades and lifts its content into place once, on first render. Used to stage a result: verdict
// first, then the next step, then the details. Under reduced motion (or where motion cannot be
// detected) the content simply renders in place with no animation.

import type { ReactNode } from 'react'
import * as m from 'motion/react-m'
import { EASE_EMPHASIZED, useMotionAllowed } from '../../lib/motion'

export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const allowed = useMotionAllowed()
  return (
    <m.div
      className={className}
      initial={allowed ? { opacity: 0, y } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE_EMPHASIZED }}
    >
      {children}
    </m.div>
  )
}

// A quick spring "pop" for an icon (the verdict shield).
export function Pop({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const allowed = useMotionAllowed()
  return (
    <m.span
      className={className}
      style={{ display: 'inline-flex' }}
      initial={allowed ? { opacity: 0, scale: 0.4 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 16, delay }}
    >
      {children}
    </m.span>
  )
}
