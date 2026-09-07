# Current API contract

Base: `/api/v1`. Reconciled with source on 2026-09-07. This is an unauthenticated, private shared-development API. Do not expose it publicly before the security/privacy gate.

Responses include `X-Request-ID`, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`. Exact-origin CORS permits GET/POST with credentials disabled.

| Method/path | Contract |
| --- | --- |
| `GET /health` | Process liveness: `200 {status:"ok",service:"scamguard-api",version:"0.1.0"}`. |
| `GET /ready` | PostgreSQL and, when persistence is enabled, analyses-table readiness. Safe 503 when unavailable. |
| `GET /capabilities` | Separates submission from intelligence. With a ready database, Message/URL submission is available and `MESSAGE` and `URL` intelligence are supported. Otherwise all capabilities are unavailable. |
| `POST /analyses` | Validates and commits intake. A Message then runs the local intelligence pipeline and returns a persisted completed assessment. A URL runs its dedicated non-fetching pipeline and returns a persisted completed assessment. |
| `GET /analyses?page=1&page_size=10` | Stable newest-first summaries, total and bounded pagination. |
| `GET /analyses/{analysis_id}` | Full content and, when present, assessment or safe failure code. |
| `GET /dashboard` | Database-derived total, flagged count, newest time and five recent summaries. |

## Create request and lifecycle

```json
{"input_type":"MESSAGE","content":"Urgent: provide your verification code now."}
```

URL example: `{"input_type":"URL","content":"https://example.com"}`. Examples are documentation only and are never seeded.

`input_type` is `MESSAGE` or `URL`; Phone/QR are rejected. Content is trimmed, non-empty valid Unicode. Message length is at most 5,000 characters. URL length is at most 2,048 and must be absolute HTTP(S), without embedded whitespace, controls, malformed percent escapes or backslashes. Embedded userinfo is accepted as evidence but its complete value is removed before storage. URLs are never fetched, opened, or executed. The total request body limit defaults to 65,536 bytes. Extra request fields are rejected.

Intake is committed before Message or URL processing. The normal lifecycle is `SUBMITTED → PROCESSING → COMPLETED`. A local-pipeline exception records `FAILED` with the safe `MESSAGE_ANALYSIS_FAILED` code (or `URL_ANALYSIS_FAILED` for URL). Optional external-review failure does not fail the local result. URL results are persisted, including evidence and component metadata.

## Response types

Every detail contains `id`, `input_type`, `content`, `status`, `created_at`, and `updated_at`. It also contains:

- `assessment`: `null` for failed and historical intake-only rows; otherwise the completed input-specific assessment.
- `failure_code`: safe code for a failed input-specific pipeline, otherwise `null`.

A Message assessment contains:

- `risk_level`: `LOW`, `CAUTION`, `ELEVATED`, `HIGH`, or `INSUFFICIENT_EVIDENCE`;
- `risk_score`: bounded 0–1 or `null` for insufficient evidence;
- separate `confidence_score` and `confidence_level`;
- conservative summary, exact evidence snippets, recommended actions, component audit data, limitations, and `completed_at`.

Components identify the local model version/class probabilities, deterministic-rule version/score, external-AI status/provider/model/contribution, and fusion version. They do not contain chain-of-thought, prompts, provider debug payloads, credentials, or API keys. Risk is decision support, never proof of fraud or safety.

Summary items replace content with a whitespace-collapsed preview of at most 160 characters and add nullable `risk_level`. A preview may still contain personal content; it is not anonymization.

An enabled dashboard returns real database values. `flagged_analyses` counts stored `ELEVATED` or `HIGH` records; an empty database produces zeros and an empty recent list. Disabled persistence retains explicit `not_configured` with nullable metrics. An unavailable database returns 503, never invented empty data.

## Capability truthfulness

With persistence disabled or not ready, submission and analysis are false with empty supported inputs. With persistence ready:

```json
{
  "analysis_available": true,
  "supported_inputs": ["MESSAGE", "URL"],
  "submission_available": true,
  "submission_inputs": ["MESSAGE", "URL"],
  "reason": "Local Message and URL intelligence are available; submitted URLs are never fetched."
}
```

Phone and QR remain visible planned frontend modes and never appear as backend capabilities. The frontend accepts the older Task 1/2 capability shape during rolling upgrades without pretending intelligence is available.

## Errors and transactions

Errors use the safe envelope `{"error":{"code", "message", "request_id", "details"}}`. Implemented cases include 422 validation, 413 body limit, 404 missing analysis/route, 405 method, 503 persistence/database, and 500 internal errors. Validation never reflects submitted values, SQL, DSNs, or secrets. Unexpected logs contain exception type and request ID only.

Services commit writes explicitly; request dependencies roll back failures and close sessions. Reads do not implicitly commit. A fresh process can retrieve committed results. POST has no idempotency key, so after a lost response the client tells the user to check history before retrying.

The frontend transport omits credentials, disables caching, validates JSON with Zod and applies an eight-second timeout. GET requests support cancellation. Successful POST invalidates dashboard/history. Phone/QR never issue API requests.

## URL assessment additions (Task 4)

URL shares the neutral summary/evidence/actions/status contract. Its `risk_score` is always null; `confidence_score` is uncalibrated classifier strength or null if the model is unavailable. Evidence adds severity, explanation and family; sources are DETERMINISTIC_RULE or a validated REPUTATION mock/future adapter. MESSAGE evidence is unchanged.

URL component keys are `url_model` (status/version/class_estimate/confidence), `url_rules` (status/version/indicator_count), `reputation` (status/provider/version/verdict), `fusion` (version), and `url_structure` (parser version, hostname, registrable domain, scheme, credentials_removed, fragment_excluded). No submitted destination is accessed. Reputation defaults DISABLED; no live adapter exists. Missing model leaves explicit UNAVAILABLE and local rules; no-indicator cases return INSUFFICIENT_EVIDENCE. Historical GET endpoints never repeat analysis or reputation requests.

The frontend validates the two assessment schemas and selects the appropriate result renderer. No schema migration is needed: these fit Task 3's existing neutral fields and component JSON. Phone/QR remain rejected. Shared/private storage and access restrictions are unchanged.
