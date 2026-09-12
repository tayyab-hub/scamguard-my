# Written Capstone report guide
Use the course's actual template, word limits and marking rubric when supplied. This repository
provides evidence and planning; it is not a finished institution-formatted dissertation.
Cite measured results with version/date and distinguish local, production, owner-reported and unperformed work.

| Section | Include evidence / argument | Repository support | Suggested figure/table |
| --- | --- | --- | --- |
| 1 Introduction | Decision-support problem, target user, cautious project claim | README; LIMITATIONS | One-paragraph scope |
| 2 Background/problem | Social-engineering context, false certainty risk, fragmented checking | Literature sources you actually read; EXAMINER_QA | Problem-to-objective mapping |
| 3 Objectives | Four modalities, explainability, private history, safe interaction | REQUIREMENTS_TRACEABILITY | Measurable objectives and evidence |
| 4 Scope | Implemented/local/optional/out-of-scope boundaries | README; LIMITATIONS | Scope table; no community-report claim |
| 5 Literature/context | SMS classification, URL-string analysis, number metadata, QR/TLV/CRC, usable security | DATASETS; URL_DATASETS; official sources listed below | Comparison by data, method, evaluation and limits |
| 6 Requirements | Functional/non-functional requirements; owner privacy and uncertainty | REQUIREMENTS_TRACEABILITY; API | Traceability matrix |
| 7 Methodology | Iterative tasks, feature freeze, reproducible datasets, validation selection, test separation | DECISIONS; FINAL_AUDIT; EVALUATION | Development timeline and evaluation design |
| 8 System design | Components, trust boundaries, session and data flows, database ownership | ARCHITECTURE; DATA_FLOW; DATABASE | Architecture + selected sequence + ER diagram |
| 9 Implementation | Nontrivial orchestration, inference export/integrity, safe QR capture, history snapshots | Module docs; code references in traceability | One readable screenshot per major flow |
| 10 Security | Threats, controls, H1 fix, residual risk | SECURITY_REVIEW; PRIVACY_MODEL | Threat/control/evidence/limit table |
| 11 Testing | Exact commands/counts/environment; initial failures and corrections | FINAL_TEST_REPORT; TESTING | Automated/manual/production/not-performed matrix |
| 12 Evaluation | Five dimensions, held-out metrics vs controlled fixtures vs study plan | EVALUATION; CONTROLLED_EVALUATION; USABILITY_TEST_PLAN | Per-class metrics, confusion matrices, fixture matrix |
| 13 Results | Measured facts only; version and denominators | docs/evidence; model reports; final test report | Compact results dashboard/table |
| 14 Discussion | Interpret bias, tradeoffs, uncertainty, gaps between tests and real-world claims | EXAMINER_REVIEW; LIMITATIONS | Evidence strength / validity threats |
| 15 Limitations | Dataset, standard subset, operational, device, usability and audit limits | LIMITATIONS | Ranked limitations |
| 16 Future work | Prioritized, realistic extensions with prerequisites | FUTURE_WORK | Priority/validation roadmap |
| 17 Conclusion | Which objectives the evidence supports; remaining owner acceptance | REQUIREMENTS_TRACEABILITY; PRODUCTION_ACCEPTANCE | Objective completion with qualifications |

## Academic accuracy rules
Message and URL have trained models; Phone/QR classification/payment structure are deterministic.
Reported classifier metrics do not validate final five-level fused risk or current scam prevalence.
Do not call fixtures a representative accuracy benchmark, automated tests a usability study,
owner acceptance independent device evidence, or this review a penetration test/WCAG certification.
“Reporting” in the formal title must not imply unimplemented public reporting/moderation.
Explain the URL collection bias prominently, not only in an appendix.

## Sources and attribution
Credit Mishra & Soni's [Mendeley v1 dataset](https://data.mendeley.com/datasets/f45bkkt8pr/1)
and Prasad & Chandra's [UCI PhiUSIIL record](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset),
including CC BY attribution and SCAMGUARD's cleaning/splitting/feature changes. Their collection
and publication dates do not establish every row's age. Use the primary papers linked by those records
only after reading them; do not invent a literature review or cite a paper based solely on its title.
The presentation/report bibliography must follow your institution's citation style.

## Owner work before submission
Supply course rubric/template; complete approved volunteer sessions and populate actual observations;
record device/browser versions and reset inbox evidence; approve/merge Task 9 and recheck production;
capture privacy-safe final screenshots; author the final report and slides; verify citations,
figure captions, page limits, authorship/AI-assistance declaration and archive requirements.
Do not insert placeholder results as if collected.
