import { expect, test } from '@playwright/test'

const scenarios = [
  ['https://paypal.example.net/%252f/file.exe', 'High risk', 'Encoded URL structure'],
  ['https://www.example.com/', 'Low observed risk', 'No structural warning was found.'],
  ['http://192.0.2.10/login', 'Caution advised', 'IP address host'],
  [
    'https://paypal.com.secure-login.example.net/verify',
    'Elevated risk',
    'Brand-like token outside its domain',
  ],
  [
    'https://example.net/login?redirect=https%3A%2F%2Fother.example',
    'Caution advised',
    'Destination parameter',
  ],
] as const

test('URL scenarios: persisted real results, no navigation to destinations, keyboard and 320px layout', async ({
  page,
}, info) => {
  const errors: string[] = []
  const outside: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('request', (req) => {
    if (!req.url().startsWith('http://127.0.0.1:5175/')) outside.push(req.url())
  })
  await page.goto('/analyse')
  await page.getByRole('tab', { name: 'URL', exact: true }).click()
  for (const [url, risk, evidence] of scenarios) {
    await page.getByLabel('Website URL').fill(url)
    const responsePromise = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/analyses') && r.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Analyse content' }).click()
    const record = await (await responsePromise).json()
    expect(record.status).toBe('COMPLETED')
    await expect(page.getByText(risk, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Detected evidence' }).getByText(evidence, { exact: false }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recommended actions' })).toBeVisible()
    const details = page.getByText('Components and limitations')
    await details.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Local URL model', { exact: true })).toBeVisible()
    await expect(page.getByText('disabled', { exact: true })).toBeVisible()
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    }
    if (risk === 'High risk') {
      await page.setViewportSize({
        width: info.project.name === 'mobile' ? 320 : 1440,
        height: 950,
      })
      await page.screenshot({ path: info.outputPath('url-result.png'), fullPage: true })
    }
    const stored = await (await page.request.get(`/api/v1/analyses/${record.id}`)).json()
    expect(stored).toEqual(record)
    // Reset disclosure for the next result.
    await details.click()
  }
  await page.getByLabel('Website URL').fill('javascript:alert(1)')
  await page.getByLabel('Website URL').blur()
  await expect(page.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
  await expect(page.getByText('Enter a valid URL starting with http:// or https://.')).toBeVisible()
  await page.goto('/')
  await page.getByRole('button', { name: /https:\/\/example.net\/login/ }).click()
  await expect(page.getByLabel('URL assessment')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: /https:\/\/example.net\/login/ }).click()
  await expect(
    page.getByRole('region', { name: 'Detected evidence' }).getByText('Destination parameter'),
  ).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await page.getByLabel('URL assessment').evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none')
  expect(errors).toEqual([])
  expect(outside).toEqual([])
})
