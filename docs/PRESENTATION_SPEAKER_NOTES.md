# Presentation speaker notes

Use the slide text as cues. The notes give the reasoning to explain in your own words; they are not evidence of a completed rehearsal. The 13-slide plan totals 795 seconds. The cover identity fields can be completed by the owner.

## Slide 1 SCAMGUARD decision support — 60 seconds

Use the 60-second opening in PRESENTATION_PLAN.md. The important distinction is between inspecting evidence and certifying an identity. Do not claim that the product prevents losses. The opening should make the intended user and decision clear before introducing technology. Pause after the sentence that states the limitation.

**Transition:** The next question is what existing systems already solve.

**Evidence to open on request:** [FINAL_PROBLEM_STATEMENT.md](FINAL_PROBLEM_STATEMENT.md)

## Slide 2 Related systems and the design gap — 60 seconds

Explain that Truecaller already checks phone numbers and URLs and that VirusTotal has a separate private option. Describe each system’s unit of evidence. Then state the bounded gap: a common workflow around the specific local methods and QR consent implemented here. No service was benchmarked against SCAMGUARD, and proprietary internals are unknown.

**Transition:** That comparison leads to four measurable project outcomes.

**Evidence to open on request:** [BACKGROUND_OF_STUDY.md](BACKGROUND_OF_STUDY.md)

## Slide 3 Four measurable objectives — 45 seconds

Name the final-release time boundary and explain that these are retrospective acceptance objectives. Point to one concrete measurement for each: advertised set, held-out matrices, A/B tests and matching deployment SHA. Do not imply that this wording was approved before work began. The original academic schedule remains a separate evidence gap.

**Transition:** The architecture connects those outcomes through one request path.

**Evidence to open on request:** [FINAL_SMART_OBJECTIVES.md](FINAL_SMART_OBJECTIVES.md)

## Slide 4 Architecture and trust boundaries — 60 seconds

Trace a request from the browser through Vercel’s configured same-origin rewrite to FastAPI on Render. Explain that frontend/vercel.json only contains the SPA catch-all; provider configuration supplies the API rewrite. The API validates identity and content, runs an engine, transacts with Neon and returns a schema-checked result. The browser never receives database credentials.

**Transition:** Inside that API, learned components and deterministic controls have different roles.

**Evidence to open on request:** [ARCHITECTURE.md](ARCHITECTURE.md)

## Slide 5 Message classification and evidence — 65 seconds

Explain training-only text features, grouped duplicate control and validation selection. The final model was refit on train plus validation. Point to 13 SCAM examples classified SPAM and explain why macro F1 and class support matter. Rules expose context and fusion produces a separate advisory risk. Classifier metrics do not validate the final five-level risk policy.

**Transition:** The URL model uses different inputs and has a different validity problem.

**Evidence to open on request:** [MODEL_EVALUATION.md](MODEL_EVALUATION.md)

## Slide 6 URL analysis and collection bias — 55 seconds

State the 36,901 domain-held-out test denominator and 98.4824% classifier accuracy only alongside the main caveat. All legitimate training URLs were HTTPS homepages without queries. Ordinary benign deep links can be unfamiliar. Rules and fusion therefore limit weak or ML-only evidence to Caution. There is no live webpage or reputation investigation.

**Transition:** Some modes cannot support a learned fraud score at all.

**Evidence to open on request:** [URL_MODEL_EVALUATION.md](URL_MODEL_EVALUATION.md)

## Slide 7 Phone and QR boundaries — 60 seconds

Explain that a valid number only matches bundled numbering metadata; cost-related categories can justify Caution. A QR is a data carrier. Its payload routes to Message, URL or Phone where supported, while payment parsing is only a generic TLV/CRC subset. Describe the retained missing-merchant-fields limitation. No QR destination is automatically activated.

**Transition:** Because those inputs may be sensitive, their lifecycle matters as much as their result.

**Evidence to open on request:** [QR_INTELLIGENCE.md](QR_INTELLIGENCE.md)

## Slide 8 Authentication and QR privacy — 60 seconds

Passwords are hashed; token digests live in the database and opaque cookies are HttpOnly. Authenticated mutations check session, Origin and CSRF. All private queries use session-derived ownership. Camera frames remain on-device, upload bytes are transient, and Task 9 redacts specified Wi-Fi/payment credentials before saving. This is tested control evidence, not a penetration-test certificate.

**Transition:** I will now show how those boundaries appear in the user workflow.

**Evidence to open on request:** [AUTHENTICATION.md](AUTHENTICATION.md)

## Slide 9 Demonstration — 150 seconds

Follow DEMO_SCRIPT.md exactly. Use a prepared account and inert fixtures. Message is the main assessment; briefly contrast URL and Phone; upload a QR and retrieve its owned History entry. Use camera only if the real device has passed preflight, replacing rather than extending the upload slot. Authentication/profile/reset/isolation are available for questions and manual acceptance, not rushed into this 150-second journey.

**Transition:** The demonstration is one example; the next slide shows the wider evidence and its limits.

**Evidence to open on request:** [DEMO_SCRIPT.md](DEMO_SCRIPT.md)

## Slide 10 Evaluation evidence — 70 seconds

Explain what each suite covers, including real local PostgreSQL and built worker assets. State the skipped external provider test and avoid calling mobile emulation physical hardware. The final release had healthy/ready/capabilities HTTP 200 and matching provider commits. These observations do not establish long-term availability, inbox receipt or better user decisions.

**Transition:** That distinction is essential to the limitations I can defend.

**Evidence to open on request:** [FINAL_EVALUATION.md](FINAL_EVALUATION.md)

## Slide 11 Limitations and next validation — 50 seconds

Prioritise the limitations that change how an output is interpreted. Explain why a representative external test and user-comprehension study would be more informative than adding another mode. Acknowledge operational cold starts and recovery gaps. Future work is a proposal with prerequisites; nothing is presented as already implemented.

**Transition:** Within those limits, the implemented contribution is concrete.

**Evidence to open on request:** [LIMITATIONS.md](LIMITATIONS.md)

## Slide 12 Implemented contribution — 35 seconds

Return to the user’s need to inspect an unfamiliar item before acting. The project delivers a working integrated workflow with evidence and limitations, supported by the named tests and release observations. It does not claim a new learning algorithm or proven reduction in scam losses. Keep this conclusion short and specific.

**Transition:** I can now explain the evidence behind any of these claims.

**Evidence to open on request:** [FINAL_CONCLUSION.md](FINAL_CONCLUSION.md)

## Slide 13 Questions and evidence — 25 seconds

Pause and face the audience. Use direct answer, reasoning, then evidence. The 25 seconds covers the closing invitation, not the examiner’s Q&A period. Open a source only when useful. If asked about a missing experiment, state what is not yet evidenced and describe the planned method without inventing results.

**Transition:** Thank you.

**Evidence to open on request:** [EXAMINER_QA.md](EXAMINER_QA.md)
