import type { SubmissionInput } from './api'

export function submissionError(type: SubmissionInput['input_type'], value: string): string | null {
  const content = value.trim()
  if (!content) return 'Enter content to record a submission.'
  if (content.includes('\u0000')) return 'Remove unsupported control characters.'
  if ([...content].length > (type === 'MESSAGE' ? 5000 : 2048))
    return 'Content exceeds the allowed length.'
  if (type === 'URL') {
    try {
      const url = new URL(content)
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        !url.hostname ||
        url.username ||
        url.password ||
        /[\s\\]/u.test(content) ||
        [...content].some((char) => char.charCodeAt(0) < 32) ||
        !/^https?:\/\//i.test(content)
      ) {
        return 'Enter a complete HTTP or HTTPS URL without sign-in details.'
      }
    } catch {
      return 'Enter a complete HTTP or HTTPS URL without sign-in details.'
    }
  }
  return null
}
