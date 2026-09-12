# Future work after submission
No items here are implemented by Task 9. Current core workflows remain implemented; missing
acceptance evidence is current closure work, not a promised future feature.

| Priority | Work | Evidence/controls needed before adoption |
| --- | --- | --- |
| 1 | Independent usability, accessibility and security review | Real participants, assistive technologies, scoped penetration test, defect follow-up and honest limitations. |
| 2 | Better Message and URL external validity/calibration | New licensed representative multilingual/temporal corpora; fresh untouched external test; campaign-aware grouping; calibration evaluated separately. |
| 3 | Operational recovery and observability | Verified backups/restores, retention/deletion policy, secret-safe metrics/mail failure monitoring, incident procedures and realistic load tests. |
| 4 | High availability / long-running analysis reliability | Measure demand first; bounded jobs/idempotency if justified; reviewed capacity/cost and failure recovery. |
| 5 | Optional real-time reputation | Licensed verified feeds, explicit privacy contract, provider failure semantics, cost/rate bounds and provenance. Missing matches never imply safety. |
| 6 | Expanded payment QR standards | Scheme-specific mandatory fields and nested validation with authoritative test vectors; CRC remains distinct from recipient verification. |
| 7 | Verified scam-report and abuse integration | Moderation, lawful collection, consent, provenance, correction/appeal, retention and protection against false accusations. |
| 8 | Device-level signals and broader camera compatibility | Explicit permissions, privacy review, independent hardware matrix and safe upload fallback. |
| 9 | Controlled adaptive learning | Reviewed labels, reproducible offline evaluation, versioned promotion, rollback and audit; never retrain automatically on untrusted reports. |

Do not add a destination fetcher merely to improve a demo. It requires separate SSRF, network
isolation, redirect/DNS/address, resource and privacy controls. It is not part of the current
no-fetch design.
