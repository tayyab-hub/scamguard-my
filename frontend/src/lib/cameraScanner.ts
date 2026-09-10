import { createQrDecoder, payloadError, type CameraPayload, type FrameDecoder } from './qrDecoder'

type Callbacks = {
  onDetected: (result: CameraPayload) => void
  onStatus: (message: string) => void
  onError: (message: string) => void
  onDevices: (devices: MediaDeviceInfo[], currentId: string) => void
}

export function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Camera permission was denied. Allow camera access in browser settings, then try again, or upload an image.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'No suitable camera was found. Connect a camera or upload a QR image.'
  if (name === 'NotReadableError' || name === 'AbortError')
    return 'The camera could not start. Close other apps using it, then retry or upload an image.'
  return 'The scanner could not read camera frames. Retry or upload a clear QR image.'
}

/** One explicit user-started session. Every asynchronous continuation checks its cancellation token. */
export class CameraScanner {
  private controller = new AbortController()
  private stream?: MediaStream
  private decoder?: FrameDecoder
  private timer?: ReturnType<typeof setTimeout>
  private deadline?: ReturnType<typeof setTimeout>
  private canvas = document.createElement('canvas')
  constructor(
    private video: HTMLVideoElement,
    private callbacks: Callbacks,
  ) {}

  async start(deviceId?: string) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.callbacks.onError(
        'Live scanning needs HTTPS and a browser with camera support. Upload a QR image instead.',
      )
      return
    }
    const { signal } = this.controller
    this.callbacks.onStatus('Waiting for camera permission…')
    this.deadline = setTimeout(() => {
      this.close()
      this.callbacks.onError(
        'The scanner paused after 90 seconds. Start again when you are ready, or upload an image.',
      )
    }, 90_000)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: { ideal: 'environment' } }),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      if (signal.aborted) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      this.stream = stream
      this.video.srcObject = stream
      stream.getVideoTracks().forEach((track) =>
        track.addEventListener(
          'ended',
          () => {
            if (!signal.aborted) {
              this.close()
              this.callbacks.onError('Camera access ended. Start again or upload an image.')
            }
          },
          { once: true },
        ),
      )
      await this.video.play()
      if (signal.aborted) return
      this.callbacks.onStatus('Preparing local QR detection…')
      const decoder = await createQrDecoder(signal)
      if (signal.aborted) {
        decoder.close()
        return
      }
      this.decoder = decoder
      // Device labels become available only after permission; failure is nonessential.
      void navigator.mediaDevices
        .enumerateDevices?.()
        .then((devices) => {
          if (!signal.aborted)
            this.callbacks.onDevices(
              devices.filter((device) => device.kind === 'videoinput'),
              stream.getVideoTracks()[0]?.getSettings().deviceId ?? '',
            )
        })
        .catch(() => undefined)
      this.callbacks.onStatus('Scanning. Position the QR code inside the frame.')
      await this.scan()
    } catch (error) {
      if (!signal.aborted) {
        this.close()
        this.callbacks.onError(cameraError(error))
      }
    }
  }

  private async scan(): Promise<void> {
    if (this.controller.signal.aborted) return
    try {
      if (this.video.readyState >= 2 && this.video.videoWidth && this.decoder) {
        const scale = Math.min(1, 960 / Math.max(this.video.videoWidth, this.video.videoHeight))
        this.canvas.width = Math.round(this.video.videoWidth * scale)
        this.canvas.height = Math.round(this.video.videoHeight * scale)
        const context = this.canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Canvas unavailable')
        context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)
        const payloads = await this.decoder.decode(this.canvas)
        if (this.controller.signal.aborted) return
        if (payloads.length > 1) {
          this.callbacks.onStatus('Multiple QR codes visible. Keep only one code in view.')
        } else if (payloads.length === 1) {
          const payload = payloads[0]!
          const error = payloadError(payload)
          const decoder = this.decoder.name
          this.close()
          if (error) this.callbacks.onError(error)
          else this.callbacks.onDetected({ payload, decoder })
          return
        }
      }
      // At most four sequential frames/second, with no overlapping decoder jobs.
      this.timer = setTimeout(() => void this.scan(), 250)
    } catch (error) {
      if (!this.controller.signal.aborted) {
        this.close()
        this.callbacks.onError(cameraError(error))
      }
    }
  }

  close() {
    this.controller.abort()
    clearTimeout(this.timer)
    clearTimeout(this.deadline)
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = undefined
    this.decoder?.close()
    this.decoder = undefined
    this.video.srcObject = null
    this.canvas.width = 0
    this.canvas.height = 0
  }
}
