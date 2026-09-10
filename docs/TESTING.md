# Testing and verification

## Task 6.1 verification (2026-09-10)

- Backend: 236 passed against real PostgreSQL; one explicitly opt-in live external-AI test skipped.
- Frontend: TypeScript and ESLint passed; Vitest 126 passed; production Vite build passed.
- Playwright: 18 foundation/motion/visual, 6 built offline-preview and 10 real PostgreSQL
  desktop/mobile scenarios passed.
- Database: `0005_auth_profile_polish` is the single head; upgrade/current/heads/check and isolated
  downgrade to `0004_phone_intelligence` then re-upgrade passed. The fixture also proves an existing
  nullable-profile user and owned Phone analysis survive `0004 → 0005` unchanged.
- Packaging/security: pip dependency check and isolated production wheel inspection passed; the
  wheel includes `app/services/mail.py`. Diff/secret checks found no committed credential.

Coverage includes Unicode/control-aware names, normalized/duplicate usernames, email and passphrase
validation, username-or-email login with generic failures, owned CSRF profile updates, mass-assignment
rejection, generic password-reset requests, digest-only expiry/replay/token handling, database rate
limits, all-session revocation, account cascade, immutable analyses and Message/URL/Phone Analyse
again behavior.

## Task 6 Phone Intelligence checks (2026-09-10)

Task 6 retains every Task 5 gate and adds deterministic Phone parsing/risk tests, authoritative API
validation, PostgreSQL ownership/rate-limit/cascade/migration coverage, frontend Phone presentation
tests, and a real login → Phone → result → history → refresh browser workflow. Use only the disposable
database URLs described below.

Observed local results on `task-6-phone-intelligence`:

- backend Pytest with `scamguard_test`: 207 passed, one deliberately opt-in live-provider test skipped;
- Ruff check/format and `pip check`: passed;
- TypeScript and zero-warning ESLint: passed;
- Vitest: 97 passed in 7 files;
- production Vite build: passed;
- foundation/motion/visual Playwright: 18 passed on desktop/mobile;
- built preview: 6 passed; full PostgreSQL browser suite: 10 passed on desktop/mobile;
- Alembic head is `0004_phone_intelligence`; the full persistence fixture ran check,
  downgrade-to-base and re-upgrade after clearing only `scamguard_test`.

Phone unit cases replace socket connect/DNS calls with raising guards. They cover multiple countries,
fixed/mobile/VoIP/premium/shared-cost metadata, E.164 normalization, uncertainty, invalid/impossible,
missing country context, HTML/SQL-like text, Unicode/control characters and length bounds. Browser
tests assert no off-origin request. No live caller, messaging, subscriber or reputation service exists.

The `0004` downgrade cannot restore the old Message/URL-only check while PHONE rows exist. The test
fixture therefore truncates all data only after verifying the database suffix is `_test`, then performs
the destructive round-trip. Never copy that downgrade sequence to development, Neon or production.

## Task 5 authentication/production checks (2026-09-08)

Task 5 adds auth UI/unit cases, environment validation, real PostgreSQL session/ownership/rate-limit
tests and a real-browser account lifecycle. The normal backend suite must run with a private
`TEST_DATABASE_URL` ending in `_test`; the browser persistence suite must use a separate URL ending in
`_e2e`. Never print either value.

The full frontend gates remain:

```powershell
cd frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:e2e -- --workers=2
npm.cmd run test:preview -- --workers=2
$env:E2E_DATABASE_URL = '<private postgresql+psycopg URL ending in _e2e>'
npm.cmd run test:persistence
```

The persistence browser suite creates isolated test accounts and covers signup, refresh restoration,
Message/URL results, logout, protected-route redirect, login, private history, analysis deletion,
account deletion, mobile layout, keyboard operation and reduced motion. Backend A/B tests separately
prove that another user cannot list/fetch/delete a record or infer it through dashboard totals.

Backend and schema gates:

```powershell
cd backend
$env:TEST_DATABASE_URL = '<private postgresql+psycopg URL ending in _test>'
.\.venv\Scripts\python.exe -m ruff check app tests migrations scripts
.\.venv\Scripts\python.exe -m ruff format --check app tests migrations scripts
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic heads
.\.venv\Scripts\python.exe -m alembic check
```

The isolated migration exercise upgrades to `0004_phone_intelligence`, checks current/head/drift,
downgrades only the cleared disposable database to base, then upgrades/checks again.
It verifies legacy null ownership, foreign keys/cascades and normalized unique emails. Do not run a
downgrade on development or production.

Build a wheel in an ignored temporary directory and inspect it to confirm both
`app/ml/artifacts/message_tfidf_v1.json` and `app/url_intelligence/artifacts/url_model_v1.json` are
present. Production configuration is locally testable, but only the external acceptance sequence in
[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) can establish an online deployment.

Exact commands for the current repository, audited 2026-09-08. Actual results belong in
[PROGRESS](../PROGRESS.md), not inferred from scripts/CI. Existing dependencies were used: Node
24.18.0, Python 3.12.13, PostgreSQL 17.11 and installed Chrome. A fresh install, remote CI and other
browser engines are separate checks.

## Frontend (from frontend/)

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## Windows launcher regression (from repository root)

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-DevScripts.ps1
.\dev.ps1 -NoBrowser
.\dev.ps1 -NoBrowser
.\stop-dev.ps1
.\stop-dev.ps1
```

The static suite parses both scripts and checks 14 safety contracts: prerequisite failures, disabled persistence, migration failure handling, unknown-port refusal, healthy reuse, visible terminals, browser control, identity-checked shutdown, clean PostgreSQL stop, path-safe wrappers/tasks and secret-safe output. The real sequence verifies a path containing spaces, cold start, health/readiness, duplicate-safe restart and idempotent shutdown. Failure-path inspection must not rename/delete local credentials or kill unknown services merely to manufacture a result.

TypeScript includes source/config/browser tests. ESLint allows zero warnings. Vitest covers the foundation, submission/history/validation and real Message result presentation. Build emits ignored dist. Check every exit code: PowerShell does not automatically stop after a failed native command. Install with npm ci for a fresh checkout; never import test fixtures into production.

## Browser regression and built offline preview

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:e2e -- --workers=2
npm.cmd run test:preview -- --workers=2
```

Build before test:preview with blank/unset VITE_API_BASE_URL. The eighteen existing foundation/motion/visual cases use a dedicated FastAPI on 8001 with PERSISTENCE_ENABLED=false and Vite on 5174, without reusing developer servers. They retain navigation, keyboard, four modes, no draft submission, safe errors/retry, immediate reduced motion, contrast checks and 320/768/1024/1280/1440px layouts. The six built-preview cases on 4173 read the actual vercel.json and serve dist without FastAPI or mock API data. Normal HTML API fallback must have no console/page errors; explicit network-failure fixtures allow expected network errors but no uncaught page errors.

For bundled Chromium, install with npx.cmd playwright install chromium and unset PLAYWRIGHT_CHANNEL. CI installs Chromium with --with-deps. E2E_PYTHON overrides the default backend .venv executable when necessary. Mobile is Chromium emulation, not physical iPhone/Safari verification.

## Backend checks (from backend/)

```powershell
.\.venv\Scripts\python.exe -m ruff check app tests migrations scripts
.\.venv\Scripts\python.exe -m ruff format --check app tests migrations scripts
.\.venv\Scripts\python.exe -m pytest -q
```

Without TEST_DATABASE_URL, real integration cases explicitly skip; that is not a pass for database behavior. Unit cases cover configuration, health/readiness failure, safe errors, CORS, rollback/close, disabled storage, chunked size limits, every indicator family, contextual suppression, three-class local inference, insufficient evidence, fusion and mocked external-review redaction/grounding/failure. Normal tests make no paid provider call.

### Reproducible model evaluation (from repository root)

```powershell
.\backend\.venv\Scripts\python.exe backend\scripts\train_message_model.py
```

The command must reproduce artifact SHA-256
`818d99f72c8502fe6ec28849e42c77f4707949366bf014bd5677079dde2c3dd3` and the checked-in report.
It verifies the reviewed source checksum first. A changed checksum or metric requires investigation
and a new reviewed model version, not an edit to the expected hash merely to make the check pass.

The live OpenAI smoke test is excluded from normal verification. It may incur cost and runs only
when a developer deliberately supplies a backend key and opts in:

```powershell
$env:RUN_OPENAI_INTEGRATION = '1'
$env:OPENAI_API_KEY = 'set privately; never commit or paste into logs'
cd backend
.\.venv\Scripts\python.exe -m pytest -q -m external_ai
```

Unset both variables afterward. Mocked provider tests are the required default evidence.

## Real PostgreSQL integration — required for database changes

Start PostgreSQL 17 using README's existing Compose workflow or a local instance. Create **separate disposable test databases**, never reuse development data. With default Compose user scamguard, from repository root:

```powershell
docker compose exec db createdb -U scamguard scamguard_test
docker compose exec db createdb -U scamguard scamguard_e2e
```

Run database creation once; an already-existing database does not need recreation. With native PostgreSQL use its createdb command against your configured host/port. Set URLs privately in your terminal, using the actual local credentials (the following is a placeholder, not a credential):

```powershell
$env:TEST_DATABASE_URL = 'postgresql+psycopg://scamguard:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/scamguard_test'
cd backend
.\.venv\Scripts\python.exe -m pytest -q
# Optional focused execution, not a replacement for the full suite:
.\.venv\Scripts\python.exe -m pytest -q -m integration
```

`tests/test_persistence.py` requires the database name to end in `_test`. Its module fixture applies Alembic head, checks schema drift, downgrades to base, verifies the table is removed and reapplies head. Cases truncate only that dedicated analyses table before/after tests. This is intentionally destructive to test data. They cover real Message completion and result retrieval across a fresh app, completed offline URL assessments, historical-row compatibility, invalid/oversized/unsupported input, pagination/order, a deterministic concurrent-write snapshot, safe detail, measured dashboard/flagged counts, constraints/rollback, request bounds and capability separation. Unit coverage verifies that unknown user-controlled JSON keys are not reflected in validation errors. The original real readiness integration runs with the same configured URL.

For development schema migration (from backend/):

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
```

These use DATABASE_URL/backend .env. Never run downgrade on development/production data casually. To reproduce upgrade/downgrade verification manually, first point DATABASE_URL at a disposable *_test database, then run `alembic upgrade head`, `alembic downgrade base`, `alembic upgrade head`, `alembic check`. The automated integration fixture already performs this isolated sequence.

The actual Windows verification used a portable official PostgreSQL 17.11 runtime under ignored .local/pg17, a loopback-only cluster on 55432, and separate scamguard_dev/scamguard_test/scamguard_e2e databases. It did not install a system service or change global PATH. Generated credentials, data and logs are ignored, not portable source. New machines should follow Compose/native setup above rather than assume that runtime exists.

## Real browser persistence (from frontend/)

```powershell
$env:E2E_DATABASE_URL = 'postgresql+psycopg://scamguard:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/scamguard_e2e'
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:persistence
```

The config refuses a DB not ending in `_e2e`. `backend/scripts/prepare_e2e.py` applies real Alembic
migrations, without seeding. Isolated FastAPI/Vite servers use 8002/5175. One worker prevents
concurrent test-count interference. Desktop/mobile cases submit controlled non-sensitive test
messages, example.com URLs and reserved example Phone values. They verify real Message/URL/Phone
results, evidence/actions, totals, private history/detail, login, navigation/reload persistence,
keyboard/reduced-motion behavior and responsive layout. QR remains disabled. External review stays
disabled. Test submissions remain only in the disposable E2E database; every run measures its
baseline count. Never target a public/development database.

## Screenshots and manual review

```powershell
$env:UPDATE_DOC_SCREENSHOTS = '1'
npm.cmd run test:e2e -- --workers=2
npm.cmd run test:persistence
$env:UPDATE_DOC_SCREENSHOTS = '0'
```

Documentation writes are opt-in. Foundation captures cover Overview/Analyse/Phone/QR desktop/mobile in docs/screenshots. Task 2 captures remain historical. Task 3 opt-in persistence captures show controlled genuine test assessments from the dedicated E2E dataset and must be labelled test evidence, not production activity. Ordinary test output remains ignored. Inspect clipping, horizontal overflow, spacing/contrast, navigation overlap, reachable actions, field/file focus, non-color risk labels and reduced motion. These tests take images and assert behavior/layout; they are not golden-image pixel comparisons or a comprehensive accessibility/security audit.

## CI and limits

GitHub Actions configures PostgreSQL 17, isolated test/E2E databases, all frontend/backend gates, migration checks and three browser suites. A configured workflow is not proof that a remote run passed. Existing non-failing warnings include Starlette httpx/AnyIO deprecations, Zod/Rollup annotations and Playwright color-environment warnings. Do not suppress failures or weaken tests for a passing report.

### Restarting this checkout's optional portable PostgreSQL

Only for the existing audited Windows checkout (these files are ignored and absent from Git clones), from repository root:

```powershell
.\.local\pg17\pgsql\bin\pg_ctl.exe -D .local/pg17-data status
# If stopped:
.\.local\pg17\pgsql\bin\pg_ctl.exe -D .local/pg17-data -l .local/postgres.log -o '-h 127.0.0.1 -p 55432' start
```

Do not run initdb over existing data. Existing backend/.env uses that local cluster; do not overwrite it or print its password. Restart an already-running older development API process to load current code. Test servers are isolated and do not replace the developer's existing server.

## Task 4 URL checks (2026-09-07)

Current URL behavior supersedes historical intake-only test descriptions above. MESSAGE regression stays in the same full suites. URLs now complete using the dedicated offline pipeline; historical SUBMITTED rows remain readable. No schema revision was needed, so a Task 4-only downgrade/re-upgrade is not applicable. The disposable *_test fixture still exercises existing Alembic head/check/downgrade-to-base/re-upgrade, never the development DB.

Backend gates (from backend):

```powershell
.\.venv\Scripts\python.exe -m ruff check app tests migrations scripts
.\.venv\Scripts\python.exe -m ruff format --check app tests migrations scripts
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic heads
.\.venv\Scripts\python.exe -m alembic check
.\.venv\Scripts\python.exe scripts/verify_url_pipeline.py
```

Set TEST_DATABASE_URL privately to the existing disposable *_test database to enable integration. URL unit tests replace socket.connect, DNS getaddrinfo, requests Session.request and httpx Client.request with raising guards, including cold suffix parsing and hostile local/private/metadata/IP/Unicode/userinfo/encoding examples. No live reputation adapter exists; protocol tests inject mocks only. Real PostgreSQL tests verify URL versions, redaction before persistence, safe pipeline failure, historical rows, fresh-app retrieval and zero re-analysis/provider calls on GET.

Dataset reproduction uses `prepare_url_dataset.py`, `train_url_model.py --verify`, and `verify_url_pipeline.py` from backend/scripts. The latter checks all 234,674 processed URL hashes, 197,700 isolated domain groups and exported inference on all 36,901 held-out test rows. The training verification asserts identical model bytes and 512-row confidence parity against sklearn. Source/download provenance is in URL_DATASETS.md. No destination URL from the dataset is accessed.

Frontend gates remain `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e -- --workers=2`, `npm.cmd run test:preview`, and `npm.cmd run test:persistence`. On this Windows checkout set PLAYWRIGHT_CHANNEL=chrome and E2E_DATABASE_URL privately to scamguard_e2e. Task 4 adds five risk presentation states, URL pending/failure/status/evidence/actions, strict validation and no-destination-link tests. Real browser tests cover five URL structures, rejection, history/reload, keyboard disclosure, reduced motion and 320/390/768/1440 widths. They assert no off-origin browser request.

Browser-assisted manual review ran the real private application on isolated local test ports, then inspected desktop/320px screenshots and backend restart persistence. Direct CUA initialization was unavailable due a Windows sandbox ACL error, so Playwright controlled the local browser. This is not a human-only usability study. Intentional test evidence is saved as docs/screenshots/task4-url-desktop.png and task4-url-320.png; ordinary artifacts/logs remain ignored. No submitted destination was opened. Consult TASK_4_REPORT.md for final counts and any limitations.

## UI refinement regression (post-Task 4)

Run the same frontend typecheck/lint/unit/build, foundation e2e, offline preview and real persistence commands above. Backend unit/model tests are not rerun for this frontend-only change; no backend/API field changes were required. Unit tests cover exact score scaling/null/rounding behavior, all URL risk index categories, unavailable confidence, stable evidence severity ordering and family deduplication without mutating assessments.

The real persistence suite now includes result-presentation.spec.ts on desktop and mobile. It compares Message meters against actual stored scores, checks URL High index and method disclosure, keyboard access to metadata, real completion timestamps/IDs, View assessment focus, insufficient evidence, and live reduced-motion during a held real POST response. It checks 320/390/768/1024/1440 widths and captures result screenshots under ignored test-results. Existing suites retain validation, failure/retry, no-destination-request, storage/history/reload and Phone/QR scope checks. Help now has 17 FAQs, including score/confidence methods.

Review new screenshots independently of assertions; inspect result heroes, evidence/actions, long content and ID wrapping, 320px layouts, Overview and Help. Built-preview results establish local offline resilience, not Vercel deployment. See [UI_UX_REFINEMENT.md](UI_UX_REFINEMENT.md) and PROGRESS.md for actual evidence.
