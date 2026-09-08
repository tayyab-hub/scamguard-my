# SCAMGUARD roadmap

Audited 2026-09-08. Status reflects evidence, not permission to continue automatically.

| Order | Milestone | Status | Real state / exit criteria |
| --- | --- | --- | --- |
| 1 | Foundation | ✅ COMPLETE | Responsive Forensic Intelligence UI, honest offline states, tests and Windows workflow. |
| 2 | Core Platform | ✅ COMPLETE | PostgreSQL/Alembic, intake, detail/history and database-derived analytics. |
| 3 | Message Intelligence | ✅ COMPLETE | Three-class local model, provenance/evaluation, rules/fusion, optional fail-safe AI and explainability. |
| 4 | URL Intelligence | ✅ COMPLETE | Offline parser, licensed local ML, explainable rules/fusion and persisted results; no destination fetch. |
| 5 | Authentication, Ownership, Privacy & Production (Task 5) | 🟡 IN PROGRESS | Local implementation/database verification complete; final regressions, branch push and user-owned cloud deployment/acceptance remain. |
| 6 | Phone Intelligence | ⚪ NOT STARTED | UI complete only; normalization, report/reputation data and evidence are absent. |
| 7 | Screenshot Intelligence | ⚪ NOT STARTED | No upload, OCR or image processing. |
| 8 | QR Intelligence | ⚪ NOT STARTED | UI/local metadata only; no decode, URL/payment routing or camera. |
| 9 | Unified Risk Engine | ⚪ NOT STARTED | Message and URL have separate conservative fusion; cross-modal evidence is unimplemented. |
| 10 | Threat Analytics | 🟡 IN PROGRESS | Genuine private per-user counts exist; no trends, campaign or threat exploration. |
| 11 | Community Intelligence | ⚪ NOT STARTED | No reports, reputation, moderation or public feedback ingestion. |
| 12 | Adaptive Learning | ⚪ NOT STARTED | No learning loop; future changes require moderated/versioned data and explicit promotion/rollback. |
| 13 | Campaign Intelligence | ⚪ NOT STARTED | No clustering, temporal correlation or campaign detection. |
| 14 | Model Lab | ⚪ NOT STARTED | Training scripts/reports exist, but no registry UI, experiment service or active route. |
| 15 | Final Evaluation | ⚪ NOT STARTED | Module evaluations and Task checks are not the final multi-user product evaluation. |

## Current boundary

Task 4 and its presentation closure are merged to `main`. Task 5 stays on
`task-5-auth-production` until review and production setup; do not merge it automatically. The next
implementation milestone is not authorized by this record. Phone/QR, community reporting and adaptive
learning remain explicitly out of scope.
