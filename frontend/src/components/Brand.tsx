import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 rounded-md" aria-label="SCAMGUARD home">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-accent bg-accent text-on-accent">
        <ShieldCheck size={23} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="text-[14px] font-bold tracking-[0.06em] text-ink">
        SCAMGUARD
        <span className="mt-1 block whitespace-nowrap font-mono text-[8px] font-medium tracking-[0.09em] text-muted">
          FORENSIC INTELLIGENCE
        </span>
      </span>
    </Link>
  )
}
