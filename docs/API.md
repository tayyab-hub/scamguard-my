# Current API contract

Base: `/api/v1`. Reconciled with Task 5 source on 2026-09-08.

Responses include `X-Request-ID`, `Cache-Control: no-store`, and
`X-Content-Type-Options: nosniff`. Production CORS uses an exact HTTPS origin list, credentials,
`GET`/`POST`/`DELETE`, and `X-CSRF-Token`; wildcard origins are prohibited.

## Operations and authentication

| Method/path | Authentication | Contract |
| --- | --- | --- |
| `GET /health` | Public | Process liveness: `200 {status:"ok",service:"scamguard-api",version:"0.1.0"}`. |
| `GET /ready` | Public | Verifies PostgreSQL, required domain/identity tables and required Message/URL intelligence. Returns safe 503 if unavailable. |
| `GET /capabilities` | Public | Reports database-backed submission and local MESSAGE/URL support without exposing user data. |
| `POST /auth/signup` | Exact Origin | Creates a normalized account and opaque session. |
| `POST /auth/login` | Exact Origin | Creates a session or returns the same generic credentials error for wrong/unknown accounts. |
| `GET /auth/me` | Session cookie | Returns minimal user data and rotates the synchronizer CSRF token. |
| `POST /auth/logout` | Session + Origin + CSRF | Revokes the current server-side session and clears the cookie. |
| `DELETE /auth/account` | Session + Origin + CSRF + password | Transactionally deletes account, sessions and owned analyses. |
| `POST /analyses` | Session + Origin + CSRF | Runs and persists an owned Message or URL assessment. |
| `GET /analyses?page=1&page_size=10` | Session | Returns only the current user's newest-first summaries. |
| `GET /analyses/{analysis_id}` | Session + ownership | Returns the current user's full stored record; missing/foreign/legacy all use the same 404. |
| `DELETE /analyses/{analysis_id}` | Session + Origin + CSRF + ownership | Deletes an owned record or returns the same safe 404. |
| `GET /dashboard` | Session | Returns totals/latest/recent only for the current user. |

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

URL example: `{"input_type":"URL","content":"https://example.com"}`. There is no `user_id` input;
extra keys are rejected and ownership always comes from the authenticated session.

`input_type` is `MESSAGE` or `URL`; Phone/QR are rejected. Content is trimmed and non-empty. Message
length is at most 5,000 characters. URL length is at most 2,048 and must be absolute HTTP(S), without
embedded whitespace, controls, malformed percent escapes or backslashes. Embedded userinfo is used
only as evidence and removed before storage. URLs are never fetched, opened or executed. The request
body limit defaults to 65,536 bytes.

The durable lifecycle is `SUBMITTED -> PROCESSING -> COMPLETED`. A local-pipeline exception records
`FAILED` with `MESSAGE_ANALYSIS_FAILED` or `URL_ANALYSIS_FAILED`. Optional external-review failure
does not fail the local Message result. A completed detail includes identity/type/timestamps plus
assessment risk, confidence, summary, evidence, recommended actions, components, limitations and
completion time. Message risk score and URL categorical semantics remain documented in their domain
reports; consumers must not turn them into unsupported fraud probabilities.

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
