import { expect, test } from '@playwright/test'
import { createAuthenticatedAccount } from './auth-fixture'

test.beforeEach(async ({ page }, info) => createAuthenticatedAccount(page.request, info))

test('evidence balance, abstention and private history work across responsive widths', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/analyse')
  await page
    .getByLabel('Message content')
    .fill(
      'Security warning: your bank account will be suspended. Provide your passw0rd and OTP immediately.',
    )
  await page.getByRole('button', { name: 'Analyse content' }).click()
  const assessment = page.getByLabel('Message assessment')
  await expect(assessment.getByText('High risk', { exact: true })).toBeVisible()
  await expect(assessment.getByRole('heading', { name: 'Why this verdict' })).toBeVisible()
  await expect(assessment.getByText('What tempers the result')).toBeVisible()
  await expect(
    assessment.getByText('Do not share passwords, PINs or one-time verification codes.'),
  ).toBeVisible()
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(assessment.getByRole('heading', { name: 'Why this verdict' })).toBeVisible()
  }
  await page.screenshot({ path: info.outputPath('review-result-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 375, height: 900 })
  await page.screenshot({ path: info.outputPath('review-result-mobile.png'), fullPage: true })
  await page.getByLabel('Message content').fill('qzxv qzxv qzxv')
  await page.getByRole('button', { name: 'Analyse content' }).click()
  await expect(assessment.getByText('Insufficient evidence', { exact: true })).toBeVisible()
  await expect(assessment.getByText('Confidence: unavailable')).toBeVisible()
  await expect(assessment.getByRole('meter')).toHaveCount(0)
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Review inconclusive results' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('review-overview-mobile.png'), fullPage: true })
  await page.getByRole('link', { name: 'Review inconclusive results' }).click()
  await expect(page.getByLabel('Risk level')).toHaveValue('INSUFFICIENT_EVIDENCE')
  await page
    .getByRole('button', { name: /View submission/ })
    .first()
    .click()
  await expect(page.getByText('Confidence: unavailable')).toBeVisible()
  expect(errors).toEqual([])
})
