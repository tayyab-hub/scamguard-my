// Context questions for unclear Message results. Some scams read exactly like a genuine message,
// so text alone cannot settle them; the reader often knows what the text cannot show. Answers
// stay in this component's memory: nothing is sent, saved or used to change the stored score.
// Rendered inside the "Quick check" result tab; each question is one compact row.

import { useId, useState } from 'react'
import { contextGuidance, QUESTIONS, type Answer, type Key } from '../../lib/senderContext'

export function SenderContextCheck() {
  const id = useId()
  const [answers, setAnswers] = useState<Partial<Record<Key, Answer>>>({})
  const guidance = contextGuidance(answers)
  return (
    <section className="context-check" aria-label="What you know that the text cannot show">
      <p className="text-[12px] leading-5 text-muted">
        <span className="font-semibold text-ink">What you know that the text cannot show.</span>{' '}
        Some scams look exactly like a normal message. Your answers stay on this device and do not
        change the saved result.
      </p>
      <div className="context-questions mt-3">
        {QUESTIONS.map((question) => (
          <fieldset key={question.key} className="context-question">
            {/* The legend names the group for assistive technology; the visible copy sits in the
                row so question and answers can share one line. */}
            <legend className="sr-only">{question.text}</legend>
            <p className="context-legend" aria-hidden="true">
              {question.text}
            </p>
            <div className="context-options">
              {(
                [
                  ['yes', 'Yes'],
                  ['no', 'No'],
                  ['unsure', 'Not sure'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="context-option">
                  <input
                    type="radio"
                    name={`${id}-${question.key}`}
                    value={value}
                    checked={answers[question.key] === value}
                    onChange={() =>
                      setAnswers((current) => ({ ...current, [question.key]: value }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div aria-live="polite" className="mt-3">
        {guidance && (
          <div className="context-guidance motion-fade" data-tone={guidance.tone}>
            <p className="text-[13px] font-semibold">{guidance.title}</p>
            <p className="mt-1 text-xs leading-5 text-body">{guidance.text}</p>
          </div>
        )}
      </div>
    </section>
  )
}
