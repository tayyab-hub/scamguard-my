# Task 1 — GitHub and Vercel frontend preview

This workflow publishes the existing **SCAMGUARD MY Forensic Intelligence frontend development preview**. It does not deploy FastAPI, create a database, enable submissions, or add detection. Actual PostgreSQL persistence is Task 2; scam detection and live backend hosting are later work. Task 2 is paused.

## Local preparation and safety

Git is initialized on `main`. Baseline `a6b996afb630cb5e14211f668074d6410d10c855` (`chore: complete Task 1 application foundation`) is published to [tayyab-hub/scamguard-my](https://github.com/tayyab-hub/scamguard-my). `origin` points to that repository and `main` tracks `origin/main`; the push was verified on 2026-09-03. The user reports Vercel is deployed and connected to GitHub. The hosted URL/build has not been independently checked in the latest task. Follow [PROGRESS.md](../PROGRESS.md) for evidence and limitations. The connection instructions below are retained for reference; this checkout is already connected and must not have its remote recreated.

`.gitignore` excludes dependencies, virtual environments, environment secrets, generated builds/test output, caches, logs/temp files, local database/storage files, unnecessary editor/OS files and local Vercel metadata. Its unanchored `node_modules/` and `.venv/` rules apply inside frontend/backend as well. `.env` and `.env.*` are ignored; the exact safe filename `.env.example` is retained at every depth. Source, tests, documentation, package manifests/lockfiles, Python requirements/pyproject and Alembic configuration remain included. `.gitattributes` normalizes text to LF and preserves PNGs as binary.

The public values `scamguard_local_only`, `ci_test_only` and explicitly named test/example passwords are disposable development examples, not production credentials. Current production backend settings reject the default local password. No real token/private key was found in the reviewed source. Never replace an example with an actual password in a tracked file; use an ignored environment file or the appropriate future host's secret settings. `VITE_*` values are public JavaScript bundle configuration, not a place for secrets.

Before any later commit/push, from the repository root:

```sh
git status --short
git diff --cached --name-only
git diff --cached --check
git ls-files -ci --exclude-standard
git remote -v
```

The `git ls-files -ci` check should print nothing: it detects tracked files that now match ignore rules. Also inspect newly staged names/content for private files or credentials. Ignore rules do not remove secrets already committed; a discovered real leaked credential requires rotation and a separately coordinated cleanup. Do not force-push or discard work as a routine fix.

## Connect the local baseline to GitHub

Create an **empty** GitHub repository. Do not initialize it with another README, license or `.gitignore`, because this local baseline already has history. Replace the example URL below with the actual repository URL; never place a token in the URL.

From the existing local project root:

```sh
git status
git branch --show-current
git log -1 --oneline
git remote -v
# Run only when no origin exists; otherwise inspect the existing URL first.
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

Authenticate through Git's normal credential flow. The prepared branch is `main`. Do not overwrite another remote or force-push to solve an unrelated history. After pushing, inspect the GitHub Actions run; a workflow file alone is not a passing CI result.

## Clone and run the frontend

Use Node 24 with npm. No Python, Docker or database is required for the frontend-only preview.

```sh
git clone https://github.com/tayyab-hub/scamguard-my.git scamguard-my
cd scamguard-my/frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. If FastAPI is running locally, the existing `/api` development proxy reaches port 8000. Otherwise the Task 1 workspace still renders after loading, with a visible service-unavailable notice and retry. Local backend instructions remain in [README.md](../README.md); they are optional for previewing the frontend.

From `frontend`, build and preview static output:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

Open `http://127.0.0.1:4173`. `npm run build` is `tsc -b && vite build`, with `dist` output inside frontend. Commands and build configuration use relative project paths; no machine-specific path or local backend is needed to compile/deploy. `preview.proxy` is explicitly empty so local static preview does not inherit the development API proxy. Vite preview is a local inspection server, not the Vercel serving layer.

## Environment behavior

| Variable | Local behavior | Task 1 Vercel setting |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Optional. Blank/unset resolves to `/api/v1`. `frontend/.env.example` documents it. | Leave unset for the backend-free preview; adding it as blank has the same effect. |
| `API_PROXY_TARGET` | Vite development-only target; default `http://127.0.0.1:8000`. | Do not set. There is no development proxy in the deployed static frontend. |
| `DATABASE_URL`, `POSTGRES_*`, backend settings | Backend/Compose only. | Do not import or configure them for this frontend project. |

For a later authorized hosted-backend task, use its public **HTTPS** API base including `/api/v1`, and configure that API's CORS for the exact frontend origins. An environment change requires rebuilding/redeploying because Vite embeds public values at build time. Do not use `localhost`, `127.0.0.1`, credentials, query tokens or private keys in deployed API configuration.

No separate demo mode or fixture backend exists. With no API, the shell/branding/navigation and page headings load, and failed health requests show “API unavailable.” After initial loading, Overview retains its three unavailable metrics, empty Recent analyses and Workspace status. Analyse allows local drafts with submission disabled and no assessment. Both pages show a service-unavailable notice with the real safe error and retry; the failed queries are not converted into fake data. A reachable Task 1 backend still returns the genuine unconfigured/analysis-unavailable contracts, validated by the unchanged client. Neither state represents detection results or real analytics.

## Import into Vercel

In Vercel, add/import the GitHub repository and select:

| Setting | Required value |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | 24.x |
| Public API environment variable | Leave `VITE_API_BASE_URL` unset for this preview |

The output directory is relative to the selected root: enter `dist`, not `frontend/dist`. No backend install/start command belongs in the frontend project. The project needs only files within `frontend`; retain the FastAPI source in Git without deploying it. These settings follow [Vercel's build/root-directory configuration](https://vercel.com/docs/builds/configure-a-build) and [supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

The minimal `frontend/vercel.json` is:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This is the [documented Vercel Vite SPA rewrite](https://vercel.com/docs/frameworks/frontend/vite). It lets React Router resolve `/analyse` and the app's not-found page on direct requests. Existing built assets are served normally. There is no external/backend rewrite or Vercel Function. With no backend, the catch-all may also serve HTML for `/api/v1/*`; the existing client rejects that response as non-JSON. Pages show a safe retry notice alongside their unavailable scaffold; the health badge remains truthful. No API contract is fabricated. When a real same-origin backend is added later, API routing must take precedence over the SPA fallback.

Trigger the import deployment and inspect the build log. Even if Vercel calls a default-branch deployment “Production,” this application release remains a **Task 1 frontend development preview**.

## Verify the deployed URL after import

Local tests already exercise built files and the checked-in rewrite using a test-only server. That server is not Vercel's runtime; an actual hosted deployment must still be checked:

1. Open `/` and verify the approved theme, sidebar/mobile navigation, three unavailable metric values, empty Recent analyses, Workspace status and service-unavailable notice. The health badge must say “API unavailable” when health fails.
2. Open `/analyse` directly in a new tab, then refresh. The local draft interface and analysis-unavailable notice must render rather than a host 404 or blank screen. Submission stays disabled and no assessment appears.
3. Navigate between Overview and Analyse, and open an unknown frontend path to check the app's not-found view.
4. Check that JavaScript, CSS and favicon requests succeed. Inspect console/page errors; expected failed API requests must not become an uncaught render failure.
5. Check mobile layout, visible focus/retry controls and absence of fabricated numbers/results. Submission must remain unavailable.
6. Confirm no browser API request targets your local machine and no backend credentials appear in environment settings or built assets.

If a direct route gets a host 404, check that Root Directory is `frontend` and the deployed commit includes its `vercel.json`. If the build cannot find `package.json`, inspect Root Directory. If the UI reports API unavailable, that is expected for this preview; do not add mock responses to hide it. If environment changes seem ignored, redeploy. If using a later HTTPS backend, investigate its availability/CORS without enabling any Task 2 behavior incidentally.

**Current boundary:** local readiness and GitHub publication are complete; the user reports the connected Vercel frontend is deployed. An authorized push to existing `main` should trigger automatic redeployment. Check the new build and hosted routes in that existing Vercel project; a successful push alone does not verify deployment completion. No deployment URL was supplied for independent live checks in this task. Backend deployment and PostgreSQL persistence remain paused Task 2 work.
