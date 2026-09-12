# Task 9 final internal audit
Date: 2026-09-12. Baseline: `4b327ccf21b59e295622e3b321cec62dc523dbde`.
Scope: application source, API contracts, auth/session/mail, ORM/migrations, camera worker,
model artifacts/provenance, tests, current docs, tracked-file hygiene and practical Git history scan.
This is an internal engineering/security review, not an independent penetration test.

## Feature freeze
Task 9 permits demonstrated bug, security, integration, accessibility and reliability corrections,
tests, evaluation tooling and submission documentation. No new engines, integrations, infrastructure,
schema revisions, redesigned screens or model tuning. Work remains on `task-9-final-closure`;
commit/push is authorized, merge/deployment to main requires the owner's later review.

## Findings and dispositions
| ID | Severity | Evidence / impact | Disposition |
| --- | --- | --- | --- |
| H1 | HIGH | `persisted_payload` retained Wi-Fi passwords when P was the first field and userinfo in embedded payment URLs. Private history should not store those credentials. Synthetic reproduction confirmed both paths. | Fixed first-field Wi-Fi redaction and all embedded HTTP(S) userinfo in recognized payment text. Ten new tests include upload/camera, response, PostgreSQL, detail, search and all-mode A/B isolation. Original-byte payment assessment is unchanged. |
| H2 | HIGH (academic reproducibility) | Global LF conversion changed the raw Message CSV checksum from the documented publisher checksum, blocking training-source verification. The archive retained the exact correct original. | Restored publisher CRLF bytes from the hash-verified archive; explicit `-text` attribute preserves them. Normalized text/labels are identical. No model retraining/change. Frozen runtime metrics reproduced. |
| M1 | MEDIUM | README/progress/roadmap/CODEX still described Task 8 as unmerged and Task 9 as not started. Some historical decisions read as current constraints. | Current documents reconciled; historical records retained and clearly superseded. |
| M2 | MEDIUM | Required 320px coverage was absent from two broad Task 8 camera/product loops; all-width auth and persisted-result coverage was incomplete. | Extended existing loops and added four desktop/mobile closure scenarios across all eight widths. |
| M3 | MEDIUM (scope limitation) | A minimal format-indicator + valid CRC payment payload is accepted as structurally consistent without complete mandatory merchant fields. | Retained generic-subset methodology; explicitly documented observed limitation. No EMV compliance or recipient-validity claim. |
| M4 | MEDIUM (evidence gap) | No recorded volunteer study or device-specific hardware evidence; generic owner acceptance is not a study. | Protocol, blank results template and device acceptance matrix prepared. NOT YET CONDUCTED / NOT PERFORMED remain explicit. |
| M5 | MEDIUM (operations) | Inbox delivery, backup restoration, load/availability and long-term abuse/retention are not independently demonstrated. | Owner acceptance/runbook and limitations document exact remaining checks. |
| M6 | MEDIUM (test reliability) | The first full run found that the disposable migration fixture could downgrade while another test module's QR rows remained, correctly failing its pre-QR constraint. | Added explicit truncation in the already guarded `_test` fixture before its downgrade. Production migrations are unchanged; the complete rerun passed 310 tests with one opt-in skip. |
| L1 | LOW | Existing third-party deprecation and build annotation warnings. | Recorded; no late dependency churn or warning suppression. |
| L2 | LOW | Synchronous analysis, offset substring search, large deferred QR WASM, long result pages, basic rate buckets and no idempotency keys. | Measured/reviewed; no speculative optimization. |
| L3 | LOW | Launcher test footer said 14 although 16 Check assertions executed. | Corrected the summary count and reran the existing static harness; no launcher behavior change. |

No release-blocking integration failure was found after fixes. H1 remains on the review branch:
the production main baseline does not receive this correction until the owner approves a merge.
Existing previously saved data was not rewritten or inspected for credentials. Any affected production
record remediation requires a separate owner decision; do not print or search for real passwords.

## Search classification
TODO/FIXME/debug/console/placeholder/mock/temporary searches found test mocks in test directories,
research-script metric output, user-facing input placeholders and historical task wording.
These are not production fallbacks. No active production mock-data substitution, console logging
of submissions, obsolete runtime route or new feature stub was established.
Development mail capture and disabled-persistence modes are intentionally environment-gated;
production settings require persistence, HTTPS origins, secure cookies, strong pepper, DB TLS
and Resend settings. API documentation is disabled in production intentionally.

## Repository hygiene
Keep both original research ZIPs: they are intentional licensed provenance, not disposable archives.
Model JSON, split manifests, lockfiles and labelled historical screenshots are intentional.
Do not commit .env, local PostgreSQL, caches, wheel/build output or ordinary test traces.
Final scanner coverage/results are in FINAL_TEST_REPORT.md. Historical evidence is not relabelled
as Task 9 production evidence. No source or claim implies community reporting, adaptive learning,
general OCR, a unified cross-modal probability or real-time reputation is implemented.
