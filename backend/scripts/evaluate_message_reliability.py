"""Reproduce frozen classification and audit probabilities without fitting to the test set.

The historical test set is reused for regression/reliability reporting only. No threshold,
calibrator, vocabulary, model or split is fitted here. Brier/log loss measure probabilistic
prediction quality, not calibration alone; ECE depends on binning and sample support.
"""

import argparse
import csv
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evaluate_final import ROOT, message_reproduction

from app.core.config import Settings
from app.ml.engine import build_message_engine


def probability_metrics(observations: list[tuple[str, dict[str, float]]]) -> dict:
    if not observations:
        raise ValueError("Probability metrics require labelled observations")
    brier = loss = 0.0
    bins = [[] for _ in range(10)]
    for actual, probabilities in observations:
        if actual not in probabilities or not math.isclose(sum(probabilities.values()), 1.0):
            raise ValueError("Invalid class probabilities")
        if any(not math.isfinite(p) or not 0 <= p <= 1 for p in probabilities.values()):
            raise ValueError("Invalid class probabilities")
        predicted = max(probabilities, key=probabilities.__getitem__)
        confidence = probabilities[predicted]
        brier += sum((p - (label == actual)) ** 2 for label, p in probabilities.items())
        loss -= math.log(max(probabilities[actual], 1e-15))
        bins[min(9, int(confidence * 10))].append((confidence, predicted == actual))
    reliability = []
    ece = 0.0
    for index, values in enumerate(bins):
        if not values:
            continue
        confidence = sum(value[0] for value in values) / len(values)
        accuracy = sum(value[1] for value in values) / len(values)
        ece += len(values) / len(observations) * abs(confidence - accuracy)
        reliability.append(
            dict(
                lower=index / 10,
                upper=(index + 1) / 10,
                count=len(values),
                mean_confidence=confidence,
                accuracy=accuracy,
            )
        )
    return dict(
        rows=len(observations),
        multiclass_brier_sum=brier / len(observations),
        log_loss=loss / len(observations),
        top_label_ece_10_bins=ece,
        reliability_bins=reliability,
        interpretation=(
            "Uncalibrated frozen classifier; Brier uses the sum across classes (range 0–2). "
            "ECE is descriptive and bin-dependent, not evidence of real-world calibration."
        ),
    )


def evaluate() -> dict:
    frozen = message_reproduction()  # Source checksum, labels, hashes and split-group isolation.
    settings = Settings(_env_file=None, app_env="test", ai_review_enabled=False)
    engine = build_message_engine(settings)
    source = ROOT / "data/raw/mendeley_sms_phishing_v1/source/Dataset_5971.csv"
    with source.open(encoding="utf-8-sig", newline="") as handle:
        source_rows = list(csv.DictReader(handle))
    with (ROOT / "data/processed/message_split_manifest_v1.csv").open() as handle:
        heldout = [row for row in csv.DictReader(handle) if row["split"] == "test"]
    observations = []
    policies = defaultdict(Counter)
    reasons = Counter()
    for row in heldout:
        text = source_rows[int(row["source_row"]) - 2]["TEXT"].strip()
        classification = engine.classifier.predict(text)
        observations.append((row["label"], classification.probabilities))
        result = engine.analyse(text)
        policies[row["label"]][str(result.risk_level)] += 1
        reasons[result.components["fusion"]["reason"]] += 1
    return dict(
        frozen_classifier=frozen,
        probability_reliability=probability_metrics(observations),
        fusion_policy_by_dataset_label=dict(policies),
        fusion_reasons=dict(reasons),
        rules_version=result.rules_version,
        fusion_version=result.fusion_version,
        limitations=[
            "This is the existing historical test set, not a new independent evaluation.",
            "Risk categories are not dataset class labels; "
            "the distribution is not fusion accuracy.",
            "No calibrator or threshold was selected using these test observations.",
            "Neither model scores nor confidence are real-world fraud probabilities.",
        ],
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = evaluate()
    rendered = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
