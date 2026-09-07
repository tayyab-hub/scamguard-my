"""Checksum-verified non-executable JSON inference; no sklearn runtime required."""

import hashlib
import json
import math
import struct
from dataclasses import dataclass
from pathlib import Path

from app.url_intelligence.features import FEATURE_VERSION, features

EXPECTED_ARTIFACT_SHA256 = "87a61a0bbee6921a590b6feeeecdd00335f9dcdb2087ff412958a4d66b16f698"


@dataclass(frozen=True)
class Classification:
    label: str
    confidence: float
    model_version: str = "url_ml_v1"


class URLClassifier:
    def __init__(self, path: Path):
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != EXPECTED_ARTIFACT_SHA256:
            raise ValueError("URL model checksum mismatch")
        self.model = json.loads(data)
        if self.model["version"] != "url_ml_v1" or self.model["feature_version"] != FEATURE_VERSION:
            raise ValueError("Unsupported URL model version")
        if self.model["classes"] != ["LEGITIMATE", "PHISHING"]:
            raise ValueError("Invalid URL model classes")

    def predict(self, url):
        return self.predict_features(features(url))

    def predict_features(self, values: dict[str, float]) -> Classification:
        if list(values) != self.model["features"]:
            raise ValueError("URL feature schema mismatch")
        x = list(values.values())
        if self.model["kind"] == "random_forest":
            # sklearn's forest converts input to float32 before threshold comparisons.
            x = [struct.unpack("f", struct.pack("f", value))[0] for value in x]
            probabilities = []
            for tree in self.model["trees"]:
                node = 0
                while tree["left"][node] != -1:
                    node = (
                        tree["left"][node]
                        if x[tree["feature"][node]] <= tree["threshold"][node]
                        else tree["right"][node]
                    )
                value = tree["value"][node]
                probabilities.append(value[1] / sum(value))
            p = sum(probabilities) / len(probabilities)
        else:
            score = self.model["intercept"] + sum(
                (v - m) / s * c
                for v, m, s, c in zip(
                    x, self.model["mean"], self.model["scale"], self.model["coef"], strict=True
                )
            )
            # SVM decision strength is not calibrated; sigmoid is only a bounded margin.
            p = 1 / (1 + math.exp(-max(-700, min(700, score))))
        return Classification("PHISHING" if p > 0.5 else "LEGITIMATE", max(p, 1 - p))
