import { expect, test } from '@playwright/test'

test('live API: responsive navigation, honest states, direct routes and no console errors', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Security overview' })).toBeVisible()
  await expect(page.getByText('API connected').filter({ visible: true })).toBeVisible()
  await expect(page.getByText('Your activity starts here')).toBeVisible()
  await expect(page.getByLabel('Not available', { exact: true })).toHaveCount(3)
  const mobile = testInfo.project.name === 'mobile'
  const nav = page.getByRole('navigation', {
    name: mobile ? 'Mobile navigation' : 'Desktop navigation',
  })
  await expect(nav).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: mobile ? 'Desktop navigation' : 'Mobile navigation' }),
  ).toBeHidden()
  await nav.getByRole('link', { name: 'Analyse' }).click()
  await expect(page).toHaveURL(/\/analyse$/)
  await expect(page.getByText('Analysis is not enabled in this release.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
  await page.getByLabel('Message content').fill('Local test draft')
  await page.getByRole('radio', { name: 'Website link' }).check()
  await expect(page.getByLabel('Website URL')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Analyse suspicious content' })).toBeVisible()
  await expect(page.getByLabel('Message content')).toHaveValue('')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.goto('/not-a-page')
  await expect(page.getByRole('heading', { name: 'This page is off the map' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to dashboard' }).click()
  await expect(page.getByText('Your activity starts here')).toBeVisible()
  await page.screenshot({
    path: `test-results/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  })
  expect(errors).toEqual([])
})

test('explicit failure fixture: visible error and successful retry', async ({ page }) => {
  // This network override is a test fixture only. The production application has no mocks.
  let fail = true
  await page.route('**/api/v1/dashboard', async (route) => {
    if (fail)
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{"error":{"code":"TEST_UNAVAILABLE"}}',
      })
    else await route.continue()
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
  fail = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('Your activity starts here')).toBeVisible()
})
