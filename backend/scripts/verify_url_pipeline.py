"""Verify prepared data hashes, domain isolation and deployed JSON inference on held-out rows."""

import csv
import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from prepare_url_dataset import OUT, ROOT

from app.url_intelligence.classifier import URLClassifier


def main():
    statistics = json.loads((OUT / "statistics_v1.json").read_text())
    for name, checksum in statistics["outputs_sha256"].items():
        assert hashlib.sha256((OUT / name).read_bytes()).hexdigest() == checksum
    domains = defaultdict(set)
    urls = set()
    with (OUT / "split_manifest_v1.csv").open() as f:
        for row in csv.DictReader(f):
            assert row["url_sha256"] not in urls
            urls.add(row["url_sha256"])
            domains[row["domain_sha256"]].add(row["split"])
    assert all(len(splits) == 1 for splits in domains.values())
    model = URLClassifier(ROOT / "backend/app/url_intelligence/artifacts/url_model_v1.json")
    matrix = [[0, 0], [0, 0]]
    classes = ["LEGITIMATE", "PHISHING"]
    with (OUT / "test_v1.csv").open() as f:
        for row in csv.DictReader(f):
            label = row.pop("label")
            prediction = model.predict_features({k: float(v) for k, v in row.items()})
            matrix[classes.index(label)][classes.index(prediction.label)] += 1
    expected = json.loads((ROOT / "docs/url_model_evaluation_v1.json").read_text())["test"][
        "confusion_matrix"
    ]
    assert matrix == expected, (matrix, expected)
    print(
        json.dumps(
            {
                "verified_rows": len(urls),
                "isolated_domains": len(domains),
                "deployed_test_confusion_matrix": matrix,
            }
        )
    )


if __name__ == "__main__":
    main()
