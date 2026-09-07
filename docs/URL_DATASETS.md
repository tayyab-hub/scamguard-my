# URL dataset provenance

Accessed 2026-09-07. The only dataset used is **PhiUSIIL Phishing URL (Website)** by Arvind Prasad and Shalini Chandra, published through the [official UCI record](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset). It was donated 2024-03-03. The associated 2024 Computers & Security paper is [PhiUSIIL: A diverse security profile empowered phishing URL detection framework based on similarity index and incremental learning](https://doi.org/10.1016/j.cose.2023.103545). UCI explicitly licenses the dataset under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit the creators and note SCAMGUARD's filtering, feature derivation and split changes when redistributing derived data.

The source has 235,795 rows: 134,850 legitimate (`label=1`) and 100,945 phishing (`label=0`). It includes actual URL strings and 54 reported features, covering URL, webpage-content and derived similarity/probability information. SCAMGUARD reads only URL and label; no supplied feature column is used. The UCI overview does not specify exact per-row collection dates, country or language distribution; these remain unknown. Donation/publication dates are not collection timestamps. No temporal or country-specific performance claim is justified.

## Research selection

Also reviewed [UCI Phishing Websites](https://archive.ics.uci.edu/dataset/327/phishing): 11,055 records and 30 categorical engineered features, including content/external signals. It was not used because its published feature table does not supply the raw URL strings needed to reproduce this local feature boundary. No Kaggle mirror or unlicensed collection was used. No URL contained in either source was visited.

## Immutable source and reproduction

`data/url/raw/phiusiil.zip` is the unmodified archive from UCI's linked download. SHA-256:

`0a639fd03aea6308c5b1c10c92aa23c2ce1505447a9137271865cd0badc9a59a`

It remains compressed; the preparation script reads its CSV as inert text without extracting executable files. The downloader is an explicit research setup action, not part of application or inference runtime. The parser uses the pinned offline PSL snapshot.

From repository root, with the locked backend ML dependencies installed:

```powershell
.\backend\.venv\Scripts\python.exe backend/scripts/prepare_url_dataset.py
.\backend\.venv\Scripts\python.exe backend/scripts/train_url_model.py --verify
.\backend\.venv\Scripts\python.exe backend/scripts/verify_url_pipeline.py
```

The first command checks the raw archive checksum, validates every URL, maps 1→LEGITIMATE and 0→PHISHING, deduplicates analytical URLs, removes conflicting groups, and splits by registrable domain. The second reproduces fixed-candidate selection and requires an exact existing artifact match. The third independently checks all processed CSV hashes, URL uniqueness, domain isolation and the deployed JSON model's complete held-out confusion matrix. Outputs use LF line endings for clone/platform stability.

## Actual preparation statistics

| Stage | Rows |
| --- | ---: |
| Original | 235,795 |
| Invalid under the supported application parser/limit | 13 |
| Duplicate rows beyond each first normalized URL | 1,107 |
| Conflicting normalized groups removed after duplicate detection | 1 |
| Final unique labelled records | 234,674 |

Final labels: 134,849 LEGITIMATE and 99,825 PHISHING. There is no synthetic augmentation, private-history reuse or label relabelling based on heuristics.

| Partition | Rows | LEGITIMATE | PHISHING | Unique domain groups |
| --- | ---: | ---: | ---: | ---: |
| Train | 164,074 | 94,755 | 69,319 | 138,389 |
| Validation | 33,699 | 20,159 | 13,540 | 29,656 |
| Test | 36,901 | 19,935 | 16,966 | 29,655 |

Seed: 20260907. GroupShuffleSplit holds out 15% of groups for test and 15/85 of the remaining groups for validation. These are group fractions, not exact row fractions; uneven domain sizes explain the observed counts. Candidate selection uses validation macro F1 only. The test set was evaluated after selection; later runs reproduce the same frozen experiment and verify export fidelity, not tune candidates.

## Leakage controls and limitations

Exact analytical duplicates (including scheme/host/default-port/trailing-dot equivalents, fragments and userinfo differences) are removed before splitting. Conflicting labels remove the whole normalized group. All paths, queries and subdomains of the same registrable domain stay together; private PSL tenants count as separate domain groups. IP/unknown suffix cases group by hostname. A manifest records source row number, URL hash, domain hash, label and split without duplicating raw URLs. Verification found 197,700 domain groups, with zero cross-partition domain overlap and zero duplicate analytical URL hashes.

Cross-domain phishing kits/campaign templates can still overlap. There is no reliable timestamp/campaign ground truth for a temporal or campaign split. A domain-held-out split reduces an important leakage route but is not a complete real-world generalization guarantee. Do not claim all near duplicates across unrelated domains were eliminated.

The measured training distribution is severely biased: **100% of legitimate records are HTTPS root pages without queries**, versus about 48.22% HTTPS and 70.06% root/no-query among phishing records. This makes many ordinary deep links out of distribution and can inflate source-held-out scores. It is the main reason ML alone cannot drive elevated/high risk. IDNA, IP, unusual-port and international examples have limited representativeness. No geographic/language balance is established, and the small English keyword/brand sets are not multilingual coverage.

Detailed hashes and counts are in `data/url/processed/statistics_v1.json`; model/error analysis is in [URL_MODEL_EVALUATION.md](URL_MODEL_EVALUATION.md).
