import { describe, expect, it } from 'vitest'
import { parseApiBaseUrl } from './env'

describe('API deployment configuration', () => {
  it('supports the local same-origin proxy outside production', () => {
    expect(parseApiBaseUrl('/api/v1')).toBe('/api/v1')
    expect(parseApiBaseUrl('http://127.0.0.1:8000/api/v1')).toBe(
      'http://127.0.0.1:8000/api/v1',
    )
  })

  it.each([
    '',
    '/api/v1',
    'http://api.example.com/api/v1',
    'https://localhost:8000/api/v1',
    'https://127.0.0.1:8000/api/v1',
  ])('rejects unsafe production API configuration %j', (value) => {
    expect(() => parseApiBaseUrl(value, true)).toThrow(
      'Production VITE_API_BASE_URL must be a non-local HTTPS API URL.',
    )
  })

  it('accepts an HTTPS production API URL', () => {
    expect(parseApiBaseUrl('https://scamguard-api.example/api/v1/', true)).toBe(
      'https://scamguard-api.example/api/v1',
    )
  })
})
