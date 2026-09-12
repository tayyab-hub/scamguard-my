# Final evaluation methodology and findings
Date: 2026-09-12. This separates functional correctness from security, model performance, human
usability and operational reliability. Passing software tests does not prove scam-detection accuracy.

| Dimension | Method / evidence | What it establishes | What it cannot establish |
| --- | --- | --- | --- |
| Functional | Unit/API tests, real *_test PostgreSQL migration/ownership tests, three browser suites; FINAL_TEST_REPORT.md | Selected contracts, failure paths and persisted workflows | Exhaustive correctness or all production environments |
| Security | Source review, negative tests, A/B isolation, network guards, secret scan; SECURITY_REVIEW.md | Tested boundaries and specific fixes | Independent penetration test, complete absence of vulnerabilities |
| Intelligence | Frozen held-out model reproduction plus controlled local fixtures | Dataset-specific classification and selected parsing/rule/routing behavior | Population fraud accuracy or calibration of final fused risk |
| Usability | Five-task volunteer protocol, blank results template | A reproducible study design | No findings yet: NOT YET CONDUCTED |
| Performance/reliability | Build inventory, 30 warm local calls per modality, production public smoke, query/lifecycle inspection | Size and narrow latency/resource evidence | Enterprise load capacity, SLA or cold-start distribution |

## Message: frozen held-out reproduction
Source: Mishra and Soni's 2022 Mendeley v1 SMS Phishing dataset, CC BY 4.0.
The [publisher record](https://data.mendeley.com/datasets/f45bkkt8pr/1) supplies 5,971
ham/spam/smishing examples. This is historical source data, not current scam prevalence.

Cleaning retained 5,797 rows: 4,834 LEGITIMATE, 435 SPAM, 528 SCAM; 106 duplicates and 68
conflicting-label rows removed. Near-duplicate groups remain within one split. Seed 20260905:
3,477 train / 1,160 validation / 1,160 test. Word 1–2 gram TF-IDF, lowercasing/accent stripping,
sublinear TF, L2 normalization, min_df 2, max 20,000 features; class-weighted Logistic Regression
selected over Linear SVM and Multinomial NB by validation macro F1, then refit on train+validation.
Details, candidate metrics and manifests: DATASETS.md and MODEL_EVALUATION.md.

Task 9 independently invokes the frozen deployed JSON inference on the original test memberships,
verifying source/manifest hashes and group isolation. It reproduces the original matrix; no
retraining, test-driven tuning, new split or new independent dataset is claimed.

| Class | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| LEGITIMATE | 0.992761 | 0.992761 | 0.992761 | 967 |
| SPAM | 0.806818 | 0.816092 | 0.811429 | 87 |
| SCAM | 0.885714 | 0.877358 | 0.881517 | 106 |
| Macro average | 0.895098 | 0.895404 | 0.895235 | 1,160 |

Accuracy 0.968966; weighted F1 0.968996. Rows actual, columns predicted:
LEGITIMATE / SPAM / SCAM: `[[960,4,3],[7,71,9],[0,13,93]]`.
These are classifier-label metrics, not precision/recall of the five-level final fusion policy.
Risks include historical English SMS bias, OCR/source artifacts, imbalance, small minority supports,
unseen scam language, multilingual/temporal shift and no probability calibration.

## URL: learned and deterministic components are distinct
The implementation includes a 120-tree random forest on 27 locally derived URL-string features,
in addition to deterministic rules and conservative fusion. It must not be described as wholly
deterministic, nor may rule fixture pass rates be presented as learned-model accuracy.
[UCI PhiUSIIL](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset)
contains 235,795 labelled examples and is CC BY 4.0. SCAMGUARD uses URL+label, not supplied
webpage/derived features. After cleaning: 234,674 rows, split by domain, fixed seed 20260907.

Task 9 verified all prepared hashes, 197,700 isolated domain groups and reproduced all 36,901
held-out runtime predictions: `[[19846,89],[471,16495]]`, LEGITIMATE / PHISHING order.
Accuracy 0.984824, macro F1 0.984698, weighted F1 0.984810. Per-class supports/precision/recall
and candidates are in URL_MODEL_EVALUATION.md. All legitimate training examples are HTTPS
homepages without queries: serious collection bias limits real-world interpretation.
No calibrated fraud probability or measured five-level fusion accuracy is claimed.
The 13 controlled cases in CONTROLLED_EVALUATION.md separately check structural evidence,
parsing/rejection and conservative outputs; they are authored behavior fixtures, not an independent
labelled URL benchmark. No fixture URL is fetched.

## Phone
Ten controlled cases check E.164, country/region, service type, invalid/ambiguous input rejection,
and conservative risk. Ordinary mobile/fixed/foreign/VoIP numbers remain Insufficient Evidence;
premium/shared-cost metadata yields Caution only. No fraud accuracy metric is appropriate:
phone metadata cannot identify the subscriber, caller, spoofing or fraud. No number is contacted.

## QR and payment
Fifteen controlled QR cases exercise exact decode/classification/routing or safe rejection,
including plain text, unknown/unsafe schemes, no-code and multiple-code images.
Synthetic PNGs are generated with the same library family used by the decoder: this is controlled
functional evidence, not an independently sampled image/camera accuracy benchmark.
Decoding/classification is separate from the underlying engine's risk judgment.

Four payment consistency/rejection cases pass. A fifth diagnostic documents a known limitation:
a valid-CRC payload missing merchant fields still passes the generic subset check.
This is not complete EMV compliance validation. CRC demonstrates integrity consistency only,
not a legitimate merchant, safe payment, valid recipient or absence of fraud.

## Reproduction and evidence integrity
From repository root:
```powershell
.\backend\.venv\Scripts\python.exe backend/scripts/evaluate_final.py
.\backend\.venv\Scripts\python.exe backend/scripts/verify_url_pipeline.py
```
The first writes authored demo assets and docs/evidence/final_evaluation.json, blocks socket/DNS
access and uses no database or local environment secrets. The second verifies the frozen URL
experiment without retraining. Preserve raw JSON alongside the narrative. Repeated runs are
reproduction, not additional held-out evidence. Raw Message CSV CRLF bytes are intentionally
preserved by .gitattributes to match the publisher checksum.
