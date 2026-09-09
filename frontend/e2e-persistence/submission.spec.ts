import { expect, test } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createAuthenticatedAccount } from './auth-fixture'

test.beforeEach(async ({ page }, info) => createAuthenticatedAccount(page.request, info))

async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.screenshot({
    path: info.outputPath(`${name}-full.png`),
    fullPage: true,
    animations: 'disabled',
  })
  if (info.project.name === 'mobile') {
    const target =
      name === 'recorded'
        ? page.getByRole('heading', { name: 'Analysis result' })
        : page.getByRole('heading', { name: 'Submission history' })
    await target.evaluate((element) => element.scrollIntoView({ block: 'start' }))
  }
  const bytes = await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: info.project.name === 'desktop',
    animations: 'disabled',
    scale: 'css',
  })
  if (process.env.UPDATE_DOC_SCREENSHOTS === '1') {
    await mkdir('../docs/screenshots', { recursive: true })
    await writeFile(
      path.join('../docs/screenshots', `task3-${name}-${info.project.name}.png`),
      bytes,
    )
  }
}

test('real PostgreSQL: Message and URL results persist through navigation and refresh', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  const unexpected: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('request', (req) => {
    if (!req.url().startsWith('http://127.0.0.1:5175')) unexpected.push(req.url())
  })
  const before = await (await page.request.get('/api/v1/dashboard')).json()
  const message = `URGENT: Your bank account will be suspended. Click the link and provide your OTP now. Browser fixture ${testInfo.project.name} ${Date.now()}`
  await page.goto('/analyse')
  await page.getByLabel('Message content').fill(message)
  await page.getByRole('button', { name: 'Analyse content' }).click()
  await expect(page.getByText('Analysis completed.')).toBeVisible()
  await expect(page.getByText('High risk')).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Detected evidence' }).getByText('Credential request'),
  ).toBeVisible()
  await capture(page, testInfo, 'recorded')
  const nav = page.getByRole('navigation', {
    name: testInfo.project.name === 'mobile' ? 'Mobile navigation' : 'Desktop navigation',
  })
  await nav.getByRole('link', { name: 'Overview' }).click()
  await expect(
    page
      .getByRole('region', { name: 'Total analyses' })
      .getByText(String(before.total_analyses + 1), { exact: true }),
  ).toBeVisible()
  await expect(page.getByText(message)).toBeVisible()
  await page.reload()
  await expect(page.getByText(message)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Flagged for review' })).toContainText(
    String(before.flagged_analyses + 1),
  )
  await page.getByRole('button', { name: new RegExp(message) }).click()
  await expect(page.getByText('Saved content · COMPLETED')).toBeVisible()
  await page.getByRole('button', { name: 'Browse history' }).click()
  await expect(page.getByRole('region', { name: 'Submission history' })).toContainText(message)
  // Recent and paginated history can show the same record; disclosure IDs stay unique.
  expect(
    await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]')).map((node) => node.id)
      return ids.length === new Set(ids).size
    }),
  ).toBe(true)
  await capture(page, testInfo, 'history')
  await nav.getByRole('link', { name: 'Analyse' }).click()
  await page.getByRole('tab', { name: 'URL', exact: true }).click()
  await page.getByLabel('Website URL').fill('https://example.com/task-2-browser-fixture')
  await page.getByRole('button', { name: 'Analyse content' }).click()
  await expect(page.getByText('Analysis completed.')).toBeVisible()
  await expect(page.getByLabel('URL assessment')).toBeVisible()
  await page.getByRole('tab', { name: 'Phone Number' }).click()
  await expect(page.getByRole('button', { name: 'Analyse phone number' })).toBeDisabled()
  await page.getByRole('tab', { name: 'QR Code' }).click()
  await expect(page.getByRole('button', { name: 'Analyse QR' })).toBeDisabled()
  const after = await (await page.request.get('/api/v1/dashboard')).json()
  expect(after.total_analyses).toBe(before.total_analyses + 2)
  expect(after.flagged_analyses).toBe(before.flagged_analyses + 1)
  expect(after.recent_analyses[0].input_type).toBe('URL')
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(errors).toEqual([])
  expect(unexpected).toEqual([])
})
