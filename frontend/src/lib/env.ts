// Validate public frontend configuration at the point of use. VITE values are compiled into
// browser assets and must contain no secrets. Relative /api/v1 normally goes through the
// existing dev/production proxy.

// Return a trimmed valid root-relative path or HTTP(S) base. Production rejects non-HTTPS
// absolute bases and common loopback hosts; malformed configuration throws an actionable error.
export function parseApiBaseUrl(value: string, production = false): string {
  const normalized = value.replace(/\/+$/, '')
  // A root-relative base is the preferred production path when the host proxies /api to FastAPI.
  if (/^\/(?!\/)[\w/-]+$/.test(normalized)) return normalized
  try {
    const url = new URL(normalized)
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      (!production || url.protocol === 'https:') &&
      (!production || !['localhost', '127.0.0.1', '::1'].includes(url.hostname)) &&
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
  throw new Error(
    production
      ? 'Production VITE_API_BASE_URL must be a same-origin absolute path or non-local HTTPS URL.'
      : 'VITE_API_BASE_URL must be an HTTP(S) URL or an absolute path such as /api/v1.',
  )
}

// Resolve the configured public base or /api/v1 when a request runs, allowing the UI to display
// configuration errors instead of failing during import.
export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL || '/api/v1'
  return parseApiBaseUrl(configured, import.meta.env.PROD)
}

// Return a validated public support address or null when blank. This controls mailto
// preparation, not a backend feedback service.
export function parseSupportEmail(value: string): string | null {
  const normalized = value.trim()
  if (!normalized) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('VITE_SUPPORT_EMAIL must be a valid public support email address.')
  }
  return normalized
}

// Read the optional build-time public support email and validate it for Help.
export function getSupportEmail(): string | null {
  return parseSupportEmail(import.meta.env.VITE_SUPPORT_EMAIL || '')
}
