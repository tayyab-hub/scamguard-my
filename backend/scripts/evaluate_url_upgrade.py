# Compare URL engine builds on the untouched PhiUSIIL test split, plus a robustness slice that
# appends ordinary paths to the legitimate test hosts (the original legitimate rows are all bare
# homepages, so they cannot reveal path-based false alarms). Nothing is fitted here.

"""Evaluate a URL engine build: test split categories and legitimate-with-path robustness."""

from __future__ import annotations

import argparse
import csv
import io
import json
import random
import sys
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PATHS = [
    "/search?q=weather",
    "/account/settings",
    "/products/12345",
    "/login",
    "/en/about-us",
    "/blog/2025/11/news.html",
    "/cart",
    "/help/contact",
]


def test_rows() -> list[tuple[str, str]]:
    csv.field_size_limit(10**8)
    with (ROOT / "data/url/processed/split_manifest_v1.csv").open(encoding="utf-8") as handle:
        test = {
            int(r["source_row"]): r["label"] for r in csv.DictReader(handle) if r["split"] == "test"
        }
    rows = []
    with zipfile.ZipFile(ROOT / "data/url/raw/phiusiil.zip") as archive:
        name = next(n for n in archive.namelist() if n.endswith(".csv"))
        with archive.open(name) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig"))
            for index, row in enumerate(reader, start=2):
                if index in test:
                    rows.append((row["URL"], test[index]))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", required=True)
    parser.add_argument("--label", required=True)
    args = parser.parse_args()
    sys.path.insert(0, str(Path(args.backend).resolve()))
    from app.url_intelligence.engine import build_url_engine

    class Settings:
        url_model_path = None

    engine = build_url_engine(Settings())
    rows = test_rows()
    by_label: dict[str, Counter] = {}
    for url, label in rows:
        by_label.setdefault(label, Counter())[engine.analyse(url).risk_level] += 1
    generator = random.Random(20261106)
    legitimate = [url for url, label in rows if label == "LEGITIMATE"]
    sample = generator.sample(legitimate, 2000)
    with_path: Counter = Counter()
    for url in sample:
        with_path[engine.analyse(url.rstrip("/") + generator.choice(PATHS)).risk_level] += 1

    def share(counts: Counter, accepted: set[str]) -> float:
        return round(sum(counts[k] for k in accepted) / sum(counts.values()), 4)

    warned = {"CAUTION", "ELEVATED", "HIGH"}
    strong = {"ELEVATED", "HIGH"}
    print(
        json.dumps(
            {
                "label": args.label,
                "test_rows": len(rows),
                "test_categories_by_label": {k: dict(v) for k, v in by_label.items()},
                "phishing_warned": share(by_label["PHISHING"], warned),
                "phishing_elevated_or_high": share(by_label["PHISHING"], strong),
                "phishing_high": share(by_label["PHISHING"], {"HIGH"}),
                "legitimate_warned": share(by_label["LEGITIMATE"], warned),
                "legitimate_elevated_or_high": share(by_label["LEGITIMATE"], strong),
                "legitimate_with_path_rows": len(sample),
                "legitimate_with_path_categories": dict(with_path),
                "legitimate_with_path_warned": share(with_path, warned),
                "legitimate_with_path_elevated_or_high": share(with_path, strong),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
