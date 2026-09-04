import { useRef, useState } from 'react'
import { ImageUp, QrCode } from 'lucide-react'

const imageTypes = ['image/png', 'image/jpeg', 'image/webp']
const maxImageBytes = 5 * 1024 * 1024

export function QrImageInput({
  file,
  onChange,
}: {
  file: File | null
  onChange: (file: File | null) => void
}) {
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  function select(files: File[]) {
    if (!files.length) return // Cancelling the picker preserves the current selection.
    if (files.length !== 1) {
      setError('Choose one QR image at a time.')
      return
    }
    const candidate = files[0]!
    if (!imageTypes.includes(candidate.type) || !/\.(png|jpe?g|webp)$/i.test(candidate.name)) {
      setError('Choose a PNG, JPG, JPEG or WEBP image.')
      return
    }
    if (candidate.size === 0 || candidate.size > maxImageBytes) {
      setError('Choose a non-empty image no larger than 5 MB.')
      return
    }
    setError('')
    onChange(candidate)
  }
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">QR intelligence</h3>
        <span className="status-chip">Upcoming</span>
      </div>
      <p id="qr-introduction" className="mb-4 text-xs leading-6 text-muted">
        QR intelligence will decode and inspect website and payment QR payloads in a later
        milestone.
      </p>
      <div
        className="rounded-lg border border-dashed border-control bg-surface-raised/40 p-4 sm:p-5"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          select(Array.from(event.dataTransfer.files))
        }}
      >
        <QrCode size={26} className="mb-3 text-accent" aria-hidden="true" />
        <label htmlFor="qr-image" className="block text-sm font-medium text-ink">
          Upload a QR screenshot or image
        </label>
        <p id="qr-file-guidance" className="mb-4 mt-1 text-xs leading-5 text-muted">
          Drop an image here or choose a file. PNG, JPG / JPEG or WEBP · up to 5 MB.
        </p>
        <div className="qr-file-control button-secondary relative">
          <span aria-hidden="true">{file ? 'Replace image' : 'Choose image'}</span>
          <input
            id="qr-image"
            ref={input}
            type="file"
            accept={imageTypes.join(',')}
            aria-describedby={`qr-file-guidance qr-local-note qr-selection${error ? ' qr-file-error' : ''}`}
            aria-invalid={Boolean(error)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(event) => {
              select(Array.from(event.currentTarget.files ?? []))
              event.currentTarget.value = ''
            }}
          />
        </div>
      </div>
      {error && (
        <p id="qr-file-error" role="alert" className="mt-3 text-xs leading-5 text-danger">
          {error}
        </p>
      )}
      <div id="qr-selection" role="status" aria-atomic="true" className="mt-3">
        {file && (
          <div className="flex items-start gap-2 rounded-md border border-line p-3">
            <ImageUp size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <p className="min-w-0 flex-1 break-all text-xs leading-5 text-ink">
              {file.name}
              <span className="block font-mono text-[10px] text-muted">
                Selected locally · {Math.ceil(file.size / 1024)} KB
              </span>
            </p>
            <button
              type="button"
              className="button-quiet min-h-11 shrink-0 rounded px-2 text-xs text-muted hover:text-ink"
              onClick={() => {
                onChange(null)
                setError('')
                input.current?.focus()
              }}
            >
              Remove
            </button>
          </div>
        )}
      </div>
      <p id="qr-local-note" className="mt-3 text-[11px] leading-5 text-muted">
        Local selection only. The image is not read, uploaded or saved. No QR data is extracted.
      </p>
    </div>
  )
}
