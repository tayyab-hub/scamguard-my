import { expect, type APIRequestContext, type TestInfo } from '@playwright/test'

export async function createAuthenticatedAccount(request: APIRequestContext, info: TestInfo) {
  const identity = `${info.project.name}-${info.workerIndex}-${Date.now()}-${Math.random()}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
  const email = `${identity}@example.com`
  const username = `browser_${identity.replace(/[^a-z0-9_]/g, '')}`.slice(0, 30)
  const password = 'browser test password only'
  const response = await request.post('http://127.0.0.1:8002/api/v1/auth/signup', {
    headers: { Origin: 'http://127.0.0.1:5175' },
    data: {
      full_name: 'Browser Test User',
      username,
      email,
      password,
    },
  })
  expect(response.status()).toBe(201)
  return { email, password }
}
