# message-fusion-v5: the v4 calibration recipe re-fitted for model v3 (adds institutional
# notices: genuine ones and scam imitations, each its own fold group). Development
# data is the English train+validation split plus the Malay/Manglish translations of training
# messages, each translation kept in the near-duplicate group of its English source so folds never
# separate a message from its translation. The English test split is evaluated once at the end.

"""Learn the v5 calibrated Message risk and evaluate it once on the untouched test split.

Run from the repository root::

    backend\\.venv\\Scripts\\python.exe backend\\scripts\\calibrate_message_fusion_v5.py
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import Counter

import numpy as np
from calibrate_message_fusion import (
    BANDS,
    CLASSES,
    FEATURES,
    ROOT,
    SEED,
    categorise,
    feature_row,
    load_rows,
    reliability,
    sha256,
)
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedGroupKFold, StratifiedKFold, cross_val_predict
from train_message_model_v2 import MALAY_FUNCTION_WORDS

sys.path.insert(0, str(ROOT / "backend"))
from app.ml.classifier import MessageClassifier  # noqa: E402
from app.ml.rules import RULES_VERSION, assess_rules  # noqa: E402

FUSION_VERSION = "message-fusion-v5"
MODEL_ARTIFACT = ROOT / "backend/app/ml/artifacts/message_tfidf_v3.json"
NOTICES = ROOT / "data/processed/notices_v1/message_notices_v1.csv"
TRANSLATIONS = ROOT / "data/processed/malay_translation/message_train_malay_v1.csv"
SOURCE = ROOT / "data/raw/mendeley_sms_phishing_v1/source/Dataset_5971.csv"


def recipe_vectorizer() -> TfidfVectorizer:
    # Must match train_message_model_v2.py / v3.py.
    return TfidfVectorizer(
        lowercase=True,
        strip_accents="unicode",
        token_pattern=r"(?u)\b\w\w+\b",
        ngram_range=(1, 2),
        min_df=2,
        max_features=30_000,
        sublinear_tf=True,
        norm="l2",
        stop_words=MALAY_FUNCTION_WORDS,
    )


def translation_rows(english: list[dict]) -> list[dict]:
    with SOURCE.open(encoding="utf-8-sig", newline="") as handle:
        source_rows = list(csv.DictReader(handle))
    # Map each English source text back to its manifest group.
    group_by_text = {row["text"]: row["group"] for row in english}
    rows = []
    with TRANSLATIONS.open(encoding="utf-8") as handle:
        for item in csv.DictReader(handle):
            original = source_rows[int(item["source_row"]) - 2]["TEXT"].strip()
            rows.append(
                {
                    "text": item["text"].strip(),
                    "label": item["label"],
                    "split": "train",
                    "group": group_by_text[original],
                }
            )
    return rows


def notice_rows() -> list[dict]:
    # Written notices have no near-duplicate source; each is its own group, numbered above the
    # manifest's group ids.
    with NOTICES.open(encoding="utf-8") as handle:
        return [
            {
                "text": item["text"].strip(),
                "label": item["label"],
                "split": "train",
                "group": 10_000_000 + index,
            }
            for index, item in enumerate(csv.DictReader(handle))
        ]


def out_of_fold_probabilities(rows: list[dict]) -> np.ndarray:
    texts = [row["text"] for row in rows]
    labels = [row["label"] for row in rows]
    groups = [row["group"] for row in rows]
    result = np.zeros((len(rows), len(CLASSES)))
    folds = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED)
    for train_index, held_index in folds.split(texts, labels, groups):
        vectorizer = recipe_vectorizer()
        matrix = vectorizer.fit_transform([texts[i] for i in train_index])
        model = LogisticRegression(
            C=4.0, class_weight="balanced", max_iter=3000, random_state=20260905
        ).fit(matrix, [labels[i] for i in train_index])
        probabilities = model.predict_proba(vectorizer.transform([texts[i] for i in held_index]))
        order = [list(model.classes_).index(name) for name in CLASSES]
        result[held_index] = probabilities[:, order]
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", default="backend/app/ml/artifacts/message_fusion_v5.json")
    parser.add_argument("--report", default="docs/message_fusion_v5_evaluation.json")
    args = parser.parse_args()

    english = load_rows()
    development = [row for row in english if row["split"] in {"train", "validation"}]
    development += translation_rows(english)
    development += notice_rows()
    test = [row for row in english if row["split"] == "test"]

    oof = out_of_fold_probabilities(development)
    dev_rules = [assess_rules(row["text"]).score for row in development]
    x_dev = np.array([feature_row(p[2], p[1], r) for p, r in zip(oof, dev_rules, strict=True)])
    y_dev = np.array([row["label"] == "SCAM" for row in development])

    calibrator = LogisticRegression(C=1.0, max_iter=1000)
    dev_scores = cross_val_predict(
        calibrator,
        x_dev,
        y_dev,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED),
        method="predict_proba",
    )[:, 1]
    thresholds = dict(BANDS)
    dev_by_label: dict[str, Counter] = {name: Counter() for name in CLASSES}
    for row, score in zip(development, dev_scores, strict=True):
        dev_by_label[row["label"]][categorise(score, thresholds)] += 1
    calibrator.fit(x_dev, y_dev)

    artifact = {
        "schema_version": 1,
        "fusion_version": FUSION_VERSION,
        "created_by": "backend/scripts/calibrate_message_fusion_v5.py",
        "random_seed": SEED,
        "model_artifact_sha256": sha256(MODEL_ARTIFACT),
        "rules_version": RULES_VERSION,
        "target": "SCAM",
        "features": FEATURES,
        "coefficients": [round(float(c), 8) for c in calibrator.coef_[0]],
        "intercept": round(float(calibrator.intercept_[0]), 8),
        "thresholds": {name: round(value, 4) for name, value in thresholds.items()},
        "band_meaning": (
            "Calibrated share of similar development messages (English SMS, their Malay/"
            "Manglish translations and written institutional notices) that were scams: "
            "HIGH >= 0.70, ELEVATED >= 0.35, CAUTION >= 0.05."
        ),
        "calibration_rows": len(development),
    }
    artifact_path = ROOT / args.artifact
    # LF only: the checksum is pinned and Git stores LF.
    artifact_path.write_bytes((json.dumps(artifact, indent=2) + "\n").encode("utf-8"))

    runtime = MessageClassifier(MODEL_ARTIFACT)
    weights = np.array(artifact["coefficients"])
    test_scores, categories = [], []
    for row in test:
        probabilities = runtime.predict(row["text"]).probabilities
        features = np.array(
            feature_row(
                probabilities["SCAM"], probabilities["SPAM"], assess_rules(row["text"]).score
            )
        )
        score = 1 / (1 + math.exp(-(artifact["intercept"] + float(features @ weights))))
        test_scores.append(score)
        categories.append(categorise(score, artifact["thresholds"]))
    test_scores = np.array(test_scores)
    y_test = np.array([row["label"] == "SCAM" for row in test])
    by_label: dict[str, Counter] = {name: Counter() for name in CLASSES}
    for row, category in zip(test, categories, strict=True):
        by_label[row["label"]][category] += 1

    def rate(label: str, accepted: set[str]) -> float:
        total = sum(by_label[label].values())
        return round(sum(by_label[label][c] for c in accepted) / total, 4)

    report = {
        "fusion_version": FUSION_VERSION,
        "artifact_sha256": sha256(artifact_path),
        "model_artifact_sha256": artifact["model_artifact_sha256"],
        "rules_version": RULES_VERSION,
        "method": (
            "v3 method re-fitted: logistic calibration over out-of-fold model logits and rule "
            "score on English train+validation plus Malay/Manglish translations of training "
            "messages and written institutional notices (5 grouped folds; a translation shares "
            "its source's group); fixed bands; "
            "one evaluation on the untouched English test split with the runtime artifact."
        ),
        "thresholds": artifact["thresholds"],
        "development_rows": len(development),
        "development_cross_validated_categories_by_label": {
            k: dict(v) for k, v in dev_by_label.items()
        },
        "test_rows": len(test),
        "test_categories_by_label": {k: dict(v) for k, v in by_label.items()},
        "test_rates": {
            "scam_at_elevated_or_high": rate("SCAM", {"ELEVATED", "HIGH"}),
            "scam_at_caution_or_above": rate("SCAM", {"CAUTION", "ELEVATED", "HIGH"}),
            "scam_at_high": rate("SCAM", {"HIGH"}),
            "legitimate_at_caution_or_above": rate("LEGITIMATE", {"CAUTION", "ELEVATED", "HIGH"}),
            "legitimate_at_elevated_or_high": rate("LEGITIMATE", {"ELEVATED", "HIGH"}),
        },
        "test_probability_quality": reliability(test_scores, y_test),
        "limitations": [
            "Calibrated on one historical, mainly UK SMS dataset and its machine translations; "
            "not a real-world fraud probability.",
            "Translations describe the same (UK) scams in Malay/Manglish; Malaysian-specific "
            "playbooks are covered by rules, and measured on the challenge sets.",
            "The test split was used once for this report and for no fitting or threshold choice.",
        ],
    }
    report_path = ROOT / args.report
    report_path.write_bytes((json.dumps(report, indent=2) + "\n").encode("utf-8"))
    print(json.dumps({k: report[k] for k in ("artifact_sha256", "test_rates")}, indent=2))
    print("probability quality:", report["test_probability_quality"]["brier"], "brier")


if __name__ == "__main__":
    main()
