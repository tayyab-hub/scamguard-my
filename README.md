# SCAMGUARD

**SCAMGUARD: Multi-Modal Scam Detection & Reporting Web Application**

A general scam-awareness workspace with the approved warm light **Forensic Intelligence** identity. The project was initially Malaysia-focused and was generalized following supervisor feedback. The repository and Vercel domain retain their historical `-my` suffix.

**Task 1 is complete. Task 2 is implemented and technically audited on `task-2-core-platform` for review.** Message/URL submissions can be validated, saved in PostgreSQL and retrieved through history. The dashboard displays genuine submission counts and dates. `SUBMITTED` means saved, never assessed. No scam classifier, risk/confidence scores or safety verdicts exist. Phone and QR UI are complete; their intelligence is not started. See the [Task 2 audit](docs/TASK_2_AUDIT.md) for exact evidence and remaining limits.

The existing frontend is deployed at https://scamguard-my.vercel.app/ and connected to GitHub/main. Hosted Overview/Analyse, direct refresh, four modes and unavailable-backend fallback were tested on 2026-09-04 with no page errors. Task 2 is a separate branch; do not merge automatically. No live backend is deployed.

## Project memory

Before code changes, read [CODEX](CODEX.md) → [PROGRESS](PROGRESS.md) → [ROADMAP](ROADMAP.md) → [DECISIONS](DECISIONS.md) → README → [ARCHITECTURE](docs/ARCHITECTURE.md) → [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) → [API](docs/API.md) → [TESTING](docs/TESTING.md). Historical Task 1/redesign reports remain in docs and are not current feature claims.

## Frontend quick start

Use Node 24 (minimum 22.12) and npm:

```sh
git clone https://github.com/tayyab-hub/scamguard-my.git
cd scamguard-my
git switch task-2-core-platform
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Existing checkouts need only the frontend commands. Frontend preview requires no database/backend: failed API requests retain the usable unavailable workspace and truthful health badge. No fake data is substituted.

```sh
npm run build
npm run preview
```

Build output is `frontend/dist`; preview is http://127.0.0.1:4173. Static preview has no API proxy. Blank/unset `VITE_API_BASE_URL` uses `/api/v1`; a later hosted backend needs its HTTPS base URL including `/api/v1`, followed by rebuilding. `API_PROXY_TARGET` is local Vite development configuration only (default http://127.0.0.1:8000). Never place secrets in `VITE_*` variables.

## Local PostgreSQL and API (PowerShell)

This is a **private shared development workspace**, without authentication or ownership isolation. Use non-sensitive test content only. Do not expose the backend publicly. See the privacy boundary below.

Requirements: Python 3.12+, PostgreSQL 17 (existing server or Docker Compose), Node/npm. From the repository root, copy examples only when the destination does not already exist:

```powershell
Copy-Item .env.example .env
# Edit POSTGRES_PASSWORD in .env; do not commit it.
docker compose up -d db
docker compose ps
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -c requirements.lock -e '.[dev]'
Copy-Item .env.example .env
# Set DATABASE_URL to your local database credentials.
# Set PERSISTENCE_ENABLED=true for this private workspace.
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app
```

Compose creates the configured database with a loopback-only port and persistent named volume. An existing PostgreSQL server can be used instead: create a development database, then configure its `postgresql+psycopg://` URL. Ordinary `docker compose down` preserves data; do not remove volumes casually.

`python -m app` reads `PORT` (default 8000); development binds loopback, production binds 0.0.0.0. Start the frontend in a second terminal. A changed local API port requires matching `API_PROXY_TARGET`. Development API docs are at http://127.0.0.1:8000/docs. `GET /api/v1/health` checks process liveness; `/ready` checks PostgreSQL and, when persistence is enabled, the analyses table. No automatic startup migration or `create_all()` is used.

Alembic revision **0001_analysis_intake** creates the schema. PostgreSQL connection, upgrade → downgrade → upgrade, schema comparison, insert/read/rollback and fresh-application persistence were genuinely tested; see [PROGRESS](PROGRESS.md). Downgrade destroys submissions and is for disposable test databases only.

## Implemented behavior

- React/TypeScript/Vite, Router, Tailwind, TanStack Query and Zod; FastAPI/Pydantic, SQLAlchemy/Psycopg/PostgreSQL and Alembic.
- Only Overview (`/`) and Analyse (`/analyse`) navigation. Approved responsive sidebar/mobile navigation, keyboard focus and reduced-motion CSS remain.
- MESSAGE: trimmed non-empty text, at most 5,000 characters. URL: validated absolute HTTP(S), at most 2,048 characters; never visited automatically.
- An available private backend accepts `POST /api/v1/analyses`, returns UUID/timestamps and SUBMITTED. UI progress, safe failure and “Submission recorded.” reflect the actual request. Failed writes are not automatically retried.
- Real total/latest/recent data, paginated history and on-demand detail. Flagged-for-review remains unavailable. Empty database means measured zero; unavailable database means unavailable, never zero.
- Phone accepts natural international drafts but cannot submit. QR accepts local filename/size selection for one non-empty PNG/JPEG/WEBP up to 5 MiB; no image reading, upload, storage, decoding or camera access. Unsubmitted drafts/file selection clear on navigation or reload.

## Security and privacy boundary

One shared private development dataset is visible to everyone who can access the backend. The UI discloses storage before submission. Content is stored solely for submission history, never training. UUIDs and CORS are not authorization.

Implemented protections include a 64 KiB request cap (including chunked bodies), server validation, parameterized ORM writes, explicit commit/rollback/close, safe errors/request IDs, no-store/nosniff headers, exact-origin CORS and content-safe exception logging. React renders submissions as escaped text; URLs are not clickable external targets.

Before public or sensitive-content intake, decide authentication/ownership and access control, consent/privacy policy, retention/deletion including backups, encryption and abuse/rate limits. None is claimed implemented. A timeout/network failure may occur after commit: check history before retrying; idempotency keys are not yet implemented.

## GitHub and Vercel

Keep the existing origin and domain. For this task, publish only the review branch:

```sh
git status
git remote -v
git push -u origin task-2-core-platform
```

Vercel settings remain: Root Directory `frontend`, framework Vite, install `npm ci`, build `npm run build`, output `dist`, Node 24. Leave `VITE_API_BASE_URL` unset for the frontend-only preview. `frontend/vercel.json` handles SPA direct routes. Vercel may generate a branch preview; report its verified status separately from main. Do not deploy FastAPI to Vercel, rename the project, or merge Task 2 automatically. See [DEPLOYMENT](docs/DEPLOYMENT.md).

## Verification and next step

[TESTING](docs/TESTING.md) contains exact frontend/backend/real PostgreSQL/browser commands. [PROGRESS](PROGRESS.md) records actual results and limitations. Generated dependencies, builds, local PostgreSQL data, `.env` and test outputs are ignored; lockfiles, source, migrations, tests and intentional documentation screenshots stay tracked.

Review and merge Task 2 manually before separately authorizing **Task 3: the first reproducible Text Intelligence capability with genuine evaluation and insufficient-information handling**. Do not start Task 3 automatically.
