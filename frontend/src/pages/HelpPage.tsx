import { useMemo, useState } from 'react'
import { BookOpen, ExternalLink, LifeBuoy, Mail, Search, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeading } from '../components/PageHeading'
import { getSupportEmail } from '../lib/env'

const faqs = [
  [
    'How is the risk score calculated?',
    'Message shows its existing fusion score multiplied by 100 and rounded. URL shows an ordinal category index. Phone and unsupported or payment-only QR results show no numeric score. A QR routed to Message or URL preserves that engine’s presentation. No displayed scale is a scam percentage; use the risk level and evidence.',
  ],
  [
    'How is confidence different from risk?',
    'Confidence describes model and evidence strength for Message, and uncalibrated classifier strength for URL. Phone numbering metadata does not produce a caller-fraud confidence value. Confidence never measures certainty of fraud.',
  ],
  [
    'What does SCAMGUARD do today?',
    'When the configured API and database are available, it assesses Messages, URLs without opening the website, international phone numbers using offline numbering metadata, and QR images through local decoding and conservative payload routing.',
  ],
  [
    'Does an assessment prove content is safe or fraudulent?',
    'No. Risk and confidence are decision support based on limited available evidence. They are not proof, a guarantee or professional advice.',
  ],
  [
    'Why is analysis unavailable?',
    'Message, URL, Phone and QR intelligence require the configured API, database and their local components. QR readiness also requires the bundled decoder.',
  ],
  [
    'Can I analyse a phone number?',
    'Yes. Enter an international number beginning with + and its country calling code. ScamGuard normalizes it and checks offline numbering-plan format, region, validity and service type. It does not call the number, identify its subscriber or use an external reputation service.',
  ],
  [
    'Can I upload a QR image?',
    'Yes. One supported raster image is uploaded to the authenticated backend, validated and decoded in memory. The original image is discarded; its decoded payload, SHA-256 fingerprint, dimensions and assessment may be stored in your private history.',
  ],
  [
    'Which QR image formats are accepted?',
    'One non-empty PNG, JPG/JPEG or WebP image up to 5 MB and 4096 × 4096 pixels is accepted. SVG is rejected. Actual file content and declared type must agree.',
  ],
  [
    'Does SCAMGUARD open QR content?',
    'No. Decoded URLs, phone, SMS, email, Wi-Fi, geographic, payment and other content remain inert text. ScamGuard never automatically navigates, launches another application, executes content or fetches a decoded website.',
  ],
  [
    'Can a valid payment QR prove the recipient is legitimate?',
    'No. Supported EMV-style parsing can report fields and CRC consistency. CRC checks formatting integrity only; it cannot verify the merchant, account owner, business legitimacy or whether a payment is safe.',
  ],
  [
    'Does SCAMGUARD open submitted links?',
    'No. URL intelligence analyses the URL string and structure locally. It never browses, fetches, renders or scans the webpage. Avoid visiting suspicious URLs merely to test them.',
  ],
  [
    'What URL format is required?',
    'Enter a full http:// or https:// URL, up to 2,048 characters. HTTPS encrypts a connection but does not prove the destination is trustworthy. Embedded credentials are removed before storage, but avoid submitting secrets in paths or queries.',
  ],
  [
    'What information should I avoid submitting?',
    'Do not include passwords, authentication codes, financial details, identity documents or sensitive personal information.',
  ],
  [
    'Who can see stored submissions?',
    'Each submitted Message, URL, Phone or QR analysis belongs to the signed-in account. Other normal users cannot list, open or delete it. Pre-account development records remain unowned and are hidden from every user.',
  ],
  [
    'What account information is stored?',
    'SCAMGUARD stores your normalized email address, a one-way Argon2id password hash, server-side session records and the analyses linked to your account. It never stores your plaintext password.',
  ],
  [
    'Can I remove my data?',
    'You can delete an individual analysis from Overview. Account settings can permanently delete the account, its active sessions and all analyses linked to it after password confirmation.',
  ],
  [
    'Is submitted content sent to an external AI service?',
    'No external AI is required. Contextual external review remains optional and disabled by default for Message analysis. Phone numbers are never sent to that optional service; Phone Intelligence uses only bundled local numbering metadata.',
  ],
  [
    'Why are dashboard values unavailable?',
    'Values remain unavailable when persistence cannot be verified. SCAMGUARD never fills those states with invented statistics.',
  ],
  [
    'What should I do about an urgent suspicious request?',
    'Pause, avoid links or payments, and verify the request through a contact channel you already trust. Contact the relevant provider or authorities when needed.',
  ],
  [
    'How do I report a technical problem?',
    'Use the feedback form on this page. It prepares a message for the configured support address without sending data automatically.',
  ],
  [
    'Why should I check history after an error?',
    'A network response can fail after storage succeeds. Checking history helps avoid creating an accidental duplicate submission.',
  ],
  [
    'Is this a replacement for professional advice?',
    'No. The workspace supports careful review but does not replace advice from law enforcement, financial institutions or qualified professionals.',
  ],
] as const

const categories = [
  'Bug report',
  'Accessibility issue',
  'Documentation',
  'General feedback',
] as const

export function HelpPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [summary, setSummary] = useState('')
  const [details, setDetails] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [prepared, setPrepared] = useState(false)
  const supportEmail = getSupportEmail()
  const filteredFaqs = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return term
      ? faqs.filter(([question, answer]) =>
          `${question} ${answer}`.toLocaleLowerCase().includes(term),
        )
      : faqs
  }, [query])
  const categoryError = attempted && !category ? 'Choose a feedback category.' : ''
  const summaryError = attempted && !summary.trim() ? 'Enter a short summary.' : ''
  const detailsError =
    attempted && !details.trim() ? 'Describe what happened or what could improve.' : ''
  const feedbackValid = Boolean(category && summary.trim() && details.trim())
  const mailto = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent(`[SCAMGUARD] ${category}: ${summary.trim()}`)}&body=${encodeURIComponent(details.trim())}`
    : ''

  return (
    <>
      <PageHeading
        eyebrow="FORENSIC INTELLIGENCE / SUPPORT"
        title="Help & Support"
        description="Understand the current workspace, review safer next steps and prepare useful feedback."
      />

      <section className="grid gap-4 md:grid-cols-3" aria-label="How SCAMGUARD works">
        {[
          [
            '01',
            'Choose content',
            'Use Message for an evidence-based assessment, analyse a URL without visiting it, check a phone number without contacting it, or upload one QR image for local decoding and conservative payload analysis.',
          ],
          [
            '02',
            'Review before sharing',
            'Remove passwords, codes, financial details and other sensitive information.',
          ],
          [
            '03',
            'Read the result carefully',
            'Risk and classifier confidence are separate signals. Assessments are advisory; HTTPS does not guarantee safety.',
          ],
        ].map(([step, title, copy]) => (
          <article key={step} className="panel p-5 sm:p-6">
            <span className="step-number">{step}</span>
            <h2 className="mt-4 text-base font-semibold">{title}</h2>
            <p className="mt-2 text-xs leading-6 text-muted">{copy}</p>
          </article>
        ))}
      </section>

      <section className="panel mt-6 p-5 sm:p-6" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="text-sm font-semibold">
          Privacy in this academic prototype
        </h2>
        <p className="mt-3 max-w-4xl text-xs leading-6 text-muted">
          Secure accounts store a full name, normalized username and email alongside an Argon2id
          password hash. Analysis records are persisted in Neon PostgreSQL and shown through your
          Overview, Analysis History and expanded Analysis Detail. The FastAPI service returns only
          records owned by your authenticated account; other users cannot access them. Completed
          results remain immutable for forensic integrity. You may delete your own record or choose
          Analyse again to copy its input into a new editable draft and create a fresh result. Full
          name and username are editable on Account; email remains read-only until verified email
          changes are supported. Never submit passwords, one-time codes, payment credentials,
          recovery phrases, identity documents or highly sensitive personal information. Uploaded QR
          images are decoded in memory and discarded; their SHA-256 fingerprint, dimensions, decoded
          payload and assessment may remain in private history. QR content is never opened or
          executed, decoded URLs retain the no-fetch guarantee, and payment QR structure cannot
          prove recipient legitimacy.
        </p>
      </section>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="panel overflow-hidden" aria-labelledby="faq-heading">
          <div className="section-heading">
            <BookOpen size={18} className="text-accent" aria-hidden="true" />
            <h2 id="faq-heading" className="text-sm font-semibold">
              Frequently asked questions
            </h2>
          </div>
          <div className="p-5 sm:p-6">
            <label htmlFor="help-search" className="text-xs font-medium text-body">
              Search help
            </label>
            <div className="relative mt-2">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                id="help-search"
                type="search"
                className="input-field pl-11"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions and guidance"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted" role="status" aria-live="polite">
              {filteredFaqs.length} {filteredFaqs.length === 1 ? 'answer' : 'answers'} available
            </p>
            <div className="mt-5 divide-y divide-line border-y border-line">
              {filteredFaqs.map(([question, answer]) => (
                <details key={question} className="faq-disclosure group rounded-lg py-1">
                  <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded px-2 py-3 text-sm font-semibold text-ink focus-visible:outline-2">
                    {question}
                    <span className="text-accent" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="px-2 pb-4 pr-8 text-xs leading-6 text-muted">{answer}</p>
                </details>
              ))}
              {!filteredFaqs.length && (
                <p className="py-8 text-sm text-muted">No help articles match that search.</p>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="panel p-5" aria-labelledby="quick-links-heading">
            <h2 id="quick-links-heading" className="flex items-center gap-2 text-sm font-semibold">
              <LifeBuoy size={17} className="text-accent" aria-hidden="true" /> Quick links
            </h2>
            <div className="mt-4 grid gap-2">
              <Link to="/" className="button-secondary justify-between">
                Open Overview <ExternalLink size={14} aria-hidden="true" />
              </Link>
              <Link to="/analyse" className="button-secondary justify-between">
                Open Analyse <ExternalLink size={14} aria-hidden="true" />
              </Link>
            </div>
          </section>
          <section
            className="rounded-lg border border-warning/30 bg-warning-subtle p-5"
            aria-labelledby="safety-heading"
          >
            <h2
              id="safety-heading"
              className="flex items-center gap-2 text-sm font-semibold text-warning"
            >
              <ShieldAlert size={17} aria-hidden="true" /> If you may be at risk
            </h2>
            <p className="mt-3 text-xs leading-6 text-muted">
              Stop contact, avoid payments and verify the request through a channel you already
              trust. Contact your provider or the appropriate authorities for urgent help.
            </p>
          </section>
        </aside>
      </div>

      <section className="panel mt-6 overflow-hidden" aria-labelledby="feedback-heading">
        <div className="section-heading">
          <Mail size={18} className="text-accent" aria-hidden="true" />
          <h2 id="feedback-heading" className="text-sm font-semibold">
            Product feedback
          </h2>
        </div>
        <form
          noValidate
          className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            setAttempted(true)
            setPrepared(feedbackValid && Boolean(supportEmail))
          }}
        >
          <div>
            <label htmlFor="feedback-category" className="text-xs font-medium text-body">
              Category
            </label>
            <select
              id="feedback-category"
              className="input-field mt-2"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setPrepared(false)
              }}
              aria-invalid={Boolean(categoryError) || undefined}
              aria-describedby={categoryError ? 'feedback-category-error' : undefined}
            >
              <option value="">Choose a category</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            {categoryError && (
              <p id="feedback-category-error" className="mt-2 text-xs text-danger">
                {categoryError}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="feedback-summary" className="text-xs font-medium text-body">
              Summary
            </label>
            <input
              id="feedback-summary"
              className="input-field mt-2"
              maxLength={120}
              value={summary}
              onChange={(event) => {
                setSummary(event.target.value)
                setPrepared(false)
              }}
              aria-invalid={Boolean(summaryError) || undefined}
              aria-describedby={summaryError ? 'feedback-summary-error' : undefined}
            />
            {summaryError && (
              <p id="feedback-summary-error" className="mt-2 text-xs text-danger">
                {summaryError}
              </p>
            )}
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="feedback-details" className="text-xs font-medium text-body">
              Details
            </label>
            <textarea
              id="feedback-details"
              className="input-field mt-2 min-h-32 resize-y"
              maxLength={2000}
              value={details}
              onChange={(event) => {
                setDetails(event.target.value)
                setPrepared(false)
              }}
              aria-invalid={Boolean(detailsError) || undefined}
              aria-describedby={`feedback-privacy${detailsError ? ' feedback-details-error' : ''}`}
            />
            {detailsError && (
              <p id="feedback-details-error" className="mt-2 text-xs text-danger">
                {detailsError}
              </p>
            )}
            <p id="feedback-privacy" className="mt-2 text-[11px] leading-5 text-muted">
              Do not include scam content, passwords, account details or other sensitive
              information. This form stays in your browser until you choose to open your email app.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
            <button type="submit" className="button-primary">
              Prepare feedback
            </button>
            {prepared && supportEmail && (
              <a className="button-secondary" href={mailto}>
                Open email app
              </a>
            )}
            {!supportEmail && (
              <p className="text-xs text-muted">
                Online feedback is being prepared. No message will be sent from this page.
              </p>
            )}
            {attempted && feedbackValid && !supportEmail && (
              <p role="status" className="sr-only">
                Feedback service is unavailable.
              </p>
            )}
          </div>
        </form>
      </section>
    </>
  )
}
