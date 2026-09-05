from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum

from app.ml.ai_review import AIReview, AIStatus
from app.ml.classifier import Classification
from app.ml.rules import RuleAssessment

FUSION_VERSION = "message-fusion-v1"


class RiskLevel(StrEnum):
    LOW = "LOW"
    CAUTION = "CAUTION"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


@dataclass(frozen=True)
class FusionResult:
    risk_level: RiskLevel
    risk_score: float | None
    confidence_score: float
    confidence_level: str
    ai_contributed: bool
    version: str = FUSION_VERSION


def fuse(
    text: str, classification: Classification, rules: RuleAssessment, ai: AIReview
) -> FusionResult:
    malicious_probability = classification.probabilities["SCAM"]
    spam_probability = classification.probabilities["SPAM"]
    model_signal = min(1.0, malicious_probability + spam_probability * 0.35)
    words = re.findall(r"\b\w+\b", text)
    if len(words) < 3 and rules.score < 0.25 and malicious_probability < 0.75:
        return FusionResult(
            RiskLevel.INSUFFICIENT_EVIDENCE,
            None,
            round(classification.confidence, 4),
            "LOW",
            False,
        )

    local_score = 0.52 * model_signal + 0.48 * rules.score
    if rules.score >= 0.72:
        local_score = max(local_score, 0.72)
    contributed = (
        ai.status == AIStatus.COMPLETED
        and ai.contributed
        and ai.risk_signal is not None
        and ai.confidence is not None
        and ai.confidence >= 0.55
    )
    score = local_score
    if contributed:
        # Context adds modest corroboration but cannot erase or dominate local evidence.
        score = max(
            local_score, min(1.0, local_score + max(0.0, ai.risk_signal - local_score) * 0.18)
        )
    score = min(1.0, score)
    if score < 0.20:
        risk = RiskLevel.LOW
    elif score < 0.42:
        risk = RiskLevel.CAUTION
    elif score < 0.65:
        risk = RiskLevel.ELEVATED
    else:
        risk = RiskLevel.HIGH

    evidence_strength = min(1.0, rules.score + (0.1 if contributed else 0.0))
    confidence = min(1.0, 0.7 * classification.confidence + 0.3 * evidence_strength)
    level = "HIGH" if confidence >= 0.78 else "MEDIUM" if confidence >= 0.55 else "LOW"
    return FusionResult(risk, round(score, 4), round(confidence, 4), level, contributed)
