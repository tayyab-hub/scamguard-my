# SCAMGUARD

**SCAMGUARD: Multi-Modal Scam Detection & Reporting Web Application**

A private scam-awareness workspace that helps people inspect suspicious messages, URLs, phone numbers
and QR content before acting. Local evidence and explicit uncertainty support a decision; results
are not proof of fraud or safety. The approved warm light identity is **Forensic Intelligence**.
The project was generalized following supervisor feedback; the repository/domain retain the historical
`-my` suffix. The formal title includes Reporting, but delivered reporting is private analysis/history,
not a public scam-reporting or moderation network.

**2026-09-12:** Tasks 1–8 are accepted, merged and deployed on main
`4b327ccf21b59e295622e3b321cec62dc523dbde`. Task 9 final closure is ready for owner review on
`task-9-final-closure`; feature freeze is active and no automatic merge is authorized.
The Task 9 QR credential-redaction correction reaches production only after review/merge.
The production architecture is Vercel → same-origin `/api/v1` rewrite → Render → Neon, with Resend
for password-reset delivery. Live camera, private searchable history, measured dashboard distributions
and session/accessibility polish are included. See [documentation index](docs/INDEX.md),
[final tests](docs/FINAL_TEST_REPORT.md), [evaluation](docs/EVALUATION.md),
[production acceptance](docs/PRODUCTION_ACCEPTANCE.md), [historical Task 8 audit](docs/TASK_8_PEAK_ENHANCEMENT.md),
[QR Intelligence](docs/QR_INTELLIGENCE.md), [Task 6.1](docs/TASK_6_1.md), [Phone Intelligence](docs/PHONE_INTELLIGENCE.md),
[Authentication](docs/AUTHENTICATION.md), and [Privacy](docs/PRIVACY_MODEL.md).

## Project memory

Technology stack: React 19, strict TypeScript, Vite, Tailwind, React Router, TanStack Query and Zod;
Python/FastAPI/Pydantic, SQLAlchemy/Psycopg, PostgreSQL and Alembic. Training uses scikit-learn;
runtime models are JSON, Phone uses offline phonenumbers, and QR uses Pillow/zxing-cpp plus a browser
zxing-wasm fallback. [Architecture diagram](docs/ARCHITECTURE.md) shows the browser/API/DB/mail boundaries.

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

The launcher checks the portable PostgreSQL runtime/data, backend `.venv` and `.env`, frontend dependencies, and persistence setting; starts the isolated database on `127.0.0.1:55432`; applies Alembic through the current head; and starts the backend and frontend in visible terminals. It reuses healthy SCAMGUARD services and refuses unknown processes on ports 8000, 5173, or 55432 without killing them. Shutdown verifies recorded process identity and stops only launcher-owned app processes, then cleanly stops this repository's PostgreSQL cluster. It never deletes the database. Final URLs are `http://127.0.0.1:5173` and `http://127.0.0.1:8000/api/v1/health`.

This convenience launcher requires the existing ignored .local portable cluster to be provisioned;
a fresh clone should use the Compose/manual API setup below unless that runtime is installed.

VS Code intentionally requires workspace trust before an automatic folder-open task runs. Review `.vscode/tasks.json`, `dev.ps1`, and `stop-dev.ps1`, then trust this repository if you want that convenience. No execution-policy setting is changed globally; wrappers use a process-scoped policy for the checked-in scripts.

```sh
npm run build
npm run preview
```

Build output is `frontend/dist`; preview is http://127.0.0.1:4173. Static preview has no API proxy.
Normal development and production requests use relative `/api/v1`; Vite proxies locally and the
existing Vercel CDN rewrite proxies production requests to Render. `API_PROXY_TARGET` is local Vite
configuration only (default http://127.0.0.1:8000). Never place secrets in `VITE_*` variables.

## Local PostgreSQL and API (PowerShell)

Local development now uses real accounts and private ownership while retaining a database and
credentials separate from production. Continue to use non-sensitive test content.

Requirements: Python 3.12+, PostgreSQL 17 (existing server or Docker Compose), Node/npm. From the repository root, copy examples only when the destination does not already exist:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Edit POSTGRES_PASSWORD in .env; do not commit it.
docker compose up -d db
docker compose ps
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -c requirements.lock -e '.[dev,ml,ai]'
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
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
tables and all four local intelligence engines. No `create_all()` is used.

Alembic `0001_analysis_intake` creates intake; `0002_message_intelligence` adds result/audit fields;
`0003_auth_ownership` adds users, sessions, rate buckets and nullable legacy-compatible ownership;
`0004_phone_intelligence` adds the PHONE input/content constraints without rewriting Message/URL
rows, and `0005_auth_profile_polish` adds nullable legacy-safe profiles and digest-only reset tokens.
`0006_qr_intelligence` adds QR input/content constraints without rewriting existing records.
Upgrade → downgrade → upgrade and drift checks pass against a disposable real PostgreSQL
database. Downgrade is destructive test activity and must never target development or production.

## Implemented behavior

- React/TypeScript/Vite, Router, Tailwind, TanStack Query and Zod; FastAPI/Pydantic, SQLAlchemy/Psycopg/PostgreSQL and Alembic.
- Sign In (`/login`), Create Account (`/signup`), password recovery (`/forgot-password` and
  `/reset-password`) and public Help (`/help`); authenticated Overview
  (`/`), Analyse (`/analyse`), History (`/history`) and Account (`/account`) routes; plus a catch-all 404. Responsive
  navigation, keyboard focus and reduced-motion CSS remain.
- New accounts require a Unicode-aware full name and case-normalized unique username. Login accepts
  username or email. Account permits CSRF-protected name/username changes while email stays read-only.
- Completed analyses are immutable. An owned expanded detail offers Analyse again, which creates an
  editable local copy and submits a new Message, URL or Phone record without changing the original.
  QR requires a fresh image upload or explicit camera scan because images are not retained.
- Live camera QR uses an explicit Start camera action, native QR detection when available and a
  same-origin `zxing-wasm@3.1.3` worker fallback. Frames stay on-device; detection stops capture before
  an inert payload preview and a separate Analyse action. HTTPS/localhost is required. Hardware
  iPhone/Android/Edge acceptance remains owner testing; image upload is always the fallback.
- Private history supports server-side content/summary search, type/risk filters, newest/oldest/risk
  sorting and bounded pagination. Overview shows measured type/risk counts with links to filtered
  history. Insufficient evidence is unranked and never presented as safety.
- MESSAGE: trimmed non-empty text, at most 5,000 characters. URL: validated absolute HTTP(S), at most 2,048 characters; never visited automatically. PHONE: explicit international `+` context, normal ASCII formatting, at most 64 characters, normalized to E.164.
- An authenticated backend accepts `POST /api/v1/analyses`, assigns ownership from the session and
  never accepts a frontend user ID. MESSAGE persists intake, runs local assessment synchronously and
  returns `COMPLETED` with risk, separate confidence, evidence, actions,
  component versions and limitations. Context-poor messages can return
  `INSUFFICIENT_EVIDENCE`. URL uses its own offline intelligence pipeline and persists a completed assessment; URL risk has no percentage score.
- The local TF-IDF Logistic Regression model keeps LEGITIMATE/SPAM/SCAM distinct. It achieved
  untouched-test macro F1 0.8952 and weighted F1 0.9690 on the documented split; these are
  dataset-specific measurements, not a promise for live messages.
- The local URL random forest achieved held-out macro F1 0.984698, with substantial source homepage/HTTPS bias. ML alone cannot produce elevated/high risk. Runtime parsing uses an offline public-suffix snapshot, and embedded userinfo is removed before storage. No live reputation adapter is configured.
- Phone uses pinned offline `phonenumbers` metadata. Ordinary/foreign/mobile/fixed/VoIP/unknown or invalid numbers do not receive scam/safe claims; reliable premium/shared-cost metadata produces CAUTION only. No numeric Phone fraud score is invented.
- Per-user total/latest/recent data, paginated history/detail/deletion and a real flagged count for
  owned completed ELEVATED/HIGH Message, URL, Phone or QR assessments. Empty history means measured zero;
  unavailable means unavailable.
- QR accepts one PNG/JPEG/WebP up to 5 MiB, validates and decodes one symbol in backend memory, then
  discards the image. HTTP(S), phone and suitable text payloads reuse existing intelligence;
  email/SMS/Wi-Fi/geo/other content is labelled conservatively. EMV-style payment structure and CRC
  never prove merchant or payment safety. Decoded content and derived private assessment metadata
  persist; URL credentials and Wi-Fi passwords are redacted before storage.
- Help search and feedback preparation run locally. `VITE_SUPPORT_EMAIL` is optional and public; when blank, the page truthfully states that online feedback is being prepared. A configured value opens the user's email application and never claims a message was sent.

## Security and privacy boundary

Accounts store a normalized email and Argon2id password hash. An opaque raw session token exists only
in an HttpOnly cookie; PostgreSQL holds its HMAC digest. Exact-origin plus synchronizer-token CSRF
protection covers state changes. Content is associated with the current user for private history and
is never used for automatic training. Users can delete individual records or their account and owned
records. Legacy unowned rows are hidden. See [Authentication](docs/AUTHENTICATION.md) and
[Privacy](docs/PRIVACY_MODEL.md).

Implemented protections include a 64 KiB default request cap (including chunked bodies), a narrow
multipart allowance for the 5 MiB QR route, server validation, parameterized ORM writes, explicit
commit/rollback/close, safe errors/request IDs, no-store/nosniff headers, exact-origin CORS and
content-safe exception logging. React renders decoded payloads as escaped inert text; URLs are not
clickable external targets.

Basic PostgreSQL-backed rate limits cover signup, login and analysis; they are not enterprise DDoS
protection. Provider backup deletion/retention, formal policy, incident response and broad public
usage still need owner review. A timeout/network failure may occur after commit: check history before
retrying; idempotency keys are not implemented.

## GitHub and Vercel

Keep the existing origin and domain. Task 9 remains on its review branch until owner acceptance:

```sh
git status
git remote -v
git log --oneline --decorate -n 10
```

Vercel settings and the working CDN rewrite remain unchanged. Root Directory is `frontend`, framework
Vite, install `npm ci`, build `npm run build`, output `dist`, Node 24. Normal API calls stay relative
so the rewrite can reach Render. See [Production deployment](docs/PRODUCTION_DEPLOYMENT.md).

## Verification and next step

[TESTING](docs/TESTING.md) contains exact frontend/backend/real PostgreSQL/browser commands. [PROGRESS](PROGRESS.md) records actual results and limitations. Generated dependencies, builds, local PostgreSQL data, `.env` and test outputs are ignored; lockfiles, source, migrations, tests and intentional documentation screenshots stay tracked.

Task 9 observed 159 Vitest, 50 Playwright and 310 Pytest passes, with one opt-in live AI test skipped.
See the final test report for exact commands, scope, warnings and production/manual distinctions.
The owner reports the application works; device-specific hardware evidence is unrecorded and the
volunteer usability study is **NOT YET CONDUCTED**. No independent penetration test, WCAG certification,
enterprise load validation or live scam-detection accuracy is claimed.

## Submission evidence

[Requirements](docs/REQUIREMENTS_TRACEABILITY.md), [architecture](docs/ARCHITECTURE.md),
[data flows](docs/DATA_FLOW.md), [database](docs/DATABASE.md), [security](docs/SECURITY_REVIEW.md),
[limitations](docs/LIMITATIONS.md) and [future work](docs/FUTURE_WORK.md) support the written report.
[Report guide](docs/CAPSTONE_REPORT_GUIDE.md), [presentation plan](docs/PRESENTATION_PLAN.md),
[demo script](docs/DEMO_SCRIPT.md), [examiner Q&A](docs/EXAMINER_QA.md),
[screenshot instructions](docs/SCREENSHOT_CHECKLIST.md) and [strict assessment](docs/EXAMINER_REVIEW.md)
support the remaining owner work. Historical records are retained with their original evidence dates.

Controlled text and generated QR fixtures are in [data/demo/task9](data/demo/task9/fixtures.json).
Keep URLs, numbers and payment content inert. Reproduce without retraining from the repository root:

```powershell
.\backend\.venv\Scripts\python.exe backend/scripts/evaluate_final.py
.\backend\.venv\Scripts\python.exe backend/scripts/verify_url_pipeline.py
.\backend\.venv\Scripts\python.exe backend/scripts/scan_repository_secrets.py
```

The Message source CSV intentionally retains publisher CRLF bytes for checksum reproducibility.
Both research archives and reviewed model artifacts are intentional licensed provenance.

## Post-Task 4 UI/UX refinement

The frontend now shares result summary, risk meter, confidence, evidence, actions and metadata components across Message and URL, including history. Message shows its stored fusion score as points out of 100; URL shows an explicitly labelled ordinal category index (0/33/67/100). They are advisory, not probabilities or mutually comparable measurements. Confidence stays separate; missing evidence has no score. Read [UI/UX refinement](docs/UI_UX_REFINEMENT.md) for the exact mapping and limitations.

Layered paper surfaces, refined navigation and panels, stronger result hierarchy, keyboard metadata,
mobile result navigation and lightweight CSS motion preserve the forensic identity. Reduced-motion
changes take effect immediately. This work is COMPLETE and was merged into `main` at `080e800`.
