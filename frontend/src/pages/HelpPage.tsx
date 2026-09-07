import { useMemo, useState } from 'react'
import { BookOpen, ExternalLink, LifeBuoy, Mail, Search, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeading } from '../components/PageHeading'
import { getSupportEmail } from '../lib/env'

const faqs = [
  ['What does SCAMGUARD do today?', 'When the configured API and database are available, it assesses Message submissions with local machine learning and explainable indicators. URL submissions receive a local model and structural evidence assessment without opening the website.'],
  ['Does an assessment prove content is safe or fraudulent?', 'No. Risk and confidence are decision support based on limited available evidence. They are not proof, a guarantee or professional advice.'],
  ['Why is analysis unavailable?', 'Message and URL intelligence require the configured API and database. Other intelligence modes remain planned.'],
  ['Can I analyse a phone number?', 'You can draft a phone number locally. Phone reputation and intelligence are not implemented and the draft is not submitted.'],
  ['Can I upload a QR image?', 'You can select one supported image locally. The browser does not read, decode, upload or save it.'],
  ['Which QR image formats are accepted?', 'The local selector accepts one non-empty PNG, JPG, JPEG or WEBP image up to 5 MB.'],
  ['Does SCAMGUARD open submitted links?', 'No. URL intelligence analyses the URL string and structure locally. It never browses, fetches, renders or scans the webpage. Avoid visiting suspicious URLs merely to test them.'],
  ['What URL format is required?', 'Enter a full http:// or https:// URL, up to 2,048 characters. HTTPS encrypts a connection but does not prove the destination is trustworthy. Embedded credentials are removed before storage, but avoid submitting secrets in paths or queries.'],
  ['What information should I avoid submitting?', 'Do not include passwords, authentication codes, financial details, identity documents or sensitive personal information.'],
  ['Who can see stored submissions?', 'This development workspace has no user accounts. Anyone with access to the backend may be able to view stored submissions.'],
  ['Why are dashboard values unavailable?', 'Values remain unavailable when persistence cannot be verified. SCAMGUARD never fills those states with invented statistics.'],
  ['What should I do about an urgent suspicious request?', 'Pause, avoid links or payments, and verify the request through a contact channel you already trust. Contact the relevant provider or authorities when needed.'],
  ['How do I report a technical problem?', 'Use the feedback form on this page. It prepares a message for the configured support address without sending data automatically.'],
  ['Why should I check history after an error?', 'A network response can fail after storage succeeds. Checking history helps avoid creating an accidental duplicate submission.'],
  ['Is this a replacement for professional advice?', 'No. The workspace supports careful review but does not replace advice from law enforcement, financial institutions or qualified professionals.'],
] as const

const categories = ['Bug report', 'Accessibility issue', 'Documentation', 'General feedback'] as const

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
      ? faqs.filter(([question, answer]) => `${question} ${answer}`.toLocaleLowerCase().includes(term))
      : faqs
  }, [query])
  const categoryError = attempted && !category ? 'Choose a feedback category.' : ''
  const summaryError = attempted && !summary.trim() ? 'Enter a short summary.' : ''
  const detailsError = attempted && !details.trim() ? 'Describe what happened or what could improve.' : ''
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
          ['01', 'Choose content', 'Use Message for an evidence-based assessment, analyse a URL without visiting it, or explore planned Phone and QR interfaces locally.'],
          ['02', 'Review before sharing', 'Remove passwords, codes, financial details and other sensitive information.'],
          ['03', 'Read the result carefully', 'Risk and classifier confidence are separate signals. Assessments are advisory; HTTPS does not guarantee safety.'],
        ].map(([step, title, copy]) => (
          <article key={step} className="panel p-5 sm:p-6">
            <span className="step-number">{step}</span>
            <h2 className="mt-4 text-base font-semibold">{title}</h2>
            <p className="mt-2 text-xs leading-6 text-muted">{copy}</p>
          </article>
        ))}
      </section>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="panel overflow-hidden" aria-labelledby="faq-heading">
          <div className="section-heading">
            <BookOpen size={18} className="text-accent" aria-hidden="true" />
            <h2 id="faq-heading" className="text-sm font-semibold">Frequently asked questions</h2>
          </div>
          <div className="p-5 sm:p-6">
            <label htmlFor="help-search" className="text-xs font-medium text-body">Search help</label>
            <div className="relative mt-2">
              <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
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
                <details key={question} className="group py-1">
                  <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded px-2 py-3 text-sm font-semibold text-ink focus-visible:outline-2">
                    {question}<span className="text-accent" aria-hidden="true">+</span>
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
              <Link to="/" className="button-secondary justify-between">Open Overview <ExternalLink size={14} aria-hidden="true" /></Link>
              <Link to="/analyse" className="button-secondary justify-between">Open Analyse <ExternalLink size={14} aria-hidden="true" /></Link>
            </div>
          </section>
          <section className="rounded-lg border border-warning/30 bg-warning-subtle p-5" aria-labelledby="safety-heading">
            <h2 id="safety-heading" className="flex items-center gap-2 text-sm font-semibold text-warning">
              <ShieldAlert size={17} aria-hidden="true" /> If you may be at risk
            </h2>
            <p className="mt-3 text-xs leading-6 text-muted">Stop contact, avoid payments and verify the request through a channel you already trust. Contact your provider or the appropriate authorities for urgent help.</p>
          </section>
        </aside>
      </div>

      <section className="panel mt-6 overflow-hidden" aria-labelledby="feedback-heading">
        <div className="section-heading">
          <Mail size={18} className="text-accent" aria-hidden="true" />
          <h2 id="feedback-heading" className="text-sm font-semibold">Product feedback</h2>
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
            <label htmlFor="feedback-category" className="text-xs font-medium text-body">Category</label>
            <select id="feedback-category" className="input-field mt-2" value={category} onChange={(event) => { setCategory(event.target.value); setPrepared(false) }} aria-invalid={Boolean(categoryError) || undefined} aria-describedby={categoryError ? 'feedback-category-error' : undefined}>
              <option value="">Choose a category</option>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
            {categoryError && <p id="feedback-category-error" className="mt-2 text-xs text-danger">{categoryError}</p>}
          </div>
          <div>
            <label htmlFor="feedback-summary" className="text-xs font-medium text-body">Summary</label>
            <input id="feedback-summary" className="input-field mt-2" maxLength={120} value={summary} onChange={(event) => { setSummary(event.target.value); setPrepared(false) }} aria-invalid={Boolean(summaryError) || undefined} aria-describedby={summaryError ? 'feedback-summary-error' : undefined} />
            {summaryError && <p id="feedback-summary-error" className="mt-2 text-xs text-danger">{summaryError}</p>}
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="feedback-details" className="text-xs font-medium text-body">Details</label>
            <textarea id="feedback-details" className="input-field mt-2 min-h-32 resize-y" maxLength={2000} value={details} onChange={(event) => { setDetails(event.target.value); setPrepared(false) }} aria-invalid={Boolean(detailsError) || undefined} aria-describedby={`feedback-privacy${detailsError ? ' feedback-details-error' : ''}`} />
            {detailsError && <p id="feedback-details-error" className="mt-2 text-xs text-danger">{detailsError}</p>}
            <p id="feedback-privacy" className="mt-2 text-[11px] leading-5 text-muted">Do not include scam content, passwords, account details or other sensitive information. This form stays in your browser until you choose to open your email app.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
            <button type="submit" className="button-primary">Prepare feedback</button>
            {prepared && supportEmail && <a className="button-secondary" href={mailto}>Open email app</a>}
            {!supportEmail && <p className="text-xs text-muted">Online feedback is being prepared. No message will be sent from this page.</p>}
            {attempted && feedbackValid && !supportEmail && <p role="status" className="sr-only">Feedback service is unavailable.</p>}
          </div>
        </form>
      </section>
    </>
  )
}
