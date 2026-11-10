# Frozen Message model inference using a checksum-verified JSON artifact. Reproduce trained TF-
# IDF and logistic-regression calculations locally without loading executable pickle data. The
# three learned labels are evidence inputs; ml/fusion.py decides the advisory risk category.

from __future__ import annotations

import hashlib
import json
import math
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

EXPECTED_ARTIFACT_SHA256 = "ccbf13ff3fcabf2aab84f724254b999a72d108f12873eabd87b2fb91a2c3c8ca"


# Model output: winning label, all class probabilities, winning-class strength, version and
# number of matched vocabulary features. Confidence is uncalibrated, and zero matches means the
# model saw no learned text features.
@dataclass(frozen=True)
class Classification:
    label: str
    probabilities: dict[str, float]
    confidence: float
    model_version: str
    matched_features: int = 0


# Loads the reviewed vocabulary, inverse document frequencies and regression weights once, then
# predicts without training or network requests.
class MessageClassifier:
    """Inference for the reviewed JSON TF-IDF/logistic-regression artifact."""

    # Read artifact bytes, check the expected SHA-256 and validate schema/dimensions before
    # retaining numeric parameters. A mismatched or malformed artifact raises instead of
    # silently using another model.
    def __init__(self, artifact_path: Path):
        raw = artifact_path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != EXPECTED_ARTIFACT_SHA256:
            raise ValueError("Message model artifact checksum mismatch")
        artifact = json.loads(raw)
        if artifact.get("schema_version") != 1 or artifact.get("model_type") != (
            "tfidf_logistic_regression"
        ):
            raise ValueError("Unsupported message model artifact")
        self.model_version: str = artifact["model_version"]
        self.classes: list[str] = artifact["classes"]
        vectorizer = artifact["vectorizer"]
        self.vocabulary: dict[str, int] = vectorizer["vocabulary"]
        # v2 artifacts list function words ignored during training; v1 artifacts have none.
        self.stop_words: frozenset[str] = frozenset(vectorizer.get("stop_words", []))
        self.idf: list[float] = vectorizer["idf"]
        self.coefficients: list[list[float]] = artifact["classifier"]["coefficients"]
        self.intercepts: list[float] = artifact["classifier"]["intercepts"]
        if not (
            len(self.idf) == len(self.vocabulary)
            and len(self.coefficients) == len(self.classes)
            and all(len(row) == len(self.idf) for row in self.coefficients)
        ):
            raise ValueError("Invalid message model dimensions")

    # Lowercase, decompose Unicode and remove combining marks, then return words of at least two
    # word characters plus adjacent word pairs. Stop words are dropped before pairing, exactly as
    # scikit-learn does. These preprocessing choices must match training.
    def _tokens(self, text: str) -> list[str]:
        normalized = unicodedata.normalize("NFKD", text.lower())
        normalized = "".join(char for char in normalized if not unicodedata.combining(char))
        words = [
            word for word in re.findall(r"(?u)\b\w\w+\b", normalized) if word not in self.stop_words
        ]
        return words + [f"{left} {right}" for left, right in zip(words, words[1:], strict=False)]

    # Convert text to sparse TF-IDF values, L2-normalize them, calculate one linear score per
    # class, and apply softmax. Return Classification without applying risk thresholds;
    # unmatched tokens do not create new vocabulary entries.
    def predict(self, text: str) -> Classification:
        counts: dict[int, int] = {}
        for token in self._tokens(text):
            index = self.vocabulary.get(token)
            if index is not None:
                counts[index] = counts.get(index, 0) + 1
        # Sublinear term frequency (1 + log(count)) limits repetition; stored IDF gives common
        # training terms less influence. Only learned vocabulary indices are present, keeping
        # the vector sparse.
        values = {
            index: (1.0 + math.log(count)) * self.idf[index] for index, count in counts.items()
        }
        norm = math.sqrt(sum(value * value for value in values.values()))
        if norm:
            values = {index: value / norm for index, value in values.items()}
        logits = [
            intercept + sum(coefficients[index] * value for index, value in values.items())
            for coefficients, intercept in zip(self.coefficients, self.intercepts, strict=True)
        ]
        # Subtracting the largest logit before exponentiation preserves softmax ratios while
        # avoiding numerical overflow. Probabilities sum to one across LEGITIMATE/SPAM/SCAM, not
        # across final risk categories.
        maximum = max(logits)
        exponentials = [math.exp(value - maximum) for value in logits]
        total = sum(exponentials)
        probabilities = {
            label: probability / total
            for label, probability in zip(self.classes, exponentials, strict=True)
        }
        label = max(probabilities, key=probabilities.__getitem__)
        return Classification(
            label=label,
            probabilities=probabilities,
            confidence=probabilities[label],
            model_version=self.model_version,
            matched_features=len(values),
        )
