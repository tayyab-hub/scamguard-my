"""Prepare the approved UCI archive offline; never access URLs inside dataset rows."""

import csv
import hashlib
import io
import json
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.url_intelligence.features import FEATURE_VERSION, features
from app.url_intelligence.parsing import parse_url

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/url/raw/phiusiil.zip"
OUT = ROOT / "data/url/processed"
SOURCE_SHA = "0a639fd03aea6308c5b1c10c92aa23c2ce1505447a9137271865cd0badc9a59a"
SEED = 20260907


def main():
    from sklearn.model_selection import GroupShuffleSplit

    assert hashlib.sha256(RAW.read_bytes()).hexdigest() == SOURCE_SHA, "Source checksum mismatch"
    OUT.mkdir(parents=True, exist_ok=True)
    counts = Counter()
    labels = Counter()
    records = {}
    conflicts = set()
    with zipfile.ZipFile(RAW) as archive:
        filename = next(n for n in archive.namelist() if n.endswith(".csv"))
        with archive.open(filename) as raw:
            for index, row in enumerate(
                csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig"))
            ):
                counts["original_rows"] += 1
                labels[row["label"]] += 1
                try:
                    url = parse_url(row["URL"])
                    label = {"0": "PHISHING", "1": "LEGITIMATE"}[row["label"]]
                except (ValueError, KeyError, UnicodeError):
                    counts["invalid_rows"] += 1
                    continue
                # Fragments/userinfo do not define distinct destinations. Deduplicate before split.
                key = url.normalized
                if key in records:
                    counts["duplicate_rows"] += 1
                    if records[key]["label"] != label:
                        conflicts.add(key)
                    continue
                records[key] = {
                    "source_row": index + 2,
                    "url_sha256": hashlib.sha256(key.encode()).hexdigest(),
                    "label": label,
                    "group": url.registrable_domain or url.hostname,
                    "features": features(url),
                }
    for key in conflicts:
        del records[key]
    rows = list(records.values())
    counts["conflicting_groups_removed"] = len(conflicts)
    counts["cleaned_rows"] = len(rows)
    groups = [r["group"] for r in rows]
    trainval, test = next(
        GroupShuffleSplit(n_splits=1, test_size=0.15, random_state=SEED).split(rows, groups=groups)
    )
    train_local, val_local = next(
        GroupShuffleSplit(n_splits=1, test_size=0.15 / 0.85, random_state=SEED).split(
            trainval, groups=[groups[i] for i in trainval]
        )
    )
    partitions = {"train": trainval[train_local], "validation": trainval[val_local], "test": test}
    feature_names = list(rows[0]["features"])
    stats = {
        "source_sha256": SOURCE_SHA,
        "seed": SEED,
        "feature_version": FEATURE_VERSION,
        "counts": dict(counts),
        "original_labels": dict(labels),
        "splits": {},
    }
    manifest = []
    for name, indexes in partitions.items():
        selected = [rows[i] for i in indexes]
        stats["splits"][name] = {
            "rows": len(selected),
            "labels": dict(Counter(r["label"] for r in selected)),
            "domains": len({r["group"] for r in selected}),
        }
        with (OUT / f"{name}_v1.csv").open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f, lineterminator="\n")
            writer.writerow(["label", *feature_names])
            for r in selected:
                writer.writerow([r["label"], *r["features"].values()])
                manifest.append(
                    [
                        r["source_row"],
                        r["url_sha256"],
                        hashlib.sha256(r["group"].encode()).hexdigest(),
                        r["label"],
                        name,
                    ]
                )
    with (OUT / "split_manifest_v1.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(["source_row", "url_sha256", "domain_sha256", "label", "split"])
        writer.writerows(sorted(manifest))
    # Assert the central leakage boundary independently from the splitting routine.
    grouped = defaultdict(set)
    for _, _, domain, _, split in manifest:
        grouped[domain].add(split)
    assert all(len(splits) == 1 for splits in grouped.values())
    assert len({r[1] for r in manifest}) == len(manifest)
    stats["outputs_sha256"] = {
        p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(OUT.glob("*.csv"))
    }
    (OUT / "statistics_v1.json").write_text(json.dumps(stats, indent=2) + "\n")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
