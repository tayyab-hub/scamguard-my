export type CameraPayload = { payload: string; decoder: 'BarcodeDetector' | 'zxing-wasm' }
export type FrameDecoder = {
  name: CameraPayload['decoder']
  decode: (canvas: HTMLCanvasElement) => Promise<string[]>
  close: () => void
}
type NativeDetector = { detect: (image: HTMLCanvasElement) => Promise<{ rawValue: string }[]> }
type NativeConstructor = {
  new (options: { formats: string[] }): NativeDetector
  getSupportedFormats: () => Promise<string[]>
}

export function payloadError(payload: string): string | null {
  if (!payload.trim()) return 'This QR code has no readable text. Try another code.'
  if (new TextEncoder().encode(payload).length > 5000)
    return 'This QR payload exceeds 5,000 bytes. Use a smaller code.'
  if (
    [...payload].some((char) => {
      const code = char.codePointAt(0)!
      return (code < 32 && !'\r\n\t'.includes(char)) || (code >= 0xd800 && code <= 0xdfff)
    })
  )
    return 'This QR code contains unsupported text. Try uploading its image.'
  return null
}

export async function createQrDecoder(
  signal: AbortSignal,
  useNative = true,
): Promise<FrameDecoder> {
  const Native = (globalThis as typeof globalThis & { BarcodeDetector?: NativeConstructor })
    .BarcodeDetector
  if (Native && useNative) {
    try {
      if ((await Native.getSupportedFormats()).includes('qr_code')) {
        const detector = new Native({ formats: ['qr_code'] })
        let fallback: FrameDecoder | undefined
        return {
          get name() {
            return fallback?.name ?? 'BarcodeDetector'
          },
          decode: async (canvas) => {
            if (fallback) return fallback.decode(canvas)
            try {
              return (await detector.detect(canvas)).map((item) => item.rawValue)
            } catch {
              fallback = await createQrDecoder(signal, false)
              return fallback.decode(canvas)
            }
          },
          close: () => fallback?.close(),
        }
      }
    } catch {
      /* Unsupported native implementations use the bundled decoder below. */
    }
  }
  if (signal.aborted) throw new Error('Scanner cancelled')
  const worker = new Worker(new URL('./qrDecoder.worker.ts', import.meta.url), { type: 'module' })
  let rejectPending: ((error: Error) => void) | undefined
  let resolveFrame: ((payloads: string[]) => void) | undefined
  const close = () => {
    worker.terminate()
    rejectPending?.(new Error('Scanner stopped'))
    rejectPending = undefined
    signal.removeEventListener('abort', close)
  }
  signal.addEventListener('abort', close, { once: true })
  await new Promise<void>((resolve, reject) => {
    rejectPending = reject
    worker.onerror = () => rejectPending?.(new Error('QR decoder unavailable'))
    worker.onmessage = (event: MessageEvent<{ type: string; payloads?: string[] }>) => {
      if (event.data.type === 'ready') {
        rejectPending = undefined
        resolve()
      } else if (event.data.type === 'result') {
        const resolve = resolveFrame
        resolveFrame = undefined
        rejectPending = undefined
        resolve?.(event.data.payloads ?? [])
      } else if (event.data.type === 'error') {
        rejectPending?.(new Error('QR decoder could not read this frame'))
      }
    }
  }).catch((error: unknown) => {
    close()
    throw error
  })
  return {
    name: 'zxing-wasm',
    decode: (canvas) =>
      new Promise<string[]>((resolve, reject) => {
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) {
          reject(new Error('Frame unavailable'))
          return
        }
        resolveFrame = resolve
        rejectPending = reject
        const frame = context.getImageData(0, 0, canvas.width, canvas.height)
        worker.postMessage(frame, [frame.data.buffer])
      }),
    close,
  }
}
