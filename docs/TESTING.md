# Testing and verification

Exact commands for the current repository, audited 2026-09-05. Actual results belong in [PROGRESS](../PROGRESS.md), not inferred from scripts/CI. Existing dependencies were used: Node 24.18.0, Python 3.12.13, PostgreSQL 17.11 and installed Chrome. A fresh install, security audit, remote CI and other browser engines are separate checks.

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

`tests/test_persistence.py` requires the database name to end in `_test`. Its module fixture applies Alembic head, checks schema drift, downgrades to base, verifies the table is removed and reapplies head. Cases truncate only that dedicated analyses table before/after tests. This is intentionally destructive to test data. They cover real Message completion and result retrieval across a fresh app, inert URL intake, historical-row compatibility, invalid/oversized/unsupported input, pagination/order, a deterministic concurrent-write snapshot, safe detail, measured dashboard/flagged counts, constraints/rollback, request bounds and capability separation. Unit coverage verifies that unknown user-controlled JSON keys are not reflected in validation errors. The original real readiness integration runs with the same configured URL.

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

The config refuses a DB not ending in `_e2e`. `backend/scripts/prepare_e2e.py` applies real Alembic migrations, without seeding. Isolated FastAPI/Vite servers use 8002/5175. One worker prevents concurrent test-count interference. Desktop/mobile cases submit controlled non-sensitive test messages and example.com URLs, verify a real Message assessment and evidence, URL acknowledgement without intelligence, real total/flagged increments, history/detail, navigation/reload persistence, disabled Phone/QR and no uncaught browser errors. External review stays disabled. Test submissions remain only in the disposable E2E database; every run measures its baseline count. Never target a public/development database.

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
