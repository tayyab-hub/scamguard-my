import { expect, test } from '@playwright/test'
import path from 'node:path'
import { createAuthenticatedAccount } from './auth-fixture'

test('real PostgreSQL: QR upload, routed result and private history survive refresh', async ({
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

  await createAuthenticatedAccount(page.request, info)
  const before = await (await page.request.get('/api/v1/dashboard')).json()
  await page.goto('/analyse')
  await page.getByRole('tab', { name: 'QR Code' }).click()
  const input = page.getByLabel('Upload a QR screenshot or image')
  await input.setInputFiles(path.resolve('test-results/qr-fixtures/controlled-url.png'))
  await expect(page.getByAltText('Selected QR image preview')).toBeVisible()
  const completed = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/analyses/qr') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Analyse QR' }).click()
  const response = await completed
  expect(response.status()).toBe(201)
  const record = await response.json()
  expect(record.input_type).toBe('QR')
  expect(record.content).toBe('https://example.com/scamguard-qr-e2e')
  expect(record.assessment.components.qr.payload_type).toBe('URL')
  expect(record.assessment.components.qr.original_image_retained).toBe(false)
  await expect(page.getByLabel('QR assessment')).toBeVisible()
  await expect(page.getByLabel('QR decoding result')).toContainText('url')
  await expect(page.getByText('https://example.com/scamguard-qr-e2e')).toBeVisible()

  await page.goto('/')
  await expect(
    page
      .getByRole('region', { name: 'Total analyses' })
      .getByText(String(before.total_analyses + 1)),
  ).toBeVisible()
  await expect(page.getByText('QR · url')).toBeVisible()
  await page.reload()
  await expect(page.getByText('QR · url')).toBeVisible()
  await page.getByRole('button', { name: /https:\/\/example\.com\/scamguard-qr-e2e/ }).click()
  await expect(page.getByLabel('QR assessment')).toBeVisible()
  await expect(page.getByText(/Upload the QR image again/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analyse again' })).toHaveCount(0)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await page
      .getByLabel('QR assessment')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none')
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(errors).toEqual([])
  expect(outside).toEqual([])
})
