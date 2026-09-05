"""Reproducibly train and evaluate the Task 3 local message classifier.

The persisted artifact is JSON rather than pickle/joblib, so application loading never executes
serialized Python. Run from the repository root after installing the ``ml`` optional dependency.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.naive_bayes import MultinomialNB
from sklearn.neighbors import NearestNeighbors
from sklearn.svm import LinearSVC

SEED = 20260905
LABEL_MAP = {"ham": "LEGITIMATE", "spam": "SPAM", "smishing": "SCAM"}
CLASSES = ["LEGITIMATE", "SPAM", "SCAM"]
SOURCE_SHA256 = "649844f1c62a6b27e145eaf17a65f7010c56c390e11a794ea8329993a05ba71e"
TOKEN_PATTERN = r"(?u)\b\w\w+\b"


@dataclass(frozen=True)
class Row:
    source_row: int
    text: str
    label: str
    normalized: str
    text_sha256: str


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text).casefold()).strip()


def load_and_deduplicate(path: Path) -> tuple[list[Row], dict[str, int]]:
    if sha256(path) != SOURCE_SHA256:
        raise ValueError("Source CSV checksum differs from the reviewed dataset version")
    with path.open(encoding="utf-8-sig", newline="") as source:
        raw = list(csv.DictReader(source))
    grouped: dict[str, list[Row]] = defaultdict(list)
    for index, item in enumerate(raw, start=2):
        text = item["TEXT"].strip()
        normalized = normalize(text)
        label = LABEL_MAP[item["LABEL"].strip().casefold()]
        grouped[normalized].append(
            Row(index, text, label, normalized, hashlib.sha256(normalized.encode()).hexdigest())
        )

    rows: list[Row] = []
    conflicts = duplicates = 0
    for group in grouped.values():
        if len({row.label for row in group}) != 1:
            conflicts += len(group)
            continue
        rows.append(group[0])
        duplicates += len(group) - 1
    audit = {
        "source_rows": len(raw),
        "exact_duplicate_rows_removed": duplicates,
        "conflicting_label_rows_removed": conflicts,
        "deduplicated_rows": len(rows),
    }
    return rows, audit


class UnionFind:
    def __init__(self, size: int):
        self.parent = list(range(size))

    def find(self, item: int) -> int:
        while self.parent[item] != item:
            self.parent[item] = self.parent[self.parent[item]]
            item = self.parent[item]
        return item

    def union(self, left: int, right: int) -> None:
        a, b = self.find(left), self.find(right)
        if a != b:
            self.parent[b] = a


def near_duplicate_groups(rows: list[Row]) -> list[int]:
    """Cluster very similar messages so clusters cannot leak between data splits."""
    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(4, 5), min_df=2)
    matrix = vectorizer.fit_transform([row.normalized for row in rows])
    neighbours = NearestNeighbors(metric="cosine", radius=0.08, algorithm="brute", n_jobs=-1)
    neighbours.fit(matrix)
    distances, indices = neighbours.radius_neighbors(matrix, return_distance=True)
    groups = UnionFind(len(rows))
    for left, (nearby, scores) in enumerate(zip(indices, distances, strict=True)):
        for right, distance in zip(nearby, scores, strict=True):
            if right > left and distance <= 0.08:
                groups.union(left, int(right))
    roots: dict[int, int] = {}
    return [roots.setdefault(groups.find(index), len(roots)) for index in range(len(rows))]


def split(rows: list[Row], groups: list[int]) -> dict[str, list[int]]:
    labels = [row.label for row in rows]
    all_indices = list(range(len(rows)))
    outer = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED)
    train_val, test = next(outer.split(all_indices, labels, groups))
    remaining_labels = [labels[index] for index in train_val]
    remaining_groups = [groups[index] for index in train_val]
    inner = StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=SEED + 1)
    train_local, validation_local = next(inner.split(train_val, remaining_labels, remaining_groups))
    return {
        "train": [int(train_val[index]) for index in train_local],
        "validation": [int(train_val[index]) for index in validation_local],
        "test": [int(index) for index in test],
    }


def metrics(labels: list[str], predicted: list[str]) -> dict[str, object]:
    return {
        "classification_report": classification_report(
            labels, predicted, labels=CLASSES, output_dict=True, zero_division=0
        ),
        "confusion_matrix": confusion_matrix(labels, predicted, labels=CLASSES).tolist(),
        "class_order": CLASSES,
    }


def rounded(value: object) -> object:
    if isinstance(value, float):
        return round(value, 8)
    if isinstance(value, list):
        return [rounded(item) for item in value]
    if isinstance(value, dict):
        return {key: rounded(item) for key, item in value.items()}
    return value


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source", default="data/raw/mendeley_sms_phishing_v1/source/Dataset_5971.csv"
    )
    parser.add_argument("--artifact", default="backend/app/ml/artifacts/message_tfidf_v1.json")
    parser.add_argument("--report", default="docs/model_evaluation_v1.json")
    parser.add_argument("--manifest", default="data/processed/message_split_manifest_v1.csv")
    args = parser.parse_args()

    source = Path(args.source)
    rows, audit = load_and_deduplicate(source)
    groups = near_duplicate_groups(rows)
    partitions = split(rows, groups)
    texts = {name: [rows[index].text for index in indices] for name, indices in partitions.items()}
    labels = {
        name: [rows[index].label for index in indices] for name, indices in partitions.items()
    }

    vectorizer = TfidfVectorizer(
        lowercase=True,
        strip_accents="unicode",
        token_pattern=TOKEN_PATTERN,
        ngram_range=(1, 2),
        min_df=2,
        max_features=20_000,
        sublinear_tf=True,
        norm="l2",
    )
    train_matrix = vectorizer.fit_transform(texts["train"])
    validation_matrix = vectorizer.transform(texts["validation"])
    candidates = {
        "logistic_regression": LogisticRegression(
            C=4.0, class_weight="balanced", max_iter=2000, random_state=SEED
        ),
        "linear_svm": LinearSVC(C=1.0, class_weight="balanced", random_state=SEED),
        "multinomial_naive_bayes": MultinomialNB(alpha=0.3),
    }
    validation: dict[str, object] = {}
    for name, model in candidates.items():
        model.fit(train_matrix, labels["train"])
        validation[name] = metrics(labels["validation"], model.predict(validation_matrix).tolist())

    # The JSON runtime supports calibrated class probabilities. Logistic regression is selected
    # when it is within two macro-F1 points of the highest validation score; otherwise training
    # fails so a reviewer must explicitly approve a different deployable model family.
    macro_scores = {
        name: report["classification_report"]["macro avg"]["f1-score"]
        for name, report in validation.items()
    }
    best_score = max(macro_scores.values())
    logistic_score = macro_scores["logistic_regression"]
    if best_score - logistic_score > 0.02:
        raise RuntimeError("Logistic regression is materially below the best validation candidate")

    final_indices = partitions["train"] + partitions["validation"]
    final_texts = [rows[index].text for index in final_indices]
    final_labels = [rows[index].label for index in final_indices]
    final_vectorizer = TfidfVectorizer(**vectorizer.get_params())
    final_matrix = final_vectorizer.fit_transform(final_texts)
    final_model = LogisticRegression(
        C=4.0, class_weight="balanced", max_iter=2000, random_state=SEED
    ).fit(final_matrix, final_labels)
    test_matrix = final_vectorizer.transform(texts["test"])
    test_report = metrics(labels["test"], final_model.predict(test_matrix).tolist())

    artifact = rounded(
        {
            "schema_version": 1,
            "model_version": "message-tfidf-logreg-v1",
            "model_type": "tfidf_logistic_regression",
            "created_by": "backend/scripts/train_message_model.py",
            "random_seed": SEED,
            "source_sha256": SOURCE_SHA256,
            "classes": final_model.classes_.tolist(),
            "vectorizer": {
                "lowercase": True,
                "strip_accents": "unicode",
                "token_pattern": TOKEN_PATTERN,
                "ngram_range": [1, 2],
                "sublinear_tf": True,
                "norm": "l2",
                "vocabulary": {
                    token: int(index) for token, index in final_vectorizer.vocabulary_.items()
                },
                "idf": final_vectorizer.idf_.tolist(),
            },
            "classifier": {
                "coefficients": final_model.coef_.tolist(),
                "intercepts": final_model.intercept_.tolist(),
            },
            "training_rows": len(final_indices),
        }
    )
    artifact_path = Path(args.artifact)
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(json.dumps(artifact, ensure_ascii=False, separators=(",", ":")))
    artifact_sha = sha256(artifact_path)

    group_sizes = Counter(groups)
    report = rounded(
        {
            "model_version": artifact["model_version"],
            "artifact_sha256": artifact_sha,
            "dataset": {
                **audit,
                "source_sha256": SOURCE_SHA256,
                "labels_after_deduplication": dict(Counter(row.label for row in rows)),
                "near_duplicate_clusters": sum(size > 1 for size in group_sizes.values()),
                "largest_cluster": max(group_sizes.values()),
            },
            "split": {
                name: {"rows": len(indices), "labels": dict(Counter(labels[name]))}
                for name, indices in partitions.items()
            },
            "validation_candidates": validation,
            "selection": {
                "selected": "logistic_regression",
                "macro_f1_scores": macro_scores,
                "rationale": (
                    "Probability-producing transparent model within 0.02 macro F1 of best "
                    "validation candidate."
                ),
            },
            "untouched_test": test_report,
        }
    )
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    manifest_path = Path(args.manifest)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    membership = {index: name for name, indices in partitions.items() for index in indices}
    with manifest_path.open("w", encoding="utf-8", newline="") as target:
        writer = csv.writer(target)
        writer.writerow(["source_row", "text_sha256", "label", "split", "near_duplicate_group"])
        for index, row in enumerate(rows):
            writer.writerow(
                [row.source_row, row.text_sha256, row.label, membership[index], groups[index]]
            )

    print(json.dumps({"artifact_sha256": artifact_sha, "report": report}, indent=2))


if __name__ == "__main__":
    main()
