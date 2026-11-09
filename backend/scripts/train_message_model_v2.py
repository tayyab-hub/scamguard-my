# Offline training for message-tfidf-logreg-v2: the v1 recipe plus Malay/Manglish translations of
# training-split messages. The v1 split manifest is reused unchanged, so the English validation and
# test partitions stay exactly as before; translations only ever join the training side. Running
# this rewrites the v2 artifact and report; it is not a routine app-start command.

"""Train the bilingual (English + Malay/Manglish) local message classifier.

Run from the repository root after installing the ``ml`` optional dependency::

    backend\\.venv\\Scripts\\python.exe backend\\scripts\\train_message_model_v2.py
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from train_message_model import (
    CLASSES,
    LABEL_MAP,
    SEED,
    SOURCE_SHA256,
    TOKEN_PATTERN,
    metrics,
    rounded,
    sha256,
)

MODEL_VERSION = "message-tfidf-logreg-v2"
# Malay/Manglish function words, pronouns and particles. In the translated training data only the
# scam and spam originals were formal, so words such as "anda" (formal "you") or "untuk" ("for")
# would otherwise be learned as scam signals. They describe register, not intent; content words
# such as "hubungi" (contact), "percuma" (free) or "hadiah" (prize) are kept.
MALAY_FUNCTION_WORDS = sorted(
    {
        "yang",
        "dan",
        "di",
        "ke",
        "dari",
        "daripada",
        "pada",
        "untuk",
        "dengan",
        "ini",
        "itu",
        "telah",
        "sudah",
        "dah",
        "akan",
        "ada",
        "adalah",
        "ialah",
        "anda",
        "kami",
        "kita",
        "saya",
        "aku",
        "awak",
        "kamu",
        "engkau",
        "dia",
        "mereka",
        "ia",
        "nya",
        "juga",
        "atau",
        "oleh",
        "bagi",
        "dalam",
        "lagi",
        "kepada",
        "sebagai",
        "boleh",
        "lah",
        "je",
        "ye",
        "ya",
        "pun",
        "kan",
        "tu",
        "ni",
        "yg",
        "dgn",
        "utk",
        "dlm",
        "pd",
        "sbb",
        "kerana",
    }
)
MAX_FEATURES = 30_000
# Share of translated rows (by near-duplicate group of their English source) held back to measure
# Malay/Manglish performance before the final refit.
MALAY_VALIDATION_SHARE = 0.2


def load_english(source: Path, manifest: Path) -> list[dict]:
    if sha256(source) != SOURCE_SHA256:
        raise ValueError("Source CSV checksum differs from the reviewed dataset version")
    with source.open(encoding="utf-8-sig", newline="") as handle:
        source_rows = list(csv.DictReader(handle))
    rows = []
    with manifest.open(encoding="utf-8") as handle:
        for entry in csv.DictReader(handle):
            item = source_rows[int(entry["source_row"]) - 2]
            label = LABEL_MAP[item["LABEL"].strip().casefold()]
            if label != entry["label"]:
                raise ValueError("Manifest label does not match source row")
            rows.append(
                {
                    "source_row": int(entry["source_row"]),
                    "text": item["TEXT"].strip(),
                    "label": label,
                    "split": entry["split"],
                    "group": int(entry["near_duplicate_group"]),
                }
            )
    return rows


def load_translations(path: Path, english: list[dict]) -> list[dict]:
    by_row = {row["source_row"]: row for row in english}
    rows = []
    with path.open(encoding="utf-8") as handle:
        for item in csv.DictReader(handle):
            origin = by_row[int(item["source_row"])]
            # Translations must come from the training split and keep the source label.
            if origin["split"] != "train" or origin["label"] != item["label"]:
                raise ValueError(f"Translation {item['source_row']} is not a train-split row")
            rows.append(
                {
                    "source_row": origin["source_row"],
                    "text": item["text"].strip(),
                    "label": item["label"],
                    "language": item["language"],
                    "group": origin["group"],
                }
            )
    return rows


def held_out(group: int) -> bool:
    # Deterministic group-level hold-out: a translation and its English source share a group,
    # and every member of a group lands on the same side.
    digest = hashlib.sha256(f"malay-validation-{group}".encode()).digest()
    return digest[0] / 255 < MALAY_VALIDATION_SHARE


def vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(
        lowercase=True,
        strip_accents="unicode",
        token_pattern=TOKEN_PATTERN,
        ngram_range=(1, 2),
        min_df=2,
        max_features=MAX_FEATURES,
        sublinear_tf=True,
        norm="l2",
        stop_words=MALAY_FUNCTION_WORDS,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source", default="data/raw/mendeley_sms_phishing_v1/source/Dataset_5971.csv"
    )
    parser.add_argument("--manifest", default="data/processed/message_split_manifest_v1.csv")
    parser.add_argument(
        "--translations",
        default="data/processed/malay_translation/message_train_malay_v1.csv",
    )
    parser.add_argument("--artifact", default="backend/app/ml/artifacts/message_tfidf_v2.json")
    parser.add_argument("--report", default="docs/model_evaluation_v2.json")
    args = parser.parse_args()

    english = load_english(Path(args.source), Path(args.manifest))
    malay = load_translations(Path(args.translations), english)
    malay_train = [row for row in malay if not held_out(row["group"])]
    malay_validation = [row for row in malay if held_out(row["group"])]
    # The English source of a held-out translation also leaves training, so no wording of a
    # held-out message is learned in either language.
    held_groups = {row["group"] for row in malay_validation}
    train = [r for r in english if r["split"] == "train" and r["group"] not in held_groups]
    train += malay_train
    validation = [row for row in english if row["split"] == "validation"]
    test = [row for row in english if row["split"] == "test"]

    vec = vectorizer()
    train_matrix = vec.fit_transform([row["text"] for row in train])
    train_labels = [row["label"] for row in train]
    candidates = {
        "logistic_regression": LogisticRegression(
            C=4.0, class_weight="balanced", max_iter=3000, random_state=SEED
        ),
        "linear_svm": LinearSVC(C=1.0, class_weight="balanced", random_state=SEED),
        "multinomial_naive_bayes": MultinomialNB(alpha=0.3),
    }
    validation_reports: dict[str, object] = {}
    malay_reports: dict[str, object] = {}
    for name, model in candidates.items():
        model.fit(train_matrix, train_labels)
        validation_reports[name] = metrics(
            [row["label"] for row in validation],
            model.predict(vec.transform([row["text"] for row in validation])).tolist(),
        )
        malay_reports[name] = metrics(
            [row["label"] for row in malay_validation],
            model.predict(vec.transform([row["text"] for row in malay_validation])).tolist(),
        )

    def macro(report: dict) -> float:
        return report["classification_report"]["macro avg"]["f1-score"]

    # Same rule as v1: keep logistic regression only within two macro-F1 points of the best
    # candidate, on English validation and on held-out Malay alike.
    for reports in (validation_reports, malay_reports):
        scores = {name: macro(report) for name, report in reports.items()}
        if max(scores.values()) - scores["logistic_regression"] > 0.02:
            raise RuntimeError("Logistic regression is materially below the best candidate")

    # Final refit: all English train + validation and every translation (the Malay hold-out was
    # only for measurement). The English test split stays untouched until the line below.
    final = [r for r in english if r["split"] in {"train", "validation"}] + malay
    final_vec = vectorizer()
    final_matrix = final_vec.fit_transform([row["text"] for row in final])
    final_model = LogisticRegression(
        C=4.0, class_weight="balanced", max_iter=3000, random_state=SEED
    ).fit(final_matrix, [row["label"] for row in final])
    test_report = metrics(
        [row["label"] for row in test],
        final_model.predict(final_vec.transform([row["text"] for row in test])).tolist(),
    )

    artifact = rounded(
        {
            "schema_version": 1,
            "model_version": MODEL_VERSION,
            "model_type": "tfidf_logistic_regression",
            "created_by": "backend/scripts/train_message_model_v2.py",
            "random_seed": SEED,
            "source_sha256": SOURCE_SHA256,
            "translations_sha256": sha256(Path(args.translations)),
            "classes": final_model.classes_.tolist(),
            "vectorizer": {
                "lowercase": True,
                "strip_accents": "unicode",
                "token_pattern": TOKEN_PATTERN,
                "ngram_range": [1, 2],
                "sublinear_tf": True,
                "norm": "l2",
                "stop_words": MALAY_FUNCTION_WORDS,
                "vocabulary": {token: int(index) for token, index in final_vec.vocabulary_.items()},
                "idf": final_vec.idf_.tolist(),
            },
            "classifier": {
                "coefficients": final_model.coef_.tolist(),
                "intercepts": final_model.intercept_.tolist(),
            },
            "training_rows": len(final),
        }
    )
    artifact_path = Path(args.artifact)
    artifact_path.write_text(json.dumps(artifact, ensure_ascii=False, separators=(",", ":")))
    artifact_sha = sha256(artifact_path)

    report = rounded(
        {
            "model_version": MODEL_VERSION,
            "artifact_sha256": artifact_sha,
            "data": {
                "english_split_manifest": args.manifest,
                "translations": args.translations,
                "translation_rows": len(malay),
                "translation_languages": dict(Counter(row["language"] for row in malay)),
                "malay_validation_rows": len(malay_validation),
                "malay_validation_labels": dict(Counter(r["label"] for r in malay_validation)),
                "selection_train_rows": len(train),
                "final_training_rows": len(final),
            },
            "english_validation_candidates": validation_reports,
            "malay_validation_candidates": malay_reports,
            "selection": {
                "selected": "logistic_regression",
                "rationale": (
                    "Same transparent probability model as v1, within 0.02 macro F1 of the best "
                    "candidate on English validation and on held-out Malay/Manglish."
                ),
            },
            "untouched_english_test": test_report,
            "class_order": CLASSES,
        }
    )
    Path(args.report).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "artifact_sha256": artifact_sha,
                "english_validation_macro_f1": {
                    k: round(macro(v), 4) for k, v in validation_reports.items()
                },
                "malay_validation_macro_f1": {
                    k: round(macro(v), 4) for k, v in malay_reports.items()
                },
                "english_test_macro_f1": round(macro(test_report), 4),
                "rows": report["data"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
