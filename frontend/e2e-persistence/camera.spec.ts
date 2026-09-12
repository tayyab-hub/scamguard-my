import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { createAuthenticatedAccount } from './auth-fixture'

declare global {
  interface Window {
    cameraFixture: {
      calls: number
      stopped: number
      mode: 'qr' | 'blank' | 'denied'
      constraints: MediaStreamConstraints[]
    }
  }
}

async function installCamera(page: Page) {
  const fixture = fs
    .readFileSync(path.resolve('test-results/qr-fixtures/controlled-url.png'))
    .toString('base64')
  await page.addInitScript(
    ({ fixture }) => {
      window.cameraFixture = { calls: 0, stopped: 0, mode: 'qr', constraints: [] }
      // Exercise the real same-origin worker/WASM fallback, even on native-capable Chrome.
      Object.defineProperty(window, 'BarcodeDetector', { configurable: true, value: undefined })
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: async (constraints: MediaStreamConstraints) => {
          window.cameraFixture.calls++
          window.cameraFixture.constraints.push(constraints)
          if (window.cameraFixture.mode === 'denied')
            throw new DOMException('Test denial', 'NotAllowedError')
          const canvas = document.createElement('canvas')
          canvas.width = 640
          canvas.height = 640
          const context = canvas.getContext('2d')!
          context.fillStyle = 'white'
          context.fillRect(0, 0, 640, 640)
          if (window.cameraFixture.mode === 'qr') {
            const image = new Image()
            image.src = `data:image/png;base64,${fixture}`
            await image.decode()
            context.drawImage(image, 64, 64, 512, 512)
          }
          const stream = canvas.captureStream(5)
          for (const track of stream.getTracks()) {
            const stop = track.stop.bind(track)
            track.stop = () => {
              window.cameraFixture.stopped++
              stop()
            }
          }
          return stream
        },
      })
      Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
        configurable: true,
        value: async () =>
          ['rear', 'front'].map((id) => ({
            deviceId: id,
            kind: 'videoinput',
            label: `Test ${id}`,
            groupId: '',
            toJSON: () => ({}),
          })),
      })
    },
    { fixture },
  )
}

test('camera: real WASM detection stays inert until explicit QR analysis and persists metadata', async ({
  page,
}, info) => {
  await createAuthenticatedAccount(page.request, info)
  await installCamera(page)
  const outside: string[] = []
  const errors: string[] = []
  const analysisRequests: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:5175/')) outside.push(request.url())
    if (request.method() === 'POST' && request.url().includes('/analyses'))
      analysisRequests.push(request.url())
  })
  await page.goto('/analyse?mode=QR')
  expect(await page.evaluate(() => window.cameraFixture.calls)).toBe(0)
  await page.getByRole('button', { name: 'Scan with camera', exact: true }).click()
  expect(await page.evaluate(() => window.cameraFixture.calls)).toBe(0)
  await page.getByRole('button', { name: 'Start camera', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'QR detected · camera stopped' })).toBeVisible({
    timeout: 20000,
  })
  await expect(page.getByRole('heading', { name: 'QR detected · camera stopped' })).toBeFocused()
  await page.screenshot({
    path: `test-results/task8-camera-${info.project.name}-detected.png`,
    fullPage: true,
  })
  expect(await page.evaluate(() => window.cameraFixture.stopped)).toBe(1)
  expect(await page.evaluate(() => window.cameraFixture.constraints[0])).toMatchObject({
    audio: false,
    video: { facingMode: { ideal: 'environment' } },
  })
  expect(analysisRequests).toEqual([])
  await expect(page.getByText('https://example.com/scamguard-qr-e2e')).toBeVisible()
  expect(page.url()).toContain('/analyse')
  const response = page.waitForResponse(
    (response) =>
      response.url().endsWith('/analyses/qr/payload') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Analyse QR', exact: true }).click()
  const recordResponse = await response
  expect(recordResponse.status()).toBe(201)
  const record = await recordResponse.json()
  expect(record.assessment.components.qr).toMatchObject({
    source: 'CAMERA',
    decoder_library: 'zxing-wasm',
    file_sha256: null,
    original_image_retained: false,
  })
  await expect(page.getByLabel('QR assessment')).toBeVisible()
  await expect(page.getByText('Camera · decoded on device')).toBeVisible()
  await page.goto('/history?type=QR')
  await page.getByRole('button', { name: /https:\/\/example.com\/scamguard-qr-e2e/ }).click()
  await expect(page.getByText('Camera · decoded on device')).toBeVisible()
  expect(outside).toEqual([])
  expect(errors).toEqual([])
  expect(analysisRequests.filter((url) => url.endsWith('/qr/payload'))).toHaveLength(1)
})

test('camera: cancellation, switching, navigation, reduced motion and upload fallback', async ({
  page,
}, info) => {
  await createAuthenticatedAccount(page.request, info)
  await installCamera(page)
  await page.goto('/analyse?mode=QR')
  await page.evaluate(() => {
    window.cameraFixture.mode = 'blank'
  })
  await page.getByRole('button', { name: 'Scan with camera', exact: true }).click()
  await page.getByRole('button', { name: 'Start camera', exact: true }).click()
  await expect(page.getByText('Scanning. Position the QR code inside the frame.')).toBeVisible({
    timeout: 20000,
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await page
      .locator('.scanner-line')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none')
  for (const width of [320, 375, 390, 430, 768, 1024, 1366, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `test-results/task8-camera-${info.project.name}-${width}.png`,
      fullPage: true,
    })
  }
  await page.getByRole('button', { name: 'Switch camera' }).click()
  await expect.poll(() => page.evaluate(() => window.cameraFixture.stopped)).toBe(1)
  await expect(page.getByText('Scanning. Position the QR code inside the frame.')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel scan' }).click()
  expect(await page.evaluate(() => window.cameraFixture.stopped)).toBe(2)
  await page.getByRole('button', { name: 'Start camera' }).click()
  await expect(page.getByText('Scanning. Position the QR code inside the frame.')).toBeVisible()
  await page.getByRole('tab', { name: 'Message', exact: true }).click()
  expect(await page.evaluate(() => window.cameraFixture.stopped)).toBe(3)
  await page.getByRole('tab', { name: 'QR Code' }).click()
  await page.getByRole('button', { name: 'Start camera' }).click()
  await expect(page.getByText('Scanning. Position the QR code inside the frame.')).toBeVisible()
  const navigation = page.getByRole('navigation', { name: 'Desktop navigation' })
  await navigation.getByRole('link', { name: 'History' }).click()
  await expect.poll(() => page.evaluate(() => window.cameraFixture.stopped)).toBe(4)
  await page.goto('/analyse?mode=QR')
  await page.getByRole('button', { name: 'Scan with camera', exact: true }).click()
  await page.evaluate(() => {
    window.cameraFixture.mode = 'denied'
  })
  await page.getByRole('button', { name: 'Start camera' }).click()
  await expect(page.getByRole('alert')).toContainText('Camera permission was denied')
  await page.getByRole('button', { name: 'Upload image instead' }).click()
  await page
    .getByLabel('Upload a QR screenshot or image')
    .setInputFiles(path.resolve('test-results/qr-fixtures/controlled-url.png'))
  await expect(page.getByRole('button', { name: 'Analyse QR', exact: true })).toBeEnabled()
})
