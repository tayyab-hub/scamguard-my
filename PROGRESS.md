# SCAMGUARD MY — current project state

Updated: **2026-09-03 16:28 +08:00 (Asia/Kuala_Lumpur)** after implementing and verifying Task 1 frontend preview resilience. This is the current handoff. The earlier documentation-only handoff is preserved in [HANDOFF_2026-09-03.md](docs/HANDOFF_2026-09-03.md); [TASK_1.md](docs/TASK_1.md) and [REDESIGN.md](docs/REDESIGN.md) retain their historical evidence. Prior deployment-preparation evidence is retained below under historical headings.

## Current milestone

**✅ COMPLETE — Task 1 foundation, frontend deployment readiness and graceful offline preview.** Task 1 includes the application foundation, professional responsive Forensic Intelligence UI, React/TypeScript and FastAPI/PostgreSQL architecture foundation, testing infrastructure, Git repository preparation and Vercel frontend readiness. Overview and Analyse now retain their unavailable workspace after failed optional API requests.

The deployment target is a **frontend development preview**. Actual PostgreSQL persistence is Task 2. Scam detection and live backend hosting are later. **Task 2 is paused and has not started.** Completing frontend readiness does not claim database connectivity, content persistence, a functioning detector or production launch readiness.

The Task 1 baseline `a6b996afb630cb5e14211f668074d6410d10c855` and publication handoff `6116d47` are on [tayyab-hub/scamguard-my](https://github.com/tayyab-hub/scamguard-my). `origin` remains `https://github.com/tayyab-hub/scamguard-my.git`; local `main` tracks `origin/main`. The user reports the Vercel frontend is now deployed and connected to GitHub, but no hosted URL was supplied for independent checks. This task changes only page-level failure presentation, tests and documentation. Delivery commit message: `fix: support frontend preview without deployed API`. Verify the current commit/push with `git status`, `git log -1 --oneline`, `git remote -v` and `git ls-remote origin refs/heads/main`. A push should trigger the connected Vercel redeployment; neither a completed redeployment nor remote CI success is inferred from local tests.

## Status legend

- **✅ COMPLETE:** implemented and verified within the named scope.
- **🟡 IN PROGRESS:** partial; remaining work is specified.
- **⚪ NOT STARTED:** absent functionality, including placeholders.
- **🔴 BLOCKED:** a named prerequisite prevents a specific step.

## Completed scope and preserved functionality

| Area | Status | Evidence / boundary |
| --- | --- | --- |
| React + TypeScript foundation | ✅ COMPLETE | Strict TS, Vite, React Router, TanStack Query, Zod API validation and render-error fallback. |
| Professional responsive UI | ✅ COMPLETE | Approved warm light Forensic Intelligence palette, sidebar/mobile navigation, branding, accessibility baseline, focus and reduced motion. New failure notice uses existing tokens and controls; connected presentation and approved documentation screenshots remain unchanged. |
| Overview and Analyse structures | ✅ COMPLETE | Only `/` and `/analyse` in navigation; catch-all not-found page. Loading/error/retry/unavailable states preserved. Overview is not functional analytics; Analyse is not a detector. |
| Local draft surface | ✅ COMPLETE | Memory-only message/URL drafts after capability success or failure, clearing/selection, disabled submission, no assessment. Failure displays a safe notice with retry; retry preserves drafts. Pending initial queries retain loading states. |
| FastAPI foundation | ✅ COMPLETE | Four versioned GET routes, typed schemas, request IDs, safe errors and explicit CORS. Backend functionality unchanged. |
| Database architecture scaffold | ✅ COMPLETE | PostgreSQL/Psycopg/SQLAlchemy configuration, sessions/rollback, Compose and Alembic environment. No domain models or revisions. |
| Testing infrastructure | ✅ COMPLETE | TypeScript/ESLint/Vitest/build, backend pytest/Ruff, ten live-API browser tests and four built offline-preview tests. 28 frontend unit tests now cover independent health, offline drafting and runtime validation. Remote CI results have not been checked. |
| Git preparation | ✅ COMPLETE | Local `main` baseline; expanded ignore rules and LF attributes; source review and staged-file checks exclude dependencies, environment secrets, output and caches. Existing configured author identity preserved. |
| Vercel readiness | ✅ COMPLETE | Root `frontend`, Vite, install `npm ci`, build `npm run build`, output `dist`, Node 24; unchanged SPA rewrite and environment defaults. Built routes/reloads and usable offline pages pass locally. Hosted redeployment verification remains separate. |
| Documentation | ✅ COMPLETE | Working instructions, current status, roadmap, decisions, README, deployment guide and testing/architecture records reconciled; historical handoff retained. |

## Current work and remaining scope

No Task 2 implementation, model training, migration or backend deployment is active. The local resilience fix and its required checks are complete; the next review is the automatic frontend redeployment. Development servers are temporary; do not assume they remain running.

| Item | Status | What remains |
| --- | --- | --- |
| GitHub connection and push | ✅ COMPLETE | Baseline published to `tayyab-hub/scamguard-my`, remote hash verified, and `main` tracks `origin/main`. No force push or remote overwrite. |
| Vercel frontend deployment / hosted verification | 🟡 IN PROGRESS | User reports the frontend is deployed and GitHub-connected. The resilience fix passes local built-preview checks; inspect its automatic redeployment and actual hosted routes next. No hosted URL or remote deployment result was independently checked here. |
| Actual PostgreSQL persistence / Core Platform | ⚪ NOT STARTED | Task 2 paused. No domain schema, submission, stored lifecycle, ownership/authentication or history service. Successful real database integration and online migration verification remain outstanding. |
| Real database verification | 🔴 BLOCKED | `TEST_DATABASE_URL` is unset; existing pytest integration case skips. Previous live readiness returned 503. This is a later database prerequisite, not a blocker for the frontend development preview. |
| Text intelligence, explanations, URL assessment, OCR/screenshots and QR | ⚪ NOT STARTED | No inference/extraction/evidence implementations. |
| Unified risk, confidence and insufficient information | ⚪ NOT STARTED | Accepted planned result-contract rules only. Unavailable/error states are not assessment outcomes. |
| Analytics, community, adaptive learning, campaigns, Model Lab | ⚪ NOT STARTED | No real records, datasets, models, feedback/moderation, learning or analytics services. |
| Full security/privacy and live hosting | 🟡 IN PROGRESS | Foundation safeguards exist; access control, retention/deletion, abuse controls, hosted backend, recovery and security/privacy evaluation are later work. |
| Final product/model evaluation | ⚪ NOT STARTED | Foundation regression tests are not detection metrics. |

## API and offline behavior

The backend contracts remain unchanged: health is process liveness; readiness runs `SELECT 1`; dashboard returns `not_configured` with null metrics and empty history; capabilities returns `analysis_available: false` and no supported inputs. `POST /api/v1/analyse` does not exist. See [API.md](docs/API.md).

The live-API browser suite verified the existing local FastAPI/Vite behavior. No manual readiness probe was rerun in this task; the last direct live readiness result was 503 in the earlier handoff. Backend unit tests still cover safe success/failure paths, with real integration skipped for the named environment reason.

`VITE_API_BASE_URL` remains blank/unset by default and resolves to `/api/v1`. Development retains its port-8000 proxy; static preview has none. Vercel's SPA rewrite may return HTML for absent API routes; the unchanged client rejects it safely. After initial loading, Overview retains three em dashes/Not available yet labels, empty Recent analyses and Workspace status. Analyse retains local drafting with submission disabled. Both pages show `PreviewNotice` with the safe error, optional request reference and retry. Queries remain errors; no fake responses, capabilities, metrics or results are introduced. `ApiStatus` independently shows “API unavailable” when health fails, and a healthy endpoint never masks another failed query. A future hosted API uses an HTTPS base including `/api/v1` and a rebuild. Backend deployment and actual PostgreSQL persistence remain Task 2.

## Latest executed verification

Executed **2026-09-03 16:22–16:24 +08:00**, Windows, Node 24.18.0, Python 3.12.13 and installed Chrome (`PLAYWRIGHT_CHANNEL=chrome`). Existing dependencies were used. Screenshot inspection followed at approximately 16:27. Exact working commands are in [TESTING.md](docs/TESTING.md).

| Working directory | Command | Actual result |
| --- | --- | --- |
| `frontend` | `npm.cmd run typecheck` | PASS |
| `frontend` | `npm.cmd run lint` | PASS, zero warnings |
| `frontend` | `npm.cmd test` | 28 passed in 2 files, 6.30s |
| `frontend` | `npm.cmd run build` | PASS, Vite 4.99s; JS 370.69 kB (113.97 kB gzip), CSS 27.84 kB (5.81 kB gzip), HTML 0.67 kB |
| `frontend` | `npm.cmd run test:e2e` | 10 passed, 15.0s; desktop/mobile with local API |
| `frontend` | `npm.cmd run test:preview` | 4 passed, 6.5s; built assets and actual SPA rewrite without backend |
| `backend` | `.\.venv\Scripts\python.exe -m pytest` | 22 passed, 1 skipped, 2 warnings, 0.43s |
| `backend` | `.\.venv\Scripts\python.exe -m ruff check app tests migrations` | PASS |
| `backend` | `.\.venv\Scripts\python.exe -m ruff format --check app tests migrations` | PASS; 16 files already formatted |
| Root | `git diff --check` / `git ls-files -ci --exclude-standard` | PASS; no whitespace errors or tracked ignored artifacts |

The PostgreSQL integration skip is unchanged: `TEST_DATABASE_URL` is not set and no running test database is configured. No source-code test failures occurred in this task. Existing non-failing Zod/Rollup annotation, Starlette httpx/AnyIO deprecation and Playwright color-environment warnings remain; none was suppressed. Bundler/browser execution used approved access for the Windows sandbox restriction.

All 17 API-client tests are unchanged. Page tests deliberately replace the former hidden-workspace expectations with the user's newly required visible unavailable interface, and add validation rejection, independent health recovery, loading and draft/privacy checks. Browser retry assertions now require the error to disappear on recovery, not merely the already-visible history. Existing tests and skip gates were not removed or weakened to obtain passing results.

Six fresh offline images (Overview/Analyse desktop, mobile viewport and mobile full-page) under ignored `frontend/test-results/preview` were inspected. Connected dashboard and mobile field-focus evidence was also inspected. No obvious clipping, horizontal overflow, spacing/contrast defect or inaccessible control was found at the tested layouts. Full-page mobile screenshots place the fixed navigation at its captured viewport position; viewport captures and interaction checks establish real navigation behavior. Successful live-API and normal HTML-fallback cases recorded no console/page errors; explicit 503/connection-abort cases intentionally exercise network failures without uncaught page errors. The four connected documentation PNGs remain unchanged.

Not verified in this task: hosted Vercel URL/redeployment, remote CI, fresh installs or dependency vulnerability audit, real PostgreSQL/online migrations, other browser engines, physical devices, or comprehensive accessibility/security evaluation. No product capability is inferred from frontend checks.

## Current change scope

Created `frontend/src/components/PreviewNotice.tsx`. Updated the two page branches, `frontend/src/app/App.test.tsx`, `frontend/e2e/foundation.spec.ts` and `frontend/e2e-preview/offline.spec.ts`. Reconciled CODEX, PROGRESS, ROADMAP, DECISIONS, README, ARCHITECTURE, API, TESTING and DEPLOYMENT documentation. The new component brings the maintained source inventory to 87 files after commit.

Backend source/tests/configuration, API contracts, client/query/environment logic, `ApiStatus`, existing full error/render-error handling, theme, layout/navigation, dependencies/lockfiles, Vercel rewrite and ignore rules are unchanged. No secrets, generated dependencies/builds/test outputs or draft content belong in this commit. No Task 2 work was implemented.

## Historical verification — deployment preparation (15:43–15:47)

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

## Historical repository audit — baseline and publication

The committed baseline contains 86 maintained files. Relative to the 79-file preparation-start inventory, seven files were added and 15 existing files changed. All `frontend/src` presentation/API code, original tests/fixtures, approved PNGs, backend app/tests/migrations, PostgreSQL Compose configuration and dependency lockfiles are unchanged. Backend environment-example changes are comments only. The build emits the same asset hashes as before preparation. The later GitHub-publication follow-up changes only README, PROGRESS, ROADMAP and DEPLOYMENT documentation.

Created: `.gitattributes`, `frontend/vercel.json`, `frontend/playwright.preview.config.ts`, `frontend/e2e-preview/offline.spec.ts`, `frontend/e2e-preview/serve.mjs`, `docs/DEPLOYMENT.md`, `docs/HANDOFF_2026-09-03.md`.

Updated: `.gitignore`, `.github/workflows/ci.yml`, `frontend/.env.example`, `backend/.env.example`, `frontend/package.json`, `frontend/tsconfig.node.json`, `frontend/vite.config.ts`, `README.md`, `CODEX.md`, `PROGRESS.md`, `ROADMAP.md`, `DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/TASK_1.md`.

Credential-pattern and manual review found only public local/test values and documentation placeholders, not real private keys/API tokens/database credentials. No root/backend/frontend `.env` files were present. Generated dependencies/builds/caches/reports, local databases/storage and `.local` artifacts are excluded; safe `.env.example`, source, tests, docs, lockfiles and Alembic configuration remain included. This scoped review is not a security certification. The historical 73-file ZIP in `.local` is stale and was not regenerated or committed.

The preparation task created one baseline commit; the subsequent authorized GitHub publication adds a documentation handoff commit. Require `git status --porcelain` and `git ls-files -ci --exclude-standard` to be empty after committing. No Vercel operation is performed as part of the GitHub push.

## Exact next step

**Verify the automatic Vercel redeployment of this Task 1 resilience fix.** In the existing connected project, check that the deployment uses the new `main` commit; open `/` and `/analyse` directly and refresh both. Require the normal unavailable workspace, honest health badge, disabled submission and no fabricated data or uncaught render failure. No deployment URL was supplied here. Do not recreate the remote/project or deploy the backend as a workaround.

**Stop after this Task 1 fix. Task 2 remains paused and has not started.**
