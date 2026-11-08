// Counts a number up from zero once, when it first appears. With reduced motion (or where motion
// cannot be detected) the final value is shown straight away. The displayed text always ends on
// the exact stored value; only the visual run-up is animated. A small requestAnimationFrame loop
// keeps this out of the animation library's bundle.

import { useEffect, useState } from 'react'
import { useMotionAllowed } from '../../lib/motion'

// Quick start, gentle finish (ease-out expo).
const easeOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

export function CountUp({
  value,
  duration = 0.9,
  delay = 0,
  format = (n: number) => n.toLocaleString(),
}: {
  value: number
  duration?: number
  /** Seconds to hold at zero first, so the count starts once its block is visible. */
  delay?: number
  format?: (n: number) => string
}) {
  const allowed = useMotionAllowed()
  // null means "show the final value".
  const [shown, setShown] = useState<number | null>(() => (allowed && value > 0 ? 0 : null))

  useEffect(() => {
    if (!allowed || value <= 0) return
    let frame = 0
    const start = performance.now() + delay * 1000
    const tick = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - start) / (duration * 1000)))
      if (progress >= 1) {
        setShown(null)
        return
      }
      setShown(Math.round(value * easeOut(progress)))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      setShown(null)
    }
  }, [allowed, value, duration, delay])

  return <>{format(allowed && shown !== null ? shown : value)}</>
}
