export function parseApiBaseUrl(value: string): string {
  const normalized = value.replace(/\/+$/, '')
  if (/^\/(?!\/)[\w/-]+$/.test(normalized)) return normalized
  try {
    const url = new URL(normalized)
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    ) {
      return normalized
    }
  } catch {
    /* Report one actionable configuration error below. */
  }
  throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL or an absolute path such as /api/v1.')
}

export function getApiBaseUrl(): string {
  return parseApiBaseUrl(import.meta.env.VITE_API_BASE_URL || '/api/v1')
}

export function parseSupportEmail(value: string): string | null {
  const normalized = value.trim()
  if (!normalized) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('VITE_SUPPORT_EMAIL must be a valid public support email address.')
  }
  return normalized
}

export function getSupportEmail(): string | null {
  return parseSupportEmail(import.meta.env.VITE_SUPPORT_EMAIL || '')
}
