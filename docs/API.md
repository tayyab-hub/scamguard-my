# Current API contract

Base: `/api/v1`. Reconciled with Task 8 source on 2026-09-10; feature branch, not deployed.

Responses include `X-Request-ID`, `Cache-Control: no-store`, and
`X-Content-Type-Options: nosniff`. Production CORS uses an exact HTTPS origin list, credentials,
`GET`/`POST`/`PATCH`/`DELETE`, and `X-CSRF-Token`; wildcard origins are prohibited.

## Operations and authentication

| Method/path | Authentication | Contract |
| --- | --- | --- |
| `GET /health` | Public | Process liveness: `200 {status:"ok",service:"scamguard-api",version:"0.1.0"}`. |
| `GET /ready` | Public | Verifies PostgreSQL, required domain/identity tables and required Message/URL/Phone/QR intelligence. Returns safe 503 if unavailable. |
| `GET /capabilities` | Public | Reports database-backed submission and local MESSAGE/URL/PHONE/QR support without exposing user data. |
| `POST /auth/signup` | Exact Origin | Creates a normalized full-name/username/email account and opaque session. |
| `POST /auth/login` | Exact Origin | Accepts normalized username or email and returns one generic credentials error for wrong/unknown accounts. |
| `GET /auth/me` | Session cookie | Returns the current profile and stable per-session synchronizer CSRF token. Opening a tab does not invalidate another tab. |
| `PATCH /auth/profile` | Session + Origin + CSRF | Updates only the current user's validated full name and username. |
| `POST /auth/password-reset/request` | Exact Origin | Always returns the same public confirmation; creates and emails a one-time token only for an existing email. |
| `POST /auth/password-reset/confirm` | Exact Origin | Consumes a valid reset token, updates the Argon2id password hash and revokes all user sessions. |
| `POST /auth/logout` | Session + Origin + CSRF | Revokes the current server-side session and clears the cookie. |
| `DELETE /auth/account` | Session + Origin + CSRF + password | Transactionally deletes account, sessions and owned analyses. |
| `POST /analyses` | Session + Origin + CSRF | Runs and persists an owned Message, URL or Phone assessment. |
| `POST /analyses/qr` | Session + Origin + CSRF | Validates and decodes one multipart QR image, routes supported content, discards the image and persists the owned result. |
| `POST /analyses/qr/payload` | Session + Origin + CSRF | Validates camera-reported decoded text and routes/persists through the same QR service. No frame upload. |
| `POST /analyses/search` | Session + Origin + CSRF | Read-only owned history search/filter/sort with bounded pagination; terms stay in the JSON body. |
| `GET /analyses?page=1&page_size=10` | Session | Returns only the current user's newest-first summaries. |
| `GET /analyses/{analysis_id}` | Session + ownership | Returns the current user's full stored record; missing/foreign/legacy all use the same 404. |
| `DELETE /analyses/{analysis_id}` | Session + Origin + CSRF + ownership | Deletes an owned record or returns the same safe 404. |
| `GET /dashboard` | Session | Returns totals/latest/recent plus grouped type/risk counts and an unassessed count for the current user. |

### Task 8 payload and search additions

Camera JSON is `{ "payload": "https://example.com", "decoder": "zxing-wasm" }`.
Decoder is exactly `BarcodeDetector` or `zxing-wasm`; extra fields, blank/control/invalid Unicode and
payloads above 5,000 UTF-8 bytes are rejected. The analysis rate bucket is shared with image/text
submissions. `components.qr` records `source: CAMERA`, `decoder_version: client-reported` and null
image MIME/width/height/bytes/SHA fields. UPLOAD remains the default for older stored QR records.
All redaction, ownership, routing, risk and no-activation rules remain authoritative on the server.

Search body fields: `query` (trimmed, maximum 200 characters), `input_type` (MESSAGE/URL/PHONE/QR
or null), `risk_level` (the five existing categories or null), `sort` (newest/oldest/risk), `page`
(1–10,000), `page_size` (1–100). Defaults are empty query, no filters, newest, page 1 and size 10.
Search is case-insensitive literal substring over stored content and result summary; `%` and `_`
do not become wildcards. Risk sort orders High → Elevated → Caution → Low, followed by unranked
insufficient/unassessed records; ties use newest timestamp and ID. The existing GET list is unchanged.

Dashboard adds `type_counts`, `risk_counts` and `unassessed_analyses`. Empty ready accounts receive
zero counts; unavailable data uses null. New clients tolerate missing fields from older API responses
without fabricating distributions. Counts and recent rows use one consistent database snapshot.

## Auth payloads

Signup accepts a structurally valid email and a 12–128 character password. Login accepts the same
email normalization and a password up to 128 characters. Extra fields are rejected.

```json
{"email":"student@example.com","password":"a long private passphrase"}
```

A successful signup/login/me response contains only the public user and a CSRF token:

```json
{
  "user": {
    "id": "1aa45614-64be-4f35-8fc8-3f35301d4992",
    "email": "student@example.com",
    "created_at": "2026-09-08T10:00:00Z"
  },
  "csrf_token": "opaque-response-secret"
}
```

The raw session token is set separately in the HttpOnly cookie. The frontend holds the CSRF token in
memory and sends it as `X-CSRF-Token` for state changes. Account deletion accepts
`{"password":"..."}` and returns 204. Logout and analysis deletion return 204.

## Analysis request and lifecycle

```json
{"input_type":"MESSAGE","content":"Urgent: provide your verification code now."}
```

URL example: `{"input_type":"URL","content":"https://example.com"}`. Phone example:
`{"input_type":"PHONE","content":"+44 (20) 7946-0958"}`. There is no `user_id` input;
extra keys are rejected and ownership always comes from the authenticated session.

`input_type` is `MESSAGE`, `URL` or `PHONE`; QR is rejected by this generic JSON route. Content is trimmed and non-empty. Message
length is at most 5,000 characters. URL length is at most 2,048 and must be absolute HTTP(S), without
embedded whitespace, controls, malformed percent escapes or backslashes. Embedded userinfo is used
only as evidence and removed before storage. URLs are never fetched, opened or executed. The request
body limit defaults to 65,536 bytes. Phone input is at most 64 characters, requires `+` international
context, permits ASCII digits/spaces/hyphens/balanced parentheses, and is normalized to E.164 before
storage. It uses bundled offline numbering metadata and makes no external request.

QR uses a separate multipart request whose single field is named `file`. It accepts exactly one
single-frame PNG, JPEG or WebP file up to 5 MiB, 4096 pixels per axis and 16 million decoded pixels.
Actual content must match the declared MIME type. One valid QR symbol must decode to non-empty UTF-8
text of at most 5,000 bytes. The backend rejects SVG, disguised/corrupt/animated files,
decompression bombs, no QR, multiple QR symbols and unsupported payload controls before persistence.
The route never opens, executes, contacts or fetches decoded content.

The durable lifecycle is `SUBMITTED -> PROCESSING -> COMPLETED`. A local-pipeline exception records
`FAILED` with `MESSAGE_ANALYSIS_FAILED`, `URL_ANALYSIS_FAILED`, `PHONE_ANALYSIS_FAILED` or
`QR_ANALYSIS_FAILED`. Optional external-review failure
does not fail the local Message result. A completed detail includes identity/type/timestamps plus
assessment risk, confidence, summary, evidence, recommended actions, components, limitations and
completion time. Phone components include normalized/display form, calling code, region,
possible/valid flags, number type and parser/library/rules/fusion versions. Phone risk and confidence
scores are `null`; consumers must not invent a fraud probability. See `PHONE_INTELLIGENCE.md`.
QR detail includes its payload type/route, image format/dimensions, file SHA-256, decoder and rules
versions, and `original_image_retained: false`. Routed results preserve the existing engine's risk
and confidence contract. Payment-only and unsupported content have no invented score. See
`QR_INTELLIGENCE.md`.

History uses bounded offset pagination (`page` 1–10,000, `page_size` 1–100) and a repeatable-read
count/page snapshot. A response lost after a committed POST is ambiguous; clients should inspect
history before retrying because idempotency keys are not implemented.

## Errors and limits

Safe failures use the standard envelope:

```json
{"error":{"code":"AUTHENTICATION_REQUIRED","message":"Sign in to continue.","request_id":"..."}}
```

Relevant status behavior includes 401 for missing/invalid/expired sessions or invalid credentials,
403 for origin/CSRF failure, 404 for missing or non-owned analyses, 409 for duplicate signup, 413 for
request size, 422 for validation, 429 for a database-backed rate limit (with `Retry-After`), and 503
for unavailable persistence/readiness. Errors do not reflect raw invalid fields, SQL details, hashes,
secrets or stack traces.

## Ownership and legacy data

Migration `0003_auth_ownership` adds nullable `analyses.user_id`. All new API writes set it from the
session. Existing pre-auth rows stay null and are excluded from every account's history, detail and
dashboard. User deletion cascades owned analyses and sessions. See
[Authentication](AUTHENTICATION.md) for the threat-model rationale.

Migration `0004_phone_intelligence` extends the existing input-type and content-length constraints for
PHONE. It preserves all Message/URL rows. Its downgrade requires Phone rows to be removed first and is
tested only against a cleared disposable `*_test` database.

Migration `0005_auth_profile_polish` adds nullable profile fields and digest-only reset tokens.
Migration `0006_qr_intelligence` extends only the analysis input/content constraints for QR. Existing
Task 6.1 users and Message/URL/Phone records are preserved. Downgrade requires QR rows to be removed
first and is tested only in a disposable `*_test` database.
