# Examiner questions and technically bounded answers

**How does ScamGuard know something is a scam?**

It does not know with certainty. It combines local classification or metadata with explicit evidence
and modality-specific conservative rules. The output supports a decision about what to verify.

**Why should we trust the model?**

Trust should be bounded by provenance, reproducible held-out results, transparent limitations and
visible evidence. Message macro F1 is about 0.8952 on one historical split, not a universal guarantee.
The URL model's source bias is particularly important.

**Why no real-time URL fetching?**

The implemented scope analyses strings without opening a potentially hostile destination. Fetching
would introduce SSRF, redirect, resource, privacy and execution risks requiring a separate design.
The tradeoff is missing live webpage/reputation evidence.

**Can a phone number really identify a scammer?**

No. Offline numbering metadata indicates format, region and possible service type, not subscriber
identity or intent. Ordinary numbers remain Insufficient Evidence.

**Does a valid payment QR mean it is safe?**

No. The parser checks a generic structural subset and CRC, not recipient legitimacy. A diagnostic
also shows that some missing merchant fields are not rejected by this subset. No full EMV compliance
claim is made.

**What happens to uploaded QR images?**

They are bounded and validated, decoded in backend memory and discarded. Private decoded text and
derived metadata persist. Camera frames stay on-device; only explicitly submitted decoded text is sent.
Credential redaction is limited, so users must not submit secrets.

**Where is user data stored?**

Owned account/session/analysis records are in Neon PostgreSQL; frontend hosting is Vercel and API
compute is Render. Resend receives password-reset recipient/URL. Provider backups have separate
retention limits that the application cannot promise to purge immediately.

**Can users edit analysis results?**

No. Completed results are immutable. Users may delete their own record or copy an owned input with
Analyse again to create a new record. QR needs a fresh image or scan.

**Why are completed analyses immutable?**

Stored evidence, versions and timestamps should describe the assessment actually performed.
Changing the input in place would make that historical record misleading.

**How is User A prevented from seeing User B?**

The API derives user identity from a validated session and scopes queries/mutations to that user.
Foreign, missing and legacy unowned records use a safe 404. Four-mode local A/B tests verify this;
UUID secrecy and frontend hiding are not the authorization mechanism.

**Why PostgreSQL?**

It provides transactions, constraints, relational ownership/cascades and consistent history queries.
The tests use real isolated PostgreSQL and explicit Alembic migrations rather than SQLite substitutes.

**Why Render/Vercel/Neon?**

They fit the separated React/API/database deployment with manageable capstone operation. This is a
practical project choice, not evidence of universal superiority. Free-tier sleep, quotas and recovery
limitations are acknowledged.

**Why sessions rather than localStorage tokens?**

An HttpOnly cookie holds a random opaque token; the database stores its digest and supports revocation.
It reduces exposure to direct JavaScript token reads but does not make XSS harmless. Origin/CSRF
controls are still required.

**How does password reset work?**

A rate-limited exact-origin request returns the same message for existing and unknown accounts.
A real account receives a random expiring token through Resend; only its digest is stored.
Confirmation locks/consumes it, replaces the Argon2id hash and revokes sessions. Provider acceptance
does not prove inbox delivery, and timing equivalence has not been measured.

**What are the biggest limitations?**

Dataset external validity/calibration, URL collection bias, incomplete payment-standard coverage,
unrecorded physical-device/volunteer evidence, and limited production operational validation.

**What would you improve with more time?**

First collect real usability/device evidence, independently review security and recovery, then expand
representative labelled data and evaluate calibration. New integrations require provenance/privacy
controls, not simply more features.

**What makes this more than a basic CRUD project?**

Versioned offline ML inference/export integrity, conservative evidence fusion, safe multi-modal QR
routing/capture, transaction-backed ownership/session controls and reproducible evaluation add
technical depth. CRUD still supports private immutable history rather than defining the whole system.

**What parts are AI/ML and what parts are deterministic?**

Message uses TF-IDF Logistic Regression; URL uses a random forest over local string features.
Rules/fusion, Phone metadata, QR classification and payment structure are deterministic. Optional
external AI review is backend-only and disabled in normal evaluation; it is not the core.

**How did you evaluate accuracy?**

With fixed held-out classifier splits and per-class metrics/confusion matrices, reproduced using
the deployed JSON inference. Controlled Phone/URL-rule/QR fixtures measure specific behavior instead.
No accuracy is claimed for final five-level risk or for detecting real-world Phone/payment fraud.

**What happens when evidence is insufficient?**

The result states Insufficient Evidence, explains what is unknown and gives cautious next steps.
It does not invent a score or transform missing information into reassurance.

**Why is Insufficient Evidence different from Low?**

Low means the available supported assessment found limited concern under its method.
Insufficient Evidence means that information or method cannot support that judgment. Neither certifies safety.

**Could this be used in the real world?**

As a cautiously scoped prototype or supervised demonstration after acceptance. Broad public reliance
would require stronger external validation, governance, monitoring, recovery and independent security work.

**Is a 98% URL score proof the system detects 98% of current scams?**

No. It is accuracy on one dataset's held-out binary labels; source collection bias is substantial,
and final risk is a separate policy. That number must not be presented as population fraud accuracy.

**Did you conduct a real usability study or test all phones?**

A protocol and blank collection template are prepared. The owner reports it works, but no detailed
device record or volunteer results were supplied. Unperformed evidence is labelled explicitly.

**Is this a community scam-reporting platform?**

No. The formal title is historical; implemented reporting is private assessment/history with explanations.
There is no public reporting/moderation or automatic adaptive-learning workflow.
