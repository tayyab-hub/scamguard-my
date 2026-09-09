import { expect, test } from '@playwright/test'
import { createAuthenticatedAccount } from './auth-fixture'

test.beforeEach(async ({ page }, info) => createAuthenticatedAccount(page.request, info))

test('result presentation: real scores, keyboard metadata, pending and live reduced motion', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/analyse')
  await page
    .getByLabel('Message content')
    .fill('URGENT: Your bank account will be suspended. Provide your OTP and password now.')
  let release!: () => void
  const hold = new Promise<void>((resolve) => {
    release = resolve
  })
  // Hold only the response of a real local POST to inspect pending UI. No fake assessment.
  await page.route('**/api/v1/analyses', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const response = await route.fetch()
    await hold
    await route.fulfill({ response })
  })
  await page.getByRole('button', { name: 'Analyse content' }).click()
  await expect(page.getByText('Running local message assessment…')).toBeVisible()
  await expect(page.getByLabel('Message content')).toBeDisabled()
  await expect(page.getByRole('meter')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await page
      .locator('.submission-pending')
      .evaluate((el) => getComputedStyle(el, '::after').animationName),
  ).toBe('none')
  const completed = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/analyses') && response.request().method() === 'POST',
  )
  release()
  const record = await (await completed).json()
  await expect(page.getByText('Analysis completed.')).toBeVisible()
  const result = page.getByLabel('Message assessment')
  await expect(result.getByRole('meter')).toHaveAttribute(
    'aria-valuenow',
    String(Math.round(record.assessment.risk_score * 100)),
  )
  await expect(
    result.getByText(`Confidence: ${record.assessment.confidence_level.toLowerCase()}`),
  ).toBeVisible()
  await page.getByRole('link', { name: 'View assessment' }).click()
  await expect(page.getByRole('heading', { name: 'Analysis result' })).toBeFocused()
  const metadata = result.getByText('Components and limitations')
  await metadata.focus()
  await page.keyboard.press('Enter')
  await expect(result.getByText(record.id, { exact: true })).toBeVisible()
  await expect(result.locator('time')).toHaveAttribute('datetime', record.assessment.completed_at)
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(
      await result.locator('.score-fill').evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('none')
  }
  await page.setViewportSize({ width: info.project.name === 'mobile' ? 320 : 1440, height: 1000 })
  await page.screenshot({ path: info.outputPath('refined-message.png'), fullPage: true })
  await page.unroute('**/api/v1/analyses')
  await page.getByRole('tab', { name: 'URL', exact: true }).click()
  await page.getByLabel('Website URL').fill('https://paypal.example.net/%252f/file.exe')
  await page.getByRole('button', { name: 'Analyse content' }).click()
  const url = page.getByLabel('URL assessment')
  await expect(url.getByRole('meter')).toHaveAttribute('aria-valuenow', '100')
  await expect(url.getByText('URL category index')).toBeVisible()
  await url.getByText('How to read this score').focus()
  await page.keyboard.press('Enter')
  await expect(url.getByText(/100 does not mean certain fraud/)).toBeVisible()
  await page.screenshot({ path: info.outputPath('refined-url.png'), fullPage: true })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('tab', { name: 'MESSAGE', exact: false }).click()
  await page.getByLabel('Message content').fill('ok')
  await page.getByRole('button', { name: 'Analyse content' }).click()
  await expect(page.getByText('Insufficient evidence', { exact: true })).toBeVisible()
  await expect(page.getByRole('meter')).toHaveCount(0)
  await page.goto('/help')
  await page.getByLabel('Search help').fill('risk score calculated')
  await page.locator('summary').filter({ hasText: 'How is the risk score calculated?' }).click()
  await expect(page.getByText(/Do not compare scores across Message and URL/)).toBeVisible()
  expect(errors).toEqual([])
})
