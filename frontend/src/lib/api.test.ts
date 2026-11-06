// Transport boundary tests for runtime schemas, safe errors, credentials/CSRF, timeouts,
// cancellation and late unauthorized responses. Fake timers advance stalled requests without
// real waiting; controlled fetch promises reproduce races.

import { describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  analysisSummarySchema,
  configureWakeRetry,
  getApi,
  healthSchema,
  isWakingServiceError,
  requestApi,
  retryWhileWaking,
  setCsrfToken,
  shouldRetryWhileWaking,
  wakeRetryDelay,
} from './api'
import { parseApiBaseUrl, parseSupportEmail } from './env'
import { healthFixture } from '../test/fixtures'

describe('API transport', () => {
  it('rejects bad environment configuration through the query without making a request', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'invalid-config')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(getApi('/health', healthSchema)).rejects.toThrow('VITE_API_BASE_URL')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('parses the API contract and includes browser credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(healthFixture))
    vi.stubGlobal('fetch', fetchMock)
    expect(await getApi('/health', healthSchema)).toEqual(healthFixture)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/health',
      expect.objectContaining({ credentials: 'include', cache: 'no-store' }),
    )
  })

  it('rejects malformed success data instead of showing a false connected state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'wrong' })))
    await expect(getApi('/health', healthSchema)).rejects.toThrow('unexpected response')
  })

  it('handles non-JSON success responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>proxy error</html>')))
    await expect(getApi('/health', healthSchema)).rejects.toThrow('unexpected response')
  })

  it('preserves the support reference but never displays arbitrary error response content', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { secret: 'private' },
            { status: 503, headers: { 'X-Request-ID': 'request-123' } },
          ),
        ),
    )
    await expect(getApi('/health', healthSchema)).rejects.toMatchObject({
      status: 503,
      requestId: 'request-123',
      message: 'The service is temporarily unavailable.',
    })
  })

  it('maps validation failures to safe actionable form feedback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ private: 'value' }, { status: 422 })),
    )
    await expect(getApi('/health', healthSchema)).rejects.toMatchObject({
      status: 422,
      message: 'Check the highlighted fields and try again.',
    })
  })

  it('handles connection errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    await expect(getApi('/health', healthSchema)).rejects.toThrow('could not reach')
  })

  it('times out a stalled request', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          }),
      ),
    )
    const assertion = expect(getApi('/health', healthSchema)).rejects.toThrow('too long')
    await vi.advanceTimersByTimeAsync(8_000)
    await assertion
  })

  it('propagates caller cancellation without converting it to a network failure', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          }),
      ),
    )
    const request = getApi('/health', healthSchema, controller.signal)
    controller.abort()
    await expect(request).rejects.not.toBeInstanceOf(ApiError)
  })

  it('does not invalidate a new session because an old request returns 401 late', async () => {
    let resolve!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done
          }),
      ),
    )
    const unauthorized = vi.fn()
    window.addEventListener('scamguard:unauthorized', unauthorized)
    setCsrfToken('old-test-session')
    const pending = getApi('/dashboard', healthSchema)
    setCsrfToken('new-test-session')
    resolve(
      Response.json({ error: { code: 'INVALID_SESSION', message: 'Expired' } }, { status: 401 }),
    )
    await expect(pending).rejects.toMatchObject({ status: 401 })
    expect(unauthorized).not.toHaveBeenCalled()
    window.removeEventListener('scamguard:unauthorized', unauthorized)
    setCsrfToken(null)
  })

  it('keeps analysis requests alive beyond the short read timeout and warns about saved results', async () => {
    vi.useFakeTimers()
    let aborted = false
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              aborted = true
              reject(new DOMException('Aborted', 'AbortError'))
            })
          }),
      ),
    )
    const assertion = expect(
      requestApi('/analyses', healthSchema, { method: 'POST', body: {} }),
    ).rejects.toThrow('Check your history')
    await vi.advanceTimersByTimeAsync(8_001)
    expect(aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(36_999)
    await assertion
  })

  it('retains bounded server retry guidance', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: 'RATE_LIMITED', message: 'Please wait.' } },
            { status: 429, headers: { 'Retry-After': '900' } },
          ),
        ),
    )
    await expect(getApi('/health', healthSchema)).rejects.toMatchObject({ retryAfterSeconds: 900 })
  })
})

describe('public environment validation', () => {
  it.each(['/api/v1', 'https://api.example.com/api/v1', 'http://localhost:8000/api/v1/'])(
    'accepts %s',
    (url) => {
      expect(parseApiBaseUrl(url)).toBe(url.replace(/\/+$/, ''))
    },
  )
  it.each([
    '//evil.example',
    'javascript:alert(1)',
    'relative/path',
    'https://name:password@example.com',
    'https://example.com?secret=1',
    '/',
  ])('rejects %s', (url) => {
    expect(() => parseApiBaseUrl(url)).toThrow('VITE_API_BASE_URL')
  })
  it('accepts a valid optional support address and rejects unsafe values', () => {
    expect(parseSupportEmail(' help@example.com ')).toBe('help@example.com')
    expect(parseSupportEmail('')).toBeNull()
    expect(() => parseSupportEmail('not-an-email')).toThrow('VITE_SUPPORT_EMAIL')
  })
})

describe('persisted response validation', () => {
  const summary = {
    id: '01d97d2d-e1f8-45af-91e5-c7f2df98758b',
    input_type: 'MESSAGE',
    status: 'SUBMITTED',
    created_at: '2026-09-04T07:00:00Z',
    updated_at: '2026-09-04T07:00:00Z',
  }

  it('measures preview limits in Unicode code points like the backend', () => {
    expect(analysisSummarySchema.safeParse({ ...summary, preview: '😀'.repeat(100) }).success).toBe(
      true,
    )
    expect(analysisSummarySchema.safeParse({ ...summary, preview: '😀'.repeat(161) }).success).toBe(
      false,
    )
  })
})

describe('hosted API wake-up retries', () => {
  it('treats only transport failures and gateway errors as a waking host', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const unreachable = await getApi('/health', healthSchema).catch((error: unknown) => error)
    expect(isWakingServiceError(unreachable)).toBe(true)
    for (const status of [502, 504])
      expect(isWakingServiceError(new ApiError('gateway', status))).toBe(true)
    for (const status of [401, 422, 500, 503])
      expect(isWakingServiceError(new ApiError('answer', status))).toBe(false)
    expect(isWakingServiceError(new ApiError('The service returned an unexpected response.'))).toBe(
      false,
    )
  })

  it('marks a stalled read, but not a stalled analysis write, as retryable', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          }),
      ),
    )
    const read = getApi('/health', healthSchema).catch((error: unknown) => error)
    const write = requestApi('/analyses', healthSchema, { method: 'POST', body: {} }).catch(
      (error: unknown) => error,
    )
    await vi.advanceTimersByTimeAsync(45_000)
    expect(isWakingServiceError(await read)).toBe(true)
    expect(isWakingServiceError(await write)).toBe(false)
  })

  it('bounds attempts and backs off with a cap', () => {
    configureWakeRetry({ attempts: 6, baseDelayMs: 2_000, maxDelayMs: 10_000 })
    const waking = new ApiError('gateway', 504)
    expect(shouldRetryWhileWaking(5, waking)).toBe(true)
    expect(shouldRetryWhileWaking(6, waking)).toBe(false)
    expect(shouldRetryWhileWaking(0, new ApiError('down', 503))).toBe(false)
    expect([0, 1, 2, 3, 4].map(wakeRetryDelay)).toEqual([2_000, 4_000, 8_000, 10_000, 10_000])
  })

  it('keeps reading until a waking host answers', async () => {
    vi.useFakeTimers()
    configureWakeRetry({ attempts: 6, baseDelayMs: 2_000, maxDelayMs: 10_000 })
    const read = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('gateway', 502))
      .mockRejectedValueOnce(new ApiError('slow', undefined, undefined, 'SERVICE_TIMEOUT'))
      .mockResolvedValue('ready')
    const onRetry = vi.fn()
    const result = retryWhileWaking(read, onRetry)
    await vi.advanceTimersByTimeAsync(6_000)
    await expect(result).resolves.toBe('ready')
    expect(read).toHaveBeenCalledTimes(3)
    expect(onRetry).toHaveBeenNthCalledWith(2, 2)
  })

  it('does not retry an application answer', async () => {
    configureWakeRetry({ attempts: 6 })
    const read = vi.fn().mockRejectedValue(new ApiError('down', 503))
    await expect(retryWhileWaking(read)).rejects.toThrow('down')
    expect(read).toHaveBeenCalledTimes(1)
  })
})
