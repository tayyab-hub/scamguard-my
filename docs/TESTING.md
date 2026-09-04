# Testing and verification

Exact commands for the current repository, audited 2026-09-04. Actual results belong in [PROGRESS](../PROGRESS.md), not inferred from scripts/CI. Existing dependencies were used: Node 24.18.0, Python 3.12.13, PostgreSQL 17.11 and installed Chrome. A fresh install, security audit, remote CI and other browser engines are separate checks.

## Frontend (from frontend/)

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

TypeScript includes source/config/browser tests. ESLint allows zero warnings. Vitest includes the original 32 cases and Task 2 submission/history/validation cases. Build emits ignored dist. Check every exit code: PowerShell does not automatically stop after a failed native command. Install with npm ci for a fresh checkout; never import test fixtures into production.

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

Without TEST_DATABASE_URL, real integration cases explicitly skip; that is not a pass for database behavior. Unit cases cover configuration, health/readiness failure, safe errors, CORS, rollback/close, disabled storage and chunked size limits.

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

`tests/test_persistence.py` requires the database name to end in `_test`. Its module fixture applies Alembic head, checks schema drift, downgrades to base, verifies the table is removed and reapplies head. Cases truncate only that dedicated analyses table before/after tests. This is intentionally destructive to test data. They cover real Message/URL commit/read across fresh applications, invalid/oversized/unsupported input, pagination/order, safe detail, measured empty/populated dashboard, constraints/rollback, request bounds and capability separation. The original real readiness integration remains and runs with the same configured URL.

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

The config refuses a DB not ending in `_e2e`. `backend/scripts/prepare_e2e.py` applies real Alembic migrations, without seeding. Isolated FastAPI/Vite servers use 8002/5175. One worker prevents concurrent test-count interference. Desktop/mobile cases submit controlled non-sensitive test text and example.com URLs, verify acknowledgement, real count increments, history/detail, navigation/reload persistence, disabled Phone/QR and no external request or browser errors. Test submissions remain only in the disposable E2E database; every run measures its baseline count. Never target a public/development database.

## Screenshots and manual review

```powershell
$env:UPDATE_DOC_SCREENSHOTS = '1'
npm.cmd run test:e2e -- --workers=2
npm.cmd run test:persistence
$env:UPDATE_DOC_SCREENSHOTS = '0'
```

Documentation writes are opt-in. Foundation captures cover Overview/Analyse/Phone/QR desktop/mobile in docs/screenshots. Task 2 captures show genuine submissions in the dedicated E2E dataset and must be labelled test evidence, not production activity. Ordinary test output remains ignored. Inspect clipping, horizontal overflow, spacing/contrast, navigation overlap, reachable actions, field/file focus and reduced motion. These tests take images and assert behavior/layout; they are not golden-image pixel comparisons or a comprehensive accessibility/security audit.

## CI and limits

GitHub Actions configures PostgreSQL 17, isolated test/E2E databases, all frontend/backend gates, migration checks and three browser suites. A configured workflow is not proof that a remote run passed. Existing non-failing warnings include Starlette httpx/AnyIO deprecations, Zod/Rollup annotations and Playwright color-environment warnings. Do not suppress failures or weaken tests for a passing report.

### Restarting this checkout's optional portable PostgreSQL

Only for the existing audited Windows checkout (these files are ignored and absent from Git clones), from repository root:

```powershell
.\.local\pg17\pgsql\bin\pg_ctl.exe -D .local/pg17-data status
# If stopped:
.\.local\pg17\pgsql\bin\pg_ctl.exe -D .local/pg17-data -l .local/postgres.log -o '-h 127.0.0.1 -p 55432' start
```

Do not run initdb over existing data. Existing backend/.env uses that local cluster; do not overwrite it or print its password. Restart an already-running older development API process to load Task 2 code. Test servers are isolated and do not replace the developer's existing server.
