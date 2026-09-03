# Testing and verification

These commands reflect the current scripts/configuration and the Windows environment actually exercised on 2026-09-03. The latest results are in [PROGRESS.md](../PROGRESS.md); [TASK_1.md](TASK_1.md) and [REDESIGN.md](REDESIGN.md) are historical verification records. Reading a test, creating a workflow or producing a screenshot does not establish that a check passed.

## Prerequisites and directories

Run from a PowerShell terminal. Set the root to your own checkout if this directory moves:

```powershell
# Start in the repository root; no machine-specific absolute path is required.
$projectRoot = (Get-Location).Path
```

Verified runtime: Node 24.18.0, npm, Python 3.12.13 in `backend/.venv`, and installed Chrome. The frontend manifest requires Node >=22.12; the backend requires Python >=3.12. `npm.cmd` avoids PowerShell script-execution-policy ambiguity. Dependencies already existed for the latest run; that run did not perform a fresh install or dependency audit.

For a new environment, follow [README.md](../README.md) to create the virtual environment, install Python dependencies using `requirements.lock` as constraints, and run `npm.cmd ci` in `frontend`. Python is not on PATH in the audited local workspace, but `backend/.venv/Scripts/python.exe` works. Do not ship/copy that machine-specific virtual environment as source. If creating it here without another installed Python, the base executable used for the original setup was `C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`; verify it still exists before use.

## Frontend checks — exact working commands

```powershell
Set-Location -LiteralPath (Join-Path $projectRoot 'frontend')
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

| Command | What it checks |
| --- | --- |
| `npm.cmd run typecheck` | `tsc -b` over strict application and Node/config/browser-test projects. |
| `npm.cmd run lint` | ESLint with `--max-warnings 0`. |
| `npm.cmd test` | Vitest in jsdom: currently 24 tests across two files. |
| `npm.cmd run build` | TypeScript plus Vite production compilation; output is ignored `frontend/dist`. |

Run all four and check each exit code; do not assume PowerShell stops after an earlier command fails. Vitest covers page routing and unavailable/loading/error/retry behavior, local draft handling, safe API errors, timeout/cancellation, malformed data, and public environment parsing. Production code must never import test fixtures.

## Playwright — exact working commands

From `frontend`, using the installed Chrome channel exercised here:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
$env:UPDATE_DOC_SCREENSHOTS = '0'
npm.cmd run test:e2e
```

To use Playwright-managed Chromium instead, install it with `npx.cmd playwright install chromium` and remove the channel override with `Remove-Item Env:PLAYWRIGHT_CHANNEL -ErrorAction SilentlyContinue`. That browser-install command was not rerun during the documentation audit. On Linux CI, the configured installation command is `npx playwright install --with-deps chromium`.

`playwright.config.ts` starts FastAPI and Vite at ports 8000 and 5173 when needed. By default it uses `../backend/.venv/Scripts/python.exe` on Windows or `../backend/.venv/bin/python` elsewhere. `E2E_PYTHON` can override the executable. The started backend receives `APP_ENV=test`. Locally, existing servers can be reused; confirm they serve this source with appropriate settings. CI does not reuse servers. The Task 1 deployment-preparation run started its own servers and completed successfully; do not assume they remain running.

There are ten tests: two foundation cases and three visual/keyboard/responsive cases, each under desktop and mobile projects. Desktop uses 1440×1000; mobile uses iPhone 13-sized Chromium emulation at 390px width. Additional assertions exercise 320, 768 and 1024px widths. The mobile project is Chromium emulation, not Safari or a physical iPhone.

Covered behavior includes live API unavailable/empty states, only Overview/Analyse navigation, direct-route reloads, not-found recovery, disabled submission, local draft reset, error/retry recovery, light theme, horizontal overflow, mobile form/navigation overlap, skip-link activation, heading focus, native radio/field focus and selected token contrast. Successful live flows must have no console or page errors. A separate test-only 503 interception intentionally exercises network failure; it is not a production fallback.

These tests capture screenshots and assert layout/behavior; they do **not** perform golden-image pixel comparisons. They are not a comprehensive accessibility, security, browser-compatibility or production-load audit.

### Built frontend / Vercel rewrite / no backend

From `frontend`, after building with blank/unset `VITE_API_BASE_URL`:

```powershell
npm.cmd run build
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:preview
```

`playwright.preview.config.ts` runs four additional desktop/mobile tests on port 4173. Its test-only Node static server in `e2e-preview/serve.mjs` reads the actual `vercel.json`, serves `dist` assets and applies the SPA fallback. It starts no FastAPI process and contains no fake API responses. This tests direct page loads/reloads, not-found/navigation, safe handling of HTML instead of API JSON, honest unavailable/error states, retry and no fabricated data. A separate explicit network-abort case covers failed connections. Expected failed-network console messages in that case are distinct from uncaught page errors; the ordinary SPA-fallback case requires no console/page errors.

The latest run passed all four tests. Four offline screenshots in ignored `test-results/preview` were manually inspected; the approved UI assets remain unchanged. This harness verifies local readiness, not Vercel's complete runtime or a live hosted URL. After import, perform the checks in [DEPLOYMENT.md](DEPLOYMENT.md).

During test development, the initial harness used Vite preview, which treats API requests differently from the explicit Vercel catch-all. Two new cases failed their expected error-message assertions. The harness was corrected to exercise `vercel.json` without weakening assertions; a missing Node `URL` import in that new server was also fixed after lint flagged it. Original tests were unchanged. Both suites now pass. `npm run preview` remains a separate local static preview with no inherited development proxy.

### Intentional documentation screenshot refresh

Only after a UI change or an explicit refresh, from `frontend`:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
$env:UPDATE_DOC_SCREENSHOTS = '1'
try { npm.cmd run test:e2e } finally { Remove-Item Env:UPDATE_DOC_SCREENSHOTS -ErrorAction SilentlyContinue }
```

Inspect the generated files in `docs/screenshots`: `dashboard-desktop.png`, `dashboard-mobile.png`, `analyse-desktop.png`, `analyse-mobile.png`. Desktop captures are full-page; mobile documentation captures show the actual viewport so fixed navigation is represented correctly. Additional full-page mobile and focus evidence goes under ignored `frontend/test-results`.

Manually check both pages for clipping, horizontal overflow, contrast, consistent spacing, navigation, oversized elements, mobile overlap and focus visibility. Fix issues before accepting changed images; never bless a screenshot to hide a regression. Ordinary test runs must not overwrite these source assets. The documentation audit used `UPDATE_DOC_SCREENSHOTS=0`; the four existing documentation images were retained unchanged.

## Backend checks — exact working commands

```powershell
Set-Location -LiteralPath (Join-Path $projectRoot 'backend')
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check app tests migrations
.\.venv\Scripts\python.exe -m ruff format --check app tests migrations
.\.venv\Scripts\python.exe -m pip check
```

The ordinary suite currently collects 23 tests. Without `TEST_DATABASE_URL`, 22 pass and one real PostgreSQL test is skipped. Readiness success/failure unit tests use an explicitly mocked SQLAlchemy session; they do not prove an actual database works. Other tests cover response contracts, production settings, CORS, safe errors/input handling, request IDs, session rollback and cleanup. Ruff formatting is a non-mutating check; do not replace it with `ruff format` when merely recording the current state.

### Real PostgreSQL integration — prerequisite-dependent commands

These commands need a reachable **dedicated disposable test database** and its credentials. They are documented to clear the current verification gap; no successful local run is claimed yet. Provision the database separately using approved local infrastructure and do not point tests/migrations at production.

```powershell
Set-Location -LiteralPath (Join-Path $projectRoot 'backend')
# Example shape only: replace with the real test database URL, without committing it.
$env:TEST_DATABASE_URL = 'postgresql+psycopg://scamguard:YOUR_TEST_PASSWORD@127.0.0.1:5432/scamguard_test'
.\.venv\Scripts\python.exe -m pytest -m integration
# Then rerun the complete backend suite with this variable still set.
.\.venv\Scripts\python.exe -m pytest
```

`test_real_postgresql_readiness` creates the real app with that URL and requires `/api/v1/ready` to return 200. It currently performs `SELECT 1`, not persistence/migration testing. Setting an invalid URL causes failure, not a meaningful pass. Do not remove the skip marker or substitute a fake database to conceal an unavailable dependency.

Alembic uses **DATABASE_URL**, independently of `TEST_DATABASE_URL`. To exercise its online environment against the same disposable database:

```powershell
$env:DATABASE_URL = $env:TEST_DATABASE_URL
$env:APP_ENV = 'test'
.\.venv\Scripts\python.exe -m alembic upgrade head
```

There are no domain revisions yet. Offline `alembic upgrade head --sql` can validate the offline scaffolding without contacting PostgreSQL; it cannot prove connectivity or domain migrations. It passed in the historical Task 1 run and was not rerun for this documentation-only audit. Successful online migration execution remains unverified locally. Use a separate terminal for these overrides so a later development server does not accidentally inherit test settings.

## Live endpoint checks

With the local API running, `curl.exe -i` shows status and headers without treating the expected readiness 503 as a missing route:

```powershell
curl.exe -i http://127.0.0.1:8000/api/v1/health
curl.exe -i http://127.0.0.1:8000/api/v1/ready
curl.exe -i http://127.0.0.1:8000/api/v1/dashboard
curl.exe -i http://127.0.0.1:8000/api/v1/capabilities
curl.exe -i http://127.0.0.1:5173/api/v1/health
```

The current audit made these five GET requests using Python's `urllib.request`/`urllib.error` with a ten-second timeout, printing status and parsed JSON. Results: health 200, ready 503 `DATABASE_UNAVAILABLE`, dashboard 200 unconfigured, capabilities 200 unavailable, proxied health 200. These endpoints contain no user-submitted content. Do not log secrets or future sensitive request bodies during debugging.

## CI, warnings and evidence hygiene

`.github/workflows/ci.yml` defines Node 24/Python 3.12 on Ubuntu, PostgreSQL 17, Python installation with constraints, backend tests/Ruff/migrations, npm clean install/typecheck/lint/unit/build, live-API Playwright Chromium and built offline-preview tests. Git is initialized, but no remote CI result is available. Python constraints record a Windows-resolved environment; platform extras on Linux still resolve from `pyproject.toml`.

Non-failing messages in the latest run: two Zod/Rollup comment-annotation warnings, Starlette TestClient deprecations involving httpx and AnyIO, and Playwright's `NO_COLOR`/`FORCE_COLOR` warning. No warning was suppressed and no existing test was changed. These are distinct from browser application errors. Dependency consistency (`pip check`) is not a vulnerability audit.

Bundler/browser commands required approved execution outside the restricted Windows sandbox during the audit. Ordinary local terminals do not have that agent restriction. Treat environment/permission errors as such; do not weaken tests to bypass them.

Keep generated dependencies, builds, bytecode, reports and caches ignored and out of source archives. Tests regenerate ignored output; that is not a product-source change. After each task record date/time/offset, commands, counts, skips, warnings, browser/environment and unverified gates in `PROGRESS.md`. Record failures honestly before fixing and rerunning the relevant checks.
