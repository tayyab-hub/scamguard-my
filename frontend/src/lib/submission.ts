import type { SubmissionInput } from './api'

export function submissionError(type: SubmissionInput['input_type'], value: string): string | null {
  const content = value.trim()
  if (!content)
    return type === 'MESSAGE'
      ? 'Enter a message to analyse.'
      : type === 'URL'
        ? 'Enter a URL to analyse.'
        : 'Enter an international phone number to analyse.'
  if (content.includes('\u0000')) return 'Remove unsupported control characters.'
  const limit = type === 'MESSAGE' ? 5000 : type === 'URL' ? 2048 : 64
  if ([...content].length > limit)
    return type === 'MESSAGE'
      ? 'Message must be 5,000 characters or fewer.'
      : type === 'URL'
        ? 'URL must be 2,048 characters or fewer.'
        : 'Phone number must be 64 characters or fewer.'
  if (type === 'URL') {
    try {
      const url = new URL(content)
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        !url.hostname ||
        /[\s\\]/u.test(content) ||
        /%(?![0-9a-f]{2})/i.test(content) ||
        /[\p{Cc}\p{Cf}\p{Cs}]/u.test(value) ||
        [...content].some((char) => char.charCodeAt(0) < 32) ||
        !/^https?:\/\//i.test(content)
      ) {
        return 'Enter a valid URL starting with http:// or https://.'
      }
    } catch {
      return 'Enter a valid URL starting with http:// or https://.'
    }
  }
  if (type === 'PHONE') {
    if (!content.startsWith('+'))
      return 'Include the international country calling code, beginning with +.'
    if (!/^\+[0-9 ()-]+$/u.test(content) || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(value))
      return 'Use only digits, spaces, hyphens and parentheses.'
    let depth = 0
    for (const character of content) {
      if (character === '(') depth += 1
      else if (character === ')') depth -= 1
      if (depth < 0 || depth > 1) return 'Check the phone number parentheses.'
    }
    if (depth !== 0) return 'Check the phone number parentheses.'
    const digits = content.replace(/\D/g, '')
    if (digits.length < 7) return 'Phone number is too short for international analysis.'
    if (digits.length > 15) return 'Phone number exceeds the 15-digit international limit.'
  }
  return null
}
