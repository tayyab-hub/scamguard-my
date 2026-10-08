# Task 3 message intelligence

Synchronous `MESSAGE` assessment uses the existing persisted analysis endpoint. All four modes
are now implemented; the older Task 3 delivery boundary no longer describes current capabilities.
The 2026-10-08 local review introduces `message-rules-v2` and `message-fusion-v2` without changing
the frozen model, tokenization or database schema. See
[engineering review](ENGINEERING_REVIEW_2026-10-08.md) for exact policy and measured results.

## Decision pipeline

```text
validated message → durable SUBMITTED record → PROCESSING
                  → local TF-IDF classifier (LEGITIMATE / SPAM / SCAM)
                  → deterministic contextual indicators
                  → optional grounded external AI review for ambiguous cases
                  → conservative fusion → COMPLETED persisted result
```

The local classifier always runs. Its three probabilities describe model class uncertainty; they
are not a risk verdict. Rules emit original-text snippets for urgency, threat/fear, credential
language, payment language, authority references, prize, investment, job/task, delivery/account,
secrecy, redirection and suspicious action. Rules-only Unicode/substitution/spacing normalization
preserves offsets; it never changes model input or independently adds risk. Protective-action
negation discounts matches only within its clause. Generic warning/training wording does not
disable detection, and later unsuppressed matches remain eligible. Combinations add bounded weight.
No vocabulary support, short context or ambiguity with weak rules can yield null risk/confidence.
Model-only warnings are capped at Caution; defined model/rule disagreement caps confidence Low.
Structured assessment-basis fields and category-specific actions explain these decisions.

Fusion converts independent evidence into `LOW`, `CAUTION`, `ELEVATED`, `HIGH`, or
`INSUFFICIENT_EVIDENCE`. Risk score and confidence are separate fields. Short context-poor text such
as “Hello” returns insufficient evidence. Strong local evidence sets a floor that an external model
cannot lower. External AI can add only a small bounded corroboration, and a high AI signal without
an exact grounded snippet is discarded.

Results include a summary, detected evidence, recommended actions, component versions/status and
limitations. They avoid absolute “safe” or “scam detected” claims. No hidden chain-of-thought,
provider debug payload, secrets or API keys are stored.

## Optional OpenAI contextual review

The provider abstraction is backend-only. Default `AI_REVIEW_ENABLED=false` means no external call
and no paid usage. When explicitly enabled with a backend `OPENAI_API_KEY`, ambiguous messages may
use the pinned `gpt-5-mini-2025-08-07` model through the official Responses API structured-output
method. OpenAI's current model reference confirms that this snapshot supports both the Responses
endpoint and Structured Outputs: <https://developers.openai.com/api/docs/models/gpt-5-mini>.
The frontend never receives the key.

Before a call, common OTP/PIN/password, long card-number and token/key forms are replaced with
`[REDACTED]`. The system prompt treats the message as untrusted data, forbids following its
instructions or browsing links, asks only for observed tactics and exact short evidence, and does
not request chain-of-thought. `store=False`, an 8-second timeout and zero SDK retries limit exposure
and cost. Pydantic rejects malformed output; unknown tactics and non-verbatim evidence are removed.
Refusal, timeout, provider failure, absent key or invalid output does not fail the local assessment.

Enabling a third-party review is a privacy decision: the redaction layer is best-effort and cannot
guarantee removal of all personal or confidential material. Use only non-sensitive development
messages until authentication, consent, retention/deletion and public-backend controls are approved.

## Persistence and failure behavior

Alembic `0002_message_intelligence` adds nullable result/audit columns so all Task 2 rows remain
valid and unchanged. It stores risk/confidence, summary, evidence, actions, limitations, local
component versions, AI provider/model/status/contribution, completion time and a bounded failure code.
The validated intake commits before analysis. A local pipeline exception produces a durable `FAILED`
record with `MESSAGE_ANALYSIS_FAILED`; it never returns partial or fabricated intelligence. External
AI exceptions are contained as component status and local analysis still completes.

Synchronous execution is intentionally simple for capstone development. A queue/worker is deferred
until measured latency, scale or reliability requirements justify it.
