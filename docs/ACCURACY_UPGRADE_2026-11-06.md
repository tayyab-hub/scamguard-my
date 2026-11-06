# Accuracy upgrade — 6 November 2026

Supervisor feedback: the Message score relied on keywords, so conversational scams without trigger
words could come back as Low, and the score itself was not meaningful. This upgrade addresses both
for Message, and applies the same audit to URL, Phone and QR. It is free and fully local: no paid
API, no new dependency, no network request to any submitted content. No trained model artifact
was retrained; no database migration was needed.

Machine-readable evidence: [Message evaluation](message_upgrade_evaluation_v3.json),
[Message calibration](message_fusion_v3_evaluation.json),
[URL evaluation](url_upgrade_evaluation_v3.json), and the
[independent challenge set](../data/challenge/README.md).

## What was wrong (measured before changing anything)

| Engine | Finding |
| --- | --- |
| Message | The model is 96.9% accurate on held-out SMS, but the hand-weighted fusion (`0.52 × model + 0.48 × rules`) capped model-only warnings below Elevated. Only 18 of 106 real scams reached High. "Hi mum, new number…", wrong-number and boss-favour scams scored Low. |
| URL | The model's legitimate training URLs were all bare homepages, so it learned "has a path → phishing". Every legitimate link with a path was warned; 97.8% of phishing URLs stopped at Caution and none reached High. Brand checks covered only four global brands. |
| Phone | Only premium-rate numbers were warned; satellite/international-network, VoIP and UK personal-forwarding numbers, often used to disguise callers, were not. Local numbers without +60 were rejected without guidance. |
| QR | A payment QR whose recipient is named after a bank, LHDN or a "refund" was not flagged, and SMS payloads were never assessed. |

## What changed

### Message — `message-rules-v3` + `message-fusion-v3`

- **Scam-tactic detection.** New rule families describe *how* scams operate rather than alarm
  words: claimed new number or lost phone, unsolicited or wrong-number contact, moving to another
  app, discreet favours, gift cards/crypto, personal money requests (including money-mule
  phrasing), unsolicited earning/investment offers, personal-data requests and upfront fees.
  Documented playbooks combine them (for example a new-number claim plus a money request).
  Malaysian authority names and some Malay phrasing were added.
- **Calibrated score.** A logistic calibrator learned from out-of-fold predictions on
  train+validation (`backend/scripts/calibrate_message_fusion.py`) turns model probabilities and the
  rule score into a calibrated share of similar historical messages that were scams. Fixed,
  pre-declared bands: Caution ≥ 5, Elevated ≥ 35, High ≥ 70. The artifact
  (`message_fusion_v3.json`) is JSON and checksum-pinned.
- **Policy safeguards.** A model-only warning can reach Elevated but not High. A single
  conversational tactic is at least Caution; a documented playbook is at least Elevated or High.
  Genuine notices that only warn ("do not share this code") or inform and point to a channel the
  reader already has (statement ready, licence expiry, delivery status) are capped at Caution.
- **Honest wording.** Low now says no known pattern was found and that this does not confirm the
  message is genuine. Each tactic adds a specific action (for example "call the person on the
  number you already have saved").

### URL — `url_rules_v3` + `url_fusion_v3`

- **Host-only model input.** The unchanged `url_ml_v1` model now judges `scheme://host/` only,
  comparing like with like; paths are left to the rules.
- **Offline brand-impersonation detector** (`url_intelligence/brands.py`): about 40 Malaysian and
  global brands with official domains; checks for a brand inside an unofficial domain, look-alike
  spelling (edit distance and confusable-character skeleton, including Cyrillic), an official domain
  used as a subdomain disguise, and brand names in subdomains or paths.
- **Free hosting, tunnelling and frequently abused endings**, more shorteners, and numeric hosts
  with login or brand wording.
- **Fusion.** Two meaningful families, or one confirmed by a strongly phishing-like host, is High;
  one meaningful family is Elevated; weak evidence on a strongly phishing-like host is Elevated;
  weak evidence alone never reaches High. Listed official domains with only weak signals are Low.

### Phone — `phone-rules-v2`

VoIP, personal-forwarding, pager and universal-access types and satellite/international-network
codes (+870, +881, +882, +883, +979) are Caution with an explanation that legitimate services use
them too. Malaysian landlines get guidance that caller ID can be spoofed in police/court/bank
scams. Local input such as `012-345 6789` now returns a hint (`try +60123456789`) instead of a bare
rejection; the user still resubmits explicitly.

### QR — `qr-risk-fusion-v3`, `qr-payload-classifier-v3`

A payment recipient named after a brand whose embedded link is not on that brand's official
domains is at least Elevated; a recipient named after an authority, tax, refund or fine is at least
Caution. `sms:`/`SMSTO:` payloads route the message body to Message, or the number to Phone.

## Results

### Message (AI review disabled)

| Historical test split (1,160 untouched rows) | Before | After |
| --- | ---: | ---: |
| Scams warned (Caution or above) | 95.3% | **100%** |
| Scams Elevated or High | 56.6% | **92.5%** |
| Scams High | 17.0% | **53.8%** |
| Genuine messages warned | 0.3% | 1.3% |
| Genuine messages Elevated or High | 0.0% | 0.2% |

Calibrator alone on the same split: expected calibration error 0.009 (10 bins), Brier 0.013.

| Independent challenge set, holdout half (45 scams, 46 genuine, never inspected) | Before | After |
| --- | ---: | ---: |
| Scams warned | 26.7% | **53.3%** |
| Scams Elevated or High | 13.3% | 20.0% |
| Genuine messages warned | 10.9% | 50.0% |
| Genuine messages Elevated or High | 0.0% | 6.5% |

The challenge set (202 messages, 79 of 90 scams without classic trigger words) was written
separately without access to the rules. Errors were inspected only on its odd-numbered half; the
even-numbered half is the fair estimate. On that development half the upgrade warned 95.6% of
scams, which shows how much rule writing fits what it has seen.

### URL (untouched PhiUSIIL test split, 36,901 URLs)

| | Before | After |
| --- | ---: | ---: |
| Phishing Elevated or High | 0.2% | **51.9%** |
| Phishing High | 0.0% | 2.3% |
| Phishing warned | 98.0% | 96.4% |
| Legitimate homepages warned | 2.5% | **0.7%** |
| Legitimate links with an ordinary path warned (2,000-row robustness slice) | 100% | **22.2%** |
| Legitimate links with a path Elevated or High | 0.0% | 0.1% |

## Limitations to state in the report

- Word-pattern rules generalise only partly. On unseen conversational scams about half still score
  Low, and many genuine conversational or service messages receive a "verify first" Caution. Text
  alone cannot distinguish some scams from genuine messages (a real "new number" text looks the
  same), which is why Caution plus independent verification is the honest output.
- The score is calibrated on one historical, mainly English SMS dataset. It is not a real-world
  fraud probability for a particular sender. Tactic floors set a band minimum and are policy, not
  a measured rate.
- The challenge set is synthetic, single-author and small; it is a stress test, not a prevalence
  sample.
- The URL model still has its training bias; host-only input reduces the effect but popular hosts
  can still be misjudged (for example `github.com/login` can reach Elevated). The brand list is
  reviewed by hand and must be maintained.
- Next improvement: a meaning-based model (sentence embeddings) or an optional AI reviewer for
  borderline messages, evaluated on the same holdout half.

## Reproduce

```powershell
backend\.venv\Scripts\python.exe backend\scripts\calibrate_message_fusion.py
backend\.venv\Scripts\python.exe backend\scripts\evaluate_message_upgrade.py --backend backend --label current
backend\.venv\Scripts\python.exe backend\scripts\evaluate_url_upgrade.py --backend backend --label current
```

To compare with the previous release, run the two evaluation scripts with `--backend` pointing at a
checkout of commit `f83b6c1`.
