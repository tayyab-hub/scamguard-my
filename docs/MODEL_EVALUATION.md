# Message model evaluation

Model version: `message-tfidf-logreg-v1`. Artifact SHA-256:
`818d99f72c8502fe6ec28849e42c77f4707949366bf014bd5677079dde2c3dd3`.
Machine-readable results are preserved in `docs/model_evaluation_v1.json`.

All candidates use the same training-only word 1–2 gram TF-IDF features: Unicode accent stripping,
lowercasing, sublinear term frequency, L2 normalization, minimum document frequency 2 and maximum
20,000 features. Class weighting is used for Logistic Regression and Linear SVM. Candidate choice
uses validation macro F1; no test result was used to select the model.

| Candidate | Validation macro F1 | Validation weighted F1 |
| --- | ---: | ---: |
| Logistic Regression | **0.8861** | **0.9626** |
| Linear SVM | 0.8723 | 0.9588 |
| Multinomial Naive Bayes | 0.8413 | 0.9446 |

Logistic Regression won and also produces interpretable class probabilities. It was refit on the
combined train and validation partitions, then evaluated once on the untouched test partition.

| Test class | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| LEGITIMATE | 0.9928 | 0.9928 | 0.9928 | 967 |
| SPAM | 0.8068 | 0.8161 | 0.8114 | 87 |
| SCAM | 0.8857 | 0.8774 | 0.8815 | 106 |
| Macro average | 0.8951 | 0.8954 | **0.8952** | 1,160 |
| Weighted average | 0.9690 | 0.9690 | **0.9690** | 1,160 |

Accuracy is 0.9690. Confusion matrix, rows actual and columns predicted in
`LEGITIMATE, SPAM, SCAM` order:

```text
[[960,  4,  3],
 [  7, 71,  9],
 [  0, 13, 93]]
```

These are genuine held-out results for this exact artifact and dataset split. They are not live
production accuracy, a claim of universal calibration or a guarantee for a particular message.
Minority-class support is small, and the data limitations in `docs/DATASETS.md` apply.

The runtime artifact is deterministic JSON containing vocabulary, IDF values, class order,
coefficients, intercepts and training metadata. Loading verifies a hard-coded SHA-256 and schema
dimensions. No pickle/joblib object is loaded, so inference does not execute serialized Python.
Regenerate with:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -e '.[ml]'
cd ..
backend\.venv\Scripts\python.exe backend\scripts\train_message_model.py
```

Regeneration is expected to reproduce the checked-in artifact under the pinned dependency lock.
Any dataset, preprocessing, split, dependency or hyperparameter change requires a new model version,
fresh validation selection, untouched test evaluation and documentation review.
