# SCAMGUARD — current project state

Updated **2026-09-09, Asia/Kuala_Lumpur** for Task 5 production closure.

## Current milestone

**Task 4 URL Intelligence and its accepted UI refinement are COMPLETE and merged to `main`** at
`386e4b7` and `080e800`. **Task 5 Authentication, User Ownership, Privacy Controls and Production
Deployment is IN PROGRESS** on `task-5-auth-production` and must not be merged automatically.

The Task 5 application implementation is locally complete enough for final regression: real accounts,
Argon2id hashes, opaque PostgreSQL sessions, synchronizer CSRF, database rate limits, per-user
analyses/dashboard, analysis deletion, account cascade deletion, auth UI, production validation,
bundled models and a Render Blueprint are present. All local static, unit, real-PostgreSQL, browser,
packaging, migration and launcher checks listed below pass. The implementation branch is published.

The user reports the production Neon PostgreSQL database and Render FastAPI backend are now deployed
and connected. Alembic completed; `/api/v1/health` returned 200; `/api/v1/ready` returned ready with
database, Message Intelligence and URL Intelligence ready. The Task 5 Vercel frontend remains pending
the authorized main merge/redeployment, and the same-origin API proxy is still being finalized and
verified. Deployed signup/login, private history and multi-user isolation through Vercel therefore
remain unverified. See [Production deployment](docs/PRODUCTION_DEPLOYMENT.md).

## Task 5 implementation

| Area | Status | Current behavior |
| --- | --- | --- |
| Task 1 Foundation | COMPLETE | Forensic Intelligence UI, responsive/keyboard/reduced-motion behavior and Windows launchers. |
| Task 2 Core Platform | COMPLETE | PostgreSQL/Alembic intake, history, dashboard and safe API foundation. |
| Task 3 Message Intelligence | COMPLETE | Local three-class model, rules, conservative fusion, explainability and optional disabled AI. |
| Task 4 URL Intelligence | COMPLETE | Strict offline parsing, local model/rules/fusion and persisted explainable results without fetching. |
| Task 5 accounts/sessions | IN PROGRESS | Implemented and fully locally tested; production browser acceptance pending. |
| Ownership/private history | IN PROGRESS | Backend-enforced per-user list/detail/delete/dashboard and A/B tests implemented; production A/B check pending. |
| Privacy controls | IN PROGRESS | Analysis deletion, password-confirmed account cascade deletion and Help/privacy disclosures implemented. |
| Production infrastructure | IN PROGRESS | Neon deployed/connected and Render live/ready; Vercel Task 5 frontend and same-origin proxy acceptance remain. |
| Phone Intelligence | NOT STARTED | Draft-only unavailable state retained. |
| QR/Screenshot Intelligence | NOT STARTED | Local metadata UI only; no upload, decode, camera or intelligence. |
| Community/adaptive/campaign work | NOT STARTED | No implementation. |

## Current verification evidence

| Check | Observed result |
| --- | --- |
| Backend full Pytest with real PostgreSQL | PASS: 171 passed, 1 deliberately skipped live-AI test; 2 existing dependency deprecation warnings. |
| Authentication/authorization | PASS within full suite: signup, login failures, refresh, logout/revocation, invalid/expired sessions, CSRF/origin, cookie config, A/B isolation, spoof rejection, legacy isolation and cascades. |
| Alembic | PASS on disposable `scamguard_test`: head/current/check `0003_auth_ownership`; isolated downgrade to `0002` and re-upgrade passed. |
| TypeScript / ESLint | PASS / PASS; zero lint warnings. |
| Vitest | PASS: 86 tests in 6 files. |
| Production frontend build | PASS: 1,758 modules; JS 448.79 kB (134.27 kB gzip), CSS 43.14 kB (8.84 kB gzip). Existing Zod/Rollup annotation warnings only. |
| Foundation/motion/visual Playwright | PASS: 18 desktop/mobile tests. |
| Built offline preview | PASS: 6 desktop/mobile tests for protected redirects, public Help/privacy, keyboard and reduced motion. |
| Real PostgreSQL browser suite | PASS: 8 desktop/mobile cases including auth lifecycle, Message/URL results, refresh persistence and deletions. |
| Ruff / pip check | PASS: lint and format for 53 Python files; no broken requirements. |
| Package artifact verification | PASS: built wheel contains Message `message_tfidf_v1.json` and URL `url_model_v1.json`. |
| Windows launcher | PASS: 14 static safety contracts; actual cold start/current migration, health/readiness, duplicate reuse, clean stop and idempotent stop. |
| Health/readiness smoke | PASS: process ok, PostgreSQL connected, Message ready, URL ready. |
| Neon PostgreSQL production | USER-VERIFIED: deployed and connected. No secret was added to Git. |
| Render FastAPI production | USER-VERIFIED: live; Alembic succeeded; health 200 and readiness PASS for database and both intelligence engines. |
| Vercel Task 5 frontend | PENDING: main merge/redeployment and same-origin proxy verification. Production auth/history flows not yet tested. |

Task 4's accepted evidence remains in [Task 4 report](docs/TASK_4_REPORT.md) and the prior Git history.
Task 5 does not change Message/URL risk logic, datasets or evaluation. External contextual AI remains
disabled by default and was not called. URL no-fetch guards remain mandatory.

## Known limitations

- Vercel and Render are cross-site origins. Production uses `Secure; SameSite=None`; restrictive
  third-party-cookie policies must be checked against the real deployment. Do not weaken CSRF/CORS to
  work around a failure.
- Render/Neon free services can suspend or cold-start and have compute/storage/egress limits. The free
  single-instance Render workflow migrates on startup because its pre-deploy command is paid-only.
- Database rate limiting is basic abuse control, not enterprise bot/DDoS protection.
- Provider backup retention/deletion, legal privacy language, incident response and broader public
  operational controls need owner review.
- Message and URL model dataset limitations remain; results are decision support, never guarantees.

## Review boundary

The user has authorized a safe no-fast-forward merge of the verified Task 5 branch into `main` and a
main push. Stop after merge/remote verification. Do not expose a secret or begin Phone, QR, community,
campaign or adaptive-learning work.
