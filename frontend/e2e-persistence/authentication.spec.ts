import { expect, test } from '@playwright/test'

test('real PostgreSQL: signup, refresh, logout, login, deletion and account privacy controls', async ({
  page,
}, info) => {
  const identity = `auth-${info.project.name}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '')
  const email = `${identity}@example.com`
  const password = 'browser authentication test password'
  const message = `Private authentication fixture ${identity}`

  await page.goto('/signup')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Security overview' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Account' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Security overview' })).toBeVisible()
  await page.goto('/analyse')
  await page.getByLabel('Message content').fill(message)
  await page.getByRole('button', { name: 'Analyse content' }).click()
  await expect(page.getByText('Analysis completed.')).toBeVisible()

  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await page.goto('/analyse')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Analyse suspicious content' })).toBeVisible()
  await page.goto('/')
  await page.getByRole('button', { name: 'Browse history' }).click()
  const history = page.getByRole('region', { name: 'Submission history' })
  await expect(history.getByText(message)).toBeVisible()
  await history.getByRole('button', { name: new RegExp(message) }).click()
  await history.getByRole('button', { name: 'Delete this analysis' }).click()
  const analysisDialog = page.getByRole('dialog', { name: 'Delete this analysis?' })
  await expect(analysisDialog).toBeVisible()
  await analysisDialog.getByRole('button', { name: 'Delete analysis' }).click()
  await expect(history.getByText(message)).toHaveCount(0)

  await page.getByRole('link', { name: 'Account' }).click()
  await expect(page.getByRole('heading', { name: 'Account controls' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete account' }).click()
  const accountDialog = page.getByRole('dialog', { name: 'Permanently delete this account?' })
  await accountDialog.getByLabel('Current password').fill(password)
  await accountDialog.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
