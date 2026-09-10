import type { Page } from '@playwright/test'

const user = {
  id: 'c9274a91-93f8-4fa2-bad3-8453f1284e36',
  full_name: 'Browser Test',
  username: 'browser_test',
  email: 'browser-test@example.com',
  created_at: '2026-09-08T00:00:00Z',
}

export async function mockAuthenticatedWorkspace(page: Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        user,
        csrf_token: 'browser-test-csrf-token-with-thirty-two-characters',
      }),
    }),
  )
  await page.route('**/api/v1/dashboard', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'not_configured',
        total_analyses: null,
        flagged_analyses: null,
        last_analysis_at: null,
        recent_analyses: [],
      }),
    }),
  )
  await page.route('**/api/v1/analyses**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 10 }),
    }),
  )
}
