# SCAMGUARD — repository working instructions

SCAMGUARD is a general **Multi-Modal Scam Detection & Reporting Web Application**. Its approved
visual identity is **Forensic Intelligence**: warm light ivory, charcoal, terracotta and olive with
restrained editorial motion. The repository has completed Task 1 Foundation, Task 2 Core Platform
and Task 3 Message Intelligence; Task 4 URL Intelligence is complete on its review branch. Never infer functionality from
a planned UI control, roadmap line, screenshot or old conversation.

## Required reading order

Before implementing code, read in order:

1. `CODEX.md`
2. `PROGRESS.md`
3. `ROADMAP.md`
4. `DECISIONS.md`
5. `README.md`
6. `docs/ARCHITECTURE.md`
7. `docs/DESIGN_SYSTEM.md`
8. `docs/API.md`
9. `docs/TESTING.md`

Then inspect the actual source, tests, migrations, Git branch/status and relevant task/module docs.
Current source is authoritative when historical wording conflicts.

## Architecture and product rules

- Keep React, strict TypeScript, React Router, Tailwind, TanStack Query and Zod on the frontend.
  Keep FastAPI, Pydantic, SQLAlchemy 2, Psycopg 3, PostgreSQL and explicit Alembic migrations.
- Preserve `/api/v1/health`, `/ready`, `/dashboard`, `/capabilities` and `/analyses`. Coordinate every
  intentional contract change across backend schemas, frontend validation, tests and `docs/API.md`.
- Liveness, database readiness, submission availability and intelligence capability are different.
  Never combine them into a misleading healthy, safe or supported claim.
- MESSAGE and URL intelligence are implemented. URL uses its separate offline parser/model/rules/fusion, never destination requests. PHONE and QR remain local UI only. No phone, image, QR, payment, authentication, community, campaign or adaptive learning feature may be claimed from scaffolding.
- Keep the frontend useful with approved loading/error/empty/unavailable states. Never replace a
  failed API response with production mock data.
- Use Alembic only; no startup `create_all`, implicit commits, destructive reset, SQLite substitute
  for PostgreSQL evidence, or test reset against a database without the required `_test`/`_e2e`
  suffix.

## Design, quality and accessibility

- Preserve the Forensic Intelligence design tokens, responsive desktop sidebar/mobile navigation,
  spacing, typography and restrained 180–250ms motion with live `prefers-reduced-motion` support.
- Use semantic controls, connected labels, keyboard operation, visible focus, sufficient contrast,
  non-color state text and no essential hover-only information. Verify around 320px through desktop.
- Centralize domain types and validation. Keep modules small and typed. Do not add a dependency when
  existing platform/library code is sufficient. Never weaken, skip or rewrite tests to make a change
  pass; fix source defects and record environmental failures separately.

## Analytics, ML and adaptive-learning integrity

- Production analytics come only from real database queries with defined scope. No fake counts,
  charts, events, risk scores, results or seeded activity. Explicit fixtures stay under test/demo
  boundaries and never enter production fallbacks.
- Preserve distinct `LEGITIMATE`, `SPAM` and `SCAM` model labels. Do not equate spam with scam.
- Model metrics must be genuine reproducible held-out measurements with source/license/checksum,
  deduplication before split, leakage controls, fixed seeds, per-class support and limitations.
- Task 3's JSON artifact is checksum-verified and never unpickled. Any retraining or preprocessing
  change requires a new version, regenerated manifest/artifact/report and reviewed evaluation.
- Risk and confidence are separate. Use `LOW`, `CAUTION`, `ELEVATED`, `HIGH` and
  `INSUFFICIENT_EVIDENCE`; never present an absolute SAFE/SCAM verdict or certainty unsupported by
  evidence.
- Adaptive learning remains unimplemented. Community input may never directly retrain or promote a
  model. Future learning requires moderation, provenance, offline evaluation, explicit promotion,
  rollback and audit history.

## Security and privacy

- Treat all submitted content, dataset rows, filenames and provider output as untrusted. Never
  render executable markup, interpolate SQL, expose secrets, log raw message content or store hidden
  chain-of-thought/provider debug payloads.
- Never automatically browse/open suspicious URLs. A future fetcher needs separate approval and
  network isolation, SSRF, DNS/redirect/scheme/address/resource controls.
- The backend is a private shared development service. Do not host it publicly before authentication,
  ownership/authorization, consent, minimization, retention/deletion including backups, encryption
  guarantees, abuse/rate limits and threat modeling are approved.
- Optional external AI is backend-only, disabled by default, uses best-effort redaction and strict
  grounded structured output. No key in `VITE_*`, source, tests or logs. Provider failure must not
  erase local evidence or prevent a local result.
- Phone/QR stay local and disabled. Never read/upload QR bytes or request camera access in current
  scope. Never reuse private submissions for model training without explicit permission.

## Git safety and task boundaries

- Inspect status/branch/diff before commits. Preserve history, never force-push, rewrite shared
  commits, discard user work, expose ignored secrets, or alter the configured remote casually.
- Keep `node_modules`, `.venv`, `dist`, caches, coverage, logs, `.local`, test output and secrets
  ignored. Dataset source and reviewed model artifacts are intentional versioned research assets.
- Task 2 and Task 3 are merged to `main`. Task 4 is authorized only on `task-4-url-intelligence`. Retain prior branches/history. Push only the Task 4 branch; do not merge it or start Task 5.

## Definition of done and completion procedure

1. Implement only the authorized scope with honest loading/error/empty/insufficient states.
2. Add meaningful unit, API, database and browser regressions for changed behavior.
3. Run exact commands in `docs/TESTING.md`: TypeScript, ESLint, Vitest, build, Playwright/preview,
   backend Ruff and full Pytest with real PostgreSQL; run Alembic current/heads/check and isolated
   downgrade/re-upgrade for schema changes.
4. Inspect screenshots and live browser console for overflow, clipping, contrast, focus, responsive
   navigation and runtime errors. Never claim a command or deployment passed unless observed.
5. Reconcile `PROGRESS`, `ROADMAP`, `DECISIONS`, README and relevant docs. Mark placeholders as not
   started. Record exact versions, test counts, skips, warnings and limitations.
6. Review final diff/status for secrets and generated folders; make logical commits and push only the
   authorized branch. Report commit hashes and remote state.
7. Stop at the requested boundary. Recommend the next task without beginning it.

Status meanings: ✅ COMPLETE only when implemented and verified; 🟡 IN PROGRESS for real partial
work; ⚪ NOT STARTED for placeholders/plans; 🔴 BLOCKED only for a concrete unresolved dependency.
