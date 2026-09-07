# SCAMGUARD

**SCAMGUARD: Multi-Modal Scam Detection & Reporting Web Application**

A general scam-awareness workspace with the approved warm light **Forensic Intelligence** identity. The project was initially Malaysia-focused and was generalized following supervisor feedback. The repository and Vercel domain retain their historical `-my` suffix.

**Task 1 Foundation, Task 2 Core Platform and Task 3 Message Intelligence are complete and merged
to `main`.** MESSAGE submissions run
a genuine local three-class model, deterministic evidence rules and conservative fusion, then store
an explainable result. Optional backend contextual AI is disabled by default. **Task 4 URL Intelligence is COMPLETE and merged to main.** URL submissions now receive local model, structural evidence and conservative risk assessments without fetching destinations. Phone and QR remain local UI only. See [Message Intelligence](docs/MESSAGE_INTELLIGENCE.md),
[Datasets](docs/DATASETS.md) and [Model Evaluation](docs/MODEL_EVALUATION.md).

The existing frontend is deployed at https://scamguard-my.vercel.app/ and connected to GitHub/main.
It remains a frontend preview with no live backend. The Task 3 merge updates frontend code only;
it does not deploy FastAPI or prove backend availability.

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

Open http://127.0.0.1:5173. Existing checkouts need only the frontend commands. Frontend preview requires no database/backend: failed API requests retain the usable unavailable workspace and truthful health badge. No fake data is substituted.

## Open everything on Windows

After the one-time setup below, choose one workflow from the repository root:

1. Double-click `Start-SCAMGUARD.cmd` and use `Stop-SCAMGUARD.cmd` when finished.
2. In a trusted VS Code workspace, allow the **SCAMGUARD: Start Development** folder-open task; run **SCAMGUARD: Stop Development** from **Terminal → Run Task** when finished.
3. In PowerShell, run `.\dev.ps1` and `.\stop-dev.ps1`. Add `-NoBrowser` when you do not want the launcher to open a browser tab.

The launcher checks the portable PostgreSQL runtime/data, backend `.venv` and `.env`, frontend dependencies, and persistence setting; starts the isolated database on `127.0.0.1:55432`; applies Alembic; and starts the backend and frontend in visible terminals. It reuses healthy SCAMGUARD services and refuses unknown processes on ports 8000, 5173, or 55432 without killing them. Shutdown verifies recorded process identity and stops only launcher-owned app processes, then cleanly stops this repository's PostgreSQL cluster. It never deletes the database. Final URLs are `http://127.0.0.1:5173` and `http://127.0.0.1:8000/api/v1/health`.

VS Code intentionally requires workspace trust before an automatic folder-open task runs. Review `.vscode/tasks.json`, `dev.ps1`, and `stop-dev.ps1`, then trust this repository if you want that convenience. No execution-policy setting is changed globally; wrappers use a process-scoped policy for the checked-in scripts.

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
.\.venv\Scripts\python.exe -m pip install -c requirements.lock -e '.[dev,ml,ai]'
Copy-Item .env.example .env
# Set DATABASE_URL to your local database credentials.
# Set PERSISTENCE_ENABLED=true for this private workspace.
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app
```

Compose creates the configured database with a loopback-only port and persistent named volume. An existing PostgreSQL server can be used instead: create a development database, then configure its `postgresql+psycopg://` URL. Ordinary `docker compose down` preserves data; do not remove volumes casually.

`python -m app` reads `PORT` (default 8000); development binds loopback, production binds 0.0.0.0. Start the frontend in a second terminal. A changed local API port requires matching `API_PROXY_TARGET`. Development API docs are at http://127.0.0.1:8000/docs. `GET /api/v1/health` checks process liveness; `/ready` checks PostgreSQL and, when persistence is enabled, the analyses table. No automatic startup migration or `create_all()` is used.

Alembic `0001_analysis_intake` creates intake; additive `0002_message_intelligence` preserves
Task 2 rows while adding nullable result/audit fields. Upgrade → downgrade → upgrade, schema
comparison and fresh-process result retrieval were tested against real PostgreSQL. Downgrade
destroys data and is for disposable test databases only.

## Implemented behavior

- React/TypeScript/Vite, Router, Tailwind, TanStack Query and Zod; FastAPI/Pydantic, SQLAlchemy/Psycopg/PostgreSQL and Alembic.
- Overview (`/`), Analyse (`/analyse`) and Help & Support (`/help`) navigation, plus a catch-all 404. Approved responsive sidebar/mobile navigation, keyboard focus and reduced-motion CSS remain.
- MESSAGE: trimmed non-empty text, at most 5,000 characters. URL: validated absolute HTTP(S), at most 2,048 characters; never visited automatically.
- An available private backend accepts `POST /api/v1/analyses`. MESSAGE persists intake, runs local
  assessment synchronously and returns `COMPLETED` with risk, separate confidence, evidence, actions,
  component versions and limitations. Context-poor messages can return
  `INSUFFICIENT_EVIDENCE`. URL uses its own offline intelligence pipeline and persists a completed assessment; URL risk has no percentage score.
- The local TF-IDF Logistic Regression model keeps LEGITIMATE/SPAM/SCAM distinct. It achieved
  untouched-test macro F1 0.8952 and weighted F1 0.9690 on the documented split; these are
  dataset-specific measurements, not a promise for live messages.
- The local URL random forest achieved held-out macro F1 0.984698, with substantial source homepage/HTTPS bias. ML alone cannot produce elevated/high risk. Runtime parsing uses an offline public-suffix snapshot, and embedded userinfo is removed before storage. No live reputation adapter is configured.
- Real total/latest/recent data, paginated history/detail and a real flagged count for completed
  ELEVATED/HIGH Message or URL assessments. Empty database means measured zero; unavailable means unavailable.
- Phone accepts natural international drafts but cannot submit. QR accepts local filename/size selection for one non-empty PNG/JPEG/WEBP up to 5 MiB; no image reading, upload, storage, decoding or camera access. Unsubmitted drafts/file selection clear on navigation or reload.
- Help search and feedback preparation run locally. `VITE_SUPPORT_EMAIL` is optional and public; when blank, the page truthfully states that online feedback is being prepared. A configured value opens the user's email application and never claims a message was sent.

## Security and privacy boundary

One shared private development dataset is visible to everyone who can access the backend. The UI
discloses storage before submission. Content is stored for private submission/result history, never
automatic training. UUIDs and CORS are not authorization. Optional external AI is backend-only,
disabled by default and best-effort redacted; enabling it explicitly sends redacted message text to
the configured provider. Configure `AI_REVIEW_ENABLED=true`, `OPENAI_API_KEY` and the reviewed
backend model only in the backend process environment; normal local operation needs none of them.
No key belongs in `.env.example`, frontend variables or source control.

Implemented protections include a 64 KiB request cap (including chunked bodies), server validation, parameterized ORM writes, explicit commit/rollback/close, safe errors/request IDs, no-store/nosniff headers, exact-origin CORS and content-safe exception logging. React renders submissions as escaped text; URLs are not clickable external targets.

Before public or sensitive-content intake, decide authentication/ownership and access control, consent/privacy policy, retention/deletion including backups, encryption and abuse/rate limits. None is claimed implemented. A timeout/network failure may occur after commit: check history before retrying; idempotency keys are not yet implemented.

## GitHub and Vercel

Keep the existing origin and domain. Task 3 is closed on `main`; inspect before future work:

```sh
git status
git remote -v
git log --oneline --decorate -n 10
```

Vercel settings remain: Root Directory `frontend`, framework Vite, install `npm ci`, build
`npm run build`, output `dist`, Node 24. Leave `VITE_API_BASE_URL` unset for the frontend-only
preview. `frontend/vercel.json` handles SPA direct routes. Do not deploy FastAPI to Vercel or rename
the project. See [DEPLOYMENT](docs/DEPLOYMENT.md).

## Verification and next step

[TESTING](docs/TESTING.md) contains exact frontend/backend/real PostgreSQL/browser commands. [PROGRESS](PROGRESS.md) records actual results and limitations. Generated dependencies, builds, local PostgreSQL data, `.env` and test outputs are ignored; lockfiles, source, migrations, tests and intentional documentation screenshots stay tracked.

Task 4 is COMPLETE, verified and manually accepted; closure and a no-fast-forward main merge are explicitly authorized. See [URL methodology](docs/URL_INTELLIGENCE.md), [URL data](docs/URL_DATASETS.md), [URL evaluation](docs/URL_MODEL_EVALUATION.md) and [Task 4 report](docs/TASK_4_REPORT.md). Retain `task-4-url-intelligence`. Task 5 has not started and must not begin automatically.

## Post-Task 4 UI/UX refinement

The frontend now shares result summary, risk meter, confidence, evidence, actions and metadata components across Message and URL, including history. Message shows its stored fusion score as points out of 100; URL shows an explicitly labelled ordinal category index (0/33/67/100). They are advisory, not probabilities or mutually comparable measurements. Confidence stays separate; missing evidence has no score. Read [UI/UX refinement](docs/UI_UX_REFINEMENT.md) for the exact mapping and limitations.

Layered paper surfaces, refined navigation and panels, stronger result hierarchy, keyboard metadata, mobile result navigation and lightweight CSS motion preserve the forensic identity. Reduced-motion changes take effect immediately. This work is confined to `codex/ui-ux-result-refinement`; Task 4 is merged on main, Task 5 remains NOT STARTED, and no merge is authorized for this refinement.
