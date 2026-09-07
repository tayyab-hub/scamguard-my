# URL model evaluation — url_ml_v1

The model is a binary **URL-string classifier**, not a webpage detector or calibrated scam-probability estimator. See [dataset provenance and limitations](URL_DATASETS.md) and the complete [machine-readable report](url_model_evaluation_v1.json). Measurements below were actually produced on 2026-09-07.

## Fixed candidates and selection

All candidates train on 164,074 records; selection uses only the 33,699-record domain-held-out validation partition. No parameter search or test-driven tuning was performed. sklearn 1.9.0, Python 3.12, fixed seed 20260907; exact installed dependencies are locked.

| Candidate | Configuration | Validation macro F1 |
| --- | --- | ---: |
| Logistic regression | StandardScaler; balanced class weights; max_iter 2000 | 0.972837 |
| Linear SVM | StandardScaler; balanced class weights; dual=False; max_iter 10000 | 0.971271 |
| Random forest (selected) | 120 trees; max_depth 12; min_samples_leaf 10; balanced class weights; n_jobs 2 | 0.987783 |

No post-selection retraining on validation/test is performed. All 27 features are recomputed from strings by the shared `features.py`: URL/host/path/query lengths, dot/subdomain/path/query counts, digit fraction, hyphens, percent escapes, encoded delimiters, double encoding, IP/punycode/unusual-port/HTTPS flags, keyword count, host/path entropy, redirect count, shortener/userinfo/nonstandard-host flags, longest alphanumeric token, equals and underscores. No HTML, TLS certificate, DNS, IP reputation, popularity, supplied UCI derived feature or destination request is used. No character-ngram candidate was necessary for this first compact structural baseline.

## Held-out test measurements

36,901 records; rows were unseen during training/selection and their domain groups were absent from both other partitions. Class mapping: source 1→LEGITIMATE; source 0→PHISHING. PHISHING does not imply every form of malware/scam is represented.

| Class | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| LEGITIMATE | 0.976817 | 0.995535 | 0.986088 | 19,935 |
| PHISHING | 0.994633 | 0.972239 | 0.983308 | 16,966 |
| Macro average | 0.985725 | 0.983887 | 0.984698 | 36,901 |
| Weighted average | 0.985009 | 0.984824 | 0.984810 | 36,901 |

Accuracy: 0.984824. Confusion matrix (rows=true; columns=predicted):

| | LEGITIMATE | PHISHING |
| --- | ---: | ---: |
| LEGITIMATE | 19,846 | 89 |
| PHISHING | 471 | 16,495 |

False-positive rate among source legitimate test URLs: 89/19,935 = 0.4465%. False-negative rate among source phishing URLs: 471/16,966 = 2.7761%. All 89 false positives were HTTPS root/no-query URLs, averaging about 31 hostname characters and 1.20 hyphens. All 471 false negatives used HTTPS and empty/root paths; they averaged about 23 hostname characters and 0.18 hyphens. One had a query. These cohort summaries are measured feature associations, not causal explanations or evidence that HTTPS guarantees safety.

## Main limitation: collection bias

Every legitimate training URL is an HTTPS homepage with no query, while only 48.22% of phishing training URLs use HTTPS. Therefore these high held-out metrics **do not estimate performance on ordinary legitimate deep links, private networks, current phishing campaigns, or arbitrary geography/language**. A long legitimate query can strongly activate the model's phishing class. Current fusion caps ML alone and any collection of weak indicators at Caution; it requires independent meaningful evidence families for higher risk. Tests explicitly protect benign length/query/encoding/port/IDNA cases from automatic High risk.

There is no probability calibration, current external dataset validation, temporal evaluation or campaign-held-out guarantee. Classifier strength is the largest average forest class mass and may reach 1.0; it is not certainty about the URL. Final categorical risk is a separate versioned decision-support policy. No precision/recall metric is claimed for final fused risk because the source's binary labels do not define that five-level policy.

## Deployment, integrity and reproduction

Artifact: `backend/app/url_intelligence/artifacts/url_model_v1.json` (1,515,138 bytes).

SHA-256: `87a61a0bbee6921a590b6feeeecdd00335f9dcdb2087ff412958a4d66b16f698`.

Plain JSON stores tree children, feature indexes, thresholds and leaf class mass with ordered features/classes/version. The loader verifies the pinned checksum and version; it never unpickles executable content. Inference reproduces sklearn's float32 input comparisons. Export confidence agrees within 1e-12 on 512 validation rows. Independent deployed inference on every test row reproduces the exact confusion matrix above.

`train_url_model.py --verify` retrains the frozen candidates and asserts byte-for-byte artifact equality. This was run successfully after fixing output to canonical LF line endings; feature/model selection and metrics did not change. `verify_url_pipeline.py` checks processed hashes, URL/domain isolation and deployed held-out results. These are reproduction checks, not additional model selection. Future data/features/dependency/model changes require a new version and fresh reviewed evaluation.
