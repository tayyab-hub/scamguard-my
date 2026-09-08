import { expect, test } from '@playwright/test'

test('built SPA protects private routes when no API session can be restored', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  const mutations: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('request', (request) => {
    if (request.method() !== 'GET' || request.postData()) mutations.push(request.url())
  })

  for (const route of ['/', '/analyse', '/account']) {
    expect((await page.goto(route))?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.getByText('API unavailable').filter({ visible: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Create account' }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Security overview' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Analyse suspicious content' })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`${route.slice(1) || 'overview'}-protected-offline.png`),
      fullPage: testInfo.project.name === 'desktop',
      scale: 'css',
    })
  }

  expect(mutations).toEqual([])
  expect(errors).toEqual([])
})

test('built SPA keeps Help and privacy guidance public without a backend', async ({ page }) => {
  await page.goto('/help')
  await expect(page.getByRole('heading', { name: 'Help & Support' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Privacy in this academic prototype' })).toBeVisible()
  await expect(page.getByText('20 answers available')).toBeVisible()
  await page.getByLabel('Search help').fill('account information')
  await expect(page.getByText('1 answer available')).toBeVisible()
  await page.getByText('What account information is stored?').click()
  await expect(page.getByText('one-way Argon2id password hash', { exact: false })).toBeVisible()
  await page.goto('/not-a-page')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.getByRole('link', { name: 'Return to Overview' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('reduced motion keeps offline authentication keyboard accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/signup')
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
  await page.getByLabel('Email address').focus()
  await expect(page.getByLabel('Email address')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Show password' }).focus()
  await expect(page.getByRole('button', { name: 'Show password' })).toHaveCSS(
    'outline-style',
    'solid',
  )
  await page.getByRole('link', { name: 'Help & Support' }).click()
  await expect(page.getByRole('heading', { name: 'Help & Support' })).toBeFocused()
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
})
