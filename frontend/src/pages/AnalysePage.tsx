import { useState } from 'react'
import { ArrowRight, CircleHelp, Info, LockKeyhole, ScanLine, ShieldCheck } from 'lucide-react'
import { PageHeading } from '../components/PageHeading'
import { EmptyState, LoadingState } from '../components/States'
import { PreviewNotice } from '../components/PreviewNotice'
import { useCapabilities } from '../lib/queries'
import { AnalysisModeSelector } from '../components/analysis/AnalysisModeSelector'
import { QrImageInput } from '../components/analysis/QrImageInput'
import {
  analysisActions,
  draftFields,
  type AnalysisMode,
  type DraftMode,
} from '../components/analysis/modes'

export function AnalysePage() {
  const capabilities = useCapabilities()
  const [inputType, setInputType] = useState<AnalysisMode>('MESSAGE')
  const [drafts, setDrafts] = useState<Record<DraftMode, string>>({
    MESSAGE: '',
    URL: '',
    PHONE: '',
  })
  const [qrFile, setQrFile] = useState<File | null>(null)
  const content = inputType === 'QR' ? '' : drafts[inputType]
  const field = inputType === 'QR' ? null : draftFields[inputType]
  const setContent = (value: string) =>
    inputType !== 'QR' && setDrafts((previous) => ({ ...previous, [inputType]: value }))
  const action = analysisActions[inputType]
  return (
    <>
      <PageHeading
        eyebrow="FORENSIC INTELLIGENCE / ANALYSE"
        title="Analyse suspicious content"
        description="A dedicated workspace for messages, links, phone numbers and QR images."
      />
      {capabilities.isPending ? (
        <LoadingState label="Checking analysis availability" />
      ) : (
        <>
          {capabilities.isError && (
            <PreviewNotice
              error={capabilities.error}
              onRetry={() => void capabilities.refetch()}
              retrying={capabilities.isFetching}
            >
              Analysis is unavailable. You can draft locally, but nothing is submitted.
            </PreviewNotice>
          )}
          <div
            className="motion-fade mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-subtle px-5 py-4"
            role="status"
          >
            <Info size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-warning">
                Analysis is not enabled in this release.
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                You can explore this workspace. No content is submitted and no risk assessment is
                generated.
              </p>
            </div>
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section
              className="panel motion-enter motion-delay-1 min-w-0 overflow-hidden"
              aria-labelledby="content-heading"
            >
              <div className="section-heading">
                <span className="step-number">01</span>
                <h2 id="content-heading" className="text-sm font-semibold">
                  Content to review
                </h2>
              </div>
              <form className="p-5 sm:p-6" onSubmit={(event) => event.preventDefault()}>
                <AnalysisModeSelector value={inputType} onChange={setInputType} />
                <div
                  key={inputType}
                  id="analysis-panel"
                  role="tabpanel"
                  aria-labelledby={`mode-${inputType}`}
                  className="analysis-mode-panel motion-enter"
                >
                  {inputType === 'QR' ? (
                    <QrImageInput file={qrFile} onChange={setQrFile} />
                  ) : (
                    field && (
                      <>
                        {inputType === 'PHONE' && (
                          <div className="mb-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <h3 className="text-sm font-semibold">Number intelligence</h3>
                              <span className="status-chip">Upcoming</span>
                            </div>
                            <p className="text-xs leading-6 text-muted">
                              Reputation and report-based phone analysis is planned for a later
                              milestone.
                            </p>
                          </div>
                        )}
                        <div className="mb-3 flex items-center justify-between">
                          <label
                            htmlFor="analysis-content"
                            className="text-xs font-medium text-body"
                          >
                            {field.label}
                          </label>
                          <button
                            type="button"
                            onClick={() => setContent('')}
                            disabled={!content}
                            className="button-quiet min-h-8 rounded px-2 py-1 text-xs text-muted hover:text-ink disabled:cursor-not-allowed"
                          >
                            Clear
                          </button>
                        </div>
                        {inputType === 'MESSAGE' ? (
                          <textarea
                            id="analysis-content"
                            className="input-field min-h-[205px] resize-y"
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            maxLength={field.limit}
                            placeholder={field.placeholder}
                            aria-describedby="content-hint content-count"
                            autoComplete="off"
                            spellCheck={false}
                          />
                        ) : (
                          <input
                            id="analysis-content"
                            type={inputType === 'PHONE' ? 'tel' : 'url'}
                            inputMode={inputType === 'PHONE' ? 'tel' : 'url'}
                            className="input-field"
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            maxLength={field.limit}
                            placeholder={field.placeholder}
                            aria-describedby="content-hint content-count"
                            autoComplete="off"
                            spellCheck={false}
                          />
                        )}
                        <div className="mb-6 mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
                          <p id="content-hint">
                            {inputType === 'PHONE'
                              ? 'Malaysian and international formats welcome. Keep the country code, if known.'
                              : 'Avoid including passwords or sensitive personal details.'}
                          </p>
                          <span id="content-count" className="font-mono">
                            {content.length.toLocaleString()} / {field.limit.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                  <p className="flex max-w-[235px] items-start gap-2 text-[11px] leading-5 text-muted">
                    <LockKeyhole size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Nothing is submitted while analysis is unavailable.
                  </p>
                  <button
                    type="submit"
                    className="button-primary"
                    disabled
                    aria-describedby="unavailable-reason"
                  >
                    <ScanLine size={16} aria-hidden="true" />
                    {action.label}
                    <ArrowRight size={15} className="motion-arrow" aria-hidden="true" />
                  </button>
                </div>
                <p id="unavailable-reason" className="mt-3 text-right text-[11px] text-muted">
                  {action.reason}
                </p>
              </form>
            </section>
            <aside className="motion-enter motion-delay-2 space-y-5">
              <section className="panel overflow-hidden" aria-labelledby="result-heading">
                <div className="section-heading">
                  <span className="step-number">02</span>
                  <h2 id="result-heading" className="text-sm font-semibold">
                    Analysis result
                  </h2>
                </div>
                <EmptyState icon={ShieldCheck} title="No assessment yet">
                  Results will appear here when the analysis service is available. No safety verdict
                  has been made.
                </EmptyState>
              </section>
              <section className="rounded-lg border border-line bg-surface-raised/60 p-5">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <CircleHelp size={17} className="text-accent" aria-hidden="true" />A moment of
                  caution
                </h2>
                <p className="mt-3 text-xs leading-6 text-muted">
                  Check unexpected requests through a contact channel you already trust. A familiar
                  name alone does not confirm who sent a message.
                </p>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  )
}
