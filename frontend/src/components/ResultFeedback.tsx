// "Was this result right?" for a saved, completed analysis. The answer is stored privately with
// the owner's record for later evaluation; it never changes the saved result and is never used
// to retrain anything automatically.
//
// Shown as a small floating card once the reader reaches the end of an unanswered result, so it
// never covers the verdict while it is being read. Choosing an answer saves it, thanks the user
// and closes the card; the × button closes it without answering. A one-line footer under the
// result always stays, so the question can be reopened or the answer changed.

import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ThumbsUp, X } from 'lucide-react'
import { ApiError, submitFeedback, type FeedbackVerdict } from '../lib/api'

const OPTIONS: [FeedbackVerdict, string][] = [
  ['RIGHT', 'Looks right'],
  ['TOO_HIGH', 'Too worried'],
  ['TOO_LOW', 'Not worried enough'],
  ['UNSURE', 'Not sure'],
]
// How long the "Thank you" stays before the card closes.
const THANKS_MS = 1600

// True while the Quick check questions are on the page and at least one is unanswered.
function quickCheckPending() {
  const section = document.querySelector('.context-check')
  if (!section) return false
  return [...section.querySelectorAll('fieldset')].some(
    (group) => !group.querySelector('input:checked'),
  )
}

export function ResultFeedback({
  analysisId,
  initial,
}: {
  analysisId: string
  initial: FeedbackVerdict | null
}) {
  const client = useQueryClient()
  const titleId = useId()
  const [saved, setSaved] = useState<FeedbackVerdict | null>(initial)
  const footer = useRef<HTMLDivElement>(null)
  // Pop up only when this result has no answer yet; History items already answered stay quiet.
  // Where the browser cannot report scrolling (tests, very old browsers), open straight away.
  const [open, setOpen] = useState(
    () => initial === null && typeof IntersectionObserver === 'undefined',
  )
  const [thanked, setThanked] = useState(false)
  const mutation = useMutation({
    mutationFn: (verdict: FeedbackVerdict) => submitFeedback(analysisId, verdict),
    retry: false,
    onSuccess: (detail) => {
      setSaved(detail.user_feedback)
      setThanked(true)
      void client.invalidateQueries({ queryKey: ['analysis', analysisId] })
    },
  })

  // Open the card once, the first time the end of the result scrolls into view. On short results
  // the Quick check questions can be on screen at the same moment; the floating card would cover
  // them, so it waits until every question is answered or the Quick check section is closed.
  useEffect(() => {
    const target = footer.current
    if (initial !== null || !target || typeof IntersectionObserver === 'undefined') return
    let stopWaiting = () => {}
    const openWhenQuickCheckDone = () => {
      if (!quickCheckPending()) {
        setOpen(true)
        return
      }
      const recheck = () => {
        if (quickCheckPending()) return
        stopWaiting()
        setOpen(true)
      }
      document.addEventListener('change', recheck)
      document.addEventListener('click', recheck)
      stopWaiting = () => {
        document.removeEventListener('change', recheck)
        document.removeEventListener('click', recheck)
      }
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          openWhenQuickCheckDone()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(target)
    return () => {
      observer.disconnect()
      stopWaiting()
    }
  }, [initial])

  // After a saved answer, show the thanks briefly, then close the card.
  useEffect(() => {
    if (!thanked) return
    const timer = window.setTimeout(() => {
      setOpen(false)
      setThanked(false)
    }, THANKS_MS)
    return () => window.clearTimeout(timer)
  }, [thanked])

  const savedLabel = OPTIONS.find(([value]) => value === saved)?.[1]

  return (
    <>
      <div ref={footer} className="result-feedback">
        <p className="flex min-h-7 flex-wrap items-center gap-x-2 text-[12px] text-muted">
          <ThumbsUp size={13} className="text-accent" aria-hidden="true" />
          {savedLabel ? (
            <span>
              You said: <span className="font-semibold text-body">{savedLabel}</span>
            </span>
          ) : (
            open && <span>Was this result right?</span>
          )}
          {!open && (
            <button type="button" className="text-link" onClick={() => setOpen(true)}>
              {savedLabel ? 'Change' : 'Rate this result'}
            </button>
          )}
        </p>
      </div>
      {open && (
        <section
          className="feedback-popup"
          aria-labelledby={titleId}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
        >
          <div className="flex items-start gap-2">
            <p
              id={titleId}
              className="flex flex-1 items-center gap-2 text-xs font-semibold text-ink"
            >
              <ThumbsUp size={14} className="text-accent" aria-hidden="true" />
              Was this result right?
            </p>
            <button
              type="button"
              className="feedback-close"
              aria-label="Close feedback"
              onClick={() => setOpen(false)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Rate this result">
            {OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="context-option context-option-sm"
                aria-pressed={saved === value}
                disabled={mutation.isPending || thanked}
                onClick={() => mutation.mutate(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] leading-5 text-muted" aria-live="polite">
            {mutation.isError
              ? mutation.error instanceof ApiError
                ? mutation.error.message
                : 'Your answer could not be saved. Please try again.'
              : thanked
                ? 'Thank you. Your answer is saved privately with this check and does not change the result.'
                : 'Optional. Saved privately with this check; it does not change the result.'}
          </p>
        </section>
      )}
    </>
  )
}
