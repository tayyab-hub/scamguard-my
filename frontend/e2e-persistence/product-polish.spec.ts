import { expect, test } from '@playwright/test'
import { createAuthenticatedAccount } from './auth-fixture'

test.setTimeout(90_000)

test('product polish: searchable private history, pagination, deletion dialog and account transition', async ({
  page,
  context,
}, info) => {
  const account = await createAuthenticatedAccount(page.request, info)
  const identity = await (await page.request.get('/api/v1/auth/me')).json()
  for (let index = 0; index < 11; index++) {
    const response = await page.request.post('/api/v1/analyses', {
      headers: { Origin: 'http://127.0.0.1:5175', 'X-CSRF-Token': identity.csrf_token },
      data: {
        input_type: 'MESSAGE',
        content: `Polish sample ${String(index).padStart(2, '0')}. This is a controlled demonstration message.`,
      },
    })
    expect(response.status()).toBe(201)
  }
  await page.goto('/')
  await expect(
    page.getByRole('link', { name: 'Message: 11 analyses. View history.' }),
  ).toBeVisible()
  await page.screenshot({
    path: `test-results/task8-data-${info.project.name}-dashboard.png`,
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Browse history' }).click()
  await expect(page).toHaveURL(/\/history$/)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Page 2 · 11 submissions')).toBeVisible()
  await page.getByRole('button', { name: /Polish sample 00/ }).click()
  const remove = page.getByRole('button', { name: 'Delete this analysis' })
  await remove.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await page.screenshot({
    path: `test-results/task8-data-${info.project.name}-dialog.png`,
    fullPage: true,
  })
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Delete analysis', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(remove).toBeFocused()
  await remove.click()
  await dialog.getByRole('button', { name: 'Delete analysis', exact: true }).click()
  await expect(page.getByText('Page 1 · 10 submissions')).toBeVisible()
  await page.getByLabel('Search your analyses').fill('Polish sample 07')
  const searched = page.waitForRequest((request) => request.url().endsWith('/analyses/search'))
  await page.getByRole('button', { name: 'Search history' }).click()
  const request = await searched
  expect(request.url()).not.toContain('Polish')
  expect(request.postDataJSON().query).toBe('Polish sample 07')
  await expect(page.getByText('Page 1 · 1 submissions')).toBeVisible()
  await page.screenshot({
    path: `test-results/task8-data-${info.project.name}-history.png`,
    fullPage: true,
  })
  await page.getByLabel('Analysis type').selectOption('QR')
  await expect(page.getByText('No matching analyses')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByLabel('Sort by').selectOption('oldest')
  await expect(
    page.getByRole('region', { name: 'Submission history' }).locator('.history-trigger').first(),
  ).toContainText('Polish sample 01')
  // Restoring a second tab must leave the first tab's CSRF token usable.
  const second = await context.newPage()
  await second.goto('/account')
  await expect(second.getByText('Profile details')).toBeVisible()
  await page.getByRole('link', { name: 'Account', exact: true }).click()
  await page.getByLabel('Full name').fill('Multiple Tab User')
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Profile saved.')).toBeVisible()
  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(second.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await second.close()
  await page.getByLabel('Username or email').fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('Profile details')).toBeVisible()
})

test('product polish: all major routes and forms fit representative viewport widths', async ({
  page,
}, info) => {
  await createAuthenticatedAccount(page.request, info)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [320, 375, 390, 430, 768, 1024, 1366, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    for (const [route, heading] of [
      ['/', 'Security overview'],
      ['/history', 'Analysis history'],
      ['/account', 'Account controls'],
      ['/analyse', 'Analyse suspicious content'],
      ['/help', 'Help & Support'],
      ['/forgot-password', 'Reset your password'],
      ['/reset-password', 'Choose a new password'],
    ]) {
      await page.goto(route!)
      await expect(page.getByRole('heading', { name: heading!, exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      if ([375, 768, 1440].includes(width))
        await page.screenshot({
          path: `test-results/task8-review-${info.project.name}-${width}-${route === '/' ? 'overview' : route!.slice(1)}.png`,
          fullPage: true,
        })
    }
  }
  expect(errors).toEqual([])
})
