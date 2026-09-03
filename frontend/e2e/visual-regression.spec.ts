import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'

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
  await expect(nav.getByRole('link')).toHaveText(['Overview', 'Analyse'])
  await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/')
  await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
  await expect(page).toHaveTitle('Overview · SCAMGUARD MY')
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

  const message = page.getByRole('radio', { name: 'Message', exact: true })
  await message.focus()
  await page.keyboard.press('ArrowRight')
  const website = page.getByRole('radio', { name: 'Website link' })
  await expect(website).toBeChecked()
  await expect(website).toBeFocused()
  expect(
    await website.evaluate((element) => getComputedStyle(element.closest('label')!).outlineStyle),
  ).toBe('solid')
  await page.screenshot({ path: testInfo.outputPath('radio-focus.png'), scale: 'css' })
  await page.keyboard.press('Tab')
  const url = page.getByLabel('Website URL')
  await expect(url).toBeFocused()
  expect(
    await url.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth)),
  ).toBeGreaterThanOrEqual(2)
  await page.screenshot({ path: testInfo.outputPath('input-focus.png'), scale: 'css' })
  expect(failures).toEqual([])
})

test('small mobile, tablet, and sidebar breakpoint preserve usable content', async ({ page }) => {
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/analyse']) {
      await page.goto(route)
      await expect(
        page.getByText(
          route === '/' ? 'Your activity starts here' : 'Analysis is not enabled in this release.',
        ),
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
        await page.getByRole('radio', { name: 'Website link' }).check()
        const input = page.getByLabel('Website URL')
        await input.fill('https://example.com')
        await input.scrollIntoViewIfNeeded()
        if (width < 1024) {
          const inputBounds = await input.boundingBox()
          const navigationBounds = await nav.boundingBox()
          expect(inputBounds!.y + inputBounds!.height).toBeLessThanOrEqual(navigationBounds!.y)
        }
        await expect(page.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
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
  ]) {
    expect(contrast(foreground!, background!)).toBeGreaterThanOrEqual(4.5)
  }
  expect(contrast('control', 'surface')).toBeGreaterThanOrEqual(3)
})
