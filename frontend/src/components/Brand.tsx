// Reusable brand/home link used by AppShell; the shield graphic is decorative and does not
// assert a safety verdict.

import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

// Return the internal home link with an accessible name and the shared visual identity. The
// compact form (collapsed sidebar) shows only the mark; the accessible name stays the same.
export function Brand({
  compact = false,
  onDark = false,
}: {
  compact?: boolean
  /** Light wordmark for the dark sidebar. */
  onDark?: boolean
}) {
  return (
    <Link to="/" className="flex items-center gap-3 rounded-md" aria-label="SCAMGUARD home">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-accent bg-accent text-on-accent">
        <ShieldCheck size={23} strokeWidth={1.5} aria-hidden="true" />
      </span>
      {!compact && (
        <span
          className={`text-[15px] font-bold tracking-[0.04em] ${onDark ? 'text-surface' : 'text-ink'}`}
        >
          SCAMGUARD
        </span>
      )}
    </Link>
  )
}
