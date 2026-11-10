// Four-mode Analyse workspace. Keep editable drafts and QR selection in local React state until
// explicit submission, check backend capabilities, and render the saved response through
// AssessmentResult. Loading/error/empty states never substitute fixture results.

import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Camera,
  Check,
  CircleHelp,
  ImageUp,
  Info,
  LockKeyhole,
  RotateCcw,
  ScanLine,
} from 'lucide-react'
import { PageHeading } from '../components/PageHeading'
import { EmptyState, LoadingState } from '../components/States'
import { PreviewNotice } from '../components/PreviewNotice'
import { useCapabilities, useSubmitAnalysis } from '../lib/queries'
import { ApiError } from '../lib/api'
import { submissionError } from '../lib/submission'
import { AnalysisModeSelector } from '../components/analysis/AnalysisModeSelector'
import { QrImageInput } from '../components/analysis/QrImageInput'
import { QrCameraInput } from '../components/analysis/QrCameraInput'
import type { CameraPayload } from '../lib/qrDecoder'
import { AssessmentResult } from '../components/analysis/URLResult'
import {
  analysisActions,
  draftFields,
  type AnalysisMode,
  type DraftMode,
} from '../components/analysis/modes'
import { useLocation, useNavigate } from 'react-router-dom'
import { ResultFeedback } from '../components/ResultFeedback'
import { ScanningIndicator } from '../components/analysis/ScanningIndicator'
import { motionAllowed } from '../lib/motion'

const inputLabels = { MESSAGE: 'Message', URL: 'URL', PHONE: 'Phone', QR: 'QR' } as const
// Shortest time the scanning radar stays visible once an analysis starts (motion allowed only).
const MIN_SCAN_MS = 700
const examples = {
  MESSAGE:
    'Your account will be suspended today. Send your password and verification code now to keep access. Visit https://example.com/verify.',
  URL: 'https://example.com/sign-in?source=sample',
  PHONE: '+44 20 7946 0958',
} as const
const modeGuidance = {
  MESSAGE: 'Review language, requests and contextual warning signs in a suspicious message.',
  URL: 'Check a website address for structural warning signs without visiting it.',
  PHONE: 'Review international numbering metadata. A number alone cannot establish scam intent.',
  QR: 'Reveal encoded content and assess supported payloads before acting on them.',
}

// Validate router state copied from an owned history detail. Only Message/URL/Phone text can
// become a draft; submitting it creates a new record rather than editing its source.
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

// Coordinate mode selection, validation, explicit submit and result display. Props on child
// inputs carry values and callbacks; useState keeps each draft across renders and
// useSubmitAnalysis owns request status.
export function AnalysePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [copiedDraft] = useState(() => copiedAnalysisDraft(location.state))
  const capabilities = useCapabilities()
  const submission = useSubmitAnalysis()
  // Keep the scanning radar up for a short minimum so a very fast analysis does not just flash
  // it for one frame. Only when motion is allowed; reduced motion shows the result at once.
  const [scanHold, setScanHold] = useState(false)
  const scanStartedAt = useRef(0)
  const submit: typeof submission.mutate = (variables, options) => {
    scanStartedAt.current = performance.now()
    if (motionAllowed()) setScanHold(true)
    submission.mutate(variables, {
      ...options,
      onSettled: (...args) => {
        const remaining = MIN_SCAN_MS - (performance.now() - scanStartedAt.current)
        window.setTimeout(() => setScanHold(false), Math.max(0, remaining))
        options?.onSettled?.(...args)
      },
    })
  }
  const [inputType, setInputType] = useState<AnalysisMode>(() => {
    const mode = new URLSearchParams(location.search).get('mode')
    return (
      copiedDraft?.inputType ||
      (mode && Object.hasOwn(inputLabels, mode) ? (mode as AnalysisMode) : 'MESSAGE')
    )
  })
  const [drafts, setDrafts] = useState<Record<DraftMode, string>>({
    MESSAGE: copiedDraft?.inputType === 'MESSAGE' ? copiedDraft.content : '',
    URL: copiedDraft?.inputType === 'URL' ? copiedDraft.content : '',
    PHONE: copiedDraft?.inputType === 'PHONE' ? copiedDraft.content : '',
  })
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [qrSource, setQrSource] = useState<'UPLOAD' | 'CAMERA'>('UPLOAD')
  const [cameraPayload, setCameraPayload] = useState<CameraPayload | null>(null)
  const [sampleMode, setSampleMode] = useState<AnalysisMode | null>(null)
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
  // Consume the copied draft once, then clear its navigation state so a later visit does not
  // replay private content.
  useEffect(() => {
    if (copiedDraft) navigate('/analyse', { replace: true, state: null })
  }, [copiedDraft, navigate])
  // When a new assessment arrives, bring the result into view and move focus to its heading so
  // keyboard and screen-reader users land on it too. Reduced-motion users get an instant jump.
  const resultId = submission.data?.assessment ? submission.data.id : null
  useEffect(() => {
    if (!resultId) return
    const heading = document.getElementById('result-heading')
    if (!heading) return
    heading.focus({ preventScroll: true })
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const panel = heading.closest('section')
    if (panel && typeof panel.scrollIntoView === 'function')
      panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [resultId])
  const content = inputType === 'QR' ? '' : drafts[inputType]
  const field = inputType === 'QR' ? null : draftFields[inputType]
  const setContent = (value: string) => {
    setSampleMode(null)
    if (inputType !== 'QR') setDrafts((previous) => ({ ...previous, [inputType]: value }))
  }
  const action = analysisActions[inputType]
  // A rendered tab is only a presentation choice. Submission also requires storage/capability
  // data from the connected service, and errors must not enable a stale capability.
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
      ? (qrSource === 'CAMERA' ? cameraPayload : qrFile)
        ? null
        : qrSource === 'CAMERA'
          ? 'Scan a QR code, then review its decoded content.'
          : 'Choose a QR image to analyse.'
      : submissionError(inputType, content)
  const validationVisible =
    Boolean(validation) &&
    (inputType === 'QR' ? qrAttempted : touched[inputType] || submitAttempted[inputType])
  const reason = available
    ? validationVisible
      ? 'Correct the highlighted field to enable submission.'
      : validation
        ? inputType === 'QR' && qrSource === 'CAMERA'
          ? 'Scan a QR code to enable submission.'
          : `Add a valid ${inputType === 'MESSAGE' ? 'message' : inputType === 'URL' ? 'URL' : inputType === 'PHONE' ? 'international phone number' : 'QR image'} to enable submission.`
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
        description="Check the evidence before you click, reply, call or pay."
        compact
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
            className={`motion-fade mb-5 flex items-start gap-2.5 rounded-lg border px-4 py-2.5 ${availableIntelligence.length ? 'border-line bg-surface-raised' : 'border-warning/30 bg-warning-subtle'}`}
            role="status"
          >
            <Info size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
            <p className="min-w-0 text-xs leading-5 text-muted">
              <span className="font-medium text-body">
                {availableIntelligence.length
                  ? `${intelligenceLabel} intelligence is available.`
                  : 'Analysis is not enabled in this release.'}
              </span>{' '}
              {availableIntelligence.length
                ? capabilities.data?.reason
                : canStore
                  ? 'Supported submissions can be recorded. No risk assessment is generated.'
                  : 'You can explore this workspace. No content is submitted and no risk assessment is generated.'}
            </p>
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <section
              className="panel motion-enter motion-delay-1 min-w-0 overflow-hidden"
              aria-labelledby="content-heading"
            >
              <div className="section-heading">
                <h2 id="content-heading" className="text-sm font-semibold">
                  Content to review
                </h2>
              </div>
              <form
                className="p-5"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  // The event handler prevents normal form navigation and blocks duplicates
                  // while pending. QR chooses payload JSON or multipart image; other modes send
                  // trimmed text. Success clears only the submitted draft.
                  if (!available || submission.isPending) return
                  if (inputType === 'QR') {
                    setQrAttempted(true)
                    if (qrSource === 'CAMERA') {
                      if (!cameraPayload) return
                      submit(
                        { input_type: 'QR', ...cameraPayload },
                        {
                          onSuccess: () => {
                            setCameraPayload(null)
                            setQrAttempted(false)
                          },
                        },
                      )
                      return
                    }
                    if (!qrFile) return
                    submit(
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
                  // Capture the submitted mode for the asynchronous success callback; clearing
                  // the correct draft must not depend on a later render's state.
                  const mode = inputType
                  submit(
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
                    setCameraPayload(null)
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
                  <p className="mb-3 text-xs leading-5 text-muted">{modeGuidance[inputType]}</p>
                  {inputType === 'QR' ? (
                    <>
                      <div
                        className="qr-source-selector mb-5 grid grid-cols-2 gap-2"
                        role="group"
                        aria-label="QR input method"
                      >
                        <button
                          type="button"
                          className="button-secondary"
                          aria-pressed={qrSource === 'UPLOAD'}
                          disabled={submission.isPending}
                          onClick={() => {
                            setQrSource('UPLOAD')
                            setCameraPayload(null)
                            setQrAttempted(false)
                          }}
                        >
                          <ImageUp size={16} aria-hidden="true" /> Upload image
                        </button>
                        <button
                          type="button"
                          className="button-secondary"
                          aria-pressed={qrSource === 'CAMERA'}
                          disabled={submission.isPending}
                          onClick={() => {
                            setQrSource('CAMERA')
                            setQrFile(null)
                            setQrAttempted(false)
                          }}
                        >
                          <Camera size={16} aria-hidden="true" /> Scan with camera
                        </button>
                      </div>
                      {qrSource === 'CAMERA' ? (
                        <QrCameraInput
                          value={cameraPayload}
                          onChange={setCameraPayload}
                          disabled={submission.isPending}
                          onUpload={() => {
                            setQrSource('UPLOAD')
                            setCameraPayload(null)
                          }}
                        />
                      ) : (
                        <QrImageInput
                          file={qrFile}
                          disabled={submission.isPending}
                          onChange={(file) => {
                            setQrFile(file)
                            setQrAttempted(false)
                          }}
                        />
                      )}
                      {validationVisible && (
                        <p
                          role="alert"
                          className="validation-feedback -mt-2 mb-4 text-xs text-danger"
                        >
                          {validation}
                        </p>
                      )}
                    </>
                  ) : (
                    field && (
                      <>
                        <div className="mb-2 flex items-center justify-between">
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
                            className="input-field min-h-[120px] resize-y"
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
                        <div className="mb-4 mt-2 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
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
                            className="validation-feedback -mt-2 mb-4 text-xs text-danger"
                          >
                            {validation}
                          </p>
                        )}
                      </>
                    )
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {inputType !== 'QR' && (
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={submission.isPending}
                      onClick={() => {
                        setContent(examples[inputType])
                        setSampleMode(inputType)
                        submission.reset()
                      }}
                    >
                      Try an example
                    </button>
                  )}
                  <button
                    type="submit"
                    className="button-primary ml-auto"
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
                              ? qrSource === 'CAMERA'
                                ? 'Analysing QR payload…'
                                : 'Decoding QR image…'
                              : 'Recording submission…'
                      : action.label}
                    <ArrowRight size={15} className="motion-arrow" aria-hidden="true" />
                  </button>
                </div>
                {sampleMode === inputType && inputType !== 'QR' && (
                  <p role="status" className="mt-2 text-[12px] leading-5 text-muted">
                    Example input · results come from the real analysis pipeline.
                  </p>
                )}
                <p
                  id="unavailable-reason"
                  className="mt-2 text-right text-[12px] text-muted empty:hidden"
                >
                  {reason}
                </p>
                <p className="mt-4 flex items-start gap-2 border-t border-line pt-3 text-[12px] leading-5 text-muted">
                  <LockKeyhole size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {available
                    ? inputType === 'QR'
                      ? qrSource === 'CAMERA'
                        ? 'Only the decoded payload and assessment are saved to your private history. No camera image is uploaded.'
                        : 'The decoded payload and assessment are stored privately. The original image is discarded after in-memory decoding.'
                      : inputType === 'MESSAGE' && canAnalyseMessage
                        ? 'This analysis is stored in your private account history. Local analysis runs first; optional external contextual review remains disabled by default. Use non-sensitive content only.'
                        : inputType === 'PHONE'
                          ? 'The normalized number and assessment are stored in your private history. No external phone or identity lookup is performed.'
                          : 'This analysis is stored in your private account history. Other users cannot access it. Use non-sensitive content only.'
                    : 'Nothing is submitted while analysis is unavailable.'}
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
                            ? qrSource === 'CAMERA'
                              ? 'Validating and analysing the decoded payload…'
                              : 'Validating image, decoding QR and routing its payload…'
                            : 'Recording your submission…'}
                  </p>
                )}
                {submission.data?.assessment && (
                  <a
                    href="#result-heading"
                    className="action-link mt-4 inline-flex min-h-11 items-center gap-2 rounded text-xs font-semibold text-accent xl:hidden"
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
              <section
                className="panel scroll-mt-20 overflow-hidden"
                aria-labelledby="result-heading"
              >
                <div className="section-heading result-heading-row">
                  <h2 id="result-heading" tabIndex={-1} className="text-sm font-semibold">
                    Analysis result
                  </h2>
                  {submission.isSuccess && (
                    <>
                      <p role="status" className="result-status-chip">
                        <Check size={12} aria-hidden="true" />
                        <span>
                          {submission.data.assessment
                            ? 'Analysis completed.'
                            : 'Submission recorded.'}
                        </span>
                        <span className="text-muted">
                          {inputLabels[submission.data.input_type]}
                          {submission.data.assessment
                            ? ''
                            : ` · ${submission.data.status.toLowerCase()}`}
                        </span>
                      </p>
                      <button
                        type="button"
                        className="button-secondary ml-auto !min-h-10 !px-3"
                        onClick={() => {
                          submission.reset()
                          setSampleMode(null)
                          document.getElementById('analysis-content')?.focus()
                        }}
                      >
                        <RotateCcw size={14} aria-hidden="true" /> Analyse another
                      </button>
                    </>
                  )}
                </div>
                {submission.isSuccess && !submission.data.assessment && (
                  <p className="break-all border-b border-line px-5 py-2 font-mono text-[12px] text-muted">
                    {submission.data.id}
                  </p>
                )}
                {submission.data?.failure_code && (
                  <p role="alert" className="p-5 text-xs text-warning">
                    The saved submission could not be assessed. Reference:{' '}
                    {submission.data.failure_code}
                  </p>
                )}
                {submission.isPending || scanHold ? (
                  <ScanningIndicator mode={inputType} />
                ) : submission.data?.assessment ? (
                  <>
                    <AssessmentResult
                      key={submission.data.id}
                      assessment={submission.data.assessment}
                      analysisId={submission.data.id}
                      content={submission.data.content}
                    />
                    <ResultFeedback
                      key={`feedback-${submission.data.id}`}
                      analysisId={submission.data.id}
                      initial={submission.data.user_feedback}
                    />
                    <p className="result-caution">
                      <CircleHelp size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="font-semibold text-body">A moment of caution:</span> a
                        familiar name alone does not confirm who sent a message; check through a
                        channel you already trust.
                      </span>
                    </p>
                  </>
                ) : (
                  <EmptyState icon={ScanLine} title="No assessment yet">
                    {submission.isSuccess
                      ? 'The submission was recorded without an assessment.'
                      : 'Submit a message, URL, phone number or QR image when intelligence is available. No safety verdict has been made.'}
                  </EmptyState>
                )}
              </section>
              {!submission.data?.assessment && (
                <section className="rounded-lg border border-line bg-surface-raised/60 p-5">
                  <h2 className="flex items-center gap-2 text-sm font-medium">
                    <CircleHelp size={17} className="text-accent" aria-hidden="true" />A moment of
                    caution
                  </h2>
                  <p className="mt-3 text-xs leading-6 text-muted">
                    Check unexpected requests through a contact channel you already trust. A
                    familiar name alone does not confirm who sent a message.
                  </p>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </>
  )
}
