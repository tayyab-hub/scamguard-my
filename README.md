# SCAMGUARD MY

Forensic Intelligence application foundation for a Malaysian scam-awareness workspace. Task 1 includes the application foundation, professional responsive UI, frontend/backend architecture foundation, testing infrastructure, local Git repository preparation, and Vercel frontend deployment readiness. It does **not** perform scam detection or issue safety verdicts.

The current deployment target is a **Task 1 frontend development preview**. Actual PostgreSQL persistence is Task 2; scam detection and live backend hosting are later work. Task 2 is paused and has not started. Vercel hosts only the existing React/Vite frontend; FastAPI and the PostgreSQL architecture remain in this repository.

The starting workspace was empty, including hidden files; no Git repository, source, AGENTS.md, README, separate specification, or brand guide was available. The user's Task 1 requirements were read in full and used as the specification. The current Forensic Intelligence design uses warm ivory surfaces, charcoal text, terracotta actions, and olive service indicators. Navigation exposes only **Overview** (`/`) and **Analyse** (`/analyse`).

The visual migration preserves the existing API contracts and backend behavior. See the [redesign verification record](docs/REDESIGN.md) for the before/after checks and [current screenshots](docs/SCREENSHOTS.md) for both pages on desktop and mobile.

Task 1 also includes restrained CSS motion: short page/card entrances, small button/navigation responses, input selection feedback and truthful API status transitions. The approved colors, fonts and settled layout are preserved. Reduced motion disables decorative movement immediately. No animation dependencies were added; see the [motion rules](docs/DESIGN_SYSTEM.md#motion-and-interaction).

## Project memory and current status

Before implementing code, start with [CODEX.md](CODEX.md) and follow its required reading order: CODEX → [PROGRESS](PROGRESS.md) → [ROADMAP](ROADMAP.md) → [DECISIONS](DECISIONS.md) → README → [ARCHITECTURE](docs/ARCHITECTURE.md) → [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) → [API](docs/API.md) → [TESTING](docs/TESTING.md). These files are the persistent handoff for a new session; include CODEX.md as the starting context when handing off this folder.

The latest verified state is in PROGRESS.md. The Task 1 baseline is published on `main` at [tayyab-hub/scamguard-my](https://github.com/tayyab-hub/scamguard-my), with local `main` tracking `origin/main`. The user reports the Vercel frontend preview is deployed and connected to GitHub; its hosted URL has not been independently checked in the latest task. The frontend now retains its Task 1 workspace when the backend is unavailable. Historical Task 1, redesign and memory-handoff counts remain in their dated reports; they are not current inventories. The earlier ignored `.local` source ZIP is historical and must not be uploaded as the current source.

## Frontend quick start

Only Node.js and npm are needed for the frontend preview. Use Node 24:

```sh
git clone https://github.com/tayyab-hub/scamguard-my.git scamguard-my
cd scamguard-my/frontend
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>. In an existing checkout, run the last two commands from `frontend/`; cloning is unnecessary. No `.env` file or live backend is required. After the initial loading state, failed requests leave the Task 1 workspace visible with a service-unavailable notice and retry. Overview retains unavailable metrics, empty history and workspace status; Analyse allows memory-only drafts with submission disabled. The independent health badge remains “API unavailable” when health fails. No fake data, capabilities or results are produced.

To build and inspect the static frontend locally, from `frontend/`:

```sh
npm run build
npm run preview
```

Open <http://127.0.0.1:4173>. Output is `frontend/dist`. Static preview deliberately has no API proxy; `npm run dev` retains the local FastAPI proxy. `frontend/.env.example` documents optional public configuration. Blank/unset `VITE_API_BASE_URL` resolves to `/api/v1`; for a later hosted API, set its HTTPS base URL including `/api/v1` and rebuild. Never use a database password, private key or token in a `VITE_*` value.

## GitHub and Vercel

This checkout is already connected. From the repository root, inspect the existing remote before an authorized push:

```sh
git status
git remote -v
git push origin main
```

The connected Vercel project uses these settings (also applicable to a new import):

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` (relative to `frontend`) |
| Node.js | 24.x |
| Environment for this preview | Leave `VITE_API_BASE_URL` unset; add no backend secrets or `API_PROXY_TARGET` |

`frontend/vercel.json` contains the SPA rewrite to `index.html`, following [Vercel's Vite guidance](https://vercel.com/docs/frameworks/frontend/vite). It enables direct `/analyse` loads and refreshes; the unchanged client rejects unavailable/non-JSON API responses. The pages retain their static unavailable interface with a visible error/retry notice. Local checks cover the checked-in rewrite and built files; verify the actual hosted routes after Vercel redeploys the fix. See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for the workflow and troubleshooting. FastAPI is not deployed as part of this frontend task.

## Architecture

- **Frontend:** React 19, strict TypeScript, Vite, React Router, Tailwind CSS 4, Lucide icons, and TanStack Query. Zod validates API responses at runtime.
- **Backend:** FastAPI application factory, Pydantic environment settings, versioned routers, typed response schemas, request IDs, safe error envelopes, and explicit CORS origins.
- **Database:** PostgreSQL 17, SQLAlchemy 2 with Psycopg 3, bounded connection pools, per-request sessions, and Alembic migration infrastructure. No domain tables or invented analysis records exist yet.
- **Verification:** Vitest/Testing Library for frontend behavior, pytest for backend behavior, Playwright for desktop/mobile checks against the real API, and a CI workflow with PostgreSQL.

```text
Browser → React Router → Page / reusable state components
                            ↓ TanStack Query + validated API client
                          /api/v1 (Vite proxy locally; reverse proxy in production)
                            ↓
                         FastAPI routers
                            ↓ dependency-managed SQLAlchemy sessions
                         PostgreSQL
```

The health endpoint checks the API process; readiness checks PostgreSQL. Dashboard and capabilities return explicit unavailable states without querying non-existent domain tables. The UI's “API connected” indicator does not imply database readiness or detection availability.

## Requirements

- Node.js **22.12+**, preferably Node 24 LTS, and npm.
- Python **3.12+** with `venv` and pip.
- Docker Compose for local PostgreSQL, or an existing PostgreSQL 17 instance.
- Chromium for Playwright (`npx playwright install chromium`), or locally installed Chrome with `PLAYWRIGHT_CHANNEL=chrome`.

## Optional local API/database setup (PowerShell)

This section is for the existing backend foundation, not a requirement for the Vercel/frontend preview. Run commands from the repository root unless a working directory is shown. Never commit `.env` files or put secrets in `VITE_*` values. Do not overwrite an existing environment file when copying examples.

### 1. Start PostgreSQL

```powershell
Copy-Item .env.example .env
# Edit POSTGRES_PASSWORD in .env before starting. The sample is local-only.
docker compose up -d db
docker compose ps
```

The database binds only to `127.0.0.1`. Its persistent data is stored in a named Docker volume. Ordinary `docker compose down` preserves that volume. If using an existing server, skip Compose and configure the backend URL.

### 2. Configure and start the API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -c requirements.lock -e '.[dev]'
Copy-Item .env.example .env
# Match DATABASE_URL credentials to the database configured above.
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The application can start without a reachable database. `/api/v1/health` then returns 200 and `/api/v1/ready` returns a safe 503. This is intentional and makes dependency failures observable. API docs: <http://127.0.0.1:8000/docs> in development only.

No domain migration exists yet. With a reachable configured database, `alembic upgrade head` connects and exercises the online migration environment; it has no domain revision to apply. Successful online execution has not been verified locally. It does not establish a functioning persistence feature. Future schema changes must use reviewed migrations; application startup never calls `create_all()`.

### 3. Start the frontend in a second terminal

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Open <http://127.0.0.1:5173>. Vite proxies `/api` to `http://127.0.0.1:8000`. Open `/analyse` directly to verify history fallback. If the backend is stopped, the UI shows a recoverable error instead of synthetic data.

On macOS/Linux, use `python3 -m venv .venv`, `.venv/bin/python` instead of `.venv\Scripts\python.exe`, and `cp` instead of `Copy-Item`. All npm scripts are cross-platform. The generated virtual environment is machine-specific and ignored.

## Environment variables

| Location | Variable | Purpose |
| --- | --- | --- |
| Root `.env` | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Local Compose database settings. |
| `backend/.env` | `APP_ENV` | `development`, `test`, or `production`. Production disables API docs. |
| `backend/.env` | `DATABASE_URL` | Required PostgreSQL Psycopg URL, `postgresql+psycopg://user:password@host:port/db`. URL-encode special characters in credentials. |
| `backend/.env` | `CORS_ORIGINS` | JSON array of exact origins; no wildcards, paths or trailing slashes. |
| `backend/.env` | `DB_CONNECT_TIMEOUT_SECONDS` | Connection and pool wait timeout, 1–30 seconds; default 3. SQL statement timeout is 5 seconds. |
| `backend/.env` | `LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR`. |
| `frontend/.env` | `VITE_API_BASE_URL` | Optional public API base path or HTTP(S) URL; blank/unset uses `/api/v1`. Use HTTPS for a future hosted API. Compiled into the browser bundle; rebuild after changes. |
| `frontend/.env` | `API_PROXY_TARGET` | Local Vite development proxy only. Not used by static preview/Vercel; do not add to Vercel settings. |
| Test process only | `TEST_DATABASE_URL` | Enables the real PostgreSQL integration test. Use a dedicated test database. |
| Test process only | `E2E_PYTHON` | Optional Python executable override for Playwright's API server. |
| Test process only | `PLAYWRIGHT_CHANNEL` | Optional installed browser channel such as `chrome`. Omit to use Playwright Chromium. |

Backend settings load `backend/.env` independent of the current directory; process environment variables take precedence. Production refuses the development database password, missing passwords, and non-HTTPS CORS origins. Use `CORS_ORIGINS=[]` for a same-origin production reverse proxy. Compose and the backend intentionally have separate environment files.

## Quality checks

See [docs/TESTING.md](docs/TESTING.md) for exact commands, working directories, the installed-Chrome option, database prerequisites, coverage limits and warning interpretation. See [PROGRESS.md](PROGRESS.md) for the latest actual results rather than inferring success from this command list.

```powershell
# frontend/
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:preview

# backend/
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check app tests migrations
.\.venv\Scripts\python.exe -m ruff format --check app tests migrations
.\.venv\Scripts\python.exe -m pip check
```

Playwright starts both servers if the configured ports are free, or reuses existing servers locally. CI always starts its own servers. It covers real API rendering, route reloads, navigation visibility, mobile overflow, local drafting, empty states, and console/page errors. One separate test injects a 503 fixture and verifies recovery. This expected negative test can produce a browser network error; the successful live API test requires an empty console error list.

The additional visual regression suite verifies the two navigation destinations, light-theme contrast, skip-link and radio/field focus, and layouts at 320, 390, 768, 1024, and 1440 pixels. The Task 1 resilience fix updates failure expectations to require the unavailable workspace plus visible errors, with stronger retry and disabled-submission coverage. To intentionally refresh the four documentation images from the live application:

```powershell
# frontend/; omit PLAYWRIGHT_CHANNEL when using Playwright's installed Chromium.
$env:PLAYWRIGHT_CHANNEL='chrome'
$env:UPDATE_DOC_SCREENSHOTS='1'
npm run test:e2e
Remove-Item Env:UPDATE_DOC_SCREENSHOTS
```

Ordinary test runs write only ignored test output. Documentation screenshots under `docs/screenshots/` are deliberate deliverable assets. Dependencies, virtual environments, builds, bytecode, test output, reports, and editable-install metadata remain excluded by `.gitignore` and must not be included in a source archive.

`npm run test:preview` requires the production build first and runs six desktop/mobile checks against a test-only static server that reads `vercel.json`. It starts no backend and tests direct routes/reloads, navigation, offline states, retries, reduced-motion accessibility and absence of fabricated data. The live-API suite has sixteen cases including motion, pending health transitions, touch/press feedback and draft/focus preservation. This is local verification, not a claim of a live Vercel deployment.

The normal backend suite works without PostgreSQL; only the marked integration test is skipped. To run it locally:

```powershell
$env:TEST_DATABASE_URL='postgresql+psycopg://scamguard:YOUR_TEST_PASSWORD@127.0.0.1:5432/scamguard_test'
.\.venv\Scripts\python.exe -m pytest -m integration
```

Run this from `backend/` after provisioning the dedicated test database and replacing the example password. `TEST_DATABASE_URL` configures this test, while Alembic uses `DATABASE_URL`; see TESTING.md before running online migrations. Never point test/migration checks at a production database.

The CI workflow provisions PostgreSQL and runs the integration test, migration command, backend checks, frontend checks, live-API browser tests and the built frontend-only preview tests. It runs after pushing to GitHub; no remote CI run is claimed here.

`frontend/package-lock.json` locks frontend dependencies. `backend/requirements.lock` records exact installed Python dependency versions and is used as a pip constraints file alongside `pyproject.toml`. Update these intentionally, then run all checks. Do not commit editable-install filesystem paths.

## Production boundary

The prepared Vercel release is a **frontend development preview**, even if Vercel labels the default-branch deployment “Production.” It is not a live scam-detection service. The full-stack deployment instructions below describe later hosting work and are not provisioned by this task.

Build the frontend with `npm run build`, serve `frontend/dist`, route `/api/` to FastAPI, and configure SPA fallback to `index.html` only for frontend routes. `vite preview` is a local build-preview server, not the production serving layer. Terminate TLS at the reverse proxy and set suitable security headers there. Run FastAPI with `APP_ENV=production`, an explicit production database URL, and restricted CORS; run migrations as a deployment step.

This is a production-oriented **foundation**, not a launch-ready detection service. Authentication, authorization, per-user records, retention/deletion controls, rate limits for future submissions, backups, alerting, and deployment-specific TLS/CSP settings require later work before accepting real user content. There is no submission endpoint or content persistence in Task 1.

## Data and scope rules

- No fake live counters, scores, activity rows, safety labels, or made-up charts.
- `null` means unavailable; it is never rendered as a measured zero.
- Test fixtures live only under `frontend/src/test`, test files, and `frontend/e2e`. Production modules do not import them. No demo data is bundled or seeded.
- Analyse inputs are memory-only drafts. Navigation away or reload discards them. They are not sent to the backend, logged, or saved in browser storage.
- ML, OCR, QR scanning, adaptive learning, and campaign detection are deliberately outside Task 1.

See [the API contract](docs/API.md), [the design system](docs/DESIGN_SYSTEM.md), and [the Task 1 delivery record](docs/TASK_1.md) for implementation and verification details.

## Next step — verify the redeployed frontend preview

After the Task 1 motion refinement is pushed to the existing `main`, inspect the automatic Vercel build and verify `/`, `/analyse`, direct refresh, motion/reduced-motion and the usable offline workspace at the deployed URL. A Git push is not independent proof that Vercel finished deploying. Actual PostgreSQL persistence and backend hosting remain Task 2 work; scam detection is later. **Do not begin Task 2 automatically.**

## Framework references

The setup follows the official [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite), [Vite setup guidance](https://vite.dev/guide/), [FastAPI settings](https://fastapi.tiangolo.com/advanced/settings/), and [FastAPI lifespan guidance](https://fastapi.tiangolo.com/advanced/events/).
