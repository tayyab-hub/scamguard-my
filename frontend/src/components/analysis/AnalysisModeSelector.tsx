import { useRef } from 'react'
import { analysisModes, type AnalysisMode } from './modes'

export function AnalysisModeSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: AnalysisMode
  onChange: (value: AnalysisMode) => void
  disabled?: boolean
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  return (
    <div className="mb-6">
      <p id="content-type-label" className="mb-3 text-xs font-medium text-body">
        Content type
      </p>
      <div
        role="tablist"
        aria-labelledby="content-type-label"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {analysisModes.map(({ type, label, icon: Icon, planned }, index) => (
          <button
            key={type}
            ref={(element) => {
              buttons.current[index] = element
            }}
            id={`mode-${type}`}
            type="button"
            disabled={disabled}
            role="tab"
            aria-selected={value === type}
            aria-controls="analysis-panel"
            aria-description={
              planned ? 'Planned analysis mode; analysis is unavailable.' : undefined
            }
            tabIndex={value === type ? 0 : -1}
            className={`content-option min-w-0 text-left ${value === type ? 'content-option-selected font-semibold' : ''}`}
            onClick={() => onChange(type)}
            onKeyDown={(event) => {
              let next: number
              if (event.key === 'ArrowRight') next = (index + 1) % analysisModes.length
              else if (event.key === 'ArrowLeft')
                next = (index - 1 + analysisModes.length) % analysisModes.length
              else if (event.key === 'Home') next = 0
              else if (event.key === 'End') next = analysisModes.length - 1
              else return
              event.preventDefault()
              onChange(analysisModes[next]!.type)
              buttons.current[next]?.focus()
            }}
          >
            <Icon size={17} className="shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
