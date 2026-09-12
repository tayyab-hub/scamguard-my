import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, CheckCircle2, SwitchCamera } from 'lucide-react'
import { CameraScanner } from '../../lib/cameraScanner'
import type { CameraPayload } from '../../lib/qrDecoder'

export function QrCameraInput({
  value,
  onChange,
  onUpload,
  disabled = false,
}: {
  value: CameraPayload | null
  onChange: (value: CameraPayload | null) => void
  onUpload: () => void
  disabled?: boolean
}) {
  const video = useRef<HTMLVideoElement>(null)
  const preview = useRef<HTMLHeadingElement>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const scanner = useRef<CameraScanner | null>(null)
  const restoreFocus = useRef(false)
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState('Camera is off. Start when you are ready.')
  const [error, setError] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')

  useEffect(() => {
    const pause = () => {
      if (!scanner.current) return
      scanner.current.close()
      scanner.current = null
      setActive(false)
      setStatus('Camera paused because you left this view. Start again when ready.')
    }
    const visibility = () => {
      if (document.hidden) pause()
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', pause)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', pause)
      scanner.current?.close()
    }
  }, [])
  useEffect(() => {
    if (value) preview.current?.focus()
  }, [value])
  useEffect(() => {
    if (active)
      video.current?.parentElement?.scrollIntoView?.({ block: 'center', behavior: 'instant' })
  }, [active])
  useEffect(() => {
    if (!active && restoreFocus.current) {
      startButton.current?.focus()
      restoreFocus.current = false
    }
  }, [active])

  function start(nextDeviceId?: string) {
    if (!video.current || disabled) return
    scanner.current?.close()
    onChange(null)
    setError('')
    setActive(true)
    const session = new CameraScanner(video.current, {
      onDetected: (result) => {
        scanner.current = null
        setActive(false)
        setStatus('QR detected. Camera stopped.')
        onChange(result)
      },
      onStatus: setStatus,
      onError: (message) => {
        scanner.current = null
        setActive(false)
        setError(message)
        setStatus('Camera is off.')
      },
      onDevices: (available, current) => {
        setDevices(available)
        setDeviceId(current)
      },
    })
    scanner.current = session
    void session.start(nextDeviceId)
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="scanner-preview" hidden={!active}>
        <video ref={video} muted playsInline autoPlay aria-label="Live camera preview" />
        <div className="scanner-frame" aria-hidden="true">
          <span className="scanner-line" />
        </div>
        <span className="scanner-label">Position the QR code inside the frame.</span>
      </div>
      <p role="status" aria-live="polite" className="text-xs leading-6 text-muted">
        {status}
      </p>
      {error && (
        <p
          role="alert"
          className="validation-feedback rounded-lg border border-warning/30 bg-warning-subtle p-4 text-xs leading-6 text-warning"
        >
          {error}
        </p>
      )}
      {value && (
        <section
          className="scanner-detected rounded-lg border border-success/30 bg-success-subtle p-4"
          aria-label="Detected QR payload"
        >
          <h3 ref={preview} tabIndex={-1} className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 size={18} aria-hidden="true" /> QR detected · camera stopped
          </h3>
          <p className="mt-3 text-xs leading-5 text-body">
            Review the content below, then choose Analyse QR. Nothing has been submitted or opened.
          </p>
          <pre
            dir="ltr"
            className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap break-all rounded border border-line bg-surface p-3 font-mono text-xs leading-6"
          >
            {value.payload}
          </pre>
          <p className="mt-3 text-[11px] leading-5 text-muted">
            Untrusted content. Camera decoding does not establish who created this code.
          </p>
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        {active ? (
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                scanner.current?.close()
                scanner.current = null
                restoreFocus.current = true
                setActive(false)
                setStatus('Camera stopped. Start again when you are ready.')
                startButton.current?.focus()
              }}
            >
              <CameraOff size={16} aria-hidden="true" /> Cancel scan
            </button>
            {devices.length > 1 && (
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  const next =
                    (devices.findIndex((device) => device.deviceId === deviceId) + 1) %
                    devices.length
                  start(devices[next]?.deviceId)
                }}
              >
                <SwitchCamera size={16} aria-hidden="true" /> Switch camera
              </button>
            )}
          </>
        ) : (
          <button
            ref={startButton}
            type="button"
            className="button-secondary"
            disabled={disabled}
            onClick={() => start()}
          >
            <Camera size={16} aria-hidden="true" />{' '}
            {value ? 'Scan again' : error ? 'Retry camera' : 'Start camera'}
          </button>
        )}
        <button type="button" className="button-secondary" disabled={disabled} onClick={onUpload}>
          Upload image instead
        </button>
        {value && (
          <button
            type="button"
            className="button-secondary"
            disabled={disabled}
            onClick={() => {
              onChange(null)
              setStatus('Decoded content cleared. Camera is off.')
            }}
          >
            Clear decoded content
          </button>
        )}
      </div>
      <p className="text-[11px] leading-5 text-muted">
        Camera frames are used only to detect the QR code on this device and are not recorded or
        uploaded. Only the decoded content is submitted when you choose Analyse QR.
      </p>
    </div>
  )
}
