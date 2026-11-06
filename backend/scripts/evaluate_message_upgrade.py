# Compare complete Message engines (rules + model + fusion, AI disabled) on the untouched
# historical test split and the independent conversational challenge set. Nothing is fitted
# here; the script only runs whichever backend directory it is given and summarises categories.

"""Evaluate a Message engine build on the test split and the challenge set.

Usage (repository root)::

    backend\\.venv\\Scripts\\python.exe backend\\scripts\\evaluate_message_upgrade.py \\
        --backend backend --label current
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LABEL_MAP = {"ham": "LEGITIMATE", "spam": "SPAM", "smishing": "SCAM"}
WARNINGS = {"CAUTION", "ELEVATED", "HIGH"}
STRONG = {"ELEVATED", "HIGH"}


def historical_test() -> list[dict]:
    source = ROOT / "data/raw/mendeley_sms_phishing_v1/source/Dataset_5971.csv"
    with source.open(encoding="utf-8-sig", newline="") as handle:
        source_rows = list(csv.DictReader(handle))
    with (ROOT / "data/processed/message_split_manifest_v1.csv").open(encoding="utf-8") as handle:
        manifest = [row for row in csv.DictReader(handle) if row["split"] == "test"]
    return [
        {
            "text": source_rows[int(row["source_row"]) - 2]["TEXT"].strip(),
            "label": row["label"],
            "ambiguous": False,
        }
        for row in manifest
    ]


def challenge() -> list[dict]:
    with (ROOT / "data/challenge/message_challenge_v1.csv").open(encoding="utf-8") as handle:
        return [
            {
                "text": row["text"],
                "label": row["label"],
                "ambiguous": row["ambiguous"].strip().lower() == "true",
                "category": row["category"],
            }
            for row in csv.DictReader(handle)
        ]


def summarise(rows: list[dict], levels: list[str]) -> dict:
    by_label: dict[str, Counter] = {}
    for row, level in zip(rows, levels, strict=True):
        by_label.setdefault(row["label"], Counter())[level] += 1

    def share(label: str, accepted: set[str]) -> float | None:
        counts = by_label.get(label)
        if not counts:
            return None
        return round(sum(counts[level] for level in accepted) / sum(counts.values()), 4)

    return {
        "rows": len(rows),
        "categories_by_label": {label: dict(counts) for label, counts in by_label.items()},
        "scam_warned_caution_or_above": share("SCAM", WARNINGS),
        "scam_elevated_or_high": share("SCAM", STRONG),
        "scam_high": share("SCAM", {"HIGH"}),
        "scam_low": share("SCAM", {"LOW"}),
        "legitimate_warned_caution_or_above": share("LEGITIMATE", WARNINGS),
        "legitimate_elevated_or_high": share("LEGITIMATE", STRONG),
        "spam_warned_caution_or_above": share("SPAM", WARNINGS),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", required=True)
    parser.add_argument("--label", required=True)
    parser.add_argument("--details", help="optional CSV of per-row challenge results")
    args = parser.parse_args()
    sys.path.insert(0, str(Path(args.backend).resolve()))
    from app.core.config import Settings
    from app.ml.engine import build_message_engine

    engine = build_message_engine(Settings(persistence_enabled=False, ai_review_enabled=False))
    results = {"label": args.label}
    for name, rows in (("historical_test", historical_test()), ("challenge_v1", challenge())):
        assessed = [engine.analyse(row["text"]) for row in rows]
        levels = [str(item.risk_level) for item in assessed]
        results[name] = summarise(rows, levels)
        results[name]["versions"] = {
            "rules": assessed[0].rules_version,
            "fusion": assessed[0].fusion_version,
        }
        if name == "challenge_v1":
            clear = [i for i, row in enumerate(rows) if not row["ambiguous"]]
            results[name]["excluding_ambiguous"] = summarise(
                [rows[i] for i in clear], [levels[i] for i in clear]
            )
            if args.details:
                with open(args.details, "w", encoding="utf-8", newline="") as handle:
                    writer = csv.writer(handle)
                    writer.writerow(["label", "category", "ambiguous", "level", "score", "text"])
                    for row, item in zip(rows, assessed, strict=True):
                        writer.writerow(
                            [
                                row["label"],
                                row["category"],
                                row["ambiguous"],
                                item.risk_level,
                                item.risk_score,
                                row["text"],
                            ]
                        )
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
