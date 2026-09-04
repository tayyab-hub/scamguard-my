import { expect, test, type Page } from '@playwright/test'

async function expectUnavailableWorkspace(page: Page, route: string) {
  if (route === '/') {
    await expect(page.getByLabel('Not available', { exact: true })).toHaveText(['—', '—', '—'])
    await expect(page.getByText('Not available yet', { exact: true })).toHaveCount(3)
    await expect(page.getByText('Your activity starts here')).toBeVisible()
    await expect(page.getByText('Workspace status')).toBeVisible()
    await expect(page.getByText('None configured')).toBeVisible()
    await expect(
      page.getByText('No live statistics are being collected or displayed.'),
    ).toBeVisible()
  } else {
    await expect(page.getByLabel('Message content')).toBeVisible()
    await expect(page.getByText('Analysis is not enabled in this release.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
    await expect(page.getByText('No assessment yet')).toBeVisible()
    await expect(page.getByText('No safety verdict has been made.', { exact: false })).toBeVisible()
  }
}

test('built SPA loads and refreshes direct routes without a backend or fabricated data', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  const apiRequests: string[] = []
  const submittedRequests: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url())
    if (request.method() !== 'GET' || request.postData()) submittedRequests.push(request.url())
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
    await expectUnavailableWorkspace(page, route!)
    await expect(page.getByText('The workspace hit a problem')).toHaveCount(0)
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('unexpected response')
    expect((await page.reload())?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: heading!, exact: true })).toBeVisible()
    await expect(page.getByRole('alert')).toBeVisible()
    await expectUnavailableWorkspace(page, route!)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(route === '/' ? 'overview-offline.png' : 'analyse-offline.png'),
      fullPage: testInfo.project.name === 'desktop',
      scale: 'css',
    })
    if (testInfo.project.name === 'mobile') {
      await page.screenshot({
        path: testInfo.outputPath(
          route === '/' ? 'overview-offline-full.png' : 'analyse-offline-full.png',
        ),
        fullPage: true,
        scale: 'css',
      })
    }
    const retry = page.getByRole('button', { name: 'Try again', exact: true })
    await retry.focus()
    await expect(retry).toBeFocused()
    expect(await retry.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
      'none',
    )
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
  expect(submittedRequests).toEqual([])
  expect(errors).toEqual([])
})

test('built SPA keeps navigation and safe error states when API connections fail', async ({
  page,
}) => {
  const pageErrors: string[] = []
  const submittedRequests: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('request', (request) => {
    if (request.method() !== 'GET' || request.postData()) submittedRequests.push(request.url())
  })
  // Explicit negative test only: emulate an unreachable configured service.
  // Browser failed-network console messages are expected for this scenario.
  await page.route('**/api/v1/**', (route) => route.abort('connectionrefused'))
  for (const route of ['/', '/analyse']) {
    await page.goto(route)
    await expect(page.getByRole('alert')).toContainText('could not reach the service')
    await expect(page.getByText('API unavailable').filter({ visible: true })).toBeVisible()
    await expectUnavailableWorkspace(page, route)
    if (route === '/analyse') {
      await page.getByLabel('Message content').fill('Local offline draft')
      await page.getByRole('tab', { name: 'URL', exact: true }).click()
      await page.getByLabel('Website URL').fill('https://example.com')
      await page.getByLabel('Website URL').press('Enter')
      await expect(page.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
      await page.getByRole('tab', { name: 'Phone Number' }).click()
      await page.getByRole('textbox', { name: 'Phone number', exact: true }).fill('+44 20 7946 0958')
      await page.getByRole('textbox', { name: 'Phone number', exact: true }).press('Enter')
      await expect(page.getByRole('button', { name: 'Analyse phone number' })).toBeDisabled()
      await page.getByRole('tab', { name: 'QR Code' }).click()
      await page.getByLabel('Upload a QR screenshot or image').setInputFiles({
        name: 'offline-fixture.png',
        mimeType: 'image/png',
        buffer: Buffer.from('local metadata fixture'),
      })
      await expect(page.getByText('offline-fixture.png')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Analyse QR' })).toBeDisabled()
      await page.getByRole('tab', { name: 'Message' }).click()
      await expect(page.getByLabel('Message content')).toHaveValue('Local offline draft')
    }
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('could not reach the service')
    await expectUnavailableWorkspace(page, route)
    if (route === '/analyse') {
      await expect(page.getByLabel('Message content')).toHaveValue('Local offline draft')
      await page.getByRole('button', { name: 'Clear', exact: true }).click()
      await expect(page.getByLabel('Message content')).toHaveValue('')
    }
  }
  expect(pageErrors).toEqual([])
  expect(submittedRequests).toEqual([])
})

test('reduced motion keeps the built offline workspace immediate and keyboard accessible', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const route of ['/', '/analyse']) {
    await page.goto(route)
    await expect(page.getByRole('alert')).toBeVisible()
    await expectUnavailableWorkspace(page, route)
    await expect(page.getByText('API unavailable').filter({ visible: true })).toBeVisible()
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
    const retry = page.getByRole('button', { name: 'Try again', exact: true })
    await page.keyboard.press('Tab')
    await retry.focus()
    await expect(retry).toBeFocused()
    await expect(retry).toHaveCSS('outline-style', 'solid')
    await expect(retry).toHaveCSS('transform', 'none')
    await page.screenshot({
      path: testInfo.outputPath(`${route === '/' ? 'overview' : 'analyse'}-reduced-motion.png`),
      scale: 'css',
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  const nav = page.getByRole('navigation', {
    name: testInfo.project.name === 'desktop' ? 'Desktop navigation' : 'Mobile navigation',
  })
  await nav.getByRole('link', { name: 'Overview' }).click()
  await expect(page.getByRole('heading', { name: 'Security overview' })).toBeFocused()
  await expectUnavailableWorkspace(page, '/')
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
})
