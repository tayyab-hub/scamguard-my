# SCAMGUARD

**SCAMGUARD: Multi-Modal Scam Detection & Reporting Web Application**

A general scam-awareness workspace with the approved warm light **Forensic Intelligence** identity. The project was initially Malaysia-focused and was generalized following supervisor feedback. The repository and Vercel domain retain their historical `-my` suffix.

**Task 1 Foundation, Task 2 Core Platform and Task 3 Message Intelligence are complete and merged
to `main`.** MESSAGE submissions run
a genuine local three-class model, deterministic evidence rules and conservative fusion, then store
an explainable result. Optional backend contextual AI is disabled by default. **Task 4 URL Intelligence is COMPLETE and merged to main.** URL submissions now receive local model, structural evidence and conservative risk assessments without fetching destinations. Phone and QR remain local UI only. See [Message Intelligence](docs/MESSAGE_INTELLIGENCE.md),
[Datasets](docs/DATASETS.md) and [Model Evaluation](docs/MODEL_EVALUATION.md).

**Task 5 Authentication, User Ownership, Privacy Controls and Production Deployment is IN PROGRESS
on `task-5-auth-production`.** Real accounts, opaque cookie sessions, CSRF protection, private
analysis ownership/deletion, account deletion and production configuration are implemented and
locally verified. The existing frontend at https://scamguard-my.vercel.app/ is not yet connected to
a verified hosted API; Neon/Render/Vercel owner setup and external acceptance remain. See
[Authentication](docs/AUTHENTICATION.md), [Privacy](docs/PRIVACY_MODEL.md), and
[Production deployment](docs/PRODUCTION_DEPLOYMENT.md).

## Project memory

Before code changes, read [CODEX](CODEX.md) → [PROGRESS](PROGRESS.md) → [ROADMAP](ROADMAP.md) → [DECISIONS](DECISIONS.md) → README → [ARCHITECTURE](docs/ARCHITECTURE.md) → [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) → [API](docs/API.md) → [TESTING](docs/TESTING.md). Historical Task 1/redesign reports remain in docs and are not current feature claims.

## Frontend quick start

Use Node 24 (minimum 22.12) and npm:

```sh
git clone https://github.com/tayyab-hub/scamguard-my.git
cd scamguard-my
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Sign Up, Sign In, Overview and Analyse require the local API and
PostgreSQL workflow below; Help remains public. No fake account, history, metric or result is
substituted when the API is unavailable.

## Open everything on Windows

After the one-time setup below, choose one workflow from the repository root:

1. Double-click `Start-SCAMGUARD.cmd` and use `Stop-SCAMGUARD.cmd` when finished.
2. In a trusted VS Code workspace, allow the **SCAMGUARD: Start Development** folder-open task; run **SCAMGUARD: Stop Development** from **Terminal → Run Task** when finished.
3. In PowerShell, run `.\dev.ps1` and `.\stop-dev.ps1`. Add `-NoBrowser` when you do not want the launcher to open a browser tab.

The launcher checks the portable PostgreSQL runtime/data, backend `.venv` and `.env`, frontend dependencies, and persistence setting; starts the isolated database on `127.0.0.1:55432`; applies Alembic through `0003_auth_ownership`; and starts the backend and frontend in visible terminals. It reuses healthy SCAMGUARD services and refuses unknown processes on ports 8000, 5173, or 55432 without killing them. Shutdown verifies recorded process identity and stops only launcher-owned app processes, then cleanly stops this repository's PostgreSQL cluster. It never deletes the database. Final URLs are `http://127.0.0.1:5173` and `http://127.0.0.1:8000/api/v1/health`.

VS Code intentionally requires workspace trust before an automatic folder-open task runs. Review `.vscode/tasks.json`, `dev.ps1`, and `stop-dev.ps1`, then trust this repository if you want that convenience. No execution-policy setting is changed globally; wrappers use a process-scoped policy for the checked-in scripts.

```sh
npm run build
npm run preview
```

Build output is `frontend/dist`; preview is http://127.0.0.1:4173. Static preview has no API proxy.
Local development may use relative `/api/v1`; a production build requires an explicit non-local
HTTPS `VITE_API_BASE_URL` including `/api/v1` and must be rebuilt after it changes.
`API_PROXY_TARGET` is local Vite configuration only (default http://127.0.0.1:8000). Never place
secrets in `VITE_*` variables.

## Local PostgreSQL and API (PowerShell)

Local development now uses real accounts and private ownership while retaining a database and
credentials separate from production. Continue to use non-sensitive test content.

Requirements: Python 3.12+, PostgreSQL 17 (existing server or Docker Compose), Node/npm. From the repository root, copy examples only when the destination does not already exist:

```powershell
Copy-Item .env.example .env
# Edit POSTGRES_PASSWORD in .env; do not commit it.
docker compose up -d db
docker compose ps
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -c requirements.lock -e '.[dev,ml,ai]'
Copy-Item .env.example .env
# Set DATABASE_URL to your local database credentials.
# Set PERSISTENCE_ENABLED=true for this private workspace.
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app
```

Compose creates the configured database with a loopback-only port and persistent named volume. An existing PostgreSQL server can be used instead: create a development database, then configure its `postgresql+psycopg://` URL. Ordinary `docker compose down` preserves data; do not remove volumes casually.

`python -m app` reads `PORT` (default 8000); development binds loopback. Production uses the
reviewed production start script. Start the frontend in a second terminal. A changed local API port
requires matching `API_PROXY_TARGET`. Development API docs are at http://127.0.0.1:8000/docs.
`GET /api/v1/health` checks process liveness; `/ready` checks PostgreSQL, required identity/domain
tables and both local intelligence engines. No `create_all()` is used.

Alembic `0001_analysis_intake` creates intake; additive `0002_message_intelligence` adds result/audit
fields; additive `0003_auth_ownership` adds users, server-side sessions, database rate buckets and
nullable ownership. Existing unowned rows survive but are hidden from ordinary accounts. Upgrade →
downgrade → upgrade and drift checks passed against a disposable real PostgreSQL database. Downgrade
destroys Task 5 identity/session data and is for disposable test databases only.

## Implemented behavior

- React/TypeScript/Vite, Router, Tailwind, TanStack Query and Zod; FastAPI/Pydantic, SQLAlchemy/Psycopg/PostgreSQL and Alembic.
- Sign In (`/login`), Create Account (`/signup`) and public Help (`/help`); authenticated Overview
  (`/`), Analyse (`/analyse`) and Account (`/account`) routes; plus a catch-all 404. Responsive
  navigation, keyboard focus and reduced-motion CSS remain.
- MESSAGE: trimmed non-empty text, at most 5,000 characters. URL: validated absolute HTTP(S), at most 2,048 characters; never visited automatically.
- An authenticated backend accepts `POST /api/v1/analyses`, assigns ownership from the session and
  never accepts a frontend user ID. MESSAGE persists intake, runs local assessment synchronously and
  returns `COMPLETED` with risk, separate confidence, evidence, actions,
  component versions and limitations. Context-poor messages can return
  `INSUFFICIENT_EVIDENCE`. URL uses its own offline intelligence pipeline and persists a completed assessment; URL risk has no percentage score.
- The local TF-IDF Logistic Regression model keeps LEGITIMATE/SPAM/SCAM distinct. It achieved
  untouched-test macro F1 0.8952 and weighted F1 0.9690 on the documented split; these are
  dataset-specific measurements, not a promise for live messages.
- The local URL random forest achieved held-out macro F1 0.984698, with substantial source homepage/HTTPS bias. ML alone cannot produce elevated/high risk. Runtime parsing uses an offline public-suffix snapshot, and embedded userinfo is removed before storage. No live reputation adapter is configured.
- Per-user total/latest/recent data, paginated history/detail/deletion and a real flagged count for
  owned completed ELEVATED/HIGH Message or URL assessments. Empty history means measured zero;
  unavailable means unavailable.
- Phone accepts natural international drafts but cannot submit. QR accepts local filename/size selection for one non-empty PNG/JPEG/WEBP up to 5 MiB; no image reading, upload, storage, decoding or camera access. Unsubmitted drafts/file selection clear on navigation or reload.
- Help search and feedback preparation run locally. `VITE_SUPPORT_EMAIL` is optional and public; when blank, the page truthfully states that online feedback is being prepared. A configured value opens the user's email application and never claims a message was sent.

## Security and privacy boundary

Accounts store a normalized email and Argon2id password hash. An opaque raw session token exists only
in an HttpOnly cookie; PostgreSQL holds its HMAC digest. Exact-origin plus synchronizer-token CSRF
protection covers state changes. Content is associated with the current user for private history and
is never used for automatic training. Users can delete individual records or their account and owned
records. Legacy unowned rows are hidden. See [Authentication](docs/AUTHENTICATION.md) and
[Privacy](docs/PRIVACY_MODEL.md).

Implemented protections include a 64 KiB request cap (including chunked bodies), server validation, parameterized ORM writes, explicit commit/rollback/close, safe errors/request IDs, no-store/nosniff headers, exact-origin CORS and content-safe exception logging. React renders submissions as escaped text; URLs are not clickable external targets.

Basic PostgreSQL-backed rate limits cover signup, login and analysis; they are not enterprise DDoS
protection. Provider backup deletion/retention, formal policy, incident response and broad public
usage still need owner review. A timeout/network failure may occur after commit: check history before
retrying; idempotency keys are not implemented.

## GitHub and Vercel

Keep the existing origin and domain. Task 4 plus its UI closure are on `main`; Task 5 stays on its
review branch:

```sh
git status
git remote -v
git log --oneline --decorate -n 10
```

Vercel settings remain: Root Directory `frontend`, framework Vite, install `npm ci`, build
`npm run build`, output `dist`, Node 24. A production build must set the public Render HTTPS base as
`VITE_API_BASE_URL`; `frontend/vercel.json` handles SPA routes. FastAPI is prepared for Render and
managed PostgreSQL for Neon. See [Production deployment](docs/PRODUCTION_DEPLOYMENT.md).

## Verification and next step

[TESTING](docs/TESTING.md) contains exact frontend/backend/real PostgreSQL/browser commands. [PROGRESS](PROGRESS.md) records actual results and limitations. Generated dependencies, builds, local PostgreSQL data, `.env` and test outputs are ignored; lockfiles, source, migrations, tests and intentional documentation screenshots stay tracked.

Task 4 is COMPLETE, verified and merged, including the accepted UI closure. Task 5 is IN PROGRESS on
`task-5-auth-production`; do not merge it automatically. Phone/QR intelligence, community reporting
and adaptive learning have not started.

## Post-Task 4 UI/UX refinement

The frontend now shares result summary, risk meter, confidence, evidence, actions and metadata components across Message and URL, including history. Message shows its stored fusion score as points out of 100; URL shows an explicitly labelled ordinal category index (0/33/67/100). They are advisory, not probabilities or mutually comparable measurements. Confidence stays separate; missing evidence has no score. Read [UI/UX refinement](docs/UI_UX_REFINEMENT.md) for the exact mapping and limitations.

Layered paper surfaces, refined navigation and panels, stronger result hierarchy, keyboard metadata,
mobile result navigation and lightweight CSS motion preserve the forensic identity. Reduced-motion
changes take effect immediately. This work is COMPLETE and was merged into `main` at `080e800`.
