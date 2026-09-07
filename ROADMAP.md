# SCAMGUARD roadmap

Audited 2026-09-07. Status is evidence, not authorization to continue automatically.

| Order | Milestone | Status | Real state / exit criteria |
| --- | --- | --- | --- |
| 1 | Foundation | ✅ COMPLETE | Responsive Forensic Intelligence UI, four planned modes, honest offline states, tests, Git/Vercel frontend readiness and Windows workflow. |
| 2 | Core Platform | ✅ COMPLETE | PostgreSQL/Alembic, Message/URL intake, detail/history, real analytics and private development controls; merged to main at `425aab0`. |
| 3 | Text Intelligence | ✅ COMPLETE | Three-class local model, provenance, held-out evaluation, rules, optional fail-safe AI, conservative fusion, persistence/API/UI and full regression gates passed and were accepted into main. |
| 4 | Explainability | ✅ COMPLETE for Message and URL | Message/URL results show grounded snippets, actions, components, versions, uncertainty and limitations. Cross-modal explainability remains future work. |
| 5 | URL Intelligence (Task 4) | ✅ COMPLETE | Offline parser, licensed local ML, explainable rules, conservative fusion, optional provider boundary and persisted results; verified on the Task 4 review branch. |
| 6 | Phone Intelligence | ⚪ NOT STARTED | UI complete only; normalization, report/reputation data and evidence are absent. |
| 7 | Screenshot Intelligence | ⚪ NOT STARTED | No upload, OCR or image processing. |
| 8 | QR Intelligence | ⚪ NOT STARTED | UI/local file metadata only; no decode, URL/payment routing or camera. |
| 9 | Unified Risk Engine | ⚪ NOT STARTED | Task 3 fusion is Message-specific. Cross-modal missing/conflicting evidence remains unimplemented. |
| 10 | Threat Analytics | 🟡 IN PROGRESS | Genuine all-time counts and risk-derived flagged count exist; no trends, campaign or threat exploration. |
| 11 | Community Intelligence | ⚪ NOT STARTED | No reports, reputation, moderation or public feedback ingestion. |
| 12 | Adaptive Learning | ⚪ NOT STARTED | No learning loop. Future changes require moderated/versioned data, offline evaluation and explicit promotion/rollback. |
| 13 | Campaign Intelligence | ⚪ NOT STARTED | No clustering, temporal correlation or campaign detection. |
| 14 | Model Lab | ⚪ NOT STARTED | Training script/report exist, but no registry UI, experiment service or active route. |
| 15 | Security & Privacy | 🟡 IN PROGRESS | Baseline controls and optional-AI redaction exist; public access/auth/ownership/consent/retention/encryption/rate limits remain. |
| 16 | Final Evaluation | ⚪ NOT STARTED | Task 3 held-out evaluation is module evidence, not final product evaluation. |

## Review boundary

Task 4 URL Intelligence is complete on `task-4-url-intelligence`. Main still ends at the Task 3 merge. Review [Task 4 evidence](docs/TASK_4_REPORT.md) manually before any separate merge authorization. Task 5 Phone Intelligence has not started and must not begin automatically.
