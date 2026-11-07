// Pure logic for the sender context questions: questions and answer-to-guidance mapping.
// Kept separate from the component so it can be unit-tested and shared.

export type Answer = 'yes' | 'no' | 'unsure'

export const QUESTIONS = [
  {
    key: 'known',
    text: 'Do you already know this sender, from a number or account you had saved before this message?',
  },
  {
    key: 'asks',
    text: 'Does it ask for money, a code (OTP or TAC), personal or bank details, or to install an app?',
  },
  {
    key: 'pressure',
    text: 'Does it push you to hurry, keep it secret, or move to another app such as Telegram?',
  },
] as const

export type Key = (typeof QUESTIONS)[number]['key']

// Map answers to guidance. Any request or pressure dominates; an unknown sender comes next; only
// a known sender with neither request nor pressure is lower concern.
export function contextGuidance(answers: Partial<Record<Key, Answer>>) {
  if (answers.asks === 'yes' || answers.pressure === 'yes')
    return {
      tone: 'warning' as const,
      title: 'Treat this as high risk',
      text: 'Requests for money, codes or details, urgency, secrecy and moving apps are the most common scam tactics, even from a familiar name. Do not pay, share or install anything. Contact the person or organisation using a number or app you already had, not one from this message.',
    }
  if (answers.known === 'no' || answers.known === 'unsure')
    return {
      tone: 'caution' as const,
      title: 'Unknown sender: verify first',
      text: 'Do not open links or reply with personal details. If it claims to be someone you know, call them on the number you already have saved. If it claims to be a company or agency, contact it through its official website or app.',
    }
  if (answers.known === 'yes' && answers.asks === 'no' && answers.pressure === 'no')
    return {
      tone: 'calm' as const,
      title: 'Lower concern',
      text: 'A known sender with no request or pressure is less concerning. If a later message asks for money, codes or details, check by calling the number you already have saved.',
    }
  return null
}
