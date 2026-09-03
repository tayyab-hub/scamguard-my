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
