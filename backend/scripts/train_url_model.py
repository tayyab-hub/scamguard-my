"""Compare fixed candidates on validation only, evaluate winner once on domain-held-out test."""

import csv
import hashlib
import json
import platform
import sys
from pathlib import Path

import numpy as np
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from prepare_url_dataset import OUT, ROOT, SEED

from app.url_intelligence.features import FEATURE_VERSION

VERSION = "url_ml_v1"


def read(name):
    with (OUT / f"{name}_v1.csv").open() as f:
        reader = csv.reader(f)
        names = next(reader)[1:]
        rows = list(reader)
    return np.array([r[1:] for r in rows], dtype=float), np.array([r[0] for r in rows]), names


def metrics(model, x, y):
    prediction = model.predict(x)
    return {
        "report": classification_report(y, prediction, output_dict=True, zero_division=0),
        "confusion_matrix": confusion_matrix(
            y, prediction, labels=["LEGITIMATE", "PHISHING"]
        ).tolist(),
    }


def main():
    x, y, names = read("train")
    vx, vy, _ = read("validation")
    candidates = {
        "logistic_regression": make_pipeline(
            StandardScaler(),
            LogisticRegression(class_weight="balanced", max_iter=2000, random_state=SEED),
        ),
        "linear_svm": make_pipeline(
            StandardScaler(),
            LinearSVC(class_weight="balanced", max_iter=10000, random_state=SEED, dual=False),
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=120,
            max_depth=12,
            min_samples_leaf=10,
            class_weight="balanced",
            random_state=SEED,
            n_jobs=2,
        ),
    }
    results = {}
    for name, model in candidates.items():
        model.fit(x, y)
        results[name] = metrics(model, vx, vy)
        print(name, results[name]["report"]["macro avg"], flush=True)
    selected = max(results, key=lambda n: results[n]["report"]["macro avg"]["f1-score"])
    model = candidates[selected]
    artifact = {
        "version": VERSION,
        "feature_version": FEATURE_VERSION,
        "features": names,
        "classes": model.classes_.tolist(),
        "kind": selected,
    }
    if selected == "random_forest":
        artifact["trees"] = [
            {
                "left": t.tree_.children_left.tolist(),
                "right": t.tree_.children_right.tolist(),
                "feature": t.tree_.feature.tolist(),
                "threshold": t.tree_.threshold.tolist(),
                "value": t.tree_.value[:, 0, :].tolist(),
            }
            for t in model.estimators_
        ]
    else:
        scaler, estimator = model.steps[0][1], model.steps[1][1]
        artifact.update(
            mean=scaler.mean_.tolist(),
            scale=scaler.scale_.tolist(),
            coef=estimator.coef_[0].tolist(),
            intercept=float(estimator.intercept_[0]),
        )
    target = ROOT / "backend/app/url_intelligence/artifacts/url_model_v1.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    artifact_bytes = (json.dumps(artifact, separators=(",", ":")) + "\n").encode()
    if "--verify" in sys.argv:
        assert target.read_bytes() == artifact_bytes, "Reproduction changed the model artifact"
    target.write_bytes(artifact_bytes)
    checksum = hashlib.sha256(target.read_bytes()).hexdigest()
    from app.url_intelligence.classifier import URLClassifier

    deployed = URLClassifier(target)
    reference = model.predict_proba(vx[:512]) if hasattr(model, "predict_proba") else None
    if reference is not None:
        for index, row in enumerate(vx[:512]):
            output = deployed.predict_features(dict(zip(names, row.tolist(), strict=True)))
            assert abs(output.confidence - float(max(reference[index]))) < 1e-12
    train_bias = {}
    for label in model.classes_:
        selected_rows = x[y == label]
        train_bias[label] = {
            "https_fraction": float(np.mean(selected_rows[:, names.index("https")])),
            "root_path_no_query_fraction": float(
                np.mean(
                    (selected_rows[:, names.index("path_depth")] == 0)
                    & (selected_rows[:, names.index("query_count")] == 0)
                )
            ),
            "url_length_p95": float(np.percentile(selected_rows[:, names.index("url_length")], 95)),
            "url_length_p99": float(np.percentile(selected_rows[:, names.index("url_length")], 99)),
        }
    tx, ty, _ = read("test")
    final = metrics(model, tx, ty)
    prediction = model.predict(tx)
    error_indexes = {
        "false_positive": np.flatnonzero((ty == "LEGITIMATE") & (prediction == "PHISHING")),
        "false_negative": np.flatnonzero((ty == "PHISHING") & (prediction == "LEGITIMATE")),
    }
    errors = {
        name: {
            "count": len(idx),
            "mean_features": dict(zip(names, np.mean(tx[idx], axis=0).tolist(), strict=True))
            if len(idx)
            else {},
        }
        for name, idx in error_indexes.items()
    }
    report = {
        "training_distribution_audit": train_bias,
        "export_parity_validation_rows": 512,
        "model_version": VERSION,
        "seed": SEED,
        "selected": selected,
        "features": names,
        "validation_candidates": results,
        "test": final,
        "error_analysis": errors,
        "artifact_sha256": checksum,
        "python": platform.python_version(),
        "sklearn": sklearn.__version__,
        "dataset_statistics": json.loads((OUT / "statistics_v1.json").read_text()),
    }
    (ROOT / "docs/url_model_evaluation_v1.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"selected": selected, "test": final, "artifact_sha256": checksum}, indent=2))


if __name__ == "__main__":
    main()
