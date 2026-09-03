import { expect, test, type Page } from '@playwright/test'

async function settled(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((animation) => animation.playState === 'running').length,
      ),
    )
    .toBe(0)
}

for (const connected of [true, false]) {
  test(`loading settles into a truthful ${connected ? 'connected' : 'unavailable'} state without repeated motion`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    let release = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    // Delay only test requests so loading and the actual transition can be inspected deterministically.
    await page.route('**/api/v1/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname
      if (pathname.endsWith('/health') || pathname.endsWith('/dashboard')) await pending
      if (!connected && pathname.endsWith('/health')) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
      } else await route.continue()
    })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    await expect(page.getByText('Loading workspace…')).toBeVisible()
    const status = page.locator('.api-status:visible')
    await expect(status).toContainText('Connecting to API')
    expect(
      await page
        .locator('.loading-scan')
        .evaluate((element) => getComputedStyle(element, '::after').animationName),
    ).not.toBe('none')
    await expect(page.locator('.animate-spin')).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath('loading.png'), scale: 'css' })

    // Changing the OS preference while activity is running must stop it immediately.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
    expect(
      await page
        .locator('.loading-scan')
        .evaluate((element) => getComputedStyle(element, '::after').animationName),
    ).toBe('none')
    await expect(page.getByText('Loading workspace…')).toBeVisible()
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    release()

    await expect(status).toContainText(connected ? 'API connected' : 'API unavailable')
    await expect(page.getByText('Your activity starts here')).toBeVisible()
    const timings = await page.locator('.metric-card').evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element)
        return (parseFloat(style.animationDuration) + parseFloat(style.animationDelay)) * 1000
      }),
    )
    expect(timings).toHaveLength(3)
    for (const duration of timings) {
      expect(duration).toBeGreaterThan(0)
      expect(duration).toBeLessThanOrEqual(350)
    }
    await expect(page.getByLabel('Not available', { exact: true })).toHaveText(['—', '—', '—'])
    await settled(page)
    const statusHandle = await status.elementHandle()
    const nav = page.getByRole('navigation', {
      name: testInfo.project.name === 'desktop' ? 'Desktop navigation' : 'Mobile navigation',
    })
    const navigationHandle = await nav.elementHandle()
    await nav.getByRole('link', { name: 'Analyse' }).click()
    await expect(page.getByRole('heading', { name: 'Analyse suspicious content' })).toBeFocused()
    await expect(page.getByLabel('Message content')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
    expect(await statusHandle!.evaluate((element) => element.isConnected)).toBe(true)
    expect(await navigationHandle!.evaluate((element) => element.isConnected)).toBe(true)
    await expect(status).toContainText(connected ? 'API connected' : 'API unavailable')
    await settled(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}

test('hover, press and input transitions preserve geometry, draft privacy and keyboard focus', async ({
  page,
}, testInfo) => {
  const submitted: string[] = []
  page.on('request', (request) => {
    if (request.method() !== 'GET' || request.postData()) submitted.push(request.url())
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.getByText('Your activity starts here')).toBeVisible()
  await settled(page)
  const card = page.getByRole('region', { name: 'Total analyses' })
  const initial = await card.boundingBox()
  const open = page.getByRole('link', { name: 'Open analyser' })
  if (testInfo.project.name === 'desktop') {
    await card.hover()
    await expect(card).toHaveCSS('translate', '0px -2px')
    const hovered = await card.boundingBox()
    expect(hovered!.width).toBe(initial!.width)
    expect(hovered!.height).toBe(initial!.height)
    expect(initial!.y - hovered!.y).toBeCloseTo(2, 0)
    await open.hover()
    await expect(open.locator('.motion-arrow')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 3, 0)')
    await page.mouse.down()
    await expect(open).toHaveCSS('transform', 'matrix(0.99, 0, 0, 0.99, 0, 0)')
    await page.screenshot({ path: testInfo.outputPath('button-press.png'), scale: 'css' })
    await page.mouse.up()
  } else {
    await card.tap()
    await expect(card).toHaveCSS('translate', 'none')
    await open.tap()
  }
  await expect(page.getByLabel('Message content')).toBeVisible()
  await settled(page)
  await page.getByLabel('Message content').fill('Private local draft')
  const messageChoice = page.getByRole('radio', { name: 'Message', exact: true })
  await messageChoice.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Website link' })).toBeFocused()
  await page.keyboard.press('Tab')
  const url = page.getByLabel('Website URL')
  await expect(url).toBeFocused()
  await url.fill('https://example.com')
  await expect(url).toHaveCSS('outline-style', 'solid')
  await settled(page)
  // Typing changes content, not the input's identity or entrance animation.
  const inputHandle = await url.elementHandle()
  await url.press('End')
  await url.press('a')
  expect(await inputHandle!.evaluate((element) => element.isConnected)).toBe(true)
  expect(await url.evaluate((element) => element.getAnimations().length)).toBe(0)
  await page.getByRole('radio', { name: 'Message', exact: true }).check()
  await expect(page.getByLabel('Message content')).toHaveValue('Private local draft')
  const analyse = page.getByRole('button', { name: 'Analyse content' })
  await expect(analyse).toBeDisabled()
  await analyse.scrollIntoViewIfNeeded()
  await settled(page)
  if (testInfo.project.name === 'desktop') {
    await analyse.hover()
    await expect(analyse.locator('.motion-arrow')).toHaveCSS('transform', 'none')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(submitted).toEqual([])
})
