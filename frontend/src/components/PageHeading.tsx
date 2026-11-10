// Shared page title/description/action component with focus management for client-side
// navigation.

import { useEffect, useRef, type ReactNode } from 'react'

// Render supplied props and focus the mounted heading via a DOM ref. tabIndex=-1 permits
// programmatic focus without adding another normal Tab stop.
export function PageHeading({
  title,
  description,
  action,
  compact = false,
}: {
  /** Kept for callers; no longer displayed (the title already names the page). */
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
  /** Tighter spacing and a smaller title for working pages where the content must fit. */
  compact?: boolean
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  return (
    <div
      className={`page-heading flex flex-wrap items-end justify-between gap-5 ${compact ? 'mb-5' : 'mb-7'}`}
    >
      <div>
        <h1
          ref={heading}
          id="page-heading"
          tabIndex={-1}
          className={`motion-enter motion-delay-1 font-display font-normal leading-[1.18] tracking-[-0.035em] text-ink outline-none ${compact ? 'text-[26px] sm:text-[28px]' : 'text-[28px] sm:text-[32px]'}`}
        >
          {title}
        </h1>
        <p className="motion-fade motion-delay-1 mt-2 max-w-xl text-sm leading-6 text-muted">
          {description}
        </p>
      </div>
      {action && <div className="motion-fade motion-delay-2">{action}</div>}
    </div>
  )
}
