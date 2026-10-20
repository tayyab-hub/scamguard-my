# Speaker notes — October final candidate

These notes match the editable deck. Sources, transitions and suggested prompts are included; the proposed allocation is not an observed performance. Use [EXAMINER_QA.md](EXAMINER_QA.md) for follow-up preparation.

## 1. SCAMGUARD

60 seconds. Open with the user decision: unfamiliar content can look plausible without being trustworthy. Explain that Reporting means private explainable analysis history. This is an October final candidate derived from the user-supplied proposal; confirm the official presentation duration. Transition: what existing services already provide. Source: proposal PDF pp7â€“9; FINAL_PROBLEM_STATEMENT.md.

## 2. Related systems inform the design

60 seconds. These are documented capability comparisons, not a head-to-head accuracy experiment. VirusTotal offers aggregated analysis and a separate private-scanning product; Safe Browsing supplies threat information; Truecaller supplies communication reputation. Do not claim unsupported proprietary internals or absolute absence of features. Transition: the project objectives. Sources: BACKGROUND_OF_STUDY.md and FINAL_SOURCE_REGISTER.md; https://docs.virustotal.com/docs/how-it-works ; https://developers.google.com/safe-browsing ; https://www.truecaller.com/ .

## 3. Four proposal objectives; one study remains

45 seconds. Preserve the proposal wording in the report. O1 desk research and requirements, O2 design, O3 implementation and deployment, O4 functional/model/human evaluation. O4 cannot be reported fully met until real volunteer observations are recorded. Proposed classifier macro-F1 target is at least 0.85 on the defined held-out sets; this is not a population guarantee. Transition: the architecture. Source: user-designated proposal PDF pp7â€“9; FINAL_SMART_OBJECTIVES.md.

## 4. One request path, four local engines

60 seconds. Trace browser to same-origin Vercel API rewrite, Render validation/session/Origin/CSRF, selected local engine and owned Neon records. Explain that the provider rewrite and repository SPA fallback have separate roles. Optional external AI is disabled in this evaluation. Transition: Message classification versus policy. Source: ARCHITECTURE.md; frontend/vercel.json; backend/app/services/analyses.py; render.yaml.

## 5. Message: learned labels and advisory risk differ

65 seconds. 5,971 source rows become 5,797 cleaned rows. Near-duplicate grouping precedes 3,477/1,160/1,160 train/validation/test splits. TFâ€“IDF and Logistic Regression were selected on validation; final fit uses train plus validation. Reported test metrics are classifier outputs, not five-level fusion accuracy. The v2 policy uses normalized rules, sufficiency/conflict guards and ceilings; 13/106 SCAM examples were classified SPAM. Transition: URL has a different collection bias. Sources: MODEL_EVALUATION.md; completion-message-evaluation.json; https://data.mendeley.com/datasets/f45bkkt8pr/1 .

## 6. URL: strong test results, substantial collection bias

55 seconds. 234,674 processed rows grouped by 197,700 registrable domains; train 164,074, validation 33,699, test 36,901. A 120-tree forest uses 27 local string features. All legitimate training URLs are HTTPS homepages without queries. Ordinary deep links can be out of distribution. No fetch, DNS lookup or threat feed establishes present legitimacy. Transition: the non-learned modes. Sources: URL_MODEL_EVALUATION.md; backend/scripts/verify_url_pipeline.py; https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset .

## 7. Phone and QR have different evidence limits

55 seconds. Phone uses phonenumbers metadata and conservative rules, not a learned scam classifier. A valid number is not a verified subscriber. QR validates bounded raster inputs or locally decoded camera text, classifies supported payloads and routes them; image/frame retention is absent. TLV/CRC is a structural subset; payment warnings enforce at least Caution. Physical device performance and complete scheme compliance are not claimed. Transition: private storage and security. Sources: PHONE_INTELLIGENCE.md; QR_INTELLIGENCE.md; https://github.com/google/libphonenumber/blob/master/FAQ.md ; https://www.emvco.com/emv-technologies/qr-codes/ .

## 8. Privacy is enforced by the API and database queries

55 seconds. Passwords use Argon2id; raw session/reset tokens are not stored, sessions are opaque cookies, mutations require exact Origin and CSRF. Ownership predicates are independent of UI navigation. Reset token consumption locks rows and revokes sessions. QR images/frames are discarded; specified credentials are redacted before storage. Remaining risks include no independent penetration test, no backup-restore evidence, signup enumeration, and no processing recovery/idempotency. Transition: demonstration. Sources: backend/app/core/auth.py; backend/app/services/analyses.py; FINAL_COMPLETION_AUDIT_2026-10-20.md.

## 9. Demonstration: inspect, explain, revisit

150 seconds. Use the synthetic OTP request, an inert example.com URL, a reserved example phone number and generated QR. Show why the verdict was reached, what tempers it, actions and limits; then retrieve the original result in private History. Show unknown-vocabulary input with unavailable confidence if time permits. Do not contact or open destinations. If hosting or camera fails, use these real captured screenshots and QR upload; explain the fallback honestly. Transition: what testing establishes. Sources: DEMO_SCRIPT.md; completion-production-smoke.json. Screenshot is a real production result from the controlled completion run; synthetic accounts are removed afterward.

## 10. Verification establishes specific behaviours

60 seconds. Distinguish test suites from classifier evaluation. Final local gates have 365 backend, 164 frontend, 18 foundation +8 preview +26 persisted browser =52. One optional paid external-AI test was deliberately skipped; two dependency deprecations are documented. npm audit and pip-audit show no known advisories after three narrow dependency fixes, not proof of no vulnerabilities. State exact release/CI evidence from the audit rather than guessing. Transition: remaining false negatives. Sources: completion-verification.json; completion-dependency-audit.json; FINAL_COMPLETION_AUDIT_2026-10-20.md.

## 11. Residual errors remain visible

55 seconds. Five historical SCAM rows receive Low or Insufficient fused output: three Low and two insufficient. They resemble promotions, shopping/prize/loan offers or opt-out wording. Labels remain unchanged; no independent sender truth is available. We diagnosed frozen outputs without tuning to these test examples. Model confidence is neither the probability of fraud nor proof of safety. Human evaluation has not been conducted. Transition: planned versus completed work. Sources: completion-message-residuals.json; EVALUATION.md; FINAL_SMART_OBJECTIVES.md.

## 12. The proposal plan and actual evidence stay separate

50 seconds. Proposal runs 1 Septemberâ€“20 November, O1 W1â€“3, O2 W2â€“3, O3 W3â€“9, O4 W9â€“11. Report planned by 18 November, presentation by 20 November, subject to the official timetable. Git dates are evidence of commits rather than work duration. The required volunteer study, physical-camera and controlled-inbox acceptance, final rules and rehearsal remain owner tasks. Transition: contribution and questions. Sources: user-designated proposal PDF pp43â€“47; PROJECT_PLAN.md; FINAL_PERSONAL_ACTIONS.md.

## 13. A working decision-support system with explicit limits

25 seconds. Close on the concrete contribution: four local methods in a private explainable workflow, reproducible classifiers, testable ownership boundaries. Technical readiness does not complete the proposed usability study or the final assessment. Invite questions. Anticipated questions: Why high accuracy and missed scams? Class imbalance and fusion differ; explain 93/106 recall. Why no live URL or caller lookup? Bounded privacy/cost scope, limited evidence explicitly stated. Does CRC prove legitimacy? No. What remains for O4? Actual consented volunteer observations. Use EXAMINER_QA.md for further defence; do not invent performance. Source: FINAL_CONCLUSION.md; FINAL_PERSONAL_ACTIONS.md.
