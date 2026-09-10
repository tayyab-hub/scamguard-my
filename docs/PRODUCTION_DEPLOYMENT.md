# Task 5 production deployment

Status (2026-09-09): **the user has manually verified the Neon production database and live Render
FastAPI backend.** Alembic completed, `/api/v1/health` returned 200, and `/api/v1/ready` reported the
database plus Message and URL Intelligence ready. The Task 5 Vercel frontend still awaits the main
merge/redeployment; its same-origin API proxy and production authentication/private-history flow have
not yet been verified. Do not interpret a Git push or provider build badge as acceptance evidence.

| Production checkpoint | Status |
| --- | --- |
| Neon PostgreSQL | DEPLOYED / CONNECTED (user-verified) |
| Render FastAPI | DEPLOYED / LIVE (user-verified) |
| Alembic production migration | PASS (user-verified) |
| `/api/v1/health` | PASS — 200 (user-verified) |
| `/api/v1/ready` | PASS — database, Message and URL ready (user-verified) |
| Vercel Task 5 frontend | PENDING main merge / redeployment |
| Vercel same-origin API proxy | Being finalized / verified |
| Production signup, login and private history | NOT YET VERIFIED through Vercel |

## Selected architecture

```text
Browser -> Vercel Vite frontend -> Render FastAPI service -> Neon PostgreSQL
                                      |-> bundled Message JSON model
                                      `-> bundled URL JSON model
```

Neon was selected for managed PostgreSQL because its current free tier is PostgreSQL-compatible,
requires TLS and does not depend on the developer laptop. Render was selected because it runs the full
Python/FastAPI/scikit-learn-compatible package and model artifacts as a conventional web service. The
checked-in `render.yaml` builds the backend, generates the auth pepper, uses `/api/v1/ready` as the
health check, and starts through `scripts/start_production.py`. That script applies additive Alembic
migrations and only then binds Uvicorn to `0.0.0.0:$PORT`.

Render's free web service currently sleeps after inactivity and can cold-start slowly; its filesystem
is ephemeral and free services have limited compute/hours. SCAMGUARD stores operational data only in
Neon, not that filesystem. A Render pre-deploy command is a paid feature, so the free single-instance
configuration migrates on startup. Before scaling to multiple instances, upgrade with explicit owner
approval, move `alembic upgrade head` to Render's pre-deploy command and remove concurrent startup
migration responsibility. Neon free-tier compute can also suspend when idle and has storage/compute/
egress limits. Review current provider terms before final submission; no paid plan is authorized here.

Both ML artifacts are package data and checksum-validated at startup. No artifact is downloaded from a
runtime URL. `/api/v1/ready` verifies PostgreSQL/domain tables plus Message and URL intelligence. The
optional external AI service is excluded from readiness because it is disabled by default and local
analysis is sufficient.

## Exact owner setup

1. Completed: Task 5 branch reviewed and authorized for closure merge.
2. Completed by the user: separate Neon production PostgreSQL created and connected over TLS.
3. Completed by the user: Render FastAPI deployed with environment-only database/auth settings.
4. Completed by the user: Alembic, health and database/Message/URL readiness verified.
5. Pending: in the existing Vercel frontend project (Root Directory `frontend`), finalize the
   same-origin API proxy/public API routing and deploy the Task 5 main commit. If direct API build
   configuration is retained, set
   `VITE_API_BASE_URL=https://<render-host>/api/v1`; optionally set `VITE_SUPPORT_EMAIL`. Redeploy,
   because Vite embeds `VITE_*` values at build time. Do not set `DATABASE_URL`, auth secrets or AI keys
   in Vercel.
6. Pending: run the external acceptance sequence below in a normal target browser. If the browser blocks the
   cross-site session cookie, stop rather than weaken cookie/CORS/CSRF controls; use reviewed same-site
   custom domains or a same-origin proxy design.

## Production environment variables

Names only—values are secrets or environment-specific.

Render required: `APP_ENV`, `PERSISTENCE_ENABLED`, `DATABASE_URL`, `CORS_ORIGINS`,
`AUTH_TOKEN_PEPPER`, `COOKIE_SECURE`, `COOKIE_SAMESITE`, `FRONTEND_BASE_URL`, `MAIL_PROVIDER`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PORT` (`PORT` is supplied by Render).

Render optional/defaulted: `SESSION_COOKIE_NAME`, `SESSION_TTL_HOURS`, `LOGIN_RATE_LIMIT`,
`SIGNUP_RATE_LIMIT`, `ANALYSIS_RATE_LIMIT`, `PASSWORD_RESET_REQUEST_RATE_LIMIT`,
`PASSWORD_RESET_CONFIRM_RATE_LIMIT`, `PASSWORD_RESET_TTL_MINUTES`, `LOG_LEVEL`, `DB_CONNECT_TIMEOUT_SECONDS`,
`MAX_REQUEST_BYTES`, `MESSAGE_MODEL_PATH`, `URL_MODEL_PATH`, `AI_REVIEW_ENABLED`, `OPENAI_API_KEY`,
`OPENAI_MODEL`, `AI_TIMEOUT_SECONDS`.

Resend was selected because its small HTTPS send API fits the existing Render service without an
SMTP daemon and supports domain-scoped sending keys. Create an account in the Resend dashboard,
verify a sending domain with its SPF/DKIM records, create a sending-only API key, and add the key and
verified sender to Render. Do not place either value in Vercel. The frontend continues to use the
checked-in relative `/api/v1` rewrite, so Task 6.1 requires no Vercel environment variable.

Vercel public build configuration: `VITE_API_BASE_URL`; optional `VITE_SUPPORT_EMAIL`. Never place a
secret in `VITE_*`. Local Vite alone may use `API_PROXY_TARGET`; it is not a production variable.

Production validation rejects persistence-off, missing/non-TLS database URLs, default/missing database
passwords, weak/default peppers, non-HTTPS or wildcard CORS origins, and cookies that are not
`Secure; SameSite=None`. Local `.env` uses the independent portable PostgreSQL database and remains
ignored.

## Required external acceptance

With the laptop's local servers stopped: open the deployed frontend, create Account A, refresh, run a
Message analysis and a URL analysis, inspect real results, refresh private history, delete one analysis,
log out, verify protected-route redirection, log back in, and verify persistence. Create Account B and
confirm A's records/totals cannot be listed, fetched or deleted and B's dashboard is independent. Delete
the test accounts, then recheck `/health`, `/ready`, browser console, network destinations, mobile layout
and keyboard flow. Confirm no request targets localhost.

The Render/Neon backend is verified independent of the laptop. Until the Vercel sequence passes,
deployed signup/login, Message/URL analysis through the frontend, persistence and multi-user isolation
are **not verified end to end**.

Official references: [Render web services](https://render.com/docs/web-services), [Render free
limits](https://render.com/docs/free), [Render deploys and pre-deploy commands](https://render.com/docs/deploys),
[Render Blueprint specification](https://render.com/docs/blueprint-spec), [Vercel environment
variables](https://vercel.com/kb/guide/how-to-add-vercel-environment-variables), and [Vercel
rewrites](https://vercel.com/docs/routing/rewrites).
