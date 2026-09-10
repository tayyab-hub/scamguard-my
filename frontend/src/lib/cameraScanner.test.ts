import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CameraScanner } from './cameraScanner'
import { createQrDecoder, payloadError } from './qrDecoder'

vi.mock('./qrDecoder', async (original) => ({
  ...(await original<typeof import('./qrDecoder')>()),
  createQrDecoder: vi.fn(),
}))

const stop = vi.fn()
const close = vi.fn()
const decode = vi.fn<() => Promise<string[]>>()
const getUserMedia = vi.fn()
const track = { stop, addEventListener: vi.fn(), getSettings: () => ({ deviceId: 'rear-camera' }) }
const stream = { getTracks: () => [track], getVideoTracks: () => [track] }
function scanner() {
  const video = document.createElement('video')
  const callbacks = { onDetected: vi.fn(), onStatus: vi.fn(), onError: vi.fn(), onDevices: vi.fn() }
  return { video, callbacks, session: new CameraScanner(video, callbacks) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal(
    'navigator',
    Object.assign(Object.create(navigator), {
      mediaDevices: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) },
    }),
  )
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2)
  vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(1280)
  vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(720)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  getUserMedia.mockResolvedValue(stream)
  decode.mockResolvedValue([])
  vi.mocked(createQrDecoder).mockResolvedValue({ name: 'zxing-wasm', decode, close })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllTimers()
})

describe('camera privacy lifecycle', () => {
  it('does not request a camera on construction; explicit start prefers rear video without audio', async () => {
    const { session } = scanner()
    expect(getUserMedia).not.toHaveBeenCalled()
    await session.start()
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: false,
        video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
      }),
    )
    session.close()
    expect(stop).toHaveBeenCalledOnce()
  })

  it.each([
    'https://example.com/never-open',
    'javascript:alert(1)',
    'tel:+442079460958',
    'sms:+442079460958',
    'mailto:a@example.com',
    '<img src=x onerror=alert(1)>',
  ])('stops before presenting inert payload %s', async (payload) => {
    decode.mockResolvedValue([payload])
    const { session, callbacks, video } = scanner()
    const open = vi.fn()
    vi.stubGlobal('open', open)
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await session.start()
    expect(stop).toHaveBeenCalledOnce()
    expect(video.srcObject).toBeNull()
    expect(close).toHaveBeenCalledOnce()
    expect(callbacks.onDetected).toHaveBeenCalledWith({ payload, decoder: 'zxing-wasm' })
    expect(open).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['NotAllowedError', 'NotFoundError', 'NotReadableError'])(
    'handles %s with upload guidance',
    async (name) => {
      getUserMedia.mockRejectedValue(new DOMException('Private device details', name))
      const { session, callbacks } = scanner()
      await session.start()
      expect(callbacks.onError).toHaveBeenCalledWith(expect.stringMatching(/upload/i))
      expect(callbacks.onError.mock.calls.flat().join()).not.toContain('Private device')
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('gives an unsupported browser fallback without requesting permission', async () => {
    vi.stubGlobal('isSecureContext', false)
    const { session, callbacks } = scanner()
    await session.start()
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(callbacks.onError).toHaveBeenCalledWith(expect.stringContaining('HTTPS'))
  })

  it('stops a stream granted after cancel, with no preview or decoder', async () => {
    let allow!: (value: typeof stream) => void
    getUserMedia.mockImplementation(
      () =>
        new Promise((resolve) => {
          allow = resolve
        }),
    )
    const { session, video } = scanner()
    const starting = session.start()
    session.close()
    allow(stream)
    await starting
    expect(stop).toHaveBeenCalledOnce()
    expect(video.srcObject).toBeNull()
    expect(createQrDecoder).not.toHaveBeenCalled()
  })

  it('ignores detection completed after cleanup', async () => {
    let resolve!: (value: string[]) => void
    decode.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const { session, callbacks } = scanner()
    const starting = session.start()
    await vi.advanceTimersByTimeAsync(0)
    session.close()
    resolve(['https://example.com'])
    await starting
    expect(callbacks.onDetected).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('closes tracks on cancellation and never resumes on its own', async () => {
    const { session } = scanner()
    await session.start()
    session.close()
    await vi.advanceTimersByTimeAsync(100_000)
    expect(stop).toHaveBeenCalledOnce()
    expect(getUserMedia).toHaveBeenCalledOnce()
    expect(decode).toHaveBeenCalledOnce()
  })

  it('pauses an idle session after ninety seconds', async () => {
    const { session, callbacks } = scanner()
    await session.start()
    await vi.advanceTimersByTimeAsync(90_000)
    expect(stop).toHaveBeenCalledOnce()
    expect(callbacks.onError).toHaveBeenCalledWith(expect.stringContaining('90 seconds'))
  })

  it('does not choose one of multiple detected codes', async () => {
    decode.mockResolvedValue(['one', 'two'])
    const { session, callbacks } = scanner()
    await session.start()
    expect(callbacks.onDetected).not.toHaveBeenCalled()
    expect(callbacks.onStatus).toHaveBeenCalledWith(expect.stringContaining('Multiple'))
    session.close()
  })

  it('stops if decoder preparation or preview playback fails', async () => {
    vi.mocked(createQrDecoder).mockRejectedValue(new Error('worker failed'))
    const { session, callbacks } = scanner()
    await session.start()
    expect(stop).toHaveBeenCalledOnce()
    expect(callbacks.onError).toHaveBeenCalled()
  })

  it('enforces byte, control and Unicode boundaries without interpreting content', () => {
    expect(payloadError('漢'.repeat(1700))).toContain('5,000 bytes')
    expect(payloadError('   ')).toContain('no readable text')
    expect(payloadError('a\x00b')).toContain('unsupported')
    expect(payloadError('\ud800')).toContain('unsupported')
    expect(payloadError('javascript:alert(1)')).toBeNull()
  })
})
