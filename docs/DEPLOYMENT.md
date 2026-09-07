# Task 1 — GitHub and Vercel frontend preview

> Current-state note (2026-09-05): Task 2 and Task 3 have been verified and accepted into `main`. The established Vercel site remains a frontend-only preview; neither PostgreSQL nor FastAPI is hosted there. Historical Task 1/Task 2 branch instructions below are retained as deployment history.

This workflow publishes the existing **SCAMGUARD Forensic Intelligence frontend development preview**. It does not deploy FastAPI, create a database, enable submissions, or add detection. Task 2 implements PostgreSQL persistence locally; scam detection and live backend hosting remain later work. Task 2 Core Platform & Persistence is active on `task-2-core-platform`; do not merge automatically.

## Local preparation and safety

Git is initialized on `main`. Baseline `a6b996afb630cb5e14211f668074d6410d10c855` (`chore: complete Task 1 application foundation`) is published to [tayyab-hub/scamguard-my](https://github.com/tayyab-hub/scamguard-my). `origin` points to that repository and `main` tracks `origin/main`; the push was verified on 2026-09-03. Vercel is deployed and GitHub-connected at https://scamguard-my.vercel.app/. On 2026-09-04, hosted Overview/Analyse loads and refreshes, four modes and unavailable-backend fallback passed browser checks with no page errors. Task 1 deployment work is complete. Follow [PROGRESS.md](../PROGRESS.md) for evidence and limitations. The connection instructions below are retained for reference; this checkout is already connected and must not have its remote recreated.

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
| `VITE_SUPPORT_EMAIL` | Optional public address for preparing a `mailto:` feedback action. Blank preserves the honest unavailable state. | Set only to an approved public project-support address, or leave unset. Never use a private/personal address. |
| `API_PROXY_TARGET` | Vite development-only target; default `http://127.0.0.1:8000`. | Do not set. There is no development proxy in the deployed static frontend. |
| `DATABASE_URL`, `POSTGRES_*`, backend settings | Backend/Compose only. | Do not import or configure them for this frontend project. |

For a later authorized hosted-backend task, use its public **HTTPS** API base including `/api/v1`, and configure that API's CORS for the exact frontend origins. An environment change requires rebuilding/redeploying because Vite embeds public values at build time. Do not use `localhost`, `127.0.0.1`, credentials, query tokens or private keys in deployed API configuration.

No separate demo mode or fixture backend exists. With no API, the shell/branding/navigation and page headings load, and failed health requests show “API unavailable.” After initial loading, Overview retains its three unavailable metrics, empty Recent analyses and Workspace status. Analyse allows local drafts with submission disabled and no assessment. Both pages show a service-unavailable notice with the real safe error and retry; the failed queries are not converted into fake data. A reachable Task 1 backend still returns the genuine unconfigured/analysis-unavailable contracts, validated by the runtime-validating client. Neither state represents detection results or real analytics.

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

**Current boundary:** Task 1 GitHub/Vercel delivery is complete. Task 2 runs on `task-2-core-platform`, pushed for review without an automatic main merge. A branch preview may appear; do not rename the project/domain or automatically deploy a backend. The tested main preview remains https://scamguard-my.vercel.app/.

## Task 2 review branch and future backend preparation

Publish task-2-core-platform only; main remains the reviewed Task 1 deployment until the user merges. Vercel may automatically create a branch preview. Verify its commit/deployment state separately; successful local tests do not establish hosted branch deployment success. Keep the current frontend-only Root Directory/build/output/rewrite and existing historical domain. No backend or database is deployed in this task.

Task 2 PostgreSQL persistence is implemented and verified locally, while hosted previews remain safely offline. Before connecting any public frontend to a backend, resolve private/shared dataset access, authentication/ownership, consent, retention/deletion, encryption and abuse controls. Do not expose the current unauthenticated backend publicly simply to enable preview submission.

A later suitable Python host must supply DATABASE_URL, APP_ENV, PORT and exact CORS_ORIGINS, apply reviewed Alembic migrations before serving persistence, then explicitly enable PERSISTENCE_ENABLED. `python -m app` reads PORT and binds 0.0.0.0 in production; /health is liveness and /ready checks PostgreSQL/domain table. Use a managed PostgreSQL service with the host's required TLS configuration and private credentials. The existing production configuration rejects missing/default DB passwords and non-HTTPS CORS origins. These checks do not replace full production hardening.

The existing Vercel origin can be allowlisted as `["https://scamguard-my.vercel.app"]` after that security review; additional branch origins must be explicitly reviewed, not wildcarded. GET and POST preflight are supported without credentials. Set the reviewed HTTPS API base including /api/v1 as VITE_API_BASE_URL and rebuild. Never expose DATABASE_URL or backend secrets through browser variables. Do not automatically configure a backend host, change the domain, or merge the branch.

Task 2 publication verification (2026-09-04): GitHub accepted the new task-2-core-platform branch, without changing main. Unauthenticated deployment metadata returned HTTP 404; no branch preview URL or remote CI result is independently confirmed. Inspect the connected GitHub/Vercel accounts before review/merge. This does not imply deployment failure.

## Task 4 URL deployment additions (2026-09-07)

Task 4 is COMPLETE and manually accepted; closure, a no-fast-forward main merge and main push are explicitly authorized on 2026-09-07. Backend deployment, cloud provisioning and paid provider calls remain outside this closure. Existing Vercel frontend settings remain unchanged. A Git push or automatically generated preview is not proof of a successful deployment, a deployed API or remote CI success; verify deployment status separately.

The URL model is bundled as non-executable JSON (`url_ml_v1`) and checksum-verified before use. It defaults to the module's artifact directory, independent of current working directory. Optional URL_MODEL_PATH can point to an operator-managed artifact with the expected checksum; relative overrides resolve against the checkout root. tldextract 5.3.1 includes its offline suffix snapshot; parsing does not need outbound connectivity, a writable home cache or a reputation key. A missing/corrupt model is reported unavailable while local evidence can still be assessed.

No database revision is added: apply existing Alembic head `0002_message_intelligence`. No historical migration is modified. The backend remains configurable through DATABASE_URL. Install locked dependencies normally; training alone needs the `ml` extra. No Docker workflow was added for Task 4. Existing native PostgreSQL was used for verification.

Local Start/Stop is development-only. Final production must run independently of a developer laptop and requires the previously documented access/authentication, privacy and abuse gates before public intake. Never deploy the current unauthenticated shared backend publicly. Reputation secrets, if a future reviewed adapter is implemented, belong only in backend environment settings, never VITE variables.
