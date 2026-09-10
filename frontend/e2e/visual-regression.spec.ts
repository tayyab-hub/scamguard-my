import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import { mockAuthenticatedWorkspace } from './auth-fixture'

test.beforeEach(async ({ page }) => mockAuthenticatedWorkspace(page))

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  if (testInfo.project.name === 'mobile') {
    // Retain the complete document for QA, but document the actual viewport so fixed
    // navigation is not misleadingly shown across the middle of a stitched image.
    await page.screenshot({
      path: testInfo.outputPath(`${name}-fullpage.png`),
      fullPage: true,
      scale: 'css',
      animations: 'disabled',
    })
    if (name === 'phone' || name === 'qr') {
      // Document the new controls, rather than only the page heading above the fold.
      await page
        .getByRole('tablist')
        .evaluate((element) => element.scrollIntoView({ block: 'start' }))
    }
  }
  const bytes = await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: testInfo.project.name === 'desktop',
    scale: 'css',
    animations: 'disabled',
  })
  // Documentation updates are opt-in; ordinary test runs do not modify source artifacts.
  if (process.env.UPDATE_DOC_SCREENSHOTS === '1') {
    const destination = path.resolve('..', 'docs', 'screenshots')
    await mkdir(destination, { recursive: true })
    await writeFile(path.join(destination, `${name}-${testInfo.project.name}.png`), bytes)
  }
}

test('Forensic Intelligence screens retain navigation and keyboard access', async ({
  page,
}, testInfo) => {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(message.text())
  })
  await page.goto('/')
  await expect(page.getByText('Your activity starts here')).toBeVisible()
  const nav = page.getByRole('navigation', {
    name: testInfo.project.name === 'desktop' ? 'Desktop navigation' : 'Mobile navigation',
  })
  await expect(nav.getByRole('link')).toHaveText(['Overview', 'Analyse', 'Help & Support'])
  await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/')
  await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
  await expect(page).toHaveTitle('Overview · SCAMGUARD')
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
    'light',
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await capture(page, testInfo, 'dashboard')

  // Exercise the preserved skip link with a real key event and verify its focus treatment.
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await skip.focus()
  await expect(skip).toBeInViewport()
  expect(await skip.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()

  await nav.getByRole('link', { name: 'Analyse' }).click()
  await expect(page.getByRole('heading', { name: 'Analyse suspicious content' })).toBeFocused()
  await expect(page.getByText('Analysis is not enabled in this release.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
  await expect(page.getByText('No assessment yet')).toBeVisible()
  await expect(page.getByLabel('Message content')).toHaveValue('')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await capture(page, testInfo, 'analyse')

  const message = page.getByRole('tab', { name: 'Message', exact: true })
  await message.focus()
  await page.keyboard.press('ArrowRight')
  const website = page.getByRole('tab', { name: 'URL', exact: true })
  await expect(website).toHaveAttribute('aria-selected', 'true')
  await expect(website).toBeFocused()
  expect(await website.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')
  await page.screenshot({ path: testInfo.outputPath('tab-focus.png'), scale: 'css' })
  await page.keyboard.press('Tab')
  const url = page.getByLabel('Website URL')
  await expect(url).toBeFocused()
  expect(
    await url.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
  ).toBeGreaterThanOrEqual(2)
  await page.screenshot({ path: testInfo.outputPath('input-focus.png'), scale: 'css' })

  await nav.getByRole('link', { name: 'Help & Support' }).click()
  await expect(page.getByRole('heading', { name: 'Help & Support' })).toBeFocused()
  await expect(page.getByRole('group')).toHaveCount(20)
  await capture(page, testInfo, 'help')
  expect(failures).toEqual([])
})

test('small mobile, tablet, and sidebar breakpoint preserve usable content', async ({
  page,
}, testInfo) => {
  for (const width of [320, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/analyse', '/help']) {
      await page.goto(route)
      await expect(
        route === '/'
          ? page.getByText('Your activity starts here')
          : route === '/analyse'
            ? page.getByText('Analysis is not enabled in this release.')
            : page.getByRole('heading', { name: 'Help & Support' }),
      ).toBeVisible()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}px`,
      ).toBe(true)
      const nav = page.getByRole('navigation', {
        name: width >= 1024 ? 'Desktop navigation' : 'Mobile navigation',
      })
      await expect(nav).toBeVisible()
      if (route === '/analyse') {
        await page.getByRole('tab', { name: 'URL', exact: true }).click()
        const input = page.getByLabel('Website URL')
        await input.fill('https://example.com')
        await input.scrollIntoViewIfNeeded()
        if (width < 1024) {
          const inputBounds = await input.boundingBox()
          const navigationBounds = await nav.boundingBox()
          expect(inputBounds!.y + inputBounds!.height).toBeLessThanOrEqual(navigationBounds!.y)
        }
        await expect(page.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
        await expect(page.getByRole('tab')).toHaveText([
          'Message',
          'URL',
          'Phone Number',
          'QR Code',
        ])
        await page.getByRole('tab', { name: 'Phone Number' }).click()
        await expect(page.getByRole('textbox', { name: 'Phone number', exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Analyse phone number' })).toBeDisabled()
        await page.getByRole('tab', { name: 'QR Code' }).click()
        await expect(page.getByLabel('Upload a QR screenshot or image')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Analyse QR' })).toBeDisabled()
        await page.getByLabel('Upload a QR screenshot or image').setInputFiles({
          name: `${'local-fixture-'.repeat(9)}.png`,
          mimeType: 'image/png',
          buffer: Buffer.from('metadata fixture'),
        })
        const qrAction = page.getByRole('button', { name: 'Analyse QR' })
        await qrAction.evaluate((element) => element.scrollIntoView({ block: 'center' }))
        if (width < 1024) {
          const actionBounds = await qrAction.boundingBox()
          const navigationBounds = await nav.boundingBox()
          expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(navigationBounds!.y)
        }
        await page.screenshot({
          path: testInfo.outputPath(`qr-${width}px.png`),
          scale: 'css',
          animations: 'disabled',
        })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
      }
    }
  }
})

test('text, controls, and focus tokens have sufficient contrast in the light theme', async ({
  page,
}) => {
  await page.goto('/')
  const colors = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement)
    return Object.fromEntries(
      [
        'canvas',
        'sidebar',
        'surface',
        'surface-raised',
        'ink',
        'body',
        'muted',
        'accent',
        'accent-subtle',
        'on-accent',
        'success',
        'success-subtle',
        'danger',
        'danger-subtle',
        'warning',
        'warning-subtle',
        'control',
        'focus',
      ].map((name) => [name, style.getPropertyValue(`--color-${name}`).trim()]),
    )
  })
  function luminance(hex: string) {
    const channels = hex
      .replace('#', '')
      .match(/.{2}/g)!
      .map((value) => {
        const channel = Number.parseInt(value, 16) / 255
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
      })
    return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
  }
  function contrast(foreground: string, background: string) {
    const values = [luminance(colors[foreground]!), luminance(colors[background]!)].sort(
      (a, b) => b - a,
    )
    return (values[0]! + 0.05) / (values[1]! + 0.05)
  }
  for (const background of ['canvas', 'sidebar', 'surface', 'surface-raised']) {
    for (const foreground of ['ink', 'body', 'muted'])
      expect(
        contrast(foreground, background),
        `${foreground}/${background}`,
      ).toBeGreaterThanOrEqual(4.5)
    expect(contrast('focus', background)).toBeGreaterThanOrEqual(3)
  }
  for (const [foreground, background] of [
    ['on-accent', 'accent'],
    ['accent', 'accent-subtle'],
    ['warning', 'warning-subtle'],
    ['success', 'surface'],
    ['success', 'success-subtle'],
    ['danger', 'danger-subtle'],
    ['danger', 'surface'],
  ]) {
    expect(contrast(foreground!, background!)).toBeGreaterThanOrEqual(4.5)
  }
  expect(contrast('control', 'surface')).toBeGreaterThanOrEqual(3)
})

test('unavailable Phone and planned QR modes preserve local privacy, file focus and reduced motion', async ({
  page,
}, testInfo) => {
  const failures: string[] = []
  const apiRequests: Array<{ url: string; method: string; body: string | null }> = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(message.text())
  })
  page.on('request', (request) => {
    if (request.url().includes('/api/'))
      apiRequests.push({ url: request.url(), method: request.method(), body: request.postData() })
  })
  await page.goto('/analyse')
  await page.getByRole('tab', { name: 'Phone Number' }).click()
  await expect(page.getByRole('textbox', { name: 'Phone number', exact: true })).toHaveAttribute(
    'inputmode',
    'tel',
  )
  await page.getByRole('textbox', { name: 'Phone number', exact: true }).fill('+44 (20) 7946-0958')
  await page.getByRole('textbox', { name: 'Phone number', exact: true }).press('Enter')
  await expect(page.getByRole('button', { name: 'Analyse phone number' })).toBeDisabled()
  await capture(page, testInfo, 'phone')
  await page.getByRole('tab', { name: 'QR Code' }).click()
  const picker = page.getByLabel('Upload a QR screenshot or image')
  await page.getByRole('tab', { name: 'QR Code' }).focus()
  await page.keyboard.press('Tab')
  await expect(picker).toBeFocused()
  await expect(page.locator('.qr-file-control')).toHaveCSS('outline-style', 'solid')
  await picker.setInputFiles({
    name: 'local-preview-fixture.png',
    mimeType: 'image/png',
    buffer: Buffer.from('local metadata fixture; never decoded'),
  })
  await expect(page.getByText('local-preview-fixture.png')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analyse QR' })).toBeDisabled()
  await capture(page, testInfo, 'qr')
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(picker).toBeFocused()
  await expect(page.locator('.qr-file-control')).toHaveCSS('outline-style', 'solid')
  await page.screenshot({ path: testInfo.outputPath('qr-file-focus.png'), scale: 'css' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const name of ['Phone Number', 'QR Code']) {
    await page.getByRole('tab', { name }).click()
    await expect(page.getByRole('tabpanel')).toHaveCSS('animation-name', 'none')
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
  }
  for (const request of apiRequests) {
    expect(new URL(request.url).pathname).toMatch(/^\/api\/v1\/(health|capabilities|auth\/me)$/)
    expect(request.method).toBe('GET')
    expect(request.body).toBeNull()
  }
  expect(failures).toEqual([])
})
