import { useEffect, useRef, useState } from 'react'
import { ImageUp, QrCode } from 'lucide-react'

const imageTypes = ['image/png', 'image/jpeg', 'image/webp']
const maxImageBytes = 5 * 1024 * 1024

export function QrImageInput({
  file,
  onChange,
  disabled = false,
}: {
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
}) {
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setPreview({ file, url: reader.result })
    }
    reader.readAsDataURL(file)
    return () => reader.abort()
  }, [file])

  function select(files: File[]) {
    if (!files.length) return
    if (files.length !== 1) {
      setError('Choose one QR image at a time.')
      return
    }
    const candidate = files[0]!
    if (!imageTypes.includes(candidate.type)) {
      setError('Choose a PNG, JPG, JPEG or WebP image. SVG is not accepted.')
      return
    }
    if (candidate.size === 0) {
      setError('Choose a non-empty image.')
      return
    }
    if (candidate.size > maxImageBytes) {
      setError('Image must be 5 MB or smaller.')
      return
    }
    setError('')
    onChange(candidate)
  }

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">QR intelligence</h3>
        <span className="status-chip">Local decoder</span>
      </div>
      <p id="qr-introduction" className="mb-4 text-xs leading-6 text-muted">
        Choose one clear QR image. Its decoded content is assessed without opening it.
      </p>
      <div
        className="rounded-lg border border-dashed border-control bg-surface-raised/40 p-4 sm:p-5"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          if (!disabled) select(Array.from(event.dataTransfer.files))
        }}
      >
        <QrCode size={26} className="mb-3 text-accent" aria-hidden="true" />
        <label htmlFor="qr-image" className="block text-sm font-medium text-ink">
          Upload a QR screenshot or image
        </label>
        <p id="qr-file-guidance" className="mb-4 mt-1 text-xs leading-5 text-muted">
          Drop one image here or choose a file. PNG, JPG / JPEG or WebP · up to 5 MB · maximum 4096
          × 4096 pixels.
        </p>
        <div className="qr-file-control button-secondary relative">
          <span aria-hidden="true">{file ? 'Replace image' : 'Choose image'}</span>
          <input
            id="qr-image"
            ref={input}
            type="file"
            accept={imageTypes.join(',')}
            disabled={disabled}
            aria-describedby={`qr-file-guidance qr-privacy-note qr-selection${error ? ' qr-file-error' : ''}`}
            aria-invalid={Boolean(error)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
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
          <div className="flex items-start gap-3 rounded-md border border-line p-3">
            {preview?.file === file ? (
              <img
                src={preview.url}
                alt="Selected QR image preview"
                className="size-20 shrink-0 rounded border border-line bg-white object-contain"
              />
            ) : (
              <ImageUp size={20} className="mt-1 shrink-0 text-accent" aria-hidden="true" />
            )}
            <p className="min-w-0 flex-1 break-all text-xs leading-5 text-ink">
              {file.name || 'Camera image'}
              <span className="block font-mono text-[10px] text-muted">
                Ready to upload · {Math.ceil(file.size / 1024)} KB
              </span>
            </p>
            <button
              type="button"
              className="button-quiet min-h-11 shrink-0 rounded px-2 text-xs text-muted hover:text-ink"
              disabled={disabled}
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
      <p id="qr-privacy-note" className="mt-3 text-[11px] leading-5 text-muted">
        The original image is validated, decoded in memory, fingerprinted, and discarded. Its
        decoded text and assessment are stored in your private history.
      </p>
    </div>
  )
}
