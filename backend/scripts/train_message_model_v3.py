# Offline training for message-tfidf-logreg-v3: the v2 recipe (English + Malay/Manglish
# translations) plus 600 written institutional notices: genuine notices in English, Malay and
# Manglish, and scam imitations of them. The English split manifest is reused unchanged, so the
# English validation and test partitions stay exactly as in v1 and v2.

"""Train the bilingual message classifier with institutional-notice examples.

Run from the repository root::

    set PYTHONPATH=backend/scripts
    backend\\.venv\\Scripts\\python.exe backend\\scripts\\train_message_model_v3.py
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from train_message_model import (
    CLASSES,
    SEED,
    SOURCE_SHA256,
    TOKEN_PATTERN,
    metrics,
    rounded,
    sha256,
)
from train_message_model_v2 import (
    MALAY_FUNCTION_WORDS,
    held_out,
    load_english,
    load_translations,
    vectorizer,
)

MODEL_VERSION = "message-tfidf-logreg-v3"
NOTICE_VALIDATION_SHARE = 0.2


def load_notices(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as handle:
        return [
            {
                "id": item["id"],
                "text": item["text"].strip(),
                "label": item["label"],
                "language": item["language"],
            }
            for item in csv.DictReader(handle)
        ]


def notice_held_out(notice_id: str) -> bool:
    digest = hashlib.sha256(f"notice-validation-{notice_id}".encode()).digest()
    return digest[0] / 255 < NOTICE_VALIDATION_SHARE


def macro(report: dict) -> float:
    return report["classification_report"]["macro avg"]["f1-score"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source", default="data/raw/mendeley_sms_phishing_v1/source/Dataset_5971.csv"
    )
    parser.add_argument("--manifest", default="data/processed/message_split_manifest_v1.csv")
    parser.add_argument(
        "--translations", default="data/processed/malay_translation/message_train_malay_v1.csv"
    )
    parser.add_argument("--notices", default="data/processed/notices_v1/message_notices_v1.csv")
    parser.add_argument("--artifact", default="backend/app/ml/artifacts/message_tfidf_v3.json")
    parser.add_argument("--report", default="docs/model_evaluation_v3.json")
    args = parser.parse_args()

    english = load_english(Path(args.source), Path(args.manifest))
    malay = load_translations(Path(args.translations), english)
    notices = load_notices(Path(args.notices))
    malay_validation = [row for row in malay if held_out(row["group"])]
    notice_validation = [row for row in notices if notice_held_out(row["id"])]
    held_groups = {row["group"] for row in malay_validation}
    train = [r for r in english if r["split"] == "train" and r["group"] not in held_groups]
    train += [row for row in malay if not held_out(row["group"])]
    train += [row for row in notices if not notice_held_out(row["id"])]
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
    held_sets = {
        "english_validation": validation,
        "malay_validation": malay_validation,
        "notice_validation": notice_validation,
    }
    reports: dict[str, dict[str, object]] = {name: {} for name in held_sets}
    for name, model in candidates.items():
        model.fit(train_matrix, train_labels)
        for set_name, rows in held_sets.items():
            reports[set_name][name] = metrics(
                [row["label"] for row in rows],
                model.predict(vec.transform([row["text"] for row in rows])).tolist(),
            )
    # Same selection rule as v1/v2 on the two three-class sets. Notices have two classes only, so
    # their accuracy is reported rather than used for selection.
    for set_name in ("english_validation", "malay_validation"):
        scores = {name: macro(report) for name, report in reports[set_name].items()}
        if max(scores.values()) - scores["logistic_regression"] > 0.02:
            raise RuntimeError("Logistic regression is materially below the best candidate")

    final = [r for r in english if r["split"] in {"train", "validation"}] + malay + notices
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
            "created_by": "backend/scripts/train_message_model_v3.py",
            "random_seed": SEED,
            "source_sha256": SOURCE_SHA256,
            "translations_sha256": sha256(Path(args.translations)),
            "notices_sha256": sha256(Path(args.notices)),
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

    notice_predictions = reports["notice_validation"]["logistic_regression"]["confusion_matrix"]
    report = rounded(
        {
            "model_version": MODEL_VERSION,
            "artifact_sha256": artifact_sha,
            "data": {
                "translation_rows": len(malay),
                "notice_rows": len(notices),
                "notice_labels": dict(Counter(row["label"] for row in notices)),
                "notice_languages": dict(Counter(row["language"] for row in notices)),
                "notice_validation_rows": len(notice_validation),
                "malay_validation_rows": len(malay_validation),
                "selection_train_rows": len(train),
                "final_training_rows": len(final),
                "final_labels": dict(Counter(row["label"] for row in final)),
            },
            "validation_candidates": reports,
            "notice_validation_confusion_matrix_logistic": notice_predictions,
            "selection": {
                "selected": "logistic_regression",
                "rationale": (
                    "Same transparent probability model as v1/v2, within 0.02 macro F1 of the "
                    "best candidate on English validation and held-out Malay/Manglish."
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
                "macro_f1": {
                    set_name: {k: round(macro(v), 4) for k, v in by_model.items()}
                    for set_name, by_model in reports.items()
                    if set_name != "notice_validation"
                },
                "notice_validation_confusion_[LEGIT,SPAM,SCAM]": notice_predictions,
                "english_test_macro_f1": round(macro(test_report), 4),
                "rows": report["data"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
