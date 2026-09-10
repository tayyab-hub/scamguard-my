# SCAMGUARD roadmap

Updated 2026-09-10. The user confirmed Task 7 acceptance, merge and successful production deployment.

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
| 8 | Peak Enhancement, UX Innovation & Product Polish | 🟡 MANUAL REVIEW | Implemented on feature branch: live camera, searchable history, measured dashboard, session reliability and UX polish. No merge/deploy. |
| 9 | Final Integration, Evaluation & Capstone Closure | ⚪ NOT STARTED | Final merge, deployment verification, evaluation, report, presentation and closure require later instructions. |

## Current boundary

Task 8 began from clean main/origin-main at `42a9db1e1d29ef0c05c248a416f6b90ac341d256`.
Keep `task-8-peak-enhancement` separate until the user manually accepts it. Commit/push is authorized;
merge, deployment and provider/secret configuration changes are not. Task 9 is NOT STARTED.
Local screenshot inspection is Task 8 product QA, not a final report or presentation evidence pack.

Windows development continues to use the existing repository-relative PowerShell launcher, real
PostgreSQL, explicit Alembic migrations and isolated `_test`/`_e2e` databases. See
`docs/TASK_8_PEAK_ENHANCEMENT.md`, `PROGRESS.md` and `docs/TESTING.md` for behavior and evidence.
