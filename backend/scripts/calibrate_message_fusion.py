# Fit the message-fusion-v3 calibrator and category thresholds without touching the test split.
# Out-of-fold model probabilities come from refitting the frozen v1 recipe inside 5 grouped folds
# of train+validation, so every calibration row is scored by a model that never saw it. The test
# split is used once, at the end, with the real runtime artifact.

"""Learn calibrated Message risk and evaluate it once on the untouched test split.

Run from the repository root after installing the ``ml`` optional dependency::

    backend\\.venv\\Scripts\\python.exe backend\\scripts\\calibrate_message_fusion.py

Writes ``backend/app/ml/artifacts/message_fusion_v3.json`` (runtime calibrator) and
``docs/message_fusion_v3_evaluation.json`` (reproducible evidence).
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedGroupKFold, StratifiedKFold, cross_val_predict

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.ml.classifier import MessageClassifier  # noqa: E402
from app.ml.rules import RULES_VERSION, assess_rules  # noqa: E402

SEED = 20261106
CLASSES = ["LEGITIMATE", "SPAM", "SCAM"]
LABEL_MAP = {"ham": "LEGITIMATE", "spam": "SPAM", "smishing": "SCAM"}
SOURCE = ROOT / "data/raw/mendeley_sms_phishing_v1/source/Dataset_5971.csv"
MANIFEST = ROOT / "data/processed/message_split_manifest_v1.csv"
MODEL_ARTIFACT = ROOT / "backend/app/ml/artifacts/message_tfidf_v1.json"
FEATURES = ["logit_scam", "logit_spam", "rule_score"]
# Because the score is calibrated, categories are fixed probability bands with a plain meaning,
# declared before evaluation: HIGH when at least 70 in 100 similar historical messages were scams,
# ELEVATED from 35, CAUTION from 5 (at least 1 in 20). The development data only reports how these
# bands behave; it does not move them.
BANDS = {"HIGH": 0.70, "ELEVATED": 0.35, "CAUTION": 0.05}
EPSILON = 1e-3  # extreme model outputs must not let one logit swamp the others


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def logit(value: float) -> float:
    value = min(max(value, EPSILON), 1 - EPSILON)
    return math.log(value / (1 - value))


def load_rows() -> list[dict]:
    with SOURCE.open(encoding="utf-8-sig", newline="") as handle:
        source_rows = list(csv.DictReader(handle))
    with MANIFEST.open(encoding="utf-8") as handle:
        manifest = list(csv.DictReader(handle))
    rows = []
    for entry in manifest:
        source = source_rows[int(entry["source_row"]) - 2]
        label = LABEL_MAP[source["LABEL"].strip().casefold()]
        if label != entry["label"]:
            raise ValueError("Manifest label does not match source row")
        rows.append(
            {
                "text": source["TEXT"].strip(),
                "label": label,
                "split": entry["split"],
                "group": int(entry["near_duplicate_group"]),
            }
        )
    return rows


def recipe_vectorizer() -> TfidfVectorizer:
    # Identical to train_message_model.py so out-of-fold behaviour matches the shipped artifact.
    return TfidfVectorizer(
        lowercase=True,
        strip_accents="unicode",
        token_pattern=r"(?u)\b\w\w+\b",
        ngram_range=(1, 2),
        min_df=2,
        max_features=20_000,
        sublinear_tf=True,
        norm="l2",
    )


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
            C=4.0, class_weight="balanced", max_iter=2000, random_state=20260905
        ).fit(matrix, [labels[i] for i in train_index])
        probabilities = model.predict_proba(vectorizer.transform([texts[i] for i in held_index]))
        order = [list(model.classes_).index(name) for name in CLASSES]
        result[held_index] = probabilities[:, order]
    return result


def feature_row(scam: float, spam: float, rule_score: float) -> list[float]:
    return [logit(scam), logit(spam), rule_score]


def categorise(score: float, thresholds: dict[str, float]) -> str:
    if score >= thresholds["HIGH"]:
        return "HIGH"
    if score >= thresholds["ELEVATED"]:
        return "ELEVATED"
    if score >= thresholds["CAUTION"]:
        return "CAUTION"
    return "LOW"


def reliability(scores: np.ndarray, positive: np.ndarray) -> dict:
    bins = []
    ece = 0.0
    for lower in np.arange(0, 1, 0.1):
        upper = lower + 0.1
        mask = (scores >= lower) & ((scores < upper) if upper < 1 else (scores <= upper))
        if mask.sum():
            gap = abs(scores[mask].mean() - positive[mask].mean())
            ece += gap * mask.sum() / len(scores)
            bins.append(
                {
                    "lower": round(float(lower), 1),
                    "upper": round(float(upper), 1),
                    "count": int(mask.sum()),
                    "mean_score": round(float(scores[mask].mean()), 4),
                    "observed_scam_rate": round(float(positive[mask].mean()), 4),
                }
            )
    brier = float(np.mean((scores - positive) ** 2))
    return {"brier": round(brier, 5), "ece_10_bins": round(ece, 5), "bins": bins}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", default="backend/app/ml/artifacts/message_fusion_v3.json")
    parser.add_argument("--report", default="docs/message_fusion_v3_evaluation.json")
    args = parser.parse_args()

    rows = load_rows()
    development = [row for row in rows if row["split"] in {"train", "validation"}]
    test = [row for row in rows if row["split"] == "test"]

    oof = out_of_fold_probabilities(development)
    dev_rules = [assess_rules(row["text"]).score for row in development]
    x_dev = np.array([feature_row(p[2], p[1], r) for p, r in zip(oof, dev_rules, strict=True)])
    y_dev = np.array([row["label"] == "SCAM" for row in development])

    calibrator = LogisticRegression(C=1.0, max_iter=1000)
    # Thresholds are chosen on cross-validated calibrator output so they are not tuned on rows
    # the calibrator was fitted to.
    dev_scores = cross_val_predict(
        calibrator,
        x_dev,
        y_dev,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED),
        method="predict_proba",
    )[:, 1]
    thresholds = dict(BANDS)
    dev_categories = [categorise(score, thresholds) for score in dev_scores]
    dev_by_label: dict[str, Counter] = {name: Counter() for name in CLASSES}
    for row, category in zip(development, dev_categories, strict=True):
        dev_by_label[row["label"]][category] += 1
    calibrator.fit(x_dev, y_dev)

    artifact = {
        "schema_version": 1,
        "fusion_version": "message-fusion-v3",
        "created_by": "backend/scripts/calibrate_message_fusion.py",
        "random_seed": SEED,
        "model_artifact_sha256": sha256(MODEL_ARTIFACT),
        "rules_version": RULES_VERSION,
        "target": "SCAM",
        "features": FEATURES,
        "coefficients": [round(float(c), 8) for c in calibrator.coef_[0]],
        "intercept": round(float(calibrator.intercept_[0]), 8),
        "thresholds": {name: round(value, 4) for name, value in thresholds.items()},
        "band_meaning": (
            "Calibrated share of similar historical messages that were scams: HIGH >= 0.70, "
            "ELEVATED >= 0.35, CAUTION >= 0.05."
        ),
        "calibration_rows": len(development),
    }
    artifact_path = ROOT / args.artifact
    # LF only: the checksum is pinned and Git stores LF, so Windows CRLF would break the pin.
    artifact_path.write_bytes((json.dumps(artifact, indent=2) + "\n").encode("utf-8"))

    # Single evaluation on the untouched test split with the real runtime classifier.
    runtime = MessageClassifier(MODEL_ARTIFACT)
    weights = np.array(artifact["coefficients"])
    test_scores, categories = [], []
    for row in test:
        probabilities = runtime.predict(row["text"]).probabilities
        features = np.array(
            feature_row(
                probabilities["SCAM"],
                probabilities["SPAM"],
                assess_rules(row["text"]).score,
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
        "fusion_version": artifact["fusion_version"],
        "artifact_sha256": sha256(artifact_path),
        "model_artifact_sha256": artifact["model_artifact_sha256"],
        "rules_version": RULES_VERSION,
        "method": (
            "Logistic calibration over out-of-fold model logits and rule score on train+validation "
            "(5 grouped folds); fixed probability bands declared in advance; one evaluation "
            "on the untouched test split using the runtime artifact. Calibrator-only categories; "
            "runtime tactic floors and insufficient-evidence checks are evaluated separately."
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
            "Calibrated on one historical, mainly English SMS dataset; not a real-world fraud "
            "probability.",
            "Rare conversational tactics added in rules v3 are almost absent from this dataset; "
            "their effect is measured on the separate challenge set, not here.",
            "The test split was used once for this report and for no fitting or threshold choice.",
        ],
    }
    report_path = ROOT / args.report
    report_path.write_bytes((json.dumps(report, indent=2) + "\n").encode("utf-8"))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
