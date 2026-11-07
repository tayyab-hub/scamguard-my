// Context questions for unclear Message results. Some scams read exactly like a genuine message,
// so text alone cannot settle them; the reader often knows what the text cannot show. Answers
// stay in this component's memory: nothing is sent, saved or used to change the stored score.

import { useId, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { contextGuidance, QUESTIONS, type Answer, type Key } from '../../lib/senderContext'

export function SenderContextCheck() {
  const id = useId()
  const [answers, setAnswers] = useState<Partial<Record<Key, Answer>>>({})
  const guidance = contextGuidance(answers)
  return (
    <section className="result-section context-check" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="flex items-center gap-2 text-sm font-semibold">
        <HelpCircle size={16} className="text-accent" aria-hidden="true" />
        What you know that the text cannot show
      </h3>
      <p className="mt-2 text-xs leading-6 text-muted">
        Some scams look exactly like a normal message. Three quick questions tailor the advice. Your
        answers stay on this device and do not change the saved result.
      </p>
      <div className="mt-4 space-y-4">
        {QUESTIONS.map((question) => (
          <fieldset key={question.key} className="context-question">
            <legend className="text-xs font-medium leading-6 text-ink">{question.text}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
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
      <div aria-live="polite" className="mt-4">
        {guidance && (
          <div className="context-guidance motion-fade" data-tone={guidance.tone}>
            <p className="text-sm font-semibold">{guidance.title}</p>
            <p className="mt-1 text-xs leading-6 text-body">{guidance.text}</p>
          </div>
        )}
      </div>
    </section>
  )
}
