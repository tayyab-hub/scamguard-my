# SCAMGUARD roadmap

Audited 2026-09-10. Status reflects implemented evidence and the current Task 6 review boundary.

| Order | Milestone | Status | Real state / exit criteria |
| --- | --- | --- | --- |
| 1 | Foundation | ✅ COMPLETE | Responsive Forensic Intelligence UI, honest states, tests and Windows workflow. |
| 2 | Core Platform | ✅ COMPLETE | PostgreSQL/Alembic, intake, detail/history and database-derived analytics. |
| 3 | Message Intelligence | ✅ COMPLETE | Three-class local model, provenance/evaluation, rules/fusion and explainability. |
| 4 | URL Intelligence | ✅ COMPLETE | Offline parser/model/rules/fusion; no destination fetch. |
| 5 | Authentication, Ownership, Privacy & Production | ✅ COMPLETE | User-verified Vercel → Render → Neon deployment with private authenticated analyses. |
| 6 | Phone Intelligence | 🟡 IN PROGRESS | Code and automated local verification complete on `task-6-phone-intelligence`; manual acceptance, merge and deployment pending. |
| 7 | QR Intelligence | ⚪ NOT STARTED | Local image metadata selection only; no upload, decode, URL/payment routing or camera. |
| 8 | Final integration/reporting | ⚪ NOT STARTED | Final cross-task integration, evaluation and capstone report work has not begun. |

## Current boundary

Do not merge or deploy Task 6 until the user manually tests it. Production Vercel, Render and Neon
configuration was not changed during Task 6. Task 7 QR Intelligence and Task 8 final
integration/reporting remain explicitly out of scope and were not started.
