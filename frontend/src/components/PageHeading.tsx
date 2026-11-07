// Shared page title/description/action component with focus management for client-side
// navigation.

import { useEffect, useRef, type ReactNode } from 'react'

// Render supplied props and focus the mounted heading via a DOM ref. tabIndex=-1 permits
// programmatic focus without adding another normal Tab stop.
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  compact = false,
}: {
  eyebrow: string
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
      className={`page-heading flex flex-wrap items-end justify-between gap-5 ${compact ? 'page-heading-compact mb-5' : 'mb-8'}`}
    >
      <div>
        <p className="eyebrow motion-fade mb-3 flex items-center gap-2">
          <span aria-hidden="true" className="eyebrow-rule h-px w-5 bg-accent" />
          {eyebrow}
        </p>
        <h1
          ref={heading}
          id="page-heading"
          tabIndex={-1}
          className={`motion-enter motion-delay-1 font-display font-normal leading-[1.18] tracking-[-0.035em] text-ink outline-none ${compact ? 'text-[28px] sm:text-[32px]' : 'text-[32px] sm:text-[40px]'}`}
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
