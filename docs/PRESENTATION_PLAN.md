# Presentation plan

**2026-10-08 implementation delta:** retain the presentation scope and timing below. When
presenting the newer local code, update the implementation/evaluation/demo slides using section
13 of the [October engineering review](ENGINEERING_REVIEW_2026-10-08.md). Demonstrate “Why this verdict,” relevant actions and unavailable confidence;
explain v2 guards and the remaining low-risk false negatives. Current automated verification is
571 passes and one opt-in live-AI skip. The trained models and deployment topology are unchanged;
the local patch has not been deployed. Existing speaker notes remain a historical draft.

Prepared for 13 minutes 15 seconds, including a 150-second demonstration and 25-second closing invitation. Examiner Q&A is additional unless the assessor specifies otherwise. This is a timed content plan, not a recorded rehearsal. Confirm the official allocation before delivery. The structure tells one story: problem → related-system gap → objectives → architecture/methods → privacy → demonstration → evaluation → limits → contribution.

## Thirty-second opening

SCAMGUARD lets a person inspect an unfamiliar message, link, number or QR payload before acting. Existing services provide useful but different evidence. This project brings local analysis and explicit explanations into one private workflow. Its contribution is a reproducible decision-support application; it does not certify identities or prove that a payment is legitimate.

## Sixty-second opening

An unfamiliar message can ask us to follow a link, call a number or scan a QR code. Each object reveals different evidence, and none of those appearances alone proves who is behind it. VirusTotal, Google Safe Browsing and Truecaller already solve important parts of this problem, including URL and phone checking. SCAMGUARD explores a specific integration: local Message and URL models, conservative Phone metadata and consent-based QR decoding, with clear explanations and private saved assessments. The technical work is testable and versioned. The output supports deciding what to verify independently; it does not guarantee safety or claim a measured reduction in fraud losses. I will explain the methods, demonstrate the workflow and show where the evidence ends.

## Slide 1 SCAMGUARD decision support

**Purpose:** Establish the user problem and bounded potential value.
**Visual:** One unfamiliar-message example and its linked URL/QR context; use inert text.
**Maximum on-slide text:** 16 words, using only the following copy (excluding small source caption).

Inspect unfamiliar content before acting\
Message · URL · Phone · QR\
Evidence with explicit limits

**Speaker notes:** Use the 60-second opening above. The important distinction is between inspecting evidence and certifying an identity. Do not claim that the product prevents losses. The opening should make the intended user and decision clear before introducing technology. Pause after the sentence that states the limitation.
**Transition sentence:** The next question is what existing systems already solve.
**Time allocation:** 60 seconds.
**Evidence:** [FINAL_PROBLEM_STATEMENT.md](FINAL_PROBLEM_STATEMENT.md)

## Slide 2 Related systems and the design gap

**Purpose:** Show research and an honest comparison.
**Visual:** Table 4 condensed to three rows: evidence source, strength, trade-off.
**Maximum on-slide text:** 16 words, using only the following copy (excluding small source caption).

VirusTotal: aggregated analysis\
Safe Browsing: threat information\
Truecaller: communication reputation\
SCAMGUARD: local methods and private explanations

**Speaker notes:** Explain that Truecaller already checks phone numbers and URLs and that VirusTotal has a separate private option. Describe each system’s unit of evidence. Then state the bounded gap: a common workflow around the specific local methods and QR consent implemented here. No service was benchmarked against SCAMGUARD, and proprietary internals are unknown.
**Transition sentence:** That comparison leads to four measurable project outcomes.
**Time allocation:** 60 seconds.
**Evidence:** [BACKGROUND_OF_STUDY.md](BACKGROUND_OF_STUDY.md)

## Slide 3 Four measurable objectives

**Purpose:** Connect the problem to acceptance evidence.
**Visual:** O1–O4 from Table 1; one short outcome per line.
**Maximum on-slide text:** 16 words, using only the following copy (excluding small source caption).

Four supported modes\
Versioned explanations and reproduced models\
Private account and history lifecycle\
Traceable verified deployment

**Speaker notes:** Name the final-release time boundary and explain that these are retrospective acceptance objectives. Point to one concrete measurement for each: advertised set, held-out matrices, A/B tests and matching deployment SHA. Do not imply that this wording was approved before work began. The original academic schedule remains a separate evidence gap.
**Transition sentence:** The architecture connects those outcomes through one request path.
**Time allocation:** 45 seconds.
**Evidence:** [FINAL_SMART_OBJECTIVES.md](FINAL_SMART_OBJECTIVES.md)

## Slide 4 Architecture and trust boundaries

**Purpose:** Explain execution and ownership.
**Visual:** Figure 1 architecture; include provider-configured API rewrite.
**Maximum on-slide text:** 18 words, using only the following copy (excluding small source caption).

Browser → Vercel → Render → Neon\
Identity comes from the server session\
Local engines return owned assessments

**Speaker notes:** Trace a request from the browser through Vercel’s configured same-origin rewrite to FastAPI on Render. Explain that frontend/vercel.json only contains the SPA catch-all; provider configuration supplies the API rewrite. The API validates identity and content, runs an engine, transacts with Neon and returns a schema-checked result. The browser never receives database credentials.
**Transition sentence:** Inside that API, learned components and deterministic controls have different roles.
**Time allocation:** 60 seconds.
**Evidence:** [ARCHITECTURE.md](ARCHITECTURE.md)

## Slide 5 Message classification and evidence

**Purpose:** Demonstrate knowledge of the actual ML pipeline.
**Visual:** Figure 7 Message confusion matrix and a simple TF-IDF → Logistic Regression → fusion sequence.
**Maximum on-slide text:** 15 words, using only the following copy (excluding small source caption).

TF-IDF + Logistic Regression\
LEGITIMATE / SPAM / SCAM\
1,160 held-out rows\
Macro F1 0.895235

**Speaker notes:** Explain training-only text features, grouped duplicate control and validation selection. The final model was refit on train plus validation. Point to 13 SCAM examples classified SPAM and explain why macro F1 and class support matter. Rules expose context and fusion produces a separate advisory risk. Classifier metrics do not validate the final five-level risk policy.
**Transition sentence:** The URL model uses different inputs and has a different validity problem.
**Time allocation:** 65 seconds.
**Evidence:** [MODEL_EVALUATION.md](MODEL_EVALUATION.md)

## Slide 6 URL analysis and collection bias

**Purpose:** Explain what URL analysis actually measures.
**Visual:** URL half of Figure 7 with a prominent dataset-bias note.
**Maximum on-slide text:** 13 words, using only the following copy (excluding small source caption).

27 URL-string features\
120-tree random forest\
No destination fetching\
HTTPS-homepage bias limits generalisation

**Speaker notes:** State the 36,901 domain-held-out test denominator and 98.4824% classifier accuracy only alongside the main caveat. All legitimate training URLs were HTTPS homepages without queries. Ordinary benign deep links can be unfamiliar. Rules and fusion therefore limit weak or ML-only evidence to Caution. There is no live webpage or reputation investigation.
**Transition sentence:** Some modes cannot support a learned fraud score at all.
**Time allocation:** 55 seconds.
**Evidence:** [URL_MODEL_EVALUATION.md](URL_MODEL_EVALUATION.md)

## Slide 7 Phone and QR boundaries

**Purpose:** Connect deterministic analysis to honest uncertainty.
**Visual:** Figure 5 QR routing and a Phone Insufficient Evidence result.
**Maximum on-slide text:** 20 words, using only the following copy (excluding small source caption).

Phone metadata ≠ caller identity\
QR decode ≠ safe content\
CRC ≠ merchant authenticity\
Supported QR payloads reuse existing engines

**Speaker notes:** Explain that a valid number only matches bundled numbering metadata; cost-related categories can justify Caution. A QR is a data carrier. Its payload routes to Message, URL or Phone where supported, while payment parsing is only a generic TLV/CRC subset. Describe the retained missing-merchant-fields limitation. No QR destination is automatically activated.
**Transition sentence:** Because those inputs may be sensitive, their lifecycle matters as much as their result.
**Time allocation:** 60 seconds.
**Evidence:** [QR_INTELLIGENCE.md](QR_INTELLIGENCE.md)

## Slide 8 Authentication and QR privacy

**Purpose:** Explain the tested security and retention controls.
**Visual:** Figures 2 and 4 reduced to one data/session path; do not show real tokens.
**Maximum on-slide text:** 14 words, using only the following copy (excluding small source caption).

Argon2id password hashes\
Opaque sessions + Origin/CSRF\
Owner-scoped records\
Frames/images discarded; specified credentials redacted

**Speaker notes:** Passwords are hashed; token digests live in the database and opaque cookies are HttpOnly. Authenticated mutations check session, Origin and CSRF. All private queries use session-derived ownership. Camera frames remain on-device, upload bytes are transient, and Task 9 redacts specified Wi-Fi/payment credentials before saving. This is tested control evidence, not a penetration-test certificate.
**Transition sentence:** I will now show how those boundaries appear in the user workflow.
**Time allocation:** 60 seconds.
**Evidence:** [AUTHENTICATION.md](AUTHENTICATION.md)

## Slide 9 Demonstration

**Purpose:** Show one coherent journey rather than every settings screen.
**Visual:** Live app; authentic local screenshots as fallback.
**Maximum on-slide text:** 16 words, using only the following copy (excluding small source caption).

Submit → interpret → retrieve\
Show one indicator and one limit\
Keep the original assessment unchanged

**Speaker notes:** Follow DEMO_SCRIPT.md exactly. Use a prepared account and inert fixtures. Message is the main assessment; briefly contrast URL and Phone; upload a QR and retrieve its owned History entry. Use camera only if the real device has passed preflight, replacing rather than extending the upload slot. Authentication/profile/reset/isolation are available for questions and manual acceptance, not rushed into this 150-second journey.
**Transition sentence:** The demonstration is one example; the next slide shows the wider evidence and its limits.
**Time allocation:** 150 seconds.
**Evidence:** [DEMO_SCRIPT.md](DEMO_SCRIPT.md)

## Slide 10 Evaluation evidence

**Purpose:** Separate tests, model metrics and human outcomes.
**Visual:** Table 13 counts plus Table 14 evidence-class labels.
**Maximum on-slide text:** 20 words, using only the following copy (excluding small source caption).

159 Vitest · 50 Playwright\
310 Pytest + 1 opt-in skip\
Matching production release SHA\
Usability study not yet conducted

**Speaker notes:** Explain what each suite covers, including real local PostgreSQL and built worker assets. State the skipped external provider test and avoid calling mobile emulation physical hardware. The final release had healthy/ready/capabilities HTTP 200 and matching provider commits. These observations do not establish long-term availability, inbox receipt or better user decisions.
**Transition sentence:** That distinction is essential to the limitations I can defend.
**Time allocation:** 70 seconds.
**Evidence:** [FINAL_EVALUATION.md](FINAL_EVALUATION.md)

## Slide 11 Limitations and next validation

**Purpose:** Show judgement and external-validity awareness.
**Visual:** Short ranked list; no decorative success graphic.
**Maximum on-slide text:** 22 words, using only the following copy (excluding small source caption).

Historical and biased datasets\
No live reputation or complete payment compliance\
Device, inbox and human evidence gaps\
No load or recovery guarantee

**Speaker notes:** Prioritise the limitations that change how an output is interpreted. Explain why a representative external test and user-comprehension study would be more informative than adding another mode. Acknowledge operational cold starts and recovery gaps. Future work is a proposal with prerequisites; nothing is presented as already implemented.
**Transition sentence:** Within those limits, the implemented contribution is concrete.
**Time allocation:** 50 seconds.
**Evidence:** [LIMITATIONS.md](LIMITATIONS.md)

## Slide 12 Implemented contribution

**Purpose:** Connect outcomes back to the original problem.
**Visual:** Objective-to-evidence summary, four rows.
**Maximum on-slide text:** 13 words, using only the following copy (excluding small source caption).

Reproducible local analysis\
Inspectable evidence and uncertainty\
Consent-based QR routing\
Private versioned history

**Speaker notes:** Return to the user’s need to inspect an unfamiliar item before acting. The project delivers a working integrated workflow with evidence and limitations, supported by the named tests and release observations. It does not claim a new learning algorithm or proven reduction in scam losses. Keep this conclusion short and specific.
**Transition sentence:** I can now explain the evidence behind any of these claims.
**Time allocation:** 35 seconds.
**Evidence:** [FINAL_CONCLUSION.md](FINAL_CONCLUSION.md)

## Slide 13 Questions and evidence

**Purpose:** Open a focused defence and make evidence easy to find.
**Visual:** Plain text cue: architecture, metrics, ownership, QR, release.
**Maximum on-slide text:** 10 words, using only the following copy (excluding small source caption).

Questions\
Architecture · methods · privacy · evaluation\
Release: 4df277bdf93a2e1424ac533d488cd7ba127b35ce

**Speaker notes:** Pause and face the audience. Use direct answer, reasoning, then evidence. The 25 seconds covers the closing invitation, not the examiner’s Q&A period. Open a source only when useful. If asked about a missing experiment, state what is not yet evidenced and describe the planned method without inventing results.
**Transition sentence:** Thank you.
**Time allocation:** 25 seconds.
**Evidence:** [EXAMINER_QA.md](EXAMINER_QA.md)
