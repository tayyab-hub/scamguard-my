# SCAMGUARD roadmap

Status audited on 2026-09-04. Read [PROGRESS.md](PROGRESS.md) for execution evidence and the exact handoff. This is an ordered plan, not authorization to begin the next item. Scaffolded pages, interfaces and configuration do not count as completed domain features.

**✅ COMPLETE** = implemented and verified in the stated scope; **🟡 IN PROGRESS** = partial, with outstanding work named; **⚪ NOT STARTED** = not implemented; **🔴 BLOCKED** = a specific prerequisite is missing. A partially complete milestone need not have an agent actively working on it.

| Order | Milestone | Status | Real current state and remaining exit criteria |
| --- | --- | --- | --- |
| 1 | Foundation | ✅ COMPLETE | Professional responsive four-mode UI, architecture/testing foundation, offline resilience, GitHub and verified main Vercel frontend. General SCAMGUARD branding is implemented on the review branch. |
| 2 | Core Platform | ✅ COMPLETE | Task 2 PostgreSQL/Alembic, Message/URL SUBMITTED records, paginated history/detail and real total/latest/recent data implemented, verified and published on task-2-core-platform for review. Private shared development scope only; no public backend/authentication. |
| 3 | Text Intelligence | ⚪ NOT STARTED | No classifier, dataset, rules engine or inference. Define supported languages/inputs, genuine data provenance, an initial method and reproducible evaluation before enabling text assessment. |
| 4 | Explainability | ⚪ NOT STARTED | No explanations or evidence schema. Explanations must trace real evidence/model behavior and state uncertainty; do not fabricate rationales. |
| 5 | URL Intelligence | ⚪ NOT STARTED | A URL draft field is not URL analysis. Begin with non-fetching inspection; any future retrieval needs an explicitly authorized isolated design and SSRF controls. |
| 6 | Phone Intelligence | ⚪ NOT STARTED | PHONE UI is COMPLETE. Normalization, phone-number intelligence, reporting/reputation and evidence assessment are NOT STARTED; no external lookup or carrier validation exists. |
| 7 | Screenshot Intelligence | ⚪ NOT STARTED | No uploads, image processing or OCR. Requires privacy, file validation, size limits, storage/deletion decisions and extraction-quality evaluation. |
| 8 | QR Intelligence | ⚪ NOT STARTED | QR UI is COMPLETE (local image selection only); QR decoding/intelligence and QR URL/payment routing are NOT STARTED. No QR decoder or payload assessment. Treat decoded content as untrusted and never navigate to it automatically. |
| 9 | Unified Risk Engine | ⚪ NOT STARTED | No aggregation or result engine. Define evidence fusion, separate risk/confidence, conflicts, missing modalities and insufficient information with measured validation. |
| 10 | Threat Analytics | ⚪ NOT STARTED | Task 2 submission counts/history exist, but no threat analytics, risk-derived counts or evidence trends exist. |
| 11 | Community Intelligence | ⚪ NOT STARTED | No reports, feedback, moderation or reputation mechanism. Require access/abuse controls, evidence validation, privacy and moderation before use. |
| 12 | Adaptive Learning | ⚪ NOT STARTED | No training loop. Controlled, versioned, moderated data intake and offline evaluation must precede explicit promotion and rollback; never learn directly from untrusted feedback. |
| 13 | Campaign Intelligence | ⚪ NOT STARTED | No clustering/correlation or campaign detection. Requires sufficient real evidence, temporal/entity definitions, privacy controls and evaluated false-positive behavior. |
| 14 | Model Lab | ⚪ NOT STARTED | No model registry, experiment interface or comparison tools. Require versioned reproducible experiments, genuine metrics and access control. No active navigation until implemented. |
| 15 | Security & Privacy | 🟡 IN PROGRESS | Safe errors, request IDs, exact CORS, bounded input/body, parameterized transactions and storage notice exist. Ownership/access, authentication, consent, retention/deletion, encryption, abuse limits, threat modeling and recovery remain future decisions. |
| 16 | Final Evaluation | ⚪ NOT STARTED | Current software regression tests are not product/model evaluation. Final evaluation must cover real detection performance, calibration, uncertainty, privacy/security, accessibility, usability, reliability and documented limitations on representative data. |

Security and privacy are cross-cutting requirements from the first content-handling feature onward. Their position in this list is a consolidation/audit milestone, not permission to postpone necessary safeguards. Similarly, each intelligence module needs genuine evaluation when introduced; final evaluation does not excuse unevaluated intermediate releases.

## Active Task 2 handoff

Task 2 implementation and local technical audit are complete on `task-2-core-platform` for review. The audit added only validation-privacy, concurrent-list consistency and reduced-motion fixes. No further task is running. Do not merge into main automatically. The main Vercel preview at https://scamguard-my.vercel.app/ was verified on 2026-09-04; branch deployment status is separate. No public backend hosting is authorized. Keep the existing remote/domain.

## Recommended Task 3, after Task 2 review and merge

First Text Intelligence capability: define supported languages, dataset provenance/licensing and labels; establish leakage-resistant held-out evaluation; implement reproducible assessment and evidence with an insufficient-information outcome. Report genuine metrics and separate risk from confidence. Public backend rollout needs a separate security/privacy gate. Do not start automatically.

## Historical Core Platform proposal — superseded by the authorized Task 2 scope

**Task 2A — Core Platform contract and PostgreSQL readiness.** Provision/configure a disposable PostgreSQL test database, verify successful readiness and the existing integration test, then specify the first narrow input/lifecycle/result/error contract, ownership, access, minimization and retention/deletion rules. Explicitly include risk versus confidence and insufficient information. Produce a scoped migration/submission/history implementation plan with acceptance criteria. Do not enable submission or implement a detector in this preparatory task.

Only after Task 2 is explicitly resumed, Task 2B can implement the agreed minimal Core Platform workflow. No model training, OCR, QR, adaptive learning, campaign detection or future navigation should be folded into that workflow by default. **Historical proposal, superseded by the authorized Task 2 implementation above.**
