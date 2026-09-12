# SCAMGUARD roadmap

Updated 2026-09-12. Tasks 1–8 are accepted, merged and deployed. Feature freeze is active.

| Order | Milestone | Status | Real state / exit criteria |
| --- | --- | --- | --- |
| 1 | Foundation | ✅ COMPLETE | Responsive Forensic Intelligence UI, honest states, tests and Windows workflow. |
| 2 | Core Platform | ✅ COMPLETE | PostgreSQL/Alembic, intake, detail/history and database-derived analytics. |
| 3 | Message Intelligence | ✅ COMPLETE | Three-class local model, provenance/evaluation, rules/fusion and explainability. |
| 4 | URL Intelligence | ✅ COMPLETE | Offline parser/model/rules/fusion; no destination fetch. |
| 5 | Authentication, Ownership, Privacy & Production | ✅ COMPLETE | User-verified Vercel → Render → Neon architecture with private authenticated analyses. |
| 6 | Phone Intelligence | ✅ COMPLETE | Manually accepted and merged. |
| 6.1 | Authentication/profile polish | ✅ COMPLETE | Manually accepted and merged at `546447fa`; profile, reset and Analyse again shipped. |
| 7 | QR Intelligence | ✅ COMPLETE | Accepted, merged and deployed; readiness/capabilities for all four modes confirmed by the user. |
| 8 | Peak Enhancement, UX Innovation & Product Polish | ✅ COMPLETE | Accepted, merged and deployed on main `4b327ccf21b59e295622e3b321cec62dc523dbde`. |
| 9 | Final Integration, Evaluation & Capstone Closure | 🟡 OWNER REVIEW | Repository fixes, regression, evaluation, documentation and presentation plans prepared on `task-9-final-closure`; no automatic merge. Device/mail evidence, real study and final report/deck remain owner work. |

## Current boundary

Task 9 began from clean main/origin-main at `4b327ccf21b59e295622e3b321cec62dc523dbde`.
Keep `task-9-final-closure` separate until owner review. Commit/push is authorized; automatic merge,
deployment and provider/secret changes are not. No new product features or intelligence tuning.
Historical task records preserve their original dates; `docs/INDEX.md` identifies current documents.

Windows development continues to use the existing repository-relative PowerShell launcher, real
PostgreSQL, explicit Alembic migrations and isolated `_test`/`_e2e` databases. See
`docs/TASK_8_PEAK_ENHANCEMENT.md`, `PROGRESS.md` and `docs/TESTING.md` for behavior and evidence.
