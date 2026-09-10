# Task 7 QR Intelligence

Status: implemented and fully locally verified on `task-7-qr-intelligence`; awaiting manual
acceptance and not merged or deployed.

## Objective

Task 7 turns QR from a local UI draft into a first-class owned analysis while keeping decoding
separate from security assessment. A QR code is a data carrier rather than an intrinsic indicator of
fraud. Where possible, decoded content is evaluated by the corresponding Message, URL or Phone
Intelligence component. Payment QR structural validity indicates formatting/integrity consistency
only and does not establish merchant legitimacy or transactional safety.

## Decoder and dependency decision

SCAMGUARD uses `zxing-cpp==3.1.1` for local QR decoding, `Pillow==12.3.0` for bounded raster
validation and `python-multipart==0.0.32` for FastAPI multipart parsing. zxing-cpp was selected
because its maintained Python wrapper exposes all decoded symbols, publishes CPython 3.12 wheels for
Windows and Linux, and needs no separately managed `libzbar` package or remote service. Pillow is
used only to validate and normalize pixels before decoding. No OCR, camera SDK, QR API, URL fetch,
DNS lookup or browser navigation is involved.

The decoder libraries are open source (zxing-cpp: Apache-2.0; Pillow: HPND). Their versions are
locked in `backend/requirements.lock` and production metadata. Decoder presence is part of readiness.

## Upload and validation contract

Authenticated clients send exactly one file to `POST /api/v1/analyses/qr` as multipart form data.
The endpoint keeps the existing exact-Origin, synchronizer CSRF, opaque-session, database rate-limit
and server-derived ownership controls. The generic JSON `POST /analyses` deliberately rejects QR.

Accepted files are single-frame PNG, JPEG or WebP raster images, at most 5 MiB, at most 4096 pixels
on either axis and at most 16 million decoded pixels. The backend verifies actual container format
against the declared MIME type, rejects SVG, empty/corrupt/animated/disguised images, decompression
bombs, no-symbol and multiple-symbol images, and accepts one valid QR symbol only. Decoded content
must be non-empty UTF-8, at most 5,000 bytes, with no unsupported control characters. Errors are safe
422 envelopes and invalid uploads create no analysis record.

The browser provides click selection, drag/drop, an image preview, replace/remove controls and
`capture="environment"` as a mobile file-picker hint. It does not request persistent camera
permission. Frontend checks improve feedback; the backend remains authoritative.

## Classification and risk routing

The deterministic payload classifier reports `URL`, `PHONE`, `TEXT`, `EMAIL`, `SMS`, `WIFI`, `GEO`,
`PAYMENT` or `OTHER`.

- Absolute HTTP(S) payloads use the unchanged offline URL engine.
- Valid `tel:` or international E.164-like content uses the unchanged Phone engine.
- Suitable ordinary text uses the unchanged Message engine; very short text is decoded without being
  forced through that classifier.
- Email, SMS, Wi-Fi, geo and unknown schemes are decoded and labelled but receive
  `INSUFFICIENT_EVIDENCE` unless another supported route exists.
- Recognized EMV-style merchant-presented payment data is parsed as bounded byte-length TLV. Its
  CRC-16/CCITT integrity field, common merchant/payment fields and embedded HTTP(S) URL are handled
  when present. An embedded URL uses URL intelligence. A structurally valid payment payload remains
  `INSUFFICIENT_EVIDENCE`; a malformed structure or invalid CRC produces at most `CAUTION`.

QR never adds severity to a routed Message, URL or Phone assessment. Risk, score, confidence,
evidence, actions and component versions come from the routed engine. A QR code is a carrier, not
evidence that its content is safe or malicious. Payment structure and CRC do not verify a merchant,
recipient, account owner, request legitimacy or transaction safety.

## Privacy and persistence

Pixel validation and decoding occur in backend memory. The original image is never written to
PostgreSQL or application-owned durable storage. FastAPI's bounded upload parser may use an ephemeral
operating-system temporary spool while receiving the multipart body; SCAMGUARD closes it immediately
after reading, and it is removed rather than retained after the request. The private record contains
the decoded payload, derived
assessment, payload type/route, dimensions, actual format, byte count, file SHA-256 and decoder/
classifier/fusion versions. It explicitly records `original_image_retained: false`.

Existing URL credential redaction is applied before a decoded URL is stored. Routed phone content is
stored as E.164. A Wi-Fi `P:` password field is replaced with `[redacted]`. Users should still avoid
uploading codes containing unnecessary secrets. Account and individual-analysis deletion cover QR
records. Another account cannot list, read, delete or count them. History never re-decodes an image
or reruns intelligence. Because the image is discarded, QR history does not offer Analyse again; the
user must upload the image again.

The SHA-256 value is an integrity/deduplication fingerprint, not proof of origin or safety. It can
also act as a stable identifier for identical files and is therefore private analysis metadata.

## API, database and security controls

The API adds only `POST /api/v1/analyses/qr`; history, detail, delete and dashboard routes are reused.
`GET /api/v1/capabilities` now advertises QR, and `GET /api/v1/ready` requires the decoder while
`GET /api/v1/health` remains liveness-only. Alembic `0006_qr_intelligence` adds `QR` to the existing
analysis constraints without creating a parallel table or rewriting earlier records. `content`
stores the canonical/redacted decoded string and existing neutral result/component columns store the
assessment and QR metadata.

The route preserves authentication, opaque HttpOnly session validation, exact Origin,
synchronizer-token CSRF, PostgreSQL per-user analysis rate limiting, server-derived ownership,
foreign/missing safe 404s, transactional persistence, account cascade and bounded safe errors. The
global 64 KiB request limit remains for ordinary routes; only the exact QR path receives enough
multipart allowance for one 5 MiB file. Filenames, MIME, pixels and payload are all untrusted.

## Test coverage

Programmatically generated fixtures cover PNG/JPEG/WebP, corrupt/disguised/SVG/MIME mismatch,
empty/oversized/excessive-dimension/no-code/multiple-code files, hostile names and payload controls.
Classification covers URL, suspicious URL, phone/tel, ordinary and scam-like text, email, SMS,
Wi-Fi, geo, unknown schemes, markup/SQL-like text and valid/malformed/embedded-URL payment payloads.
API/database tests cover auth, CSRF, owner derivation, A/B isolation, safe 404/delete, account cascade,
rate limits, redaction, readiness, capability, dashboard/history and invalid-upload non-persistence.
Frontend unit and desktop/mobile browser tests cover selection/drop/preview/remove, errors, escaped
rendering, payment fields/limitations, history/refresh, responsive layout, keyboard/reduced motion and
the no-off-origin-request guarantee. Exact observed counts are recorded in `PROGRESS.md`.

## Versions and limitations

- engine: `qr-intelligence-v1`
- decoder: `zxing-cpp` plus its installed version
- classifier: `qr-payload-classifier-v1`
- fusion: `qr-risk-fusion-v1`

Limitations include damaged/obscured/stylized codes, unsupported image/payload encodings, payloads
whose meaning depends on an external application, and payment formats outside the conservative
EMV-style subset. SCAMGUARD does not open links, execute commands, contact numbers, join Wi-Fi,
launch payment apps, validate bank ownership, identify the QR creator or perform reputation lookups.

## Production impact

Task 7 adds no required environment variable, paid service, external API or OS-level decoder package.
Its conservative defaults can be overridden with `QR_MAX_UPLOAD_BYTES`, `QR_MAX_DIMENSION`,
`QR_MAX_PIXELS` and `QR_MAX_PAYLOAD_BYTES`; production needs no override. Render
must install the updated locked Python dependencies and run Alembic `0006_qr_intelligence` after a
future approved merge; Vercel must rebuild the frontend. The existing relative `/api/v1` Vercel
rewrite remains unchanged. No production service was modified during Task 7 development.
