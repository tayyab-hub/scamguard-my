from __future__ import annotations

import hashlib
import json
import math
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

EXPECTED_ARTIFACT_SHA256 = "818d99f72c8502fe6ec28849e42c77f4707949366bf014bd5677079dde2c3dd3"


@dataclass(frozen=True)
class Classification:
    label: str
    probabilities: dict[str, float]
    confidence: float
    model_version: str


class MessageClassifier:
    """Inference for the reviewed JSON TF-IDF/logistic-regression artifact."""

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
        self.idf: list[float] = vectorizer["idf"]
        self.coefficients: list[list[float]] = artifact["classifier"]["coefficients"]
        self.intercepts: list[float] = artifact["classifier"]["intercepts"]
        if not (
            len(self.idf) == len(self.vocabulary)
            and len(self.coefficients) == len(self.classes)
            and all(len(row) == len(self.idf) for row in self.coefficients)
        ):
            raise ValueError("Invalid message model dimensions")

    @staticmethod
    def _tokens(text: str) -> list[str]:
        normalized = unicodedata.normalize("NFKD", text.lower())
        normalized = "".join(char for char in normalized if not unicodedata.combining(char))
        words = re.findall(r"(?u)\b\w\w+\b", normalized)
        return words + [f"{left} {right}" for left, right in zip(words, words[1:], strict=False)]

    def predict(self, text: str) -> Classification:
        counts: dict[int, int] = {}
        for token in self._tokens(text):
            index = self.vocabulary.get(token)
            if index is not None:
                counts[index] = counts.get(index, 0) + 1
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
        )
