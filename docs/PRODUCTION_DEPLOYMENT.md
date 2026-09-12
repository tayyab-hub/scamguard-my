# Production deployment runbook

Current status (2026-09-12): Tasks 1–8 are accepted, merged and deployed at main
`4b327ccf21b59e295622e3b321cec62dc523dbde`. Vercel Ready, Render Live/main/On Commit and Neon
`0006_qr_intelligence` were observed during same-day Task 8 closure; fresh Task 9 public endpoints pass.
See [PRODUCTION_ACCEPTANCE.md](PRODUCTION_ACCEPTANCE.md) for evidence classes and remaining owner checks.
Task 9 remains a separate review branch; its QR privacy fix is not in production yet.
The sections below retain the original setup guidance. A build badge is not full workflow acceptance.

| Production checkpoint | Status |
| --- | --- |
| Neon PostgreSQL | DEPLOYED / CONNECTED (user-verified) |
| Render FastAPI | DEPLOYED / LIVE (user-verified) |
| Alembic production migration | PASS (user-verified) |
| `/api/v1/health` | PASS — 200 (user-verified) |
| `/api/v1/ready` | PASS for the deployed release (user-verified) |
| Vercel Tasks 1–8 frontend | READY at current main (provider UI observed) |
| Vercel same-origin API proxy | PASS (user-verified) |
| Production signup, login and private history | PASS (user-verified) |
| Task 7 QR / Task 8 camera release | MERGED / DEPLOYED; device-specific acceptance unrecorded |

## Selected architecture

```text
Browser -> Vercel Vite frontend -> Render FastAPI service -> Neon PostgreSQL
                                      |-> bundled Message JSON model
                                      |-> bundled URL JSON model
                                      |-> bundled Phone metadata
                                      `-> bundled QR decoder wheel
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
runtime URL. `/api/v1/ready` also verifies the local QR decoder alongside
PostgreSQL and all required intelligence engines. The
optional external AI service is excluded from readiness because it is disabled by default and local
analysis is sufficient.

## Exact owner setup

1. Completed: Task 5 branch reviewed and authorized for closure merge.
2. Completed by the user: separate Neon production PostgreSQL created and connected over TLS.
3. Completed by the user: Render FastAPI deployed with environment-only database/auth settings.
4. Completed by the user: Alembic, health and database/Message/URL readiness verified.
5. Completed by the user: the existing Vercel project deployed the frontend and its checked-in
   same-origin rewrite. Normal API calls remain relative; do not replace this working architecture
   with a direct browser-to-Render base URL.
6. Completed by the user: the external signup/login/private-history acceptance sequence passed.

## Production environment variables

Names only—values are secrets or environment-specific.

Render required: `APP_ENV`, `PERSISTENCE_ENABLED`, `DATABASE_URL`, `CORS_ORIGINS`,
`AUTH_TOKEN_PEPPER`, `COOKIE_SECURE`, `COOKIE_SAMESITE`, `FRONTEND_BASE_URL`, `MAIL_PROVIDER`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PORT` (`PORT` is supplied by Render).

Render optional/defaulted: `SESSION_COOKIE_NAME`, `SESSION_TTL_HOURS`, `LOGIN_RATE_LIMIT`,
`SIGNUP_RATE_LIMIT`, `ANALYSIS_RATE_LIMIT`, `PASSWORD_RESET_REQUEST_RATE_LIMIT`,
`PASSWORD_RESET_CONFIRM_RATE_LIMIT`, `PASSWORD_RESET_TTL_MINUTES`, `LOG_LEVEL`, `DB_CONNECT_TIMEOUT_SECONDS`,
`MAX_REQUEST_BYTES`, `QR_MAX_UPLOAD_BYTES`, `QR_MAX_DIMENSION`, `QR_MAX_PIXELS`,
`QR_MAX_PAYLOAD_BYTES`, `MESSAGE_MODEL_PATH`, `URL_MODEL_PATH`, `AI_REVIEW_ENABLED`, `OPENAI_API_KEY`,
`OPENAI_MODEL`, `AI_TIMEOUT_SECONDS`.

Resend was selected because its small HTTPS send API fits the existing Render service without an
SMTP daemon and supports domain-scoped sending keys. Create an account in the Resend dashboard,
verify a sending domain with its SPF/DKIM records, create a sending-only API key, and add the key and
verified sender to Render. Do not place either value in Vercel. The frontend continues to use the
provider-configured relative `/api/v1` rewrite, so Task 6.1 requires no Vercel environment variable.
The checked-in vercel.json contains the SPA catch-all; preserve the existing project API rewrite
ahead of that fallback. Recreating the project requires recreating this provider configuration.

Vercel public build configuration: optional `VITE_SUPPORT_EMAIL`. The checked-in production API
architecture uses the relative rewrite and requires no API URL variable. Never place a
secret in `VITE_*`. Local Vite alone may use `API_PROXY_TARGET`; it is not a production variable.

Task 7 adds no required environment variable and no OS package. Its four optional QR limits have safe
checked-in defaults. After an approved merge, Render must
rebuild to install the locked Pillow, python-multipart and zxing-cpp wheels, then its existing start
path applies Alembic `0006_qr_intelligence`. Vercel must rebuild the frontend. Neon needs only that
additive migration; no manual data edit or new service is required.

Production validation rejects persistence-off, missing/non-TLS database URLs, default/missing database
passwords, weak/default peppers, non-HTTPS or wildcard CORS origins, and cookies that are not
`Secure; SameSite=None`. Local `.env` uses the independent portable PostgreSQL database and remains
ignored.

## Historical full external-acceptance protocol

The current Task 9 agent review creates no production accounts or messages. Use
PRODUCTION_ACCEPTANCE.md for owner actions and actual observations. The original two-account protocol
below is retained as a future owner-controlled test; local `_test`/`_e2e` suites already exercise it.

With the laptop's local servers stopped: open the deployed frontend, create Account A, refresh, run a
Message analysis and a URL analysis, inspect real results, refresh private history, delete one analysis,
log out, verify protected-route redirection, log back in, and verify persistence. Create Account B and
confirm A's records/totals cannot be listed, fetched or deleted and B's dashboard is independent. Delete
the test accounts, then recheck `/health`, `/ready`, browser console, network destinations, mobile layout
and keyboard flow. Confirm no request targets localhost.

The deployed backend is independent of the laptop. The owner previously accepted production flows
and now reports "its working"; exact device/test artifacts remain unspecified. Automated A/B proof
is local isolated PostgreSQL evidence, not a claim that this review repeated destructive production tests.

Official references: [Render web services](https://render.com/docs/web-services), [Render free
limits](https://render.com/docs/free), [Render deploys and pre-deploy commands](https://render.com/docs/deploys),
[Render Blueprint specification](https://render.com/docs/blueprint-spec), [Vercel environment
variables](https://vercel.com/kb/guide/how-to-add-vercel-environment-variables), and [Vercel
rewrites](https://vercel.com/docs/routing/rewrites).
