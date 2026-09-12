import { expect, test, type Page } from '@playwright/test'
import { createAuthenticatedAccount } from './auth-fixture'

const widths = [320, 375, 390, 430, 768, 1024, 1366, 1440]
async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
}

test('final closure: public authentication forms at every required width', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 950 })
    for (const [route, heading] of [
      ['/login', 'Welcome back'],
      ['/signup', 'Create your account'],
    ]) {
      await page.goto(route!)
      await expect(page.getByRole('heading', { name: heading!, exact: true })).toBeVisible()
      await fits(page)
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
      if (route === '/signup') {
        await expect(page.getByLabel('Full name')).toBeVisible()
        await expect(page.getByLabel('Username', { exact: true })).toBeVisible()
        await expect(page.getByLabel('Email address')).toBeVisible()
      }
    }
  }
})

test('final closure: four modes, persisted results and dialogs at every required width', async ({
  page,
}, info) => {
  test.setTimeout(180_000)
  await createAuthenticatedAccount(page.request, info)
  const identity = await (await page.request.get('/api/v1/auth/me')).json()
  const headers = { Origin: 'http://127.0.0.1:5175', 'X-CSRF-Token': identity.csrf_token }
  for (const [mode, content] of [
    ['MESSAGE', 'Your account is locked. Send your password and OTP immediately to avoid arrest.'],
    ['URL', 'https://example.com/closure'],
    ['PHONE', '+44 20 7946 0958'],
    ['QR', 'https://example.com/closure-qr'],
  ]) {
    const response = await page.request.post(
      mode === 'QR' ? '/api/v1/analyses/qr/payload' : '/api/v1/analyses',
      {
        headers,
        data:
          mode === 'QR'
            ? { payload: content, decoder: 'zxing-wasm' }
            : { input_type: mode, content },
      },
    )
    expect(response.status()).toBe(201)
  }
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of widths) {
    await page.setViewportSize({ width, height: 950 })
    for (const mode of ['MESSAGE', 'URL', 'PHONE', 'QR']) {
      await page.goto(`/analyse?mode=${mode}`)
      await expect(page.getByRole('heading', { name: 'Analyse suspicious content' })).toBeVisible()
      await fits(page)
      await page.goto(`/history?type=${mode}`)
      const history = page.getByRole('region', { name: 'Submission history' })
      const record = history.locator('.history-trigger')
      await expect(record).toHaveCount(1)
      await record.click()
      const remove = page.getByRole('button', { name: 'Delete this analysis' })
      await expect(remove).toBeVisible()
      await fits(page)
      if ([320, 1440].includes(width))
        await page.screenshot({
          path: `test-results/task9-${info.project.name}-${width}-${mode}-result.png`,
          fullPage: true,
        })
      await remove.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
      await fits(page)
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible()
      await expect(remove).toBeFocused()
    }
  }
  expect(errors).toEqual([])
})
