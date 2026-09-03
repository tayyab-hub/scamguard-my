# Task 1 API contract

Base path: `/api/v1`. Application endpoint responses passing through the request-context middleware get a server-generated `X-Request-ID`, `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store`. CORS exposes the request ID to allowed origins. CORS preflight responses are handled by the outer CORS middleware; proxy/network responses can also differ. There is no authentication or content submission API in this release.

Reconciled against routes, schemas and client implementation on 2026-09-03. These are the currently implemented contracts, preserved through the visual migration and documentation handoff. Read [ARCHITECTURE.md](ARCHITECTURE.md) for component boundaries, [TESTING.md](TESTING.md) for verification commands and [PROGRESS.md](../PROGRESS.md) for live observations. A documented response shape is not a claim that the local database is connected.

| Method and path | Success response | Semantics |
| --- | --- | --- |
| `GET /health` | `{"status":"ok","service":"scamguard-my-api","version":"0.1.0"}` | Process liveness only; does not query PostgreSQL. |
| `GET /ready` | `{"status":"ready","database":"connected"}` | Runs `SELECT 1`; returns 503 when the database cannot be reached. |
| `GET /dashboard` | See below | Explicitly unconfigured; no invented observations. |
| `GET /capabilities` | See below | Analysis unavailable; the frontend must not submit content. |

Dashboard:

```json
{
  "status": "not_configured",
  "total_analyses": null,
  "flagged_analyses": null,
  "last_analysis_at": null,
  "recent_analyses": []
}
```

Capabilities:

```json
{
  "analysis_available": false,
  "supported_inputs": [],
  "reason": "Analysis is not enabled in this release."
}
```

The frontend Zod schemas validate the required Task 1 values, including null metrics, empty arrays and `analysis_available: false`. Malformed JSON, missing required fields and incompatible values remain rejected queries. Overview and Analyse display those safe errors with retry while retaining their Task 1 unavailable scaffold and disabled local drafting; no synthetic successful response or supported capability is supplied. Health still reports its own request outcome. Unknown object properties are stripped by Zod's default object behavior, rather than rejected. Introducing real metrics, supported inputs or analysis requires coordinated backend/frontend schema changes, documentation and tests; adding fields alone does not enable a feature.

The dashboard and capabilities routes return explicit fixed unavailable responses without querying PostgreSQL. The backend response types fix the status/null/false values; their list fields are typed lists with empty defaults. The frontend additionally requires those arrays to remain empty. No persisted history, result schema, risk/confidence fields, or insufficient-information assessment outcome exists yet. `POST /api/v1/analyse` is not implemented and returns the missing-route error; `/analyse` is a frontend draft page only.

Application errors use this envelope:

```json
{
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "Database connection is unavailable.",
    "request_id": "server-generated-uuid",
    "details": []
  }
}
```

Supported errors include `HTTP_404`, `HTTP_405`, `VALIDATION_ERROR` (422), `DATABASE_UNAVAILABLE` (503), and `INTERNAL_ERROR` (500). Validation details contain only field locations and generic messages, not submitted values. Unexpected errors log exception type and request ID, not exception text or request bodies. Proxy/network errors can have a different format; the client still presents a safe retry state.

The client omits credentials, validates successful response bodies, aborts requests on navigation/unmount, and applies an 8-second timeout. It does not automatically retry failed page requests; the user can retry. API liveness refreshes every 30 seconds while the app is visible and refetches on focus. No failure falls back to fabricated data.

The frontend queries health, dashboard and capabilities; it does not consume readiness. “API connected” therefore means process liveness only. Allowed cross-origin application methods currently include GET, with credentials disabled. Analysis availability must remain false until a separately authorized feature provides its real implementation, contract and tests.
