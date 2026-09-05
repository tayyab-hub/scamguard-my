# Task 2 API contract

Base: `/api/v1`. Reconciled with source on 2026-09-05. This is a private shared development API, without authentication or per-user ownership. Do not host it publicly before the security/privacy gate. No endpoint performs scam assessment.

Application responses include server-generated `X-Request-ID`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`. Exact-origin CORS exposes request IDs and allows GET/POST with credentials disabled. Preflight/proxy responses may differ.

| Method/path | Contract |
| --- | --- |
| GET /health | 200 `{status:"ok",service:"scamguard-api",version:"0.1.0"}`. Liveness only. The frontend temporarily accepts the former identifier during rolling upgrades, but active backend metadata is neutral. |
| GET /ready | 200 `{status:"ready",database:"connected"}` after SELECT 1 and, with persistence enabled, an analyses-table query. Safe 503 if unavailable/unmigrated. |
| GET /capabilities | Intelligence fields remain `analysis_available:false`, `supported_inputs:[]`, `reason:"Analysis is not enabled in this release."`. Adds `submission_available` and `submission_inputs`. These become true / `["MESSAGE","URL"]` only when persistence is enabled and the database/table query succeeds; otherwise false / `[]`. |
| POST /analyses | 201 AnalysisDetail after validation and commit. Requires PERSISTENCE_ENABLED. |
| GET /analyses?page=1&page_size=10 | `{items: AnalysisSummary[], total, page, page_size}`. Page 1–10000; size 1–100. Newest first by created_at DESC then UUID DESC. Count and rows use one request-scoped database snapshot. Out-of-range populated pages return an empty items array. |
| GET /analyses/{analysis_id} | AnalysisDetail, UUID validation (422), missing row 404 ANALYSIS_NOT_FOUND. |
| GET /dashboard | Real database summary when persistence is enabled; explicit not_configured otherwise. |

## Create request

```json
{"input_type":"MESSAGE","content":"Non-sensitive development test message"}
```

URL example: `{"input_type":"URL","content":"https://example.com"}`. These are documentation examples, not seeded data.

`input_type` is the uppercase enum MESSAGE or URL. PHONE/QR/other values are rejected. Content must be a string, trimmed, non-empty, without NUL/invalid Unicode. MESSAGE maximum is 5,000 Unicode characters; URL maximum is 2,048. URL must be valid absolute HTTP(S) without credentials, whitespace/control characters or backslashes; it is never fetched. Extra request fields are rejected, including caller-supplied status or result fields. Entire HTTP body is capped at 65,536 bytes by default, including chunked requests (MAX_REQUEST_BYTES is configurable). Client validation is supplemental; the backend is authoritative.

## Response types

AnalysisDetail contains exactly the implemented domain fields:

| Field | Type/meaning |
| --- | --- |
| id | UUID |
| input_type | MESSAGE or URL |
| content | Validated, trimmed submitted text |
| status | SUBMITTED — validated and committed, never a completed assessment |
| created_at / updated_at | ISO 8601 timezone-aware timestamps |

AnalysisSummary has the same identity/type/status/timestamps but replaces content with `preview`: whitespace-collapsed, truncated to at most 160 characters. Summary is not redaction/anonymization; it can contain personal content. Full detail is fetched only when requested by the interface. No risk, confidence, verdict, evidence or model fields are returned.

Enabled dashboard: `{status:"ready",total_analyses:<real count>,flagged_analyses:null,last_analysis_at:<newest timestamp or null>,recent_analyses:<up to five summaries>}`. An empty database produces total 0 and empty recent list. Counts cover the entire shared dataset, all submitted records, all time. They do not count completed intelligence or identify suspicious records. Each GET observes the database at request time; offset pages can shift when concurrent submissions arrive.

Disabled dashboard retains the Task 1 shape: `{status:"not_configured",total_analyses:null,flagged_analyses:null,last_analysis_at:null,recent_analyses:[]}`. An enabled but unavailable database returns 503, not fabricated empty data. Old GET-only previews are supported: missing new capability fields default to false/empty in the frontend. Unknown response properties are stripped by Zod; incompatible required values are rejected.

## Errors and transactions

```json
{"error":{"code":"DATABASE_UNAVAILABLE","message":"Submission storage is unavailable.","request_id":"server-generated-uuid","details":[]}}
```

422 VALIDATION_ERROR, 413 REQUEST_TOO_LARGE, 404 ANALYSIS_NOT_FOUND/HTTP_404, 405 HTTP_405, 503 PERSISTENCE_UNAVAILABLE/DATABASE_UNAVAILABLE and 500 INTERNAL_ERROR use safe envelopes. Validation reports generic trusted field locations, never values/SQL/credentials; an unknown user-controlled JSON key is reduced to its parent body location. Unexpected exception logs contain type/request ID only. There is no `/api/v1/analyse` singular submission endpoint.

A service explicitly commits successful writes; request dependencies roll back failures and close sessions. Reads never implicitly commit. A fresh process can retrieve a committed record. If a response is lost after commit, the client cannot know whether persistence succeeded: writes have no automatic retry or idempotency key; check history before manually retrying.

The shared frontend transport omits credentials, disables fetch caching, validates JSON with Zod and applies an eight-second timeout. GET queries support cancellation. POST may complete even after a page change; it is not treated as undone by client navigation. Query invalidation refreshes dashboard/history after acknowledged success. Offline pages retain unavailable UI with safe error/retry; health remains independent of database/submission availability. Phone/QR never issue POST requests.
