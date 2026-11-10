# Message detector upgrade — 10 November 2026

Model `message-tfidf-logreg-v2`, rules `message-rules-v4` and fusion `message-fusion-v4` replace
v1 / v3 / v3. The upgrade was planned from an [error analysis](ERROR_ANALYSIS_2026-11-09.md) of
the second challenge set and measured once on a third, sealed set.

## What changed

| Area | Change |
| --- | --- |
| Training data | 1,377 Malay and Manglish translations of training-split messages from the CC BY 4.0 Mendeley SMS dataset ([data card](../data/processed/malay_translation/README.md)). No public Malay SMS scam dataset was found. |
| Model v2 | Same TF-IDF + logistic regression recipe, trained on English plus translations (6,014 rows, 30,000 features). Malay function words ("anda", "untuk", "yang" …) are ignored, because only the scam and spam originals were formal and the model would otherwise treat formal Malay as a scam sign. Untouched English test macro F1 0.896 (v1: 0.895). [Evidence](model_evaluation_v2.json). |
| Rules v4, fewer false alarms | Protective wording in English and Malay ("does not ask", "tidak meminta", "jangan kongsi", "no payment needed"); links the URL engine recognises as official or well known are not redirection evidence and are listed as tempering evidence; a lone bank or brand name adds no weight; narrower patterns ("per day", "password was changed"). |
| Rules v4, new tactics | Passing on a received code, "safe account" transfers, renting out a bank account, wrong-transfer refunds, fees before release ("duti setem", "top up to unlock"), IC/ATM card/password requests from a claimed authority, Malay threats, urgency and secrecy. |
| Fusion v4 | Calibrator re-fitted on English development rows plus translations (a translation shares its source's fold group); same fixed bands; new tactic floors. [Evidence](message_fusion_v4_evaluation.json). |
| Frontend | Scores from fusion v3 or later are labelled "Calibrated risk score". |

## Result on the sealed challenge set v3 (single evaluation)

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

## Honest reading

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

## Limitations

- Translations are machine-made from mostly UK SMS (2007–2012): Malay wording, not Malaysian
  context. Malaysian playbooks are covered by rules.
- v3 is synthetic, single-author and small; one author family (AI) wrote v3 and the translations.
- The optional AI reviewer was off for all measurements.

## Reproduce

```
backend\.venv\Scripts\python.exe backend\scripts\train_message_model_v2.py
backend\.venv\Scripts\python.exe backend\scripts\calibrate_message_fusion_v4.py
backend\.venv\Scripts\python.exe backend\scripts\evaluate_message_upgrade.py --backend backend --label current --challenge-v2
```

(Run the first two with `PYTHONPATH=backend/scripts`. Retraining rewrites the artifacts; update the
pinned checksums in `app/ml/classifier.py` and `app/ml/fusion.py` if they change.)

## Next

1. Add genuine institutional notices (English and Malay) to training, then measure on a new
   sealed set v4.
2. Find out why genuine messages with official links are still warned (needs v4 to measure).
3. Add the evaluation to CI with minimum scores.
