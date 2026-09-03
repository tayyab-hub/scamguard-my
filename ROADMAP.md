# SCAMGUARD MY roadmap

Status audited on 2026-09-03. Read [PROGRESS.md](PROGRESS.md) for execution evidence and the exact handoff. This is an ordered plan, not authorization to begin the next item. Scaffolded pages, interfaces and configuration do not count as completed domain features.

**✅ COMPLETE** = implemented and verified in the stated scope; **🟡 IN PROGRESS** = partial, with outstanding work named; **⚪ NOT STARTED** = not implemented; **🔴 BLOCKED** = a specific prerequisite is missing. A partially complete milestone need not have an agent actively working on it.

| Order | Milestone | Status | Real current state and remaining exit criteria |
| --- | --- | --- | --- |
| 1 | Foundation | ✅ COMPLETE | Task 1 application foundation, professional responsive UI, frontend/backend architecture foundation, testing infrastructure, Git repository preparation and Vercel frontend readiness. The target is a frontend development preview. Actual GitHub upload/Vercel import and live-URL checks remain external next steps; no remote CI result is claimed. |
| 2 | Core Platform | ⚪ NOT STARTED | Task 2 is paused. Actual PostgreSQL persistence, successful real database verification, domain models/migrations, submission/lifecycle, ownership/authentication and stored history remain here. Existing unavailable contracts and draft controls are scaffolding only. |
| 3 | Text Intelligence | ⚪ NOT STARTED | No classifier, dataset, rules engine or inference. Define supported languages/inputs, genuine data provenance, an initial method and reproducible evaluation before enabling text assessment. |
| 4 | Explainability | ⚪ NOT STARTED | No explanations or evidence schema. Explanations must trace real evidence/model behavior and state uncertainty; do not fabricate rationales. |
| 5 | URL Intelligence | ⚪ NOT STARTED | A URL draft field is not URL analysis. Begin with non-fetching inspection; any future retrieval needs an explicitly authorized isolated design and SSRF controls. |
| 6 | Screenshot Intelligence | ⚪ NOT STARTED | No uploads, image processing or OCR. Requires privacy, file validation, size limits, storage/deletion decisions and extraction-quality evaluation. |
| 7 | QR Intelligence | ⚪ NOT STARTED | No QR decoder or payload assessment. Treat decoded content as untrusted and never navigate to it automatically. |
| 8 | Unified Risk Engine | ⚪ NOT STARTED | No aggregation or result engine. Define evidence fusion, separate risk/confidence, conflicts, missing modalities and insufficient information with measured validation. |
| 9 | Threat Analytics | ⚪ NOT STARTED | Overview shows unavailable metrics and empty history only. Real trends/counts require implemented domain records, scoped database queries, provenance and privacy controls. |
| 10 | Community Intelligence | ⚪ NOT STARTED | No reports, feedback, moderation or reputation mechanism. Require access/abuse controls, evidence validation, privacy and moderation before use. |
| 11 | Adaptive Learning | ⚪ NOT STARTED | No training loop. Controlled, versioned, moderated data intake and offline evaluation must precede explicit promotion and rollback; never learn directly from untrusted feedback. |
| 12 | Campaign Intelligence | ⚪ NOT STARTED | No clustering/correlation or campaign detection. Requires sufficient real evidence, temporal/entity definitions, privacy controls and evaluated false-positive behavior. |
| 13 | Model Lab | ⚪ NOT STARTED | No model registry, experiment interface or comparison tools. Require versioned reproducible experiments, genuine metrics and access control. No active navigation until implemented. |
| 14 | Security & Privacy | 🟡 IN PROGRESS | Foundation safeguards exist: safe errors, request IDs, restricted CORS/settings, no-store headers and memory-only drafts. Authentication/authorization, retention/deletion, abuse limits, threat modeling, deployment hardening and recovery verification remain absent. This milestone is not a launch-readiness claim. |
| 15 | Final Evaluation | ⚪ NOT STARTED | Current software regression tests are not product/model evaluation. Final evaluation must cover real detection performance, calibration, uncertainty, privacy/security, accessibility, usability, reliability and documented limitations on representative data. |

Security and privacy are cross-cutting requirements from the first content-handling feature onward. Their position in this list is a consolidation/audit milestone, not permission to postpone necessary safeguards. Similarly, each intelligence module needs genuine evaluation when introduced; final evaluation does not excuse unevaluated intermediate releases.

## Immediate next step — Task 1 preview publication

Connect the local baseline to the supplied GitHub repository URL, push `main`, import the repository into Vercel with Root Directory `frontend`, and verify the deployed `/` and `/analyse` routes, refresh behavior, assets and offline states. Follow [DEPLOYMENT.md](docs/DEPLOYMENT.md). No remote URL or Vercel project is configured by local preparation. Live backend hosting and scam detection are later work. The frontend preview does not require a reachable PostgreSQL database.

## Paused future Core Platform plan

**Task 2A — Core Platform contract and PostgreSQL readiness.** Provision/configure a disposable PostgreSQL test database, verify successful readiness and the existing integration test, then specify the first narrow input/lifecycle/result/error contract, ownership, access, minimization and retention/deletion rules. Explicitly include risk versus confidence and insufficient information. Produce a scoped migration/submission/history implementation plan with acceptance criteria. Do not enable submission or implement a detector in this preparatory task.

Only after Task 2 is explicitly resumed, Task 2B can implement the agreed minimal Core Platform workflow. No model training, OCR, QR, adaptive learning, campaign detection or future navigation should be folded into that workflow by default. **Neither Task 2A nor Task 2B has started; do not continue automatically.**
