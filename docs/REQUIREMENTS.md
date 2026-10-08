# Functional and non-functional requirements

These are project-defined acceptance IDs, not identifiers supplied by the marking scheme. Table 6 maps every functional requirement to its reason (objective), implementation and verification. Table 7 states measurable non-functional acceptance and its evidence boundary. No unsupported human outcome is marked complete. Paths are repository-relative.

**Table 6. Functional requirements and traceability.** Source: final-release source and named tests.

| ID | Requirement | Objective | Implementation evidence | Verification evidence | Status / limit |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Analyse Message with separate legitimate/spam/scam evidence. | O1/O2 | backend/app/ml/engine.py | backend/tests/test_message_intelligence.py | Verified locally; model limits apply. |
| FR-02 | Analyse a validated URL string without fetching its destination. | O1/O2 | backend/app/url_intelligence/engine.py | backend/tests/test_url_intelligence.py | Verified locally; no live reputation. |
| FR-03 | Parse international Phone input and report conservative metadata. | O1 | backend/app/phone_intelligence/engine.py | backend/tests/test_phone_intelligence.py | Verified locally; identity not determined. |
| FR-04 | Accept bounded raster QR upload and reject missing/multiple/invalid symbols. | O1 | backend/app/qr_intelligence/decoder.py | backend/tests/test_qr_intelligence.py | Verified locally; clean fixtures are not camera accuracy. |
| FR-05 | Route decoded QR content; report payment TLV/CRC subset and limitations. | O1/O2 | backend/app/qr_intelligence/payment.py | docs/evidence/final_evaluation.json | Verified subset; complete payment compliance out of scope. |
| FR-06 | Start camera only on action; stop on detection/exit; require separate Analyse. | O1 | frontend/src/lib/cameraScanner.ts | frontend/e2e-persistence/camera.spec.ts | Synthetic-stream regression passed; physical-device record pending. |
| FR-07 | Register and log in by username/email; restore and revoke server sessions. | O3 | backend/app/api/auth.py | backend/tests/test_auth.py | Verified locally; owner reports production functioning. |
| FR-08 | Edit only the current profile and reject duplicate normalized username. | O3 | frontend/src/pages/AccountPage.tsx | frontend/e2e-persistence/product-polish.spec.ts | Verified locally. |
| FR-09 | Issue expiring single-use reset links; replace hash and revoke sessions. | O3 | backend/app/services/mail.py | backend/tests/test_auth.py | Local mail behaviour verified; production inbox pending. |
| FR-10 | List/reopen only owned saved results and preserve assessment versions. | O3 | backend/app/services/analyses.py | backend/tests/test_persistence.py | Verified on real local PostgreSQL. |
| FR-11 | Search/filter/sort bounded owned History with deterministic pagination. | O3 | frontend/src/pages/HistoryPage.tsx | backend/tests/test_task8.py | Verified locally; large-history load unmeasured. |
| FR-12 | Compute dashboard totals and distributions from owned records. | O3 | backend/app/api/routes.py | backend/tests/test_final_closure.py | Verified locally; no fabricated fallback. |
| FR-13 | Create a new draft from owned Message/URL/Phone results; require fresh QR. | O3 | frontend/src/components/SubmissionHistory.tsx | frontend/e2e-persistence/product-polish.spec.ts | Verified locally; original immutable. |
| FR-14 | Delete owned records after confirmation; foreign reads/deletes return 404. | O3 | backend/app/services/analyses.py | backend/tests/test_final_closure.py | Four-mode A/B regression passed. |
| FR-15 | Delete an account after password verification and cascade its owned rows. | O3 | backend/app/api/auth.py | backend/tests/test_auth.py | Verified locally; provider backups are separate. |
| FR-16 | Expose separate liveness, readiness and advertised capabilities. | O4 | backend/app/api/routes.py | docs/evidence/release-production-endpoints.json | Observed HTTP 200 at final release. |
| FR-17 | Present evidence, actions and limits without treating confidence as risk. | O2 | frontend/src/components/analysis/ResultPresentation.tsx | frontend/e2e-persistence/result-presentation.spec.ts | Presentation regressions passed; comprehension not yet measured. |
| FR-18 | Persist credential-redacted QR text while discarding uploaded images. | O1/O3 | backend/app/qr_intelligence/engine.py | backend/tests/test_final_closure.py | Regression passed; fix present in live release; old rows not rewritten. |

**Table 7. Non-functional requirements and traceability.** Source: implementation, tests and study protocol.

| ID | Quality | Acceptance requirement | Implementation evidence | Verification/evaluation evidence | Status / limit |
| --- | --- | --- | --- | --- | --- |
| NFR-01 | Security | Reject missing/invalid session, Origin and CSRF on protected operations; use Argon2id and rate limits. | backend/app/core/auth.py | backend/tests/test_auth.py | Verified controls; no independent penetration test. |
| NFR-02 | Privacy | Scope each private operation by authenticated owner; discard QR images/frames; redact specified credentials. | backend/app/services/analyses.py | backend/tests/test_final_closure.py | Verified cases; arbitrary secrets and backups not fully covered. |
| NFR-03 | Performance | Bound QR work (5 MiB upload, 4096 dimension, 16 million pixels, 5000-byte payload defaults), paginate history and defer WASM. | backend/app/core/config.py | docs/PERFORMANCE_RELIABILITY.md | Bounds and 30-call warm samples evidenced; no production SLA/load claim. |
| NFR-04 | Reliability | Return explicit failure/unavailable states; retain local analysis if optional AI fails; transact/rollback database operations. | backend/app/ml/engine.py | backend/tests/test_persistence.py | Local failure paths evidenced; cloud outage/restore untested. |
| NFR-05 | Usability | Provide labelled four-mode entry, evidence/actions, recovery feedback and retrievable history; evaluate five tasks separately. | frontend/src/pages/AnalysePage.tsx | docs/USABILITY_TEST_PLAN.md | UI implemented; user task success/comprehension NOT YET EVIDENCED. |
| NFR-06 | Accessibility | Provide labels, keyboard focus, dialogs, reduced motion and non-colour status; check 320–1440 CSS px. | frontend/src/components/ModalDialog.tsx | frontend/e2e-persistence/final-closure.spec.ts | Selected automated/visual checks passed; assistive-technology/device coverage incomplete. |
| NFR-07 | Maintainability | Preserve typed contracts, modular engines, pinned dependencies and explicit migration revisions. | backend/app/api/analysis_schemas.py | docs/evidence/release-verification.json | Type/lint/test/build/migration gates passed at final release. |
| NFR-08 | Explainability | Expose observations, method versions and uncertainty; distinguish Low from Insufficient Evidence. | backend/app/ml/fusion.py | docs/EVALUATION.md | Result content and method traceability evidenced; human interpretation pending. |
| NFR-09 | Reproducibility | Verify dataset/artifact hashes and reproduce held-out matrices with frozen runtime inference. | backend/scripts/evaluate_final.py | docs/evidence/final_evaluation.json | Matrices reproduced; no new independent test set implied. |
| NFR-10 | Deployment consistency | Serve matching Vercel/Render commit identities with ready database and current Alembic head. | docs/PRODUCTION_ACCEPTANCE.md (provider API rule); render.yaml | docs/FINAL_RELEASE.md | Observed 12 September 2026; continuous monitoring not claimed. |

All 18 FR and 10 NFR have concrete evidence paths. FR-06/09 and NFR-05/06/08 have explicit manual or human-evaluation gaps. Passing implementation checks is not reported as full satisfaction of those wider human outcomes. Legacy R01–R18 mapping is retained in REQUIREMENTS_TRACEABILITY.md.
