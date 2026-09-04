# SCAMGUARD architecture

Audited 2026-09-04. Read PROGRESS for executed verification and DECISIONS for accepted constraints. The general international brand follows supervisor feedback; historical repository/domain/service identifiers are retained.

## CURRENTLY IMPLEMENTED

```text
React Router → AppShell → Overview / Analyse / NotFound
  TanStack Query + centralized GET/POST transport + Zod
    /api/v1 (Vite proxy locally, optional HTTPS API later)
      FastAPI factory → request ID / safe errors / CORS / bounded body
        Pydantic routes → submission services → request SQLAlchemy session
          Psycopg → PostgreSQL 17
                    schema managed by Alembic
```

This is real submission persistence, not scam detection. Only Overview and Analyse appear in navigation. Vercel hosts the frontend only; unavailable-backend states remain usable. Task 2 is on a review branch and does not change main automatically.

### Frontend

`main.tsx` supplies StrictMode, error boundary, QueryClientProvider and BrowserRouter. `AppShell` retains the desktop sidebar at 1024px+, mobile navigation, skip link, route heading focus and document titles. `styles.css` supplies the unchanged warm light Forensic Intelligence tokens and shared short CSS motion/reduced-motion rules.

`lib/api.ts` centralizes transport, eight-second timeouts, safe errors/request references, credentials omission, no-store and Zod runtime schemas. GETs support caller cancellation. `lib/queries.ts` owns health/dashboard/capability/history/detail queries and the submission mutation. Writes are not automatically retried; successful writes invalidate dashboard/history. Query data is never replaced with fixtures after failure. `lib/submission.ts` provides supplemental client validation.

The four UI modes come from `components/analysis/modes.ts`, separate from API-supported inputs. Message/URL use the existing independent draft fields. A genuine submission capability enables their validated action. During POST, fields/modes/actions are locked; successful acknowledgement clears the submitted draft and shows “Submission recorded.” Failed requests preserve drafts and explain that history should be checked before retrying. The assessment panel remains empty. Stored content survives browser refresh and backend restart because it resides in PostgreSQL.

Phone remains a local international tel draft. QR retains local metadata-only selection/drop of one non-empty PNG/JPEG/WEBP up to 5 MiB, replacement/removal and keyboard focus. No image bytes are read, decoded, uploaded or persisted; no object URLs or camera calls exist. Phone/QR actions remain disabled even when Message/URL persistence is available. Unsubmitted drafts/file references clear on navigation/reload.

Overview displays API-derived total, newest type/time/status and up to five recent summaries. Flagged remains unavailable. An actual empty database produces zero plus a polished empty state. Failed/unconfigured queries show unavailable values, never synthetic zero. `SubmissionHistory` provides bounded pagination and `SubmissionRows` fetches full escaped content only on disclosure; unique disclosure IDs avoid conflicts between recent/history lists. Submitted URLs remain inert text. Native keyboard controls, live pending/error/success states and reduced motion remain intact.

### Backend and database

| Source | Responsibility |
| --- | --- |
| app/main.py | Factory, lazy engine/session lifespan, disposal, request IDs/no-store/nosniff, CORS, route registration |
| app/__main__.py | Environment PORT entry point, loopback in development |
| app/core/config.py | PostgreSQL DSN, APP_ENV, PERSISTENCE_ENABLED (default false), exact CORS, bounded request/connection settings |
| app/core/errors.py, body_limit.py | Safe errors including SQLAlchemy failures; 64 KiB bounded body, including chunked requests |
| app/api/routes.py, schemas.py | Health/readiness, actual dashboard, separate submission/intelligence capabilities |
| app/api/analyses.py, analysis_schemas.py | Typed validated create/list/detail routes |
| app/services/analyses.py | Explicit commit, bounded list/detail queries, count and safe short previews |
| app/db/base.py, models.py, session.py | Declarative model, typed enums, pool/session/rollback lifecycle |
| migrations/versions/0001_analysis_intake.py | Deterministic initial schema upgrade/downgrade |
| tests, scripts/prepare_e2e.py | Isolated PostgreSQL integration and migrated browser-test database setup |

The analyses table contains UUID id (PK), input_type, content (TEXT), status, timezone-aware created_at and updated_at. InputType is MESSAGE/URL; AnalysisStatus declares SUBMITTED/PROCESSING/COMPLETED/FAILED for lifecycle evolution. Current routes only create/expose SUBMITTED and cannot change status. No worker or intelligence transition exists. The VARCHAR enum storage has named database CHECK constraints; additional checks enforce nonblank content and Message/URL lengths. A descending composite index on created_at/id supports stable newest-first order. Future risk/result columns are deliberately absent.

The engine uses Psycopg, pool_pre_ping, pool size 5 plus 5 overflow, a default three-second connect/pool wait and five-second statement timeout, with SQL parameters hidden. The app creates the engine lazily without requiring a live database at startup. Services explicitly commit writes; request sessions roll back errors and close. List count and rows use one request-scoped repeatable-read snapshot so a concurrent commit cannot produce an internally inconsistent page. Alembic runs explicitly, never through startup create_all. Upgrade/downgrade/re-upgrade and metadata comparison are tested against real PostgreSQL.

Health is process liveness only. Readiness probes PostgreSQL and the domain table when persistence is enabled. Capabilities become submission-available only after a successful table query; intelligence remains false. Disabled storage returns the legacy unavailable dashboard; enabled but broken storage returns a safe 503. Database errors do not expose DSNs, SQL or content.

### Configuration/deployment/privacy

Root .env configures existing local PostgreSQL Compose. backend/.env is loaded relative to the backend, with process variables taking precedence. Only safe .env.example files are tracked. DATABASE_URL uses postgresql+psycopg; production rejects missing/default passwords and non-HTTPS CORS. PORT configures python -m app. Frontend VITE_API_BASE_URL is public build-time configuration; API_PROXY_TARGET is dev-only. No production logic depends on local absolute paths.

Current main Vercel frontend at https://scamguard-my.vercel.app/ passed hosted checks on 2026-09-04. Branch deployment/CI status is separate. Root frontend, Vite build/dist and SPA rewrite remain unchanged; no backend deployment is authorized.

The persisted dataset is shared, private development data without authentication/ownership. The UI warns before submission. Limits, parameterized ORM, safe errors and escaped rendering reduce specific risks; they do not make public hosting safe. No retention/deletion service, encryption-at-rest guarantee, rate limit, authentication, authorization, user consent system, backup recovery or public-launch security certification exists. Default proxy/access logs require review before hosting. Test data lives only in dedicated *_test and *_e2e databases.

## PLANNED ARCHITECTURE

Text classification/explainability, URL reputation, international phone normalization/reporting/reputation, screenshot/OCR, QR decoding and URL/payment routing, unified risk/confidence/evidence, community intelligence/moderation, controlled adaptive learning, campaign intelligence and Model Lab are not implemented. There are no workers, model runtime, external intelligence calls or risk scores.

Future modules require reviewed contracts/migrations, measured evaluation, insufficient-information handling, risk/confidence separation and privacy/access policy. Suspicious URLs must never be automatically browsed. Community feedback cannot directly retrain/promote models. Public backend hosting needs an explicit security/privacy decision and suitable Python/managed PostgreSQL hosting. No new vendor, queue, authentication system or model is selected here. Task 3 requires separate authorization after Task 2 review.
