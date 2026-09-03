# SCAMGUARD MY architecture

Repository inspection: 2026-09-03. Read [PROGRESS.md](../PROGRESS.md) for current verification and [DECISIONS.md](../DECISIONS.md) for accepted constraints. This document deliberately separates running foundation code from proposed future components.

## CURRENTLY IMPLEMENTED

### Application boundaries

SCAMGUARD MY currently provides an API-aware Malaysian scam-awareness workspace. It has no detection engine and produces no safety verdicts. Only Overview (`/`) and Analyse (`/analyse`) are navigation destinations; unknown frontend paths render a not-found page.

```text
Browser
  React Router -> AppShell -> Overview / Analyse / NotFound
  Page and API-status queries -> shared GET client + Zod
       |
       | /api/v1; Vite development proxy
       v
  FastAPI application factory / request context / CORS / error handlers
       |-- GET health       -> process liveness
       |-- GET dashboard    -> explicit not_configured/null/empty response
       |-- GET capabilities -> analysis_available: false
       `-- GET ready        -> per-request SQLAlchemy session -> SELECT 1 -> PostgreSQL

  Analyse editor -> React component memory only
                   no submission, database write, external URL request or result
```

The PostgreSQL arrow represents the implemented connection path, not a verified available database in this workspace. Current live readiness returns 503. The frontend does not query readiness; its API indicator consumes health only.

### Frontend

| Location | Responsibility |
| --- | --- |
| `frontend/src/main.tsx` | StrictMode, render error boundary, QueryClientProvider, BrowserRouter. Query defaults: 30-second stale time, no automatic failure retry, refetch on window focus. |
| `frontend/src/app/App.tsx` | Overview, Analyse and catch-all routes under AppShell. |
| `frontend/src/layout/AppShell.tsx` | Desktop sidebar at 1024px+, mobile bottom navigation, headings/document titles, route focus, skip link, status and footer. |
| `frontend/src/pages` | API-aware page states; Overview unavailable metric/history presentation; Analyse local draft editor; not-found return link. |
| `frontend/src/components` | Brand, page heading, API status, loading/error/retry/empty states, page-level `PreviewNotice`, render-error fallback. |
| `frontend/src/lib` | Public environment validation, GET transport, Zod response schemas, TanStack Query hooks. |
| `frontend/src/styles.css` | Tailwind 4 semantic Forensic Intelligence tokens and shared components, light color scheme, CSS motion tokens/keyframes, focus and reduced-motion treatment. |
| `frontend/src/test`, `*.test.ts(x)`, `frontend/e2e` | Explicit test fixtures and behavioral/browser regression tests, isolated from production imports. |

The GET client omits browser credentials and disables fetch caching. It supports upstream cancellation, an eight-second timeout, safe generic errors with request references, JSON parsing and runtime schema validation. Zod validates required values and strips unknown object fields; it is not a strict extra-field rejection policy. Health refreshes every 30 seconds while visible. Production code has no mock fallback.

Both pages show a loading state while their initial request is pending. Overview then renders its em dashes, unavailable notices, empty history and workspace status after either a valid unconfigured response or a failed query. It never calculates analytics. Analyse still requests and validates capabilities; on failure it retains the approved local editor with analysis disabled. Failed queries remain errors, with a page-level `PreviewNotice` showing the safe error, request reference when present, and retry. No fallback object is injected into the client or query cache, and health status is independent. The existing full error component and render-error boundary remain available for genuine failures.

Message and URL drafts have separate component state, limits of 5,000 and 2,048 characters, content selection and clearing. Query retry preserves drafts; reload or navigation away discards them. Submission is disabled, form submission is prevented, and no result is generated. These client limits are not a future server validation contract. This fallback is specific to the optional Task 1 scaffold; future data-dependent features must handle their real failures explicitly.

Motion is a presentation-only CSS layer with shared durations/easing, small entrances and control feedback. A pathname-keyed wrapper around Outlet animates the main content without remounting the persistent shell or altering query lifecycle. The API live region keeps its real health-query semantics; only its label contents are keyed for a state-change fade and one connection pulse. Input/empty-state animation timing stays local. Reduced motion removes all keyframes and motion delays; only genuinely pending states may repeat effects otherwise. No animation dependency, JavaScript timer or domain state was introduced. See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

### Backend and data configuration

| Location | Responsibility |
| --- | --- |
| `backend/app/main.py` | FastAPI `create_app`, lifespan-managed engine/session factory and disposal, server-generated request IDs, safe unexpected-error responses, no-store/nosniff headers, CORS. |
| `backend/app/api/routes.py`, `schemas.py` | Four versioned GET endpoints and typed responses; see [API.md](API.md). |
| `backend/app/core/config.py` | Pydantic settings, environment validation, exact CORS origins, PostgreSQL Psycopg DSN, production safeguards. |
| `backend/app/core/errors.py` | Safe application/HTTP/validation error envelopes; generic details avoid input echo. |
| `backend/app/db/session.py` | Synchronous SQLAlchemy engine and request session dependency, close/rollback, explicit commit ownership. |
| `backend/app/db/base.py` | Shared DeclarativeBase only; no domain models. |
| `backend/migrations` | Alembic environment and template; versions directory has no revision files. |
| `backend/tests` | API/configuration/session tests plus an opt-in real PostgreSQL readiness test. |

The engine uses Psycopg 3, `pool_pre_ping`, pool size 5 with 5 overflow connections, connection/pool wait timeout default 3 seconds (setting allows 1–30), a 5-second PostgreSQL statement timeout, and hidden SQL parameters. Application startup creates the engine but does not connect, create tables, or run migrations. Request sessions close at exit and roll back on exceptions; future services must explicitly commit writes. Readiness executes `SELECT 1` and maps SQLAlchemy failures to a safe 503.

`compose.yaml` defines local PostgreSQL 17 with a loopback-only port, healthcheck, and named persistent volume. It requires the root Compose password variable. No `.env` files existed at this audit, and no reachable database was verified. Alembic infrastructure is implemented; domain schema and online migration verification are not.

### Configuration and operations

- Root `.env` configures Compose only. `backend/.env` is loaded relative to the backend independent of working directory; process variables take precedence. The frontend has its own public/build environment example.
- Backend requires `postgresql+psycopg://`. Development has a local-only default DSN. Production rejects missing/default passwords and HTTP CORS origins, disables `/docs` and `/openapi.json`, and can use empty CORS origins behind a same-origin proxy.
- `VITE_API_BASE_URL` defaults to `/api/v1` and must be an absolute path or HTTP(S) URL without credentials/query/fragment. It is public bundle configuration. `API_PROXY_TARGET` is development-server configuration, defaulting to `http://127.0.0.1:8000`.
- Local Vite binds port 5173; FastAPI is run on 8000. The production build creates static assets. Vite's development proxy is not a production API proxy; static `npm run preview` explicitly disables that proxy. Local servers are temporary development processes.
- Task 1 uses Vercel with Root Directory `frontend`, Vite, `npm ci`, `npm run build`, `dist` output and a minimal `frontend/vercel.json` SPA rewrite. This is a frontend development preview only, with usable unavailable-state pages when the API is absent. FastAPI is not deployed to Vercel. Backend hosting and actual PostgreSQL persistence remain Task 2 work; see [DEPLOYMENT.md](DEPLOYMENT.md).
- GitHub is connected on `main`; the user reports the Vercel frontend preview is deployed and connected to GitHub. A live URL or remote CI result was not independently verified in this task. GitHub Actions defines PostgreSQL/backend/frontend/live-browser gates plus a built offline-preview suite. The test-only preview server reads the rewrite and serves built files without an API; it is neither deployed infrastructure nor a replacement backend.

### Current security/privacy boundary

The app implements no-store/nosniff headers for application responses, request references, exact-origin CORS without credentials, safe error envelopes, configuration checks, and frontend non-persistence of drafts. Application exception logging includes exception type and request ID rather than raw content or exception messages. These safeguards do not establish authentication, authorization, retention/deletion, rate limiting, encryption-at-rest, backup recovery, auditing, or regulatory compliance. Default server/proxy access logging must be reviewed before any future sensitive request parameters are introduced.

There is no authentication, session cookie, submission route, database content, upload storage, external scanning service, worker, model runtime, analytics collection, or training pipeline. Current API “unavailable” states are implemented and tested; their absent domain features are not complete.

## PLANNED ARCHITECTURE

The following are roadmap boundaries, not implemented packages, endpoints, tables, or chosen vendors. Do not treat this diagram as authority to build them without a task.

```text
Validated, authorized intake
  -> minimal persisted analysis lifecycle
  -> explicitly enabled evidence modules
       text | explainability | URL | screenshot/OCR | QR
  -> unified assessment (risk + separate confidence + insufficient information)
  -> authorized history and real database-derived analytics

Reviewed community evidence -> controlled candidate datasets/models
  -> offline evaluation -> explicit promotion/rollback
  -> later campaign intelligence and Model Lab
```

1. **Core Platform:** settle input/result/error contracts, ownership, privacy/retention and lifecycle first; then add reviewed models/migrations and persistence under a separately authorized implementation task. Route names, schema fields, authentication mechanism, and initial analysis method remain undecided.
2. **Evidence and assessment:** implement text, explanations, URL inspection, screenshot/OCR and QR in roadmap order with independent validation/evaluation. No automatic suspicious URL browsing. Define evidence provenance, supported inputs, failures, uncertainty and calibration before returning unified assessments. An extraction failure or lack of evidence must not become a safe verdict.
3. **Analytics and community:** derive counts and trends from real records with scope and time-window semantics. Validate and moderate community evidence; do not expose private submissions or count reports as confirmed scams by default.
4. **Controlled learning and research:** version data/models, prevent poisoning and evaluation leakage, measure genuine metrics, review candidate promotion, and retain rollback. Campaign detection and Model Lab depend on real evidence/data; no mock analytical claims.
5. **Security and operations throughout:** access control, content limits, privacy/deletion, secrets, deployment hardening and recovery must gate the features that need them. A later dedicated milestone consolidates verification; it does not defer essential safeguards until the end.

No queue technology, artifact/object store, model family, OCR provider, external intelligence provider, orchestration system, or backend hosting platform is selected by this document. Vercel is selected only for the Task 1 frontend development preview. [ROADMAP.md](../ROADMAP.md) records ordering and [PROGRESS.md](../PROGRESS.md) identifies the precise next task. Task 2 is paused.
