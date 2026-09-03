import { expect, test } from '@playwright/test'

test('built SPA loads and refreshes direct routes without a backend or fabricated data', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  const apiRequests: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url())
  })

  // Static SPA fallback returns HTML for an unconfigured API; no response is mocked.
  const unavailable = await page.request.get('/api/v1/health')
  expect(unavailable.headers()['content-type']).toContain('text/html')
  for (const [route, heading] of [
    ['/', 'Security overview'],
    ['/analyse', 'Analyse suspicious content'],
  ]) {
    const response = await page.goto(route!)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: heading!, exact: true })).toBeVisible()
    await expect(page.getByText('API unavailable').filter({ visible: true })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('unexpected response')
    await expect(page.getByLabel('Not available', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Your activity starts here')).toHaveCount(0)
    await expect(page.getByLabel('Message content')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Analyse content' })).toHaveCount(0)
    await expect(page.getByText('The workspace hit a problem')).toHaveCount(0)
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('unexpected response')
    expect((await page.reload())?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: heading!, exact: true })).toBeVisible()
    await expect(page.getByRole('alert')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(route === '/' ? 'overview-offline.png' : 'analyse-offline.png'),
      fullPage: testInfo.project.name === 'desktop',
      scale: 'css',
    })
  }

  const nav = page.getByRole('navigation', {
    name: testInfo.project.name === 'mobile' ? 'Mobile navigation' : 'Desktop navigation',
  })
  await expect(nav.getByRole('link')).toHaveText(['Overview', 'Analyse'])
  await nav.getByRole('link', { name: 'Overview' }).click()
  await expect(page.getByRole('heading', { name: 'Security overview' })).toBeFocused()
  await page.goto('/not-a-page')
  await expect(page.getByRole('heading', { name: 'This page is off the map' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to dashboard' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  expect(apiRequests.length).toBeGreaterThan(0)
  for (const url of apiRequests) expect(new URL(url).origin).toBe('http://127.0.0.1:4173')
  expect(errors).toEqual([])
})

test('built SPA keeps navigation and safe error states when API connections fail', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  // Explicit negative test only: emulate an unreachable configured service.
  // Browser failed-network console messages are expected for this scenario.
  await page.route('**/api/v1/**', (route) => route.abort('connectionrefused'))
  for (const route of ['/', '/analyse']) {
    await page.goto(route)
    await expect(page.getByRole('alert')).toContainText('could not reach the service')
    await expect(page.getByText('API unavailable').filter({ visible: true })).toBeVisible()
    await expect(page.getByLabel('Message content')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Analyse content' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('could not reach the service')
  }
  expect(pageErrors).toEqual([])
})
