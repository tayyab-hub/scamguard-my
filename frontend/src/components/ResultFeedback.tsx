// "Was this result right?" for a saved, completed analysis. The answer is stored privately with
// the owner's record for later evaluation; it never changes the saved result and is never used
// to retrain anything automatically.

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ThumbsUp } from 'lucide-react'
import { ApiError, submitFeedback, type FeedbackVerdict } from '../lib/api'

const OPTIONS: [FeedbackVerdict, string][] = [
  ['RIGHT', 'Looks right'],
  ['TOO_HIGH', 'Too worried'],
  ['TOO_LOW', 'Not worried enough'],
  ['UNSURE', 'Not sure'],
]

export function ResultFeedback({
  analysisId,
  initial,
}: {
  analysisId: string
  initial: FeedbackVerdict | null
}) {
  const client = useQueryClient()
  const [saved, setSaved] = useState<FeedbackVerdict | null>(initial)
  const mutation = useMutation({
    mutationFn: (verdict: FeedbackVerdict) => submitFeedback(analysisId, verdict),
    retry: false,
    onSuccess: (detail) => {
      setSaved(detail.user_feedback)
      void client.invalidateQueries({ queryKey: ['analysis', analysisId] })
    },
  })
  return (
    <section className="result-feedback" aria-label="Result feedback">
      <p className="flex items-center gap-2 text-xs font-semibold text-ink">
        <ThumbsUp size={14} className="text-accent" aria-hidden="true" />
        Was this result right?
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Rate this result">
        {OPTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="context-option"
            aria-pressed={saved === value}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-muted" aria-live="polite">
        {mutation.isError
          ? mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Your answer could not be saved. Please try again.'
          : saved
            ? 'Thank you. Your answer is saved privately with this check and does not change the result.'
            : 'Optional. Saved privately with this check; it does not change the result.'}
      </p>
    </section>
  )
}
