// Shown in the result panel while an analysis runs: a pulsing radar with a sweeping line and the
// local checks for the chosen input type. The steps light up in turn as a visual cue only; they
// do not claim that any check has finished. The whole graphic is decorative (the input panel's
// status line announces progress), and it is still under reduced motion.

import { ShieldCheck } from 'lucide-react'
import type { AnalysisMode } from './modes'

const STEPS: Record<AnalysisMode, string[]> = {
  MESSAGE: ['Reading the language', 'Checking links offline', 'Checking phone numbers offline'],
  URL: ['Reading the address structure', 'Checking the domain', 'Combining the evidence'],
  PHONE: ['Reading the number', 'Checking numbering metadata', 'Combining the evidence'],
  QR: ['Decoding the QR code', 'Identifying its content', 'Checking what it points to'],
}

export function ScanningIndicator({ mode }: { mode: AnalysisMode }) {
  return (
    <div className="scan-stage" aria-hidden="true">
      <div className="scan-radar">
        <span className="scan-ring scan-ring-1" />
        <span className="scan-ring scan-ring-2" />
        <span className="scan-ring scan-ring-3" />
        <span className="scan-sweep" />
        <span className="scan-core">
          <ShieldCheck size={26} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-5 text-center text-[13px] font-medium text-ink">Running local checks</p>
      <ul className="scan-steps mt-3">
        {STEPS[mode].map((step) => (
          <li key={step} className="scan-step">
            <span className="scan-step-dot" />
            {step}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-[12px] text-muted">
        Links are never opened and numbers are never called.
      </p>
    </div>
  )
}
