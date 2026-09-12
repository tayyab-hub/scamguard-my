# Usability study protocol
Status: **NOT YET CONDUCTED**. Owner-reported “it's working” (2026-09-12) is informal acceptance,
not participant evidence, a timed study or device-specific proof. Use USABILITY_RESULTS_TEMPLATE.md.

## Research questions
Can a first-time user finish the five core tasks? Can they locate evidence and distinguish Low
from Insufficient Evidence? Do they understand that structural checks do not verify identity or safety?

Recruit about 5–8 consenting adult volunteers with varied technical familiarity, using an approved
course recruitment/consent process. This is a small formative convenience sample, not a representative
population study. Do not claim statistical generalization. Use pseudonymous P01… IDs, not names/emails
in the report. Explain voluntary participation, withdrawal, what will be recorded, and retention.
Do not record passwords, reset URLs, personal messages, faces or phone contacts. Use controlled
fixtures and isolated local/demo accounts; do not ask participants to submit private scam experiences.

## Session (20–25 minutes)
Give a neutral introduction: “This prototype offers evidence to help you decide what to verify.
It does not certify safety.” Ask for think-aloud feedback without teaching the navigation.
Record device/browser, prior familiarity and whether assistance was required. Start timing at the
end of each task prompt; stop at the success condition. Use a five-minute timeout per task and
record timeout/abandonment rather than inventing a completion time.

| Task | Neutral prompt | Success condition / comprehension probe |
| --- | --- | --- |
| 1 | Create a test account or sign in with the supplied demo identity. | Private dashboard reached. Can they explain which data belongs to them? |
| 2 | Review this supplied suspicious message and explain what you would do next. | Result reached; identifies evidence and an independent verification action, without treating a score as certainty. |
| 3 | Review the supplied URL without visiting it. | URL assessment reached; explains why structural evidence cannot prove site legitimacy. |
| 4 | Find your earlier message in History. | Correct saved record opened using search/filter; can distinguish Analyse again from editing the original. |
| 5 | Scan the supplied QR or use upload; interpret this Phone/plain-text or payment result. | Explicit scan/Analyse or upload completed; explains Insufficient Evidence and no-auto-open. Valid CRC must not be described as a safe merchant. |

Measure per task: unassisted/assisted/failed, elapsed seconds, recoverable errors, assistance,
participant's own risk interpretation, and a 1–5 ease rating. Predefine error categories:
wrong mode, navigation failure, invalid input, misread outcome, unintended action, technical failure.
Keep technical failures separate from usability failures while retaining both in the results.

After tasks ask: “What does Low mean?”, “What does Insufficient Evidence mean?”, “Does a valid
payment CRC verify the recipient?”, “What was confusing?”, “What would you change?”
Code comprehension as correct/partial/incorrect using a written rationale, preserving anonymized quotes.
Do not reinterpret an answer as correct to improve results.

## Analysis and reporting
Report counts with denominators, median/range times among completed tasks, assistance/failure counts,
error types, ease distributions and a small theme table with anonymized quotes. Publish no invented
participants, SUS scores or significance tests. The custom five-task protocol is not SUS.
State sample size, recruitment bias, think-aloud effects, familiarity, device coverage, missing tasks,
technical interruptions and no causal claim. Use findings to explain limitations; freeze means only
demonstrated critical usability defects should trigger a late fix.
