# Limitations and boundaries
These limits are part of the final result, not footnotes to hide in the presentation.

- **Message:** Historical, mainly English SMS data; OCR/source artifacts, imbalance and small spam/scam
  test supports. Evolving language, multilingual and cross-platform shift are unmeasured. False
  positives/negatives persist. Classifier confidence is uncalibrated; final risk has no independently
  labelled real-world evaluation.
- **URL:** URL strings are parsed locally. No destination fetch, HTML, live DNS/TLS investigation,
  active reputation feed or verified maliciousness. Structural indicators also occur in benign links.
  A learned forest exists, but its high held-out result is affected by substantial homepage/HTTPS
  collection bias. Domains are held out; campaigns/time/geography are not established.
- **Phone:** Metadata is not identity or fraud. No subscriber lookup, contact, spoofing detection,
  reputation or verified scam-report corpus. Numbering metadata can age; premium rates are a cost
  concern, not a scam verdict. No Phone fraud score is invented.
- **QR:** Successful decoding is not maliciousness detection. Supported payloads inherit routed-engine
  limits; unknown structures stay insufficient. Synthetic image tests and Chromium emulation do not
  demonstrate physical iPhone/Safari/Android/webcam performance. Camera provenance is client-reported.
  A first fallback scan needs a 1.09 MB raw WASM asset.
- **Payment:** Generic TLV/CRC subset, not full scheme/EMV compliance. Missing merchant fields can still
  pass this subset. CRC does not verify merchant identity, account ownership or safe payment.
  Credential redaction can change stored payment text; checks describe the original input.
- **Optional AI:** Backend-only and disabled by default; normal evaluation uses local engines only.
  External-provider behavior is mocked in regression, live provider test is skipped. Redaction is
  best-effort and cannot make arbitrary sensitive text safe to share.
- **Authentication/privacy:** No MFA, independently measured timing resistance or comprehensive
  penetration test. Basic application rate limits are not DDoS protection. Analysis content remains
  private sensitive data; arbitrary secrets cannot all be detected. Task 9 redaction is not deployed
  until owner review/merge, and does not retroactively rewrite records.
- **Operations:** Free Render instance may sleep/cold-start. No HA/failover, enterprise-scale load,
  disaster-recovery exercise, independently verified backup retention/purge or inbox deliverability
  assessment. Resend test sender/domain restrictions must be checked before demonstrating recovery.
  Sync analysis has no queue/idempotency key; a lost response after commit requires checking History.
- **Usability/accessibility:** No real volunteer study yet. Owner's “it's working” is informal
  acceptance only. Reviewed against relevant accessibility practices; no WCAG certification or
  comprehensive assistive-technology audit. Local visual/keyboard checks have a limited sample.
- **Academic scope:** No community/campaign/adaptive-learning platform, general OCR or cross-modal
  probability is implemented. “Reporting” in the formal project title refers to explainable analysis
  records; a public scam-report submission/moderation workflow must not be implied.

These limits constrain deployment and claims. See EXAMINER_REVIEW.md for priorities rather than
presenting a blanket “production ready” or “high-distinction guaranteed” conclusion.
