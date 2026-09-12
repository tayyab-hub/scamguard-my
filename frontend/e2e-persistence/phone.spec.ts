import { expect, test } from '@playwright/test'
import { createAuthenticatedAccount } from './auth-fixture'

test('real PostgreSQL: login, Phone assessment, history and refreshed result persist', async ({
  page,
}, info) => {
  const errors: string[] = []
  const outside: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:5175/')) outside.push(request.url())
  })

  const account = await createAuthenticatedAccount(page.request, info)
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel('Username or email').fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Security overview' })).toBeVisible()
  // The anonymous session probe on /login returns an expected 401 before sign-in.
  errors.length = 0

  await page.goto('/analyse')
  await page.getByRole('tab', { name: 'Phone Number' }).click()
  const phone = page.getByRole('textbox', { name: 'Phone number', exact: true })
  await phone.fill('+44 (20) 7946-0958')
  const completed = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/analyses') && response.request().method() === 'POST',
  )
  await phone.press('Enter')
  const record = await (await completed).json()
  expect(record.input_type).toBe('PHONE')
  expect(record.content).toBe('+442079460958')
  await expect(page.getByText('Analysis completed.')).toBeVisible()
  const result = page.getByLabel('Phone assessment')
  await expect(result).toContainText('Insufficient evidence')
  await page.screenshot({ path: info.outputPath('task8-phone-result.png'), fullPage: true })
  await expect(result.getByRole('meter')).toHaveCount(0)
  await expect(
    result
      .getByRole('region', { name: 'Phone numbering evidence' })
      .getByText('Valid international numbering format'),
  ).toBeVisible()
  await result.getByText('Technical details').focus()
  await page.keyboard.press('Enter')
  await expect(
    result.getByText(/cannot by itself establish whether the caller is fraudulent/),
  ).toBeVisible()

  await page.goto('/')
  await page.getByRole('button', { name: 'Browse history' }).click()
  const history = page.getByRole('region', { name: 'Submission history' })
  await expect(history.getByText('+442079460958')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Analysis history', exact: true })).toBeVisible()
  await history.getByRole('button', { name: /\+442079460958/ }).click()
  await expect(page.getByLabel('Phone assessment')).toBeVisible()
  await expect(page.getByText('Saved content · COMPLETED')).toBeVisible()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await page
      .getByLabel('Phone assessment')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none')
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(errors).toEqual([])
  expect(outside).toEqual([])
})
