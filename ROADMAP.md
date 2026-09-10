# SCAMGUARD roadmap

Audited 2026-09-10. Status reflects Task 6 closure and the current Task 6.1 review boundary.

| Order | Milestone | Status | Real state / exit criteria |
| --- | --- | --- | --- |
| 1 | Foundation | ✅ COMPLETE | Responsive Forensic Intelligence UI, honest states, tests and Windows workflow. |
| 2 | Core Platform | ✅ COMPLETE | PostgreSQL/Alembic, intake, detail/history and database-derived analytics. |
| 3 | Message Intelligence | ✅ COMPLETE | Three-class local model, provenance/evaluation, rules/fusion and explainability. |
| 4 | URL Intelligence | ✅ COMPLETE | Offline parser/model/rules/fusion; no destination fetch. |
| 5 | Authentication, Ownership, Privacy & Production | ✅ COMPLETE | User-verified Vercel → Render → Neon deployment with private authenticated analyses. |
| 6 | Phone Intelligence | ✅ COMPLETE | Manually accepted and merged to main. |
| 6.1 | Authentication/profile polish | 🟡 IN REVIEW | Implementation and full local verification complete; manual acceptance and merge pending. |
| 7 | QR Intelligence | ⚪ NOT STARTED | Local image metadata selection only; no upload, decode, URL/payment routing or camera. |
| 8 | Final integration/reporting | ⚪ NOT STARTED | Final cross-task integration, evaluation and capstone report work has not begun. |

## Current boundary

Do not merge or deploy Task 6.1 until the user manually tests it. Production Vercel, Render and Neon
state was not changed during implementation. Task 7 QR Intelligence and Task 8 final
integration/reporting remain explicitly out of scope and were not started.
