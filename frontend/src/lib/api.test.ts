import { describe, expect, it, vi } from 'vitest'
import { ApiError, analysisSummarySchema, getApi, healthSchema } from './api'
import { parseApiBaseUrl } from './env'
import { healthFixture } from '../test/fixtures'

describe('API transport', () => {
  it('rejects bad environment configuration through the query without making a request', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'invalid-config')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(getApi('/health', healthSchema)).rejects.toThrow('VITE_API_BASE_URL')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('parses the API contract and omits browser credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(healthFixture))
    vi.stubGlobal('fetch', fetchMock)
    expect(await getApi('/health', healthSchema)).toEqual(healthFixture)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/health',
      expect.objectContaining({ credentials: 'omit', cache: 'no-store' }),
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
    expect(analysisSummarySchema.safeParse({ ...summary, preview: '😀'.repeat(100) }).success).toBe(true)
    expect(analysisSummarySchema.safeParse({ ...summary, preview: '😀'.repeat(161) }).success).toBe(false)
  })
})
