# Evaluation and interpretation

SCAMGUARD was evaluated across functional behaviour, security boundaries, learned-model performance, usability preparation and operational observations. These dimensions answer different questions. Table 13 summarises the final release gates; Table 14 summarises intelligence and performance evidence. The complete methods, per-class results and controlled cases remain in [EVALUATION.md](EVALUATION.md), [MODEL_EVALUATION.md](MODEL_EVALUATION.md), [URL_MODEL_EVALUATION.md](URL_MODEL_EVALUATION.md) and [CONTROLLED_EVALUATION.md](CONTROLLED_EVALUATION.md).

**Table 13. Final release verification.** Source: [FINAL_RELEASE.md](FINAL_RELEASE.md) and [machine record](evidence/release-verification.json), merged main `4df277bdf93a2e1424ac533d488cd7ba127b35ce`, 12 September 2026.

| Check | Recorded result | Interpretation |
| --- | --- | --- |
| TypeScript / ESLint | Pass / zero warnings | Selected type and lint checks pass. |
| Vitest | 159 passed, 11 files | Unit/component regressions. |
| Playwright | 18 foundation + 8 built preview + 24 PostgreSQL = 50 passed | Mocked transport states and real local persisted workflows; Chromium mobile emulation, not physical phones. |
| Pytest | 310 passed, 1 skipped, 2 dependency warnings | Real isolated local PostgreSQL; optional live OpenAI test deliberately not run. |
| Frontend build / Ruff / pip check | Pass / lint and 71-file format pass / no broken requirements | Build/style/compatibility; not proof of zero dependency vulnerabilities. |
| Alembic current/head/check | Single head 0006_qr_intelligence; no new operations | Local drift check; production head separately observed using SELECT only. |
| Secret scan | 0 findings; 228 current files; 734 historical blobs | Bounded patterns/known local private values; excludes corpora/models/locks/media. |
| Production release | Vercel Ready and Render Live at same complete final SHA | Version agreement at observation time. |
| Public production probes | Health/ready/capabilities HTTP 200 through both hosts | Database connected; four engines ready and advertised. No authenticated production workflow inference. |

The release records predate this academic edit. No software test rerun or new production observation is claimed merely because text was rewritten. Task 9's earlier npm audit, model reproduction and wheel inspection remain separately dated evidence in FINAL_TEST_REPORT.md; they were not all repeated by the merge runner.

**Table 14. Intelligence and narrow performance evidence.** Sources: frozen JSON reports, controlled evaluation and PERFORMANCE_RELIABILITY.md.

| Evaluation | Sample / method | Recorded result | Valid conclusion and limit |
| --- | --- | --- | --- |
| Message classifier | 1,160 held-out messages; grouped split; selected Logistic Regression | Accuracy 96.8966%; macro F1 0.895235; SCAM recall 93/106 = 87.7358% | Dataset-specific three-class behaviour; not final-risk or population fraud accuracy. |
| URL classifier | 36,901 domain-held-out URLs; selected 120-tree forest | Accuracy 98.4824%; macro F1 0.984698; phishing recall 16,495/16,966 = 97.2239% | String-classifier behaviour; serious HTTPS-homepage collection bias. |
| URL rules | 13 authored cases | 13/13 expectations met | Selected structural/rejection behaviour; conventional example.com still produced Caution. |
| Phone | 10 authored metadata/policy cases | 10/10 expectations met | Metadata agreement and conservative output; no subscriber/fraud benchmark. |
| QR | 15 generated image cases | 15/15 expectations met | Clean synthetic decode/classification/routing/rejection; not independent camera accuracy. |
| Payment | 4 consistency/rejection cases plus separate diagnostic | 4/4; minimal missing-merchant-fields payload still passes subset | CRC/TLV subset behaviour; full mandatory-field compliance absent. |
| Warm local latency | 30 sequential calls per operation; excludes network/DB/startup | p95: Message 0.229 ms; URL 0.589 ms; Phone 0.135 ms; QR 1.780 ms | Narrow in-process sample; no production SLA, cold-start or concurrency result. |
| Human usability | Five-task protocol and blank form | NOT YET CONDUCTED | No participants, completion rates, ease scores or comprehension findings can be reported. |

Accuracy alone would hide important Message errors. Of 106 SCAM test examples, 13 were predicted SPAM; a macro average gives each class equal weight rather than allowing the 967 LEGITIMATE examples to dominate. Precision measures the fraction of predicted members of a class that belong to it; recall measures the fraction of actual class members recovered; F1 is their harmonic mean (scikit-learn developers, n.d.). The two matrices in Figure 7 show the actual denominators and errors.

The Message source contains historical English SMS and source/OCR artefacts; minority test classes are small. All legitimate URL training records are HTTPS homepages without queries, so ordinary legitimate deep links can be out of distribution. Domain separation reduces one leakage route but does not establish temporal or campaign separation. Reproducing frozen predictions checks implementation fidelity, not new independent generalisation. Phone and payment lack fraud ground truth by design, so no accuracy percentage is invented for them.

Security tests establish selected controls: session-derived ownership, foreign-record denial, CSRF/origin checks, immutable results and specified QR credential redaction. They do not establish a penetration-test result. Likewise, public readiness and deployment badges do not measure password-reset inbox delivery or user decision quality. These limitations determine the bounded conclusion in [FINAL_CONCLUSION.md](FINAL_CONCLUSION.md).
