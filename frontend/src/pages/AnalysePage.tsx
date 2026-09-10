import { useEffect, useState } from 'react'
import { ArrowRight, CircleHelp, Info, LockKeyhole, ScanLine, ShieldCheck } from 'lucide-react'
import { PageHeading } from '../components/PageHeading'
import { EmptyState, LoadingState } from '../components/States'
import { PreviewNotice } from '../components/PreviewNotice'
import { useCapabilities, useSubmitAnalysis } from '../lib/queries'
import { ApiError } from '../lib/api'
import { submissionError } from '../lib/submission'
import { AnalysisModeSelector } from '../components/analysis/AnalysisModeSelector'
import { QrImageInput } from '../components/analysis/QrImageInput'
import { AssessmentResult } from '../components/analysis/URLResult'
import {
  analysisActions,
  draftFields,
  type AnalysisMode,
  type DraftMode,
} from '../components/analysis/modes'
import { useLocation, useNavigate } from 'react-router-dom'

const inputLabels = { MESSAGE: 'Message', URL: 'URL', PHONE: 'Phone', QR: 'QR' } as const

function copiedAnalysisDraft(state: unknown) {
  if (!state || typeof state !== 'object' || !('analysisDraft' in state)) return null
  const draft = (state as { analysisDraft?: unknown }).analysisDraft
  if (!draft || typeof draft !== 'object') return null
  const candidate = draft as { inputType?: unknown; content?: unknown; sourceId?: unknown }
  if (
    !['MESSAGE', 'URL', 'PHONE'].includes(String(candidate.inputType)) ||
    typeof candidate.content !== 'string' ||
    typeof candidate.sourceId !== 'string'
  )
    return null
  return {
    inputType: candidate.inputType as DraftMode,
    content: candidate.content,
    sourceId: candidate.sourceId,
  }
}

export function AnalysePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [copiedDraft] = useState(() => copiedAnalysisDraft(location.state))
  const capabilities = useCapabilities()
  const submission = useSubmitAnalysis()
  const [inputType, setInputType] = useState<AnalysisMode>(copiedDraft?.inputType || 'MESSAGE')
  const [drafts, setDrafts] = useState<Record<DraftMode, string>>({
    MESSAGE: copiedDraft?.inputType === 'MESSAGE' ? copiedDraft.content : '',
    URL: copiedDraft?.inputType === 'URL' ? copiedDraft.content : '',
    PHONE: copiedDraft?.inputType === 'PHONE' ? copiedDraft.content : '',
  })
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [qrAttempted, setQrAttempted] = useState(false)
  const [touched, setTouched] = useState<Record<DraftMode, boolean>>({
    MESSAGE: false,
    URL: false,
    PHONE: false,
  })
  const [submitAttempted, setSubmitAttempted] = useState<Record<DraftMode, boolean>>({
    MESSAGE: false,
    URL: false,
    PHONE: false,
  })
  useEffect(() => {
    if (copiedDraft) navigate('/analyse', { replace: true, state: null })
  }, [copiedDraft, navigate])
  const content = inputType === 'QR' ? '' : drafts[inputType]
  const field = inputType === 'QR' ? null : draftFields[inputType]
  const setContent = (value: string) =>
    inputType !== 'QR' && setDrafts((previous) => ({ ...previous, [inputType]: value }))
  const action = analysisActions[inputType]
  const canStore = !capabilities.isError && capabilities.data?.submission_available === true
  const canAnalyseMessage =
    !capabilities.isError &&
    capabilities.data?.analysis_available === true &&
    capabilities.data.supported_inputs.includes('MESSAGE')
  const canAnalyseURL =
    !capabilities.isError &&
    capabilities.data?.analysis_available === true &&
    capabilities.data.supported_inputs.includes('URL')
  const canAnalysePhone =
    !capabilities.isError &&
    capabilities.data?.analysis_available === true &&
    capabilities.data.supported_inputs.includes('PHONE')
  const canAnalyseQR =
    !capabilities.isError &&
    capabilities.data?.analysis_available === true &&
    capabilities.data.supported_inputs.includes('QR')
  const availableIntelligence = [
    canAnalyseMessage ? 'Message' : null,
    canAnalyseURL ? 'URL' : null,
    canAnalysePhone ? 'Phone' : null,
    canAnalyseQR ? 'QR' : null,
  ].filter((value): value is string => value !== null)
  const intelligenceLabel = availableIntelligence.join(', ').replace(/, ([^,]*)$/, ' and $1')
  const available = canStore && capabilities.data?.submission_inputs.includes(inputType)
  const validation =
    inputType === 'QR'
      ? qrFile
        ? null
        : 'Choose a QR image to analyse.'
      : submissionError(inputType, content)
  const validationVisible =
    Boolean(validation) &&
    (inputType === 'QR' ? qrAttempted : touched[inputType] || submitAttempted[inputType])
  const reason = available
    ? validationVisible
      ? 'Correct the highlighted field to enable submission.'
      : validation
        ? `Add a valid ${inputType === 'MESSAGE' ? 'message' : inputType === 'URL' ? 'URL' : inputType === 'PHONE' ? 'international phone number' : 'QR image'} to enable submission.`
        : inputType === 'MESSAGE' && canAnalyseMessage
          ? 'Runs local message intelligence and records the result.'
          : inputType === 'URL' && canAnalyseURL
            ? 'Runs local URL intelligence without opening the website.'
            : inputType === 'PHONE' && canAnalysePhone
              ? 'Runs local phone-number metadata analysis without contacting the number.'
              : inputType === 'QR' && canAnalyseQR
                ? 'Decodes one QR locally and analyses supported content without opening it.'
                : 'Records the submission only. Intelligence is unavailable.'
    : action.reason
  return (
    <>
      <PageHeading
        eyebrow="FORENSIC INTELLIGENCE / ANALYSE"
        title="Analyse suspicious content"
        description="A dedicated workspace for messages, links, phone numbers and QR images."
      />
      {copiedDraft && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-accent/25 bg-accent-subtle px-5 py-4 text-sm text-body"
        >
          A copy of the saved {inputLabels[copiedDraft.inputType].toLowerCase()} input is ready to
          edit. Submitting creates a new analysis; the original record remains unchanged.
        </p>
      )}
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
                {availableIntelligence.length
                  ? `Local ${intelligenceLabel} intelligence is available.`
                  : 'Analysis is not enabled in this release.'}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {availableIntelligence.length
                  ? 'Messages, URLs, phone numbers and QR payloads receive local evidence-based assessments. Decoded content is never opened, websites are never fetched and phone numbers are never contacted.'
                  : canStore
                    ? 'Supported submissions can be recorded. No risk assessment is generated.'
                    : 'You can explore this workspace. No content is submitted and no risk assessment is generated.'}
              </p>
            </div>
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
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
              <form
                className="p-5 sm:p-6"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!available || submission.isPending) return
                  if (inputType === 'QR') {
                    setQrAttempted(true)
                    if (!qrFile) return
                    submission.mutate(
                      { input_type: 'QR', file: qrFile },
                      {
                        onSuccess: () => {
                          setQrFile(null)
                          setQrAttempted(false)
                        },
                      },
                    )
                    return
                  }
                  setSubmitAttempted((previous) => ({ ...previous, [inputType]: true }))
                  if (validation) return
                  const mode = inputType
                  submission.mutate(
                    { input_type: mode, content: content.trim() },
                    {
                      onSuccess: () => {
                        setDrafts((previous) => ({ ...previous, [mode]: '' }))
                        setTouched((previous) => ({ ...previous, [mode]: false }))
                        setSubmitAttempted((previous) => ({ ...previous, [mode]: false }))
                      },
                    },
                  )
                }}
              >
                <AnalysisModeSelector
                  value={inputType}
                  disabled={submission.isPending}
                  onChange={(mode) => {
                    setInputType(mode)
                    setQrAttempted(false)
                    submission.reset()
                  }}
                />
                <div
                  key={inputType}
                  id="analysis-panel"
                  role="tabpanel"
                  aria-labelledby={`mode-${inputType}`}
                  className="analysis-mode-panel motion-enter"
                >
                  {inputType === 'QR' ? (
                    <>
                      <QrImageInput
                        file={qrFile}
                        disabled={submission.isPending}
                        onChange={(file) => {
                          setQrFile(file)
                          setQrAttempted(false)
                        }}
                      />
                      {validationVisible && (
                        <p
                          role="alert"
                          className="validation-feedback -mt-3 mb-6 text-xs text-danger"
                        >
                          {validation}
                        </p>
                      )}
                    </>
                  ) : (
                    field && (
                      <>
                        {inputType === 'PHONE' && (
                          <div className="mb-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <h3 className="text-sm font-semibold">Number intelligence</h3>
                              <span className="status-chip">Local metadata</span>
                            </div>
                            <p className="text-xs leading-6 text-muted">
                              Enter an international number beginning with +. ScamGuard checks
                              numbering-plan metadata only; it never calls, messages or identifies
                              the subscriber.
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
                            disabled={!content || submission.isPending}
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
                            disabled={submission.isPending}
                            onChange={(event) => setContent(event.target.value)}
                            onBlur={() =>
                              setTouched((previous) => ({ ...previous, MESSAGE: true }))
                            }
                            placeholder={field.placeholder}
                            aria-describedby={`content-hint content-count unavailable-reason${validationVisible ? ' content-error' : ''}`}
                            aria-invalid={validationVisible || undefined}
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
                            disabled={submission.isPending}
                            onChange={(event) => setContent(event.target.value)}
                            onBlur={() =>
                              setTouched((previous) => ({ ...previous, [inputType]: true }))
                            }
                            maxLength={inputType === 'PHONE' ? field.limit : undefined}
                            placeholder={field.placeholder}
                            aria-describedby={`content-hint content-count unavailable-reason${validationVisible ? ' content-error' : ''}`}
                            aria-invalid={validationVisible || undefined}
                            autoComplete="off"
                            spellCheck={false}
                          />
                        )}
                        <div className="mb-6 mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
                          <p id="content-hint">
                            {inputType === 'PHONE'
                              ? 'Country calling code required. Spaces, hyphens and parentheses are accepted.'
                              : 'Avoid including passwords or sensitive personal details.'}
                          </p>
                          <span id="content-count" className="font-mono">
                            {content.length.toLocaleString()} / {field.limit.toLocaleString()}
                          </span>
                        </div>
                        {validationVisible && (
                          <p
                            id="content-error"
                            role="alert"
                            className="validation-feedback -mt-3 mb-6 text-xs text-danger"
                          >
                            {validation}
                          </p>
                        )}
                      </>
                    )
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                  <p className="flex max-w-[235px] items-start gap-2 text-[11px] leading-5 text-muted">
                    <LockKeyhole size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {available
                      ? inputType === 'QR'
                        ? 'The decoded payload and assessment are stored privately. The original image is discarded after in-memory decoding.'
                        : inputType === 'MESSAGE' && canAnalyseMessage
                          ? 'This analysis is stored in your private account history. Local analysis runs first; optional external contextual review remains disabled by default. Use non-sensitive content only.'
                          : inputType === 'PHONE'
                            ? 'The normalized number and assessment are stored in your private history. No external phone or identity lookup is performed.'
                            : 'This analysis is stored in your private account history. Other users cannot access it. Use non-sensitive content only.'
                      : 'Nothing is submitted while analysis is unavailable.'}
                  </p>
                  <button
                    type="submit"
                    className="button-primary"
                    disabled={!available || Boolean(validation) || submission.isPending}
                    aria-busy={submission.isPending}
                    aria-describedby="unavailable-reason"
                  >
                    <ScanLine size={16} aria-hidden="true" />
                    {submission.isPending
                      ? inputType === 'MESSAGE' && canAnalyseMessage
                        ? 'Analysing message…'
                        : inputType === 'URL' && canAnalyseURL
                          ? 'Analysing URL…'
                          : inputType === 'PHONE' && canAnalysePhone
                            ? 'Analysing phone number…'
                            : inputType === 'QR' && canAnalyseQR
                              ? 'Decoding QR image…'
                              : 'Recording submission…'
                      : action.label}
                    <ArrowRight size={15} className="motion-arrow" aria-hidden="true" />
                  </button>
                </div>
                <p id="unavailable-reason" className="mt-3 text-right text-[11px] text-muted">
                  {reason}
                </p>
                {submission.isPending && (
                  <p
                    role="status"
                    className="submission-pending loading-scan mt-4 text-sm text-muted"
                  >
                    {inputType === 'MESSAGE' && canAnalyseMessage
                      ? 'Running local message assessment…'
                      : inputType === 'URL' && canAnalyseURL
                        ? 'Running local URL assessment…'
                        : inputType === 'PHONE' && canAnalysePhone
                          ? 'Running local phone assessment…'
                          : inputType === 'QR' && canAnalyseQR
                            ? 'Validating image, decoding QR and routing its payload…'
                            : 'Recording your submission…'}
                  </p>
                )}
                {submission.data?.assessment && (
                  <a
                    href="#result-heading"
                    className="action-link mt-4 inline-flex min-h-11 items-center gap-2 rounded text-xs font-semibold text-accent"
                    onClick={() => document.getElementById('result-heading')?.focus()}
                  >
                    View assessment{' '}
                    <ArrowRight size={15} className="motion-arrow" aria-hidden="true" />
                  </a>
                )}
                {submission.isError && (
                  <div
                    role="alert"
                    className="mt-4 rounded-lg border border-warning/30 bg-warning-subtle p-4 text-sm text-warning"
                  >
                    <p>
                      We could not confirm your submission. Check your history before trying again.
                    </p>
                    <p className="mt-2 text-xs">{submission.error.message}</p>
                    {submission.error instanceof ApiError && submission.error.requestId && (
                      <p className="mt-2 break-all text-xs">
                        Reference: {submission.error.requestId}
                      </p>
                    )}
                  </div>
                )}
              </form>
            </section>
            <aside className="motion-enter motion-delay-2 min-w-0 space-y-5">
              <section className="panel overflow-hidden" aria-labelledby="result-heading">
                <div className="section-heading">
                  <span className="step-number">02</span>
                  <h2 id="result-heading" tabIndex={-1} className="text-sm font-semibold">
                    Analysis result
                  </h2>
                </div>
                {submission.isSuccess && (
                  <div
                    role="status"
                    className="submission-confirmation border-b border-line px-5 py-3 text-sm"
                  >
                    <p className="font-semibold text-accent">
                      {submission.data.assessment ? 'Analysis completed.' : 'Submission recorded.'}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {inputLabels[submission.data.input_type]} · {submission.data.status}
                    </p>
                    {!submission.data.assessment && (
                      <p className="mt-2 break-all font-mono text-[11px] text-muted">
                        {submission.data.id}
                      </p>
                    )}
                  </div>
                )}
                {submission.data?.failure_code && (
                  <p role="alert" className="p-5 text-xs text-warning">
                    The saved submission could not be assessed. Reference:{' '}
                    {submission.data.failure_code}
                  </p>
                )}
                {submission.isPending ? (
                  <div aria-hidden="true" className="p-5">
                    <div className="loading-scan h-40 rounded-lg border border-line bg-surface-raised" />
                    <div className="mt-4 h-3 w-2/3 rounded bg-line" />
                    <div className="mt-3 h-3 w-1/2 rounded bg-line" />
                  </div>
                ) : submission.data?.assessment ? (
                  <AssessmentResult
                    key={submission.data.id}
                    assessment={submission.data.assessment}
                    analysisId={submission.data.id}
                    content={submission.data.content}
                  />
                ) : (
                  <EmptyState icon={ShieldCheck} title="No assessment yet">
                    {submission.isSuccess
                      ? 'The submission was recorded without an assessment.'
                      : 'Submit a message, URL, phone number or QR image when intelligence is available. No safety verdict has been made.'}
                  </EmptyState>
                )}
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
