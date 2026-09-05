# Task 3 dataset record

## Selected source

SCAMGUARD Task 3 uses **SMS Phishing Dataset for Machine Learning and Pattern Recognition**, version
1, by Sandhya Mishra and Devpriya Soni, published 20 June 2022 on Mendeley Data. DOI:
<https://doi.org/10.17632/f45bkkt8pr.1>. The publisher marks it **CC BY 4.0**. The source describes
5,971 English messages: 4,844 ham, 489 spam and 638 smishing after case-normalizing the labels.

The dataset was selected because its source keeps nuisance/commercial `spam` distinct from
credential- or fraud-oriented `smishing`. SCAMGUARD maps the three labels to `LEGITIMATE`, `SPAM`
and `SCAM`. It never relabels every spam example as a scam. The original archive and extracted CSV
are preserved under `data/raw/mendeley_sms_phishing_v1`; the training script checks the CSV before
using it.

| File | SHA-256 |
| --- | --- |
| Dataset_5971.zip | `9bbf3188fdad81495d8e82825648b9b63b53fc86841a3d26c02629990b233cc3` |
| Dataset_5971.csv | `649844f1c62a6b27e145eaf17a65f7010c56c390e11a794ea8329993a05ba71e` |

The source is real collected research data according to its authors. SCAMGUARD did not generate or
augment rows. Some source messages were transcribed from online images and the file contains OCR,
encoding and labeling artifacts. Public availability and CC BY licensing do not establish that
every embedded phone number, URL or personal fragment is suitable for display. The application
never presents training rows, and the dataset must not be used as production activity.

## Cleaning and leakage controls

`backend/scripts/train_message_model.py` is deterministic with seed `20260905`. It:

1. verifies the reviewed source checksum;
2. trims labels and maps only ham/spam/smishing;
3. normalizes Unicode, case and whitespace solely for duplicate grouping;
4. drops every normalized text group carrying conflicting labels;
5. keeps one row from same-label exact duplicate groups;
6. clusters near duplicates at cosine similarity 0.92 using character 4–5 gram TF-IDF;
7. assigns whole clusters to stratified train/validation/test partitions; and
8. leaves the test partition untouched until one model family is selected on validation results.

The audit retained 5,797 rows after removing 106 same-label duplicates and 68 rows in conflicting
label groups. It found 143 near-duplicate clusters, largest size 5. The resulting split is 3,477
train, 1,160 validation and 1,160 test. Hash-only membership is in
`data/processed/message_split_manifest_v1.csv`.

## Bias and limits

The dataset is heavily imbalanced (4,834 LEGITIMATE, 435 SPAM, 528 SCAM after cleaning), mainly
English, SMS-oriented, historical, and not representative of every region, language, platform or
current campaign. It can encode collection-source, OCR, vocabulary, geography and time biases.
The classifier may miss new tactics and may overreact to familiar words. Metrics cannot establish
sender identity, URL safety or universal performance. Future data changes need a new immutable
source record, license review, split manifest, versioned artifact and untouched evaluation.

The UCI SMS Spam Collection was also reviewed: it is a genuine 5,574-message CC BY 4.0 ham/spam
corpus (<https://doi.org/10.24432/C5CC84>), but its binary label cannot preserve the required
spam-versus-scam distinction. It was therefore not merged into Task 3 training data.
