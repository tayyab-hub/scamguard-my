# SCAMGUARD — current project state

Updated **2026-09-05, Asia/Kuala_Lumpur** for the final Task 3 merge into `main`.

## Current milestone

**✅ COMPLETE — Task 3 Message Intelligence.** Task 2 was
fully re-verified, merged to `main` with merge commit `425aab0`, and pushed. Task 3's retained
feature branch passed final closure and is merged into `main`.

## Real functionality

| Area | Status | Current behavior |
| --- | --- | --- |
| Task 1 Foundation | ✅ COMPLETE | Responsive Forensic Intelligence UI, four Analyse modes, offline states, tests, Git/Vercel frontend readiness and Windows launchers. |
| Task 2 Core Platform | ✅ COMPLETE | PostgreSQL/Alembic, Message/URL validation and persistence, history/detail, real dashboard counts, Help/404, private development boundary. Merged to main. |
| Task 3 dataset and model | ✅ COMPLETE | Reviewed CC BY 4.0 three-class source, immutable checksums, leakage-controlled splits, three candidate comparisons and genuine untouched-test evaluation. |
| Local Message classification | ✅ COMPLETE | JSON TF-IDF Logistic Regression artifact predicts distinct LEGITIMATE/SPAM/SCAM probabilities; checksum and dimensions verified without pickle loading. |
| Deterministic Message evidence | ✅ COMPLETE | Twelve maintainable indicator categories, exact snippets, local context suppression and bounded combination logic. |
| Message fusion/explainability | ✅ COMPLETE | Separate risk and confidence, insufficient-evidence outcome, summaries, evidence, actions, component versions/status and limitations. |
| Optional external AI review | ✅ COMPLETE | Backend-only provider abstraction and OpenAI Responses API structured adapter; disabled by default, redacted, grounded, zero retry, fail-safe. No paid call was made. |
| Message persistence/API/UI | ✅ COMPLETE | POST MESSAGE persists intake, runs synchronously, stores and returns completed result; history/detail and dashboard use real stored outcomes. |
| Final Task 3 verification/publication | ✅ COMPLETE | Full source, build, real-PostgreSQL, migration, browser, responsive screenshot and manual scenario gates passed. Logical feature commits are `73d9de2` and `417bc5d`; the branch was published and accepted for the final no-fast-forward merge. |
| URL intelligence | ⚪ NOT STARTED | URL still validates and persists as inert SUBMITTED text. It is never fetched or assessed. |
| Phone intelligence | ⚪ NOT STARTED | Phone UI only; no normalization, reputation or analysis. |
| QR/Screenshot intelligence | ⚪ NOT STARTED | QR local metadata UI only; no byte read/upload/decoding/OCR/camera/payment routing. |
| Auth/community/adaptive/campaign/Model Lab | ⚪ NOT STARTED | No implementation. |
| Security & Privacy | 🟡 IN PROGRESS | Safe errors/limits/CORS/ORM/redaction exist. Authentication/ownership, consent, retention/deletion, encryption guarantees, rate limits and public hosting remain unresolved. |

## Functional API state

- `/api/v1/health` remains liveness; `/ready` checks PostgreSQL and the migrated analyses table.
- `/capabilities` separates submission from analysis. With private persistence ready, MESSAGE and
  URL can be submitted, but only MESSAGE is in `supported_inputs` for intelligence.
- `POST /analyses` with MESSAGE returns a persisted `COMPLETED` assessment or a persisted safe
  `FAILED` state. URL returns `SUBMITTED` with no assessment.
- List/detail expose status and optional real risk. Dashboard flagged count is the database count of
  completed `ELEVATED` or `HIGH` messages. Unconfigured data remains null, never synthetic zero.

## Latest actually verified checks

| Check | Actual result |
| --- | --- |
| Required Task 2 pre-merge gates | Frontend typecheck/lint/50 Vitest/build/18 Playwright/6 preview/2 persistence and backend Ruff/55 Pytest/Alembic all passed. |
| Task 3 reproducible training | PASS; regenerated exact artifact SHA-256 `818d99f7…3dd3`. Logistic Regression validation macro F1 0.8861; untouched-test macro F1 0.8952 / weighted F1 0.9690. |
| Backend Ruff | PASS; 36 files formatted and lint-clean. `pip check` found no broken requirements. |
| Backend full Pytest with real PostgreSQL | PASS; 78 passed, 1 deliberately skipped live-AI test, 2 dependency deprecation warnings. Includes Alembic upgrade/check/downgrade/re-upgrade and fresh-app retrieval. |
| Alembic development schema | PASS; `current` and `heads` both `0002_message_intelligence`; `check` found no new operations. |
| Frontend TypeScript / ESLint | PASS / PASS, zero lint warnings. |
| Frontend Vitest | PASS; 51 tests in 3 files. Host access was required because sandboxed esbuild could not read parent filesystem metadata. |
| Frontend production build | PASS; Vite 7.3.6, 1,750 modules; JS 419.55 kB (126.60 kB gzip), CSS 34.55 kB (7.12 kB gzip). Third-party Zod annotation warnings only. |
| Playwright | PASS; 18 foundation/motion/visual, 6 built offline-preview, and 2 real PostgreSQL desktop/mobile tests. Chrome color-environment warnings only. |
| Manual scenarios | PASS; suspicious→HIGH, safety guidance→LOW with suppressed indicators, ambiguous grounded review→CAUTION, prompt injection remained data, provider timeout→local CAUTION with AI ERROR, and result survived a fresh app instance. |

No paid external call was made. Existing Starlette httpx/AnyIO dependency deprecation warnings
remain visible. No test was removed or relaxed to hide a product failure.

## Known limitations and handoff

The model is mainly English, historical SMS data with minority-class and collection/OCR bias. Its
probabilities are not universally calibrated. Rules cannot understand every context. AI redaction is
best-effort and optional; no real provider call was made. Results do not verify sender identity,
phone, URL, payment destination or external facts. Synchronous processing is suitable for current
development scale only.

The backend remains a private shared development service with raw submitted Message/URL content and
no user ownership. Do not host it publicly. The main Vercel URL remains a frontend-only preview;
merging Task 3 changes its UI bundle but does not deploy or enable the private backend.

## Exact next step

Task 3 is closed. The recommended next implementation task is **Task 4 URL Intelligence:
non-fetching URL parsing
and lexical evidence first, with no
automatic browsing and a separate security design for any future retrieval.** Do not start it
automatically.

Historical detailed Task 1 and Task 2 audits remain in `docs/TASK_1.md`, `docs/TASK_2.md` and
`docs/TASK_2_AUDIT.md`; Git history retains prior handoff versions of this file.
