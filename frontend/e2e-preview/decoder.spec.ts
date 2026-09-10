import { readdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('built QR worker loads its packaged WASM from the same origin and decodes a frame', async ({
  page,
}) => {
  const worker = (await readdir('dist/assets')).find((name) => name.startsWith('qrDecoder.worker-'))
  expect(worker).toBeTruthy()
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('/help')
  const payloads = await page.evaluate(
    (asset) =>
      new Promise<string[]>((resolve, reject) => {
        const decoder = new Worker(`/assets/${asset}`, { type: 'module' })
        const timer = setTimeout(() => {
          decoder.terminate()
          reject(new Error('Decoder timed out'))
        }, 15000)
        decoder.onerror = () => {
          clearTimeout(timer)
          decoder.terminate()
          reject(new Error('Worker failed'))
        }
        decoder.onmessage = (event) => {
          if (event.data.type === 'ready') {
            const frame = new ImageData(256, 256)
            frame.data.fill(255)
            decoder.postMessage(frame)
          } else {
            clearTimeout(timer)
            decoder.terminate()
            if (event.data.type === 'result') resolve(event.data.payloads)
            else reject(new Error('Decoder failed'))
          }
        }
      }),
    worker!,
  )
  expect(payloads).toEqual([])
  expect(requests.some((url) => url.endsWith('.wasm'))).toBe(true)
  expect(requests.every((url) => url.startsWith('http://127.0.0.1:4173/'))).toBe(true)
})
