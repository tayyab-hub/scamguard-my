# SCAMGUARD — current project state

Updated **2026-09-10, Asia/Kuala_Lumpur** for Task 6.1 implementation verification.

## Current milestone

Tasks 1–5 are complete. The user manually verified the Task 5 production architecture: Vercel serves
the frontend, its same-origin `/api/v1` rewrite reaches Render, and Render uses Neon PostgreSQL.

**Task 6 was manually accepted and merged to `main` at `f24db9fee97b54bad9c27984f7c56d5f2ac6fd5f`.
Task 6.1 is implemented and locally verified on `task-6-1-auth-profile-polish`, awaiting manual
acceptance before merge.** Task 7 QR Intelligence and Task 8 final integration/reporting have not started.

| Area | Status | Current behavior |
| --- | --- | --- |
| Task 1 Foundation | COMPLETE | Responsive Forensic Intelligence UI, keyboard/reduced-motion behavior and Windows workflow. |
| Task 2 Core Platform | COMPLETE | PostgreSQL/Alembic, persistence, history, dashboard and safe API foundation. |
| Task 3 Message Intelligence | COMPLETE | Local three-class model, rules, conservative fusion and explainability. |
| Task 4 URL Intelligence | COMPLETE | Strict offline parsing/model/rules/fusion without destination access. |
| Task 5 Auth + Production | COMPLETE | Argon2id accounts, HttpOnly sessions, CSRF/origin controls, private ownership/deletion and verified Vercel → Render → Neon production. |
| Task 6 Phone Intelligence | COMPLETE | Manually accepted, merged and pushed to main. |
| Task 6.1 Auth/profile polish | IN REVIEW | Profile model/UI, username login, password reset and immutable Analyse again are verified; manual acceptance pending. |
| Task 7 QR Intelligence | NOT STARTED | Local file metadata UI only; no upload, decode, camera or intelligence. |
| Task 8 final integration/reporting | NOT STARTED | No final cross-task evaluation/reporting work begun. |

## Task 6 implementation

- A pinned offline `phonenumbers==9.0.38` parser requires explicit international `+` context,
  accepts normal ASCII formatting, normalizes accepted content to E.164, and returns only supported
  numbering metadata.
- The dedicated `app.phone_intelligence` engine emits structured `NUMBERING_METADATA` evidence and
  contextual safety actions. Ordinary, foreign, mobile, fixed, VoIP, invalid and unknown numbers do
  not receive scam/safe claims. Reliable premium/shared-cost metadata produces `CAUTION` only.
- Phone results deliberately have no numeric risk or fraud-confidence score. The default outcome is
  `INSUFFICIENT_EVIDENCE` because numbering metadata cannot establish caller identity or intent.
- `PHONE` uses the existing authenticated `/api/v1/analyses` path, CSRF/origin checks, database-backed
  rate limit, owner derivation, persistence, history/detail/delete, dashboard and account cascade.
- Alembic `0004_phone_intelligence` extends the input/content constraints without changing existing
  Message/URL data. The destructive rollback test clears only the disposable `*_test` database.
- Capabilities advertises Phone; readiness verifies Phone engine initialization. Health is unchanged.
- The frontend Phone mode validates, submits and renders structured Phone metadata/evidence/actions/
  limitations in the existing design. QR remains disabled and unimplemented.

See [Phone Intelligence](docs/PHONE_INTELLIGENCE.md) for methodology, privacy and limitations.

## Verification evidence

Task 6.1 verification: backend Pytest **236 passed / 1 opt-in live-AI skipped**; Vitest **126 passed**;
Playwright foundation **18 passed**, built preview **6 passed**, and real PostgreSQL desktop/mobile
**10 passed**. TypeScript, ESLint, Ruff lint/format, production build, pip check, production wheel,
Alembic head/current/check, `0005 → 0004 → 0005`, migration preservation and secret review pass.

| Check | Observed result |
| --- | --- |
| Backend Pytest with real PostgreSQL | PASS: 207 passed; 1 explicitly opt-in live-AI test skipped; 2 existing dependency deprecation warnings. |
| Phone engine/API/security | PASS: international types, normalization, conservative risk, hostile input/no-network guards, auth/CSRF, A/B isolation, spoof rejection, cascade deletion and DB rate limit. |
| Alembic | PASS in disposable `scamguard_test`: `0004_phone_intelligence` head/current/check and downgrade-to-base/re-upgrade within the full fixture. |
| Ruff / dependency check | PASS: lint, format check and `pip check`; 58 Python files formatted. |
| TypeScript / ESLint | PASS / PASS with zero ESLint warnings. |
| Vitest | PASS: 97 tests in 7 files. |
| Production frontend build | PASS: 1,759 modules; JS 454.46 kB (135.89 kB gzip), CSS 43.14 kB (8.84 kB gzip). Existing Zod/Rollup annotation warnings only. |
| Foundation/motion/visual Playwright | PASS: 18 desktop/mobile tests. |
| Built offline preview | PASS: 6 desktop/mobile protected-route, public Help, keyboard and reduced-motion tests. |
| Real PostgreSQL Playwright | PASS: 10 desktop/mobile tests, including login → Phone submit → result → history → refresh persistence. |
| Packaging | PASS: wheel contains Phone modules, both existing model artifacts, and pinned `phonenumbers==9.0.38` runtime metadata. |
| Secret scan | PASS: reviewed Task 6 source/diff contains no real API key, database credential, private key or environment secret; only explicit local/CI examples remain. |

## Known limitations

- Numbering metadata does not prove assignment, subscriber identity, caller authenticity, reputation,
  spoofing, intent or fraud. Task 6 has no external lookup or reputation feed.
- Metadata may become stale; upgrading `phonenumbers` requires an intentional dependency update and
  regression review.
- Existing Message/URL dataset and score limitations remain. Scores are modality-specific decision
  support, never fraud probabilities.
- Database rate limiting is basic abuse control, not enterprise bot/DDoS protection.
- Provider backup retention/deletion, formal legal privacy language, incident response and broad
  public operational controls remain owner responsibilities.

## Review boundary

Do not merge or deploy Task 6.1 until the user completes manual testing. Required Resend/Render values
remain owner setup; do not change production services manually. Do not begin Task 7 or Task 8.
