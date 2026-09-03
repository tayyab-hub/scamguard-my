import type { ReactNode } from 'react'

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow mb-3 flex items-center gap-2">
          <span aria-hidden="true" className="h-px w-5 bg-accent" />
          {eyebrow}
        </p>
        <h1
          id="page-heading"
          tabIndex={-1}
          className="font-display text-[32px] font-normal leading-[1.18] tracking-[-0.035em] text-ink outline-none sm:text-[40px]"
        >
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
