# SCAMGUARD roadmap

Audited 2026-09-10. Status reflects the completed Task 6.1 merge and Task 7 review boundary.

| Order | Milestone | Status | Real state / exit criteria |
| --- | --- | --- | --- |
| 1 | Foundation | ✅ COMPLETE | Responsive Forensic Intelligence UI, honest states, tests and Windows workflow. |
| 2 | Core Platform | ✅ COMPLETE | PostgreSQL/Alembic, intake, detail/history and database-derived analytics. |
| 3 | Message Intelligence | ✅ COMPLETE | Three-class local model, provenance/evaluation, rules/fusion and explainability. |
| 4 | URL Intelligence | ✅ COMPLETE | Offline parser/model/rules/fusion; no destination fetch. |
| 5 | Authentication, Ownership, Privacy & Production | ✅ COMPLETE | User-verified Vercel → Render → Neon architecture with private authenticated analyses. |
| 6 | Phone Intelligence | ✅ COMPLETE | Manually accepted and merged. |
| 6.1 | Authentication/profile polish | ✅ COMPLETE | Manually accepted and merged at `546447fa`; profile, reset and Analyse again shipped. |
| 7 | QR Intelligence | 🟡 IN REVIEW | Implementation and full local verification complete on feature branch; manual acceptance and merge pending. |
| 8 | Final integration/reporting | ⚪ NOT STARTED | Final cross-task integration, evaluation and capstone report work has not begun. |

## Current boundary

Task 7 adds a bounded authenticated QR image upload, local in-memory decoding, conservative payload
classification/routing, private persistence and accessible frontend without changing production
configuration or the Vercel CDN rewrite. It must remain on `task-7-qr-intelligence` until the user
manually accepts it. Do not merge, deploy or begin Task 8 automatically.

Windows development continues to use the existing repository-relative PowerShell launcher, real
PostgreSQL, explicit Alembic migrations and isolated `_test`/`_e2e` databases. See
`docs/QR_INTELLIGENCE.md`, `PROGRESS.md` and `docs/TESTING.md` for the exact behavior and evidence.
