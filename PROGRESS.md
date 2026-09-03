# SCAMGUARD MY — current project state

Updated: **2026-09-03 15:53 +08:00 (Asia/Kuala_Lumpur)**. This is the current handoff. The earlier documentation-only handoff is preserved in [HANDOFF_2026-09-03.md](docs/HANDOFF_2026-09-03.md); [TASK_1.md](docs/TASK_1.md) and [REDESIGN.md](docs/REDESIGN.md) retain their historical evidence.

## Current milestone

**✅ COMPLETE — Task 1 local foundation and frontend deployment readiness.** Task 1 includes the application foundation, professional responsive Forensic Intelligence UI, React/TypeScript and FastAPI/PostgreSQL architecture foundation, testing infrastructure, Git repository preparation and Vercel frontend readiness.

The deployment target is a **frontend development preview**. Actual PostgreSQL persistence is Task 2. Scam detection and live backend hosting are later. **Task 2 is paused and has not started.** Completing frontend readiness does not claim database connectivity, content persistence, a functioning detector or production launch readiness.

The local Git baseline uses `main` and commit message `chore: complete Task 1 application foundation`. Resolve its exact hash with `git log -1 --oneline`; this file belongs to that baseline, so it does not embed its own commit hash. No GitHub remote is configured, no push was performed, and no Vercel deployment URL or remote CI result exists yet. Verify actual Git state on arrival with `git status` and `git remote -v`.

## Status legend

- **✅ COMPLETE:** implemented and verified within the named scope.
- **🟡 IN PROGRESS:** partial; remaining work is specified.
- **⚪ NOT STARTED:** absent functionality, including placeholders.
- **🔴 BLOCKED:** a named prerequisite prevents a specific step.

## Completed scope and preserved functionality

| Area | Status | Evidence / boundary |
| --- | --- | --- |
| React + TypeScript foundation | ✅ COMPLETE | Strict TS, Vite, React Router, TanStack Query, Zod API validation and render-error fallback. |
| Professional responsive UI | ✅ COMPLETE | Approved warm light Forensic Intelligence palette, sidebar/mobile navigation, branding, accessibility baseline, focus and reduced motion. Presentation code and screenshots unchanged by deployment preparation. |
| Overview and Analyse structures | ✅ COMPLETE | Only `/` and `/analyse` in navigation; catch-all not-found page. Loading/error/retry/unavailable states preserved. Overview is not functional analytics; Analyse is not a detector. |
| Local draft surface | ✅ COMPLETE | Memory-only message/URL drafts when the capability response is available, clearing/selection, disabled submission, no assessment. Editor stays hidden when capability retrieval fails. |
| FastAPI foundation | ✅ COMPLETE | Four versioned GET routes, typed schemas, request IDs, safe errors and explicit CORS. Backend functionality unchanged. |
| Database architecture scaffold | ✅ COMPLETE | PostgreSQL/Psycopg/SQLAlchemy configuration, sessions/rollback, Compose and Alembic environment. No domain models or revisions. |
| Testing infrastructure | ✅ COMPLETE | TypeScript/ESLint/Vitest/build, backend pytest/Ruff, ten live-API browser tests and four additional built offline-preview tests. CI configuration includes both browser suites; remote CI unrun. |
| Git preparation | ✅ COMPLETE | Local `main` baseline; expanded ignore rules and LF attributes; source review and staged-file checks exclude dependencies, environment secrets, output and caches. Existing configured author identity preserved. |
| Vercel readiness | ✅ COMPLETE | Root `frontend`, Vite, install `npm ci`, build `npm run build`, output `dist`, Node 24; minimal SPA rewrite. Built routes/reloads/offline states pass locally; actual hosted verification is pending import. |
| Documentation | ✅ COMPLETE | Working instructions, current status, roadmap, decisions, README, deployment guide and testing/architecture records reconciled; historical handoff retained. |

## Current work and remaining scope

No Task 2 implementation, model training, migration or deployment is active. Test servers are temporary and were managed by Playwright; do not assume development servers remain running.

| Item | Status | What remains |
| --- | --- | --- |
| GitHub connection and push | 🔴 BLOCKED | No target repository URL provided. Use the commands in DEPLOYMENT.md once the empty repository exists. Do not invent or overwrite a remote. |
| Vercel import and live-route verification | ⚪ NOT STARTED | Import GitHub repository with Root Directory `frontend`, then inspect the actual hosted `/` and `/analyse` refresh behavior and offline states. No deployment is claimed from local tests. |
| Actual PostgreSQL persistence / Core Platform | ⚪ NOT STARTED | Task 2 paused. No domain schema, submission, stored lifecycle, ownership/authentication or history service. Successful real database integration and online migration verification remain outstanding. |
| Real database verification | 🔴 BLOCKED | `TEST_DATABASE_URL` is unset; existing pytest integration case skips. Previous live readiness returned 503. This is a later database prerequisite, not a blocker for the frontend development preview. |
| Text intelligence, explanations, URL assessment, OCR/screenshots and QR | ⚪ NOT STARTED | No inference/extraction/evidence implementations. |
| Unified risk, confidence and insufficient information | ⚪ NOT STARTED | Accepted planned result-contract rules only. Unavailable/error states are not assessment outcomes. |
| Analytics, community, adaptive learning, campaigns, Model Lab | ⚪ NOT STARTED | No real records, datasets, models, feedback/moderation, learning or analytics services. |
| Full security/privacy and live hosting | 🟡 IN PROGRESS | Foundation safeguards exist; access control, retention/deletion, abuse controls, hosted backend, recovery and security/privacy evaluation are later work. |
| Final product/model evaluation | ⚪ NOT STARTED | Foundation regression tests are not detection metrics. |

## API and offline behavior

The backend contracts remain unchanged: health is process liveness; readiness runs `SELECT 1`; dashboard returns `not_configured` with null metrics and empty history; capabilities returns `analysis_available: false` and no supported inputs. `POST /api/v1/analyse` does not exist. See [API.md](docs/API.md).

The live-API browser suite started local FastAPI/Vite and verified their original behavior. No manual readiness probe was rerun in this task; the last direct live readiness result was 503 in the earlier handoff. The current backend unit tests still cover safe success/failure paths, with real integration skipped for the named environment reason.

`VITE_API_BASE_URL` can be blank/unset and defaults to `/api/v1`. Local `npm run dev` keeps its existing port-8000 API proxy; static `npm run preview` explicitly disables that proxy. Deployed browser requests have no hardcoded localhost base. Vercel's SPA rewrite may serve HTML when an API is absent; the unchanged client rejects it safely. The shell, navigation and headings render, “API unavailable” appears, and panels show the approved error/retry states. No mock data, counters, results or enabled submission are introduced. A later hosted API needs an HTTPS base URL including `/api/v1` and a rebuild.

## Latest executed verification

Executed 2026-09-03, approximately 15:43–15:47 +08:00, on Windows with Node 24.18.0, Python 3.12.13 and installed Chrome via `PLAYWRIGHT_CHANNEL=chrome`. Exact instructions are in [TESTING.md](docs/TESTING.md).

| Working directory | Command | Actual final result |
| --- | --- | --- |
| `frontend` | `npm.cmd run typecheck` | PASS |
| `frontend` | `npm.cmd run lint` | PASS, zero warnings allowed |
| `frontend` | `npm.cmd test` | 24 passed in 2 files, 3.85s |
| `frontend` | `npm.cmd run build` | PASS; 370.31 kB JS (113.92 kB gzip), 27.79 kB CSS (5.80 kB gzip) |
| `frontend` | `npm.cmd run test:e2e` | 10 passed, 17.0s; existing desktop/mobile live-API suite |
| `frontend` | `npm.cmd run test:preview` | 4 passed, 4.5s; built frontend + checked-in SPA rewrite, no backend |
| `backend` | `.\.venv\Scripts\python.exe -m pytest` | 22 passed, 1 skipped, 2 warnings, 0.33s |
| `backend` | `.\.venv\Scripts\python.exe -m ruff check app tests migrations` | PASS |
| `backend` | `.\.venv\Scripts\python.exe -m ruff format --check app tests migrations` | PASS, 16 files formatted |
| `backend` | `.\.venv\Scripts\python.exe -m pip check` | PASS, no broken requirements |
| Root | `git check-ignore` boundary audit | 30 excluded-path cases and 14 retained-source cases passed |

Four offline Overview/Analyse desktop/mobile screenshots were manually inspected from ignored `frontend/test-results/preview`: no obvious clipping, overflow or navigation overlap at the tested viewports. Successful live-API and ordinary static-fallback browser cases reported no console/page errors. Explicit 503/network-abort negative cases intentionally exercise failures. Documentation PNGs were not replaced.

Failures found and fixed: two newly added preview cases initially failed because the Vite preview harness used different API fallback semantics than the Vercel rewrite. The harness now reads and applies `vercel.json`; assertions were retained. ESLint then caught a missing `URL` import in that new test server, which was fixed. TypeScript/lint and preview checks were rerun successfully. Original tests, assertions, skip rules and product behavior were not changed. No unresolved source-code or environmental execution failure remains in the requested frontend checks. Bundler/browser execution used approved access for the known Windows sandbox restriction.

Non-failing warnings: two Zod/Rollup annotations, Starlette TestClient httpx/AnyIO deprecations, and Playwright CLI color-environment warnings. Nothing was suppressed to obtain a pass. Fresh dependency installation/audit, Linux CI, real PostgreSQL success, online migrations, actual Vercel deployment, other browser engines, physical devices and full accessibility/security evaluation were not executed here.

## Repository audit and delivery

The candidate baseline contains 86 maintained files. Relative to the 79-file starting inventory, seven files were added and 15 existing files changed. All `frontend/src` presentation/API code, original tests/fixtures, approved PNGs, backend app/tests/migrations, PostgreSQL Compose configuration and dependency lockfiles are unchanged. Backend environment-example changes are comments only. The build emits the same asset hashes as before preparation.

Created: `.gitattributes`, `frontend/vercel.json`, `frontend/playwright.preview.config.ts`, `frontend/e2e-preview/offline.spec.ts`, `frontend/e2e-preview/serve.mjs`, `docs/DEPLOYMENT.md`, `docs/HANDOFF_2026-09-03.md`.

Updated: `.gitignore`, `.github/workflows/ci.yml`, `frontend/.env.example`, `backend/.env.example`, `frontend/package.json`, `frontend/tsconfig.node.json`, `frontend/vite.config.ts`, `README.md`, `CODEX.md`, `PROGRESS.md`, `ROADMAP.md`, `DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/TASK_1.md`.

Credential-pattern and manual review found only public local/test values and documentation placeholders, not real private keys/API tokens/database credentials. No root/backend/frontend `.env` files were present. Generated dependencies/builds/caches/reports, local databases/storage and `.local` artifacts are excluded; safe `.env.example`, source, tests, docs, lockfiles and Alembic configuration remain included. This scoped review is not a security certification. The historical 73-file ZIP in `.local` is stale and was not regenerated or committed.

The baseline commit is the only commit created by this task. After committing, require `git status --porcelain` and `git ls-files -ci --exclude-standard` to be empty. No remote is created and no GitHub/Vercel operation is performed without its target. The baseline hash and final clean status are reported in the task completion message, with commands to verify them locally.

## Exact next step

**Connect GitHub and import the Task 1 frontend preview into Vercel.** Follow [DEPLOYMENT.md](docs/DEPLOYMENT.md): create an empty GitHub repository, inspect remotes, add its real URL, push `main`, import with Root Directory `frontend` and the documented build settings, then check the actual hosted routes and offline behavior. No backend environment variables belong in that Vercel project.

**Stop after this preparation task. Task 2 remains paused and has not started.**
