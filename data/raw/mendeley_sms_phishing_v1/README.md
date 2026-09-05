# Mendeley SMS Phishing Dataset, version 1

This directory preserves the unmodified source archive and extracted CSV used for SCAMGUARD's
Task 3 message-classifier experiment.

- Dataset: **SMS Phishing Dataset for Machine Learning and Pattern Recognition**
- Authors: Sandhya Mishra and Devpriya Soni
- Version/published: version 1, 20 June 2022
- DOI: <https://doi.org/10.17632/f45bkkt8pr.1>
- Source page: <https://data.mendeley.com/datasets/f45bkkt8pr/1>
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Original archive SHA-256: `9bbf3188fdad81495d8e82825648b9b63b53fc86841a3d26c02629990b233cc3`
- Extracted CSV SHA-256: `649844f1c62a6b27e145eaf17a65f7010c56c390e11a794ea8329993a05ba71e`

The source describes 5,971 English messages labeled ham, spam or smishing. SCAMGUARD maps those
labels to `LEGITIMATE`, `SPAM` and `SCAM`; spam is deliberately not treated as scam. The collection
is strongly imbalanced and contains duplicates, conflicting labels, OCR/encoding artifacts and
geographically/temporally narrow language. See `docs/DATASETS.md` and the reproducible training
script for the exclusions and split controls.

Do not edit files in this directory. Derived manifests, reports and model artifacts must be
regenerated from the script rather than hand-modifying this source.
