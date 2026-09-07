import type { SubmissionInput } from './api'

export function submissionError(type: SubmissionInput['input_type'], value: string): string | null {
  const content = value.trim()
  if (!content)
    return type === 'MESSAGE' ? 'Enter a message to analyse.' : 'Enter a URL to analyse.'
  if (content.includes('\u0000')) return 'Remove unsupported control characters.'
  if ([...content].length > (type === 'MESSAGE' ? 5000 : 2048))
    return type === 'MESSAGE'
      ? 'Message must be 5,000 characters or fewer.'
      : 'URL must be 2,048 characters or fewer.'
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
  return null
}
