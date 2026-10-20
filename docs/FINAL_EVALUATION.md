# Evaluation and interpretation

SCAMGUARD was evaluated across functional behaviour, security boundaries, learned-model performance, usability preparation and operational observations. These dimensions answer different questions. Table 13 summarises the final release gates; Table 14 summarises intelligence and performance evidence. The complete methods, per-class results and controlled cases remain in [EVALUATION.md](EVALUATION.md), [MODEL_EVALUATION.md](MODEL_EVALUATION.md), [URL_MODEL_EVALUATION.md](URL_MODEL_EVALUATION.md) and [CONTROLLED_EVALUATION.md](CONTROLLED_EVALUATION.md).

**Table 13. October completion verification.** Source: completion-verification.json and the completion audit. These are fresh execution records; the September totals remain in the historical release documents.

| Check | Recorded result | Interpretation |
| --- | --- | --- |
| TypeScript / ESLint | Pass / zero warnings | Selected type and lint checks. |
| Vitest | 164 passed in 12 files | Unit/component regressions. |
| Playwright | 18 foundation + 8 built preview + 26 PostgreSQL = 52 passed | Desktop/mobile emulation and real local persistence; not physical phones. |
| Pytest | 365 passed; one intentional live-AI skip; two deprecation warnings | Real isolated PostgreSQL and engine/security regressions. |
| Build / Ruff / pip check | All passed | Packaging, style and installed compatibility. |
| Alembic current/head/check | 0006_qr_intelligence; no new operations | Local drift checks; production version separately read using SELECT only. |
| Frozen inference | Both held-out confusion matrices reproduced | Same frozen data and artifacts; no training or independent new sample. |
| Dependency audits | npm audit and pip-audit: zero known advisories after three narrow patches | Known advisory coverage at scan time; not a security guarantee. |
| Post-patch validation | Backend, pip check, both inference verifiers, wheel and 26 persisted browser tests passed again | Verifies the patched urllib3 environment. |
| Production | Dated provider identities, public probes and synthetic-account results in completion audit | Point-in-time evidence; no inbox or physical-camera inference. |

The final audit records the exact GitHub CI/release identities and bounded secret-scan result. Initial sandbox and local database-port failures were corrected and rerun; they are not counted as passing tests.

**Table 14. Intelligence and narrow performance evidence.** The Message and URL matrices were freshly reproduced without changing them. Authored URL/Phone/QR/payment case totals and the 30-call latency sample below are historical September measurements, retained with that date; they are not new October benchmarks.

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
