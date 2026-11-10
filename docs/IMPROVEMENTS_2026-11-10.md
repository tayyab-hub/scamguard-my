# Message detector upgrade — 10 November 2026

**Deployed build:** model `message-tfidf-logreg-v3`, rules `message-rules-v4`, fusion
`message-fusion-v5` (round 2 below). They replace v1 / v3 / v3. The upgrade was planned from an
[error analysis](ERROR_ANALYSIS_2026-11-09.md) of the second challenge set and was measured in
two rounds, each once on its own sealed set: round 1 (model v2, fusion v4) on challenge set v3,
round 2 on challenge set v4. Round 1 was never deployed.

## Round 1: what changed

| Area | Change |
| --- | --- |
| Training data | 1,377 Malay and Manglish translations of training-split messages from the CC BY 4.0 Mendeley SMS dataset ([data card](../data/processed/malay_translation/README.md)). No public Malay SMS scam dataset was found. |
| Model v2 | Same TF-IDF + logistic regression recipe, trained on English plus translations (6,014 rows, 30,000 features). Malay function words ("anda", "untuk", "yang" …) are ignored, because only the scam and spam originals were formal and the model would otherwise treat formal Malay as a scam sign. Untouched English test macro F1 0.896 (v1: 0.895). [Evidence](model_evaluation_v2.json). |
| Rules v4, fewer false alarms | Protective wording in English and Malay ("does not ask", "tidak meminta", "jangan kongsi", "no payment needed"); links the URL engine recognises as official or well known are not redirection evidence and are listed as tempering evidence; a lone bank or brand name adds no weight; narrower patterns ("per day", "password was changed"). |
| Rules v4, new tactics | Passing on a received code, "safe account" transfers, renting out a bank account, wrong-transfer refunds, fees before release ("duti setem", "top up to unlock"), IC/ATM card/password requests from a claimed authority, Malay threats, urgency and secrecy. |
| Fusion v4 | Calibrator re-fitted on English development rows plus translations (a translation shares its source's fold group); same fixed bands; new tactic floors. [Evidence](message_fusion_v4_evaluation.json). |
| Frontend | Scores from fusion v3 or later are labelled "Calibrated risk score". |

## Round 1: result on the sealed challenge set v3 (single evaluation)

`data/challenge_v3` (237 messages; 51% Malay or Manglish) was written by an independent AI
assistant with no access to the detector, earlier sets or the error analysis. Its messages were
never read during development. "Before" was recorded on 9 November before any code change;
"after" was run once on 10 November when all changes were final. AI reviewer and phishing feed
off. Files: [before](../data/challenge_v3/baseline_before_changes.json),
[after](../data/challenge_v3/result_after_changes.json).

| Measure | Before | After |
| --- | --- | --- |
| Scams warned (Caution or above) | 72.5% | **86.3%** |
| Scams at Elevated or High | 41.2% | **55.9%** |
| Scams missed (Low) | 27.5% | **13.7%** |
| Genuine messages warned | 34.5% | 40.0% (worse) |
| Genuine messages at Elevated or High | 6.4% | 9.1% (worse) |
| Spam warned | 52.0% | 68.0% |

| By language | Before | After |
| --- | --- | --- |
| Malay/Manglish scams at Elevated or High | 25.5% | **56.9%** |
| English scams at Elevated or High | 56.9% | 54.9% |
| English genuine messages warned | 58.5% | **49.1%** |
| Malay/Manglish genuine messages warned | 12.3% | 31.6% (worse) |

After-only slices: scams with a link at Elevated or High 85.2% (27); scams relying on a phone
number 73.3% (15); scams with neither 38.3% (60); genuine messages containing a link warned
66.7% (21).

Regression check on the untouched historical English test split: all scams still warned; scams at
Elevated or High 92.5% → 89.6%; genuine messages warned 1.3% → 1.2%.

## Round 1: honest reading

- **Malay scam detection more than doubled** and half as many scams are missed overall. This is
  the main gain.
- **False alarms did not fall overall; they rose** from 34.5% to 40.0% of genuine messages.
  English genuine messages improved, but Malay genuine messages are warned far more often. The
  old model looked good on Malay genuine messages only because it recognised almost no Malay and
  defaulted to "genuine", which is also why it missed Malay scams.
- **Root cause of the remaining false alarms:** the training data contains almost no genuine
  institutional notices (bank, delivery, government) in any language, so notice-style wording
  resembles scam and spam wording. Two thirds of genuine messages with a link are still warned.
- **Trade-off:** the upgrade favours catching scams over avoiding warnings. A warned genuine
  message costs the reader a verification step; a missed scam can cost money.
- **v3 is now used.** Any further tuning must be measured on a new sealed set (v4).
- Challenge set v2 results (scams at Elevated or High 39.2% → 59.8%) are optimistic because its
  errors were studied; they are not reported as evidence.

## Round 2: genuine notices, official links (model v3, fusion v5)

Round 1 showed the cause of the false alarms: the training data had almost no genuine
institutional notices. Round 2 addressed that before anything was deployed.

| Area | Change |
| --- | --- |
| Training data | 600 written notices ([data card](../data/processed/notices_v1/README.md)): 400 genuine institutional and transactional notices (180 English, 144 Malay, 76 Manglish) and 200 scam imitations of such notices, so the model learns what differs (a request, a lookalike link, a callback number, pressure) rather than the notice style. No public dataset of genuine Malaysian notices was found; these are AI-written. |
| Model v3 | Same recipe as v2 plus the notices (6,614 rows). Untouched English test macro F1 0.904 (v1 0.895, v2 0.896); 103 of 107 held-out notices classified correctly. [Evidence](model_evaluation_v3.json). |
| Fusion v5 | Calibrator re-fitted including the notices. [Evidence](message_fusion_v5_evaluation.json). |
| Official links | Fixed a round-1 defect: links the URL engine labels "Listed official domain" were not recognised as official, so the round-1 link rule rarely applied. Forms and file shares on trusted domains (Google Forms, Drive, OneDrive, Dropbox) are never treated as official. |
| Official-channel notices | When the only way to act on a message is a recognised official site (no phone number, no other link, no request, threat, deadline or tactic), the model's resemblance to scam wording is capped: below Caution, or at Caution when money words appear. |

### Result on the sealed challenge set v4 (single evaluation)

`data/challenge_v4` (240 messages; 50% Malay or Manglish) was written by a further independent AI
assistant with no access to the detector, the earlier sets, the training data or any analysis, and
was not read during development. All three builds were run on it once, on 10 November, after the
round-2 detector and its tests were final. AI reviewer and phishing feed off. Files:
[live build](../data/challenge_v4/result_live_baseline.json),
[round 1](../data/challenge_v4/result_model_v2.json),
[round 2](../data/challenge_v4/result_model_v3.json).

| Measure | Live before (v1/v3/v3) | Round 1 (v2/v4/v4) | Round 2 (v3/v4/v5) |
| --- | --- | --- | --- |
| Scams warned (Caution or above) | 72.0% | 83.0% | **93.0%** |
| Scams at Elevated or High | 47.0% | 57.0% | **76.0%** |
| Scams missed (Low) | 28.0% | 17.0% | **7.0%** |
| Genuine messages warned | 50.4% | 52.2% | **32.2%** |
| Genuine messages at Elevated or High | 11.3% | 17.4% | **5.2%** |
| Spam warned | 56.0% | 60.0% | 48.0% |

| Slice | Live before | Round 1 | Round 2 |
| --- | --- | --- | --- |
| Malay/Manglish scams at Elevated or High | 34.7% | 63.3% | **83.7%** |
| Malay/Manglish scams missed | 44.9% | 20.4% | **4.1%** |
| English scams at Elevated or High | 58.8% | 51.0% | **68.6%** |
| English genuine messages warned | 66.7% | 59.7% | **35.1%** |
| Malay/Manglish genuine messages warned | 34.5% | 44.8% | **29.3%** |
| Scams relying on a phone number, Elevated or High (18) | 33.3% | 50.0% | **83.3%** |
| Scams with a link, Elevated or High (36) | 83.3% | 86.1% | **94.4%** |
| Scams with neither, Elevated or High (46) | 23.9% | 37.0% | **58.7%** |
| Genuine messages with a link warned (28) | 89.3% | 89.3% | **17.9%** |
| Genuine messages without a link warned (87) | 37.9% | 40.2% | 36.8% |

Regression check on the untouched historical English test split: all scams still warned; scams at
Elevated or High 92.5% → 90.6%; genuine messages warned 1.3% → 1.1%.

### Round 2: honest reading

- Round 2 improves **both** directions on unseen messages: missed scams fall from 28% to 7% and
  warnings on genuine messages fall from 50% to 32%.
- **Likely optimistic.** The notices used for training and challenge set v4 were both written by
  AI assistants of the same family (independently, without sight of each other). Their style may
  be closer to each other than to real Malaysian messages, so real-world gains are probably
  smaller. Two of the 240 v4 messages share at least 70% of their words with a training notice;
  none is identical.
- **Still weak:** about a third of genuine messages are warned, almost all at Caution, and
  genuine messages without a link did not improve (36.8%). Seven scams in a hundred are missed,
  and scams with no link or number reach Elevated or High only 59% of the time.
- Four of 25 spam messages are now Elevated and one High; spam is unwanted but not fraud.
- v4 is now used. Further tuning needs a new sealed set.

## Limitations

- Translations are machine-made from mostly UK SMS (2007–2012): Malay wording, not Malaysian
  context. Malaysian playbooks are covered by rules.
- v3 and v4 are synthetic, single-author and small; one author family (AI) wrote the challenge
  sets, the translations and the notices.
- The optional AI reviewer was off for all measurements.

## Reproduce

```
backend\.venv\Scripts\python.exe backend\scripts\train_message_model_v3.py
backend\.venv\Scripts\python.exe backend\scripts\calibrate_message_fusion_v5.py
backend\.venv\Scripts\python.exe backend\scripts\evaluate_message_upgrade.py --backend backend --label current --challenge-v2
```

(Run the first two with `PYTHONPATH=backend/scripts`. Retraining rewrites the artifacts; update the
pinned checksums in `app/ml/classifier.py` and `app/ml/fusion.py` if they change.)

## Next

1. Collect real, consented Malaysian messages (genuine and scam) to replace synthetic notices and
   to build a human-written test set.
2. Reduce Caution on genuine messages without links (conversational false alarms).
3. Add the evaluation to CI with minimum scores.
4. Measure the optional AI reviewer's contribution on a sealed set.
