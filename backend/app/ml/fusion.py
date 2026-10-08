from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum

from app.ml.ai_review import AIReview, AIStatus
from app.ml.classifier import Classification
from app.ml.rules import RuleAssessment

FUSION_VERSION = "message-fusion-v2"
# Versioned policy weights, not learned/calibrated fraud probabilities. The v1 weights and
# category boundaries are retained; v2 adds evidence sufficiency and disagreement guards.
MODEL_WEIGHT = 0.52
RULE_WEIGHT = 0.48
SPAM_WEIGHT = 0.35
STRONG_RULE_SCORE = 0.72
MIN_RULE_CONTEXT = 0.25
MIN_MODEL_CONFIDENCE = 0.55
AI_MIN_CONFIDENCE = 0.55
AI_MAX_CONTRIBUTION = 0.18
LOW_BOUNDARY = 0.20
CAUTION_BOUNDARY = 0.42
HIGH_BOUNDARY = 0.65
CONFIDENCE_MODEL_WEIGHT = 0.7
CONFIDENCE_EVIDENCE_WEIGHT = 0.3


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
    confidence_score: float | None
    confidence_level: str
    ai_contributed: bool
    version: str = FUSION_VERSION
    reason: str = "COMBINED_SIGNALS"
    disagreement: bool = False


def fuse(
    text: str, classification: Classification, rules: RuleAssessment, ai: AIReview
) -> FusionResult:
    malicious_probability = classification.probabilities["SCAM"]
    spam_probability = classification.probabilities["SPAM"]
    model_signal = min(1.0, malicious_probability + spam_probability * SPAM_WEIGHT)
    if not classification.matched_features:
        model_signal = 0.0
    words = re.findall(r"\b\w+\b", text)
    reason = None
    if rules.score < MIN_RULE_CONTEXT:
        if classification.matched_features == 0:
            reason = "OUT_OF_VOCABULARY"
        elif len(words) < 3 and malicious_probability < 0.75:
            reason = "LIMITED_TEXT"
        elif classification.confidence < MIN_MODEL_CONFIDENCE:
            reason = "AMBIGUOUS_MODEL"
    if reason:
        return FusionResult(
            RiskLevel.INSUFFICIENT_EVIDENCE,
            None,
            None,
            "LOW",
            False,
            reason=reason,
        )

    local_score = MODEL_WEIGHT * model_signal + RULE_WEIGHT * rules.score
    strong_rules = rules.score >= STRONG_RULE_SCORE and len(rules.indicators) >= 3
    if strong_rules:
        local_score = max(local_score, STRONG_RULE_SCORE)
    elif not classification.matched_features:
        local_score = max(local_score, LOW_BOUNDARY)
    reason = "STRONG_LOCAL_EVIDENCE" if strong_rules else "COMBINED_SIGNALS"
    contributed = (
        ai.status == AIStatus.COMPLETED
        and ai.contributed
        and ai.risk_signal is not None
        and ai.confidence is not None
        and ai.confidence >= AI_MIN_CONFIDENCE
    )
    score = local_score
    if contributed:
        # Context adds modest corroboration but cannot erase or dominate local evidence.
        score = max(
            local_score,
            min(1.0, local_score + max(0.0, ai.risk_signal - local_score) * AI_MAX_CONTRIBUTION),
        )
    contributed = contributed and score > local_score
    if not rules.indicators and not contributed and score >= CAUTION_BOUNDARY:
        score = CAUTION_BOUNDARY - 0.0001
        reason = "UNCORROBORATED_MODEL"
    score = min(1.0, score)
    if score < LOW_BOUNDARY:
        risk = RiskLevel.LOW
    elif score < CAUTION_BOUNDARY:
        risk = RiskLevel.CAUTION
    elif score < HIGH_BOUNDARY:
        risk = RiskLevel.ELEVATED
    else:
        risk = RiskLevel.HIGH

    evidence_strength = min(1.0, rules.score + (0.1 if contributed else 0.0))
    confidence = min(
        1.0,
        CONFIDENCE_MODEL_WEIGHT * classification.confidence
        + CONFIDENCE_EVIDENCE_WEIGHT * evidence_strength,
    )
    disagreement = (classification.label == "LEGITIMATE" and strong_rules) or (
        classification.label == "SCAM" and rules.score < MIN_RULE_CONTEXT
    )
    if disagreement:
        confidence = min(confidence, MIN_MODEL_CONFIDENCE - 0.01)
    if classification.matched_features == 0:
        confidence = None
    level = (
        "HIGH"
        if confidence is not None and confidence >= 0.78
        else "MEDIUM"
        if confidence is not None and confidence >= MIN_MODEL_CONFIDENCE
        else "LOW"
    )
    return FusionResult(
        risk,
        round(score, 4),
        round(confidence, 4) if confidence is not None else None,
        level,
        contributed,
        reason=reason,
        disagreement=disagreement,
    )
