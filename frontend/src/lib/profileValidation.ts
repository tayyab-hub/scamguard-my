// Local form checks shared by account/signup/recovery views. Each returns an error string or
// null. Backend normalization, unique constraints and password checks remain authoritative;
// these helpers do not query accounts.

// Accept Unicode letters/marks, spaces and the supported punctuation after NFC normalization;
// reject controls and out-of-range length.
export function validateFullName(value: string): string | null {
  const normalized = value.normalize('NFC').trim()
  if (!normalized) return 'Enter your full name.'
  if (/\p{C}/u.test(normalized)) return 'Full name cannot contain control characters.'
  if (normalized.length < 2 || normalized.length > 100)
    return 'Full name must be between 2 and 100 characters.'
  if (!/^[\p{L}\p{M}\p{Zs}.'’\-‐‑]+$/u.test(normalized))
    return 'Use letters, spaces, hyphens, apostrophes, or periods.'
  return null
}

// Check the visible ASCII username format; the backend lowercases and enforces uniqueness.
export function validateUsername(value: string): string | null {
  if (!value) return 'Choose a username.'
  if (value !== value.trim()) return 'Username cannot begin or end with a space.'
  if (!/^[A-Za-z0-9_]{3,30}$/.test(value)) return 'Use 3–30 letters, numbers, or underscores.'
  return null
}

// Provide a lightweight shape/length check; the backend uses email-validator and does not claim
// mailbox ownership from syntax.
export function validateEmail(value: string): string | null {
  const normalized = value.trim()
  if (!normalized) return 'Enter your email address.'
  if (normalized.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
    return 'Enter a valid email address.'
  return null
}

// Check the 12–128 character form bounds and reject all-whitespace input without trimming a
// meaningful password.
export function validateNewPassword(value: string): string | null {
  if (!value) return 'Enter a password.'
  if (value.length < 12) return 'Use at least 12 characters.'
  if (value.length > 128) return 'Use no more than 128 characters.'
  if (!value.trim()) return 'Password cannot contain only spaces.'
  return null
}
