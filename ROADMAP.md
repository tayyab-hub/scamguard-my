# SCAMGUARD roadmap

Updated 2026-10-08. Tasks 1–9 remain the recorded September release. The user subsequently
authorized a local engineering review; its security, evidence and UX improvements are implemented
and verified. Their authorized release is tracked in
[release integration](docs/SCAMGUARD_RELEASE_INTEGRATION.md). Phase 2 was planned only.
No new product stage or infrastructure is introduced. See
[engineering review](docs/ENGINEERING_REVIEW_2026-10-08.md) for the historical verification.

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
| 9 | Final Integration, Evaluation & Capstone Closure | ✅ COMPLETE | Accepted and merged at `4df277bdf93a2e1424ac533d488cd7ba127b35ce`; Vercel Ready and Render Live. Academic evidence and remaining owner actions are indexed in docs/FINAL_ACADEMIC_PACKAGE.md. |

## Current boundary

The September production release is recorded in `docs/FINAL_RELEASE.md`. The October review was
explicitly authorized to improve application code; the earlier academic-only restriction applied
to that earlier pass. Current changes require a reviewed release with frontend before backend.
No push, deployment or publication was performed. Historical records retain their original dates.

Windows development continues to use the existing repository-relative PowerShell launcher, real
PostgreSQL, explicit Alembic migrations and isolated `_test`/`_e2e` databases. See
`docs/TASK_8_PEAK_ENHANCEMENT.md`, `PROGRESS.md` and `docs/TESTING.md` for behavior and evidence.
