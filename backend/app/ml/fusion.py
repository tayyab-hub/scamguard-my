# Versioned Message advisory policy (message-fusion-v3). A logistic calibrator learned from
# out-of-fold data combines model class probabilities with the rule score into a calibrated
# share of similar historical messages that were scams. Fixed probability bands map that score to
# a category; documented scam-tactic playbooks can only raise it. Confidence stays separate.

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass
from enum import StrEnum
from functools import cache
from pathlib import Path

from app.ml.ai_review import AIReview, AIStatus
from app.ml.classifier import Classification
from app.ml.rules import SAFETY_CONTEXT, TACTIC_CATEGORIES, RuleAssessment

FUSION_VERSION = "message-fusion-v3"
CALIBRATOR_PATH = Path(__file__).resolve().parent / "artifacts" / "message_fusion_v3.json"
# Pinned like the model artifact: a changed calibrator must be regenerated and re-reviewed.
EXPECTED_CALIBRATOR_SHA256 = "b1761ecfaab010349ff5ca54c5239e38883e2c507b8049b764c827f0bf6f9bd7"
MIN_RULE_CONTEXT = 0.25
MIN_MODEL_CONFIDENCE = 0.55
STRONG_RULE_SCORE = 0.72
SPAM_FLOOR_PROBABILITY = 0.5
AI_MIN_CONFIDENCE = 0.55
AI_MAX_CONTRIBUTION = 0.18
CONFIDENCE_MODEL_WEIGHT = 0.7
CONFIDENCE_EVIDENCE_WEIGHT = 0.3
EPSILON = 1e-3  # extreme model outputs must not let one logit swamp the others
# Class shares of the 4,637 calibration rows (422 SCAM, 348 SPAM), used when no vocabulary matches.
NO_FEATURE_PRIOR = {"LEGITIMATE": 0.8340, "SCAM": 0.0910, "SPAM": 0.0750}

# Playbooks that are well documented in public scam advisories but nearly absent from the
# training SMS data. They set a minimum category rather than a learned probability, so the score
# is reported as raised by a tactic floor whenever one applies.
PAYMENT_REQUESTS = frozenset(
    {"MONEY_REQUEST", "IRREVERSIBLE_PAYMENT", "PERSONAL_DATA", "CREDENTIAL"}
)
HIGH_PLAYBOOKS = (
    ("IDENTITY_CHANGE", PAYMENT_REQUESTS),
    ("DISCREET_REQUEST", PAYMENT_REQUESTS),
    ("SECRECY", PAYMENT_REQUESTS | {"FINANCIAL"}),
)
ELEVATED_PLAYBOOKS = (
    (
        "UNSOLICITED_CONTACT",
        frozenset({"PLATFORM_SHIFT", "UNSOLICITED_OFFER", "IRREVERSIBLE_PAYMENT"}),
    ),
    (
        "UNSOLICITED_OFFER",
        frozenset({"PLATFORM_SHIFT", "IRREVERSIBLE_PAYMENT", "FINANCIAL", "MONEY_REQUEST"}),
    ),
    ("ADVANCE_FEE", PAYMENT_REQUESTS | {"FINANCIAL", "IMPERSONATION"}),
)
# Genuine one-time-code and account notices warn the reader *not* to share or act. When that
# protective wording is present and nothing asks the reader to act (no link, call-back request,
# threat or tactic), the model's resemblance to scam vocabulary is capped at Caution.
ACTION_CATEGORIES = frozenset({"REDIRECTION", "SUSPICIOUS_ACTION", "THREAT", "URGENCY", "PRIZE"})
# Service notices (statements, renewals, appointments, delivery status) are rare in the personal
# SMS training data, so the model can mistake them for scams. A genuine notice informs and points
# to a channel the reader already has; it does not ask for a link click, details, payment to an
# account or a call to a number it supplies. Such notices are capped at Caution.
SERVICE_NOTICE = re.compile(
    r"\b(reminder|appointment|statement (?:for|is)|renews? on|renewal|expires? on|due (?:by|on)|"
    r"is (?:now )?(?:ready|available)|out for delivery|has been (?:approved|delivered|shipped|"
    r"received|credited)|was (?:transferred|debited|credited)|track it in|in (?:the|our) \w+ app|"
    r"(?:via|in|on) (?:the )?(?:official )?(?:my\w+|\w+ app|i-akaun|app|account settings)|"
    r"at (?:any|our|the) [\w\s]{0,30}(?:counter|branch|centre|center|outlet)|"
    r"number on the back of your card|contact your agent|no payment (?:is )?required)\b",
    re.IGNORECASE,
)
TRUSTED_CHANNEL = re.compile(
    r"\b(number on the back of your card|official (?:app|website|hotline)|contact your agent)\b",
    re.IGNORECASE,
)
NOTICE_COMPATIBLE = frozenset({"IMPERSONATION", "DELIVERY_ACCOUNT", "FINANCIAL", "URGENCY"})


# Five advisory outputs shared with persistence/UI. INSUFFICIENT_EVIDENCE is abstention, not a
# lower numerical risk category.
class RiskLevel(StrEnum):
    LOW = "LOW"
    CAUTION = "CAUTION"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


# Final Message decision with nullable scores, confidence label and audit reasons. disagreement
# records conflicting model/rule signals without deleting strong warnings.
@dataclass(frozen=True)
class FusionResult:
    risk_level: RiskLevel
    risk_score: float | None
    confidence_score: float | None
    confidence_level: str
    ai_contributed: bool
    version: str = FUSION_VERSION
    reason: str = "CALIBRATED_SIGNALS"
    disagreement: bool = False


# Checksum-verified calibrator coefficients and band thresholds; loaded once per process.
@cache
def calibrator() -> dict:
    raw = CALIBRATOR_PATH.read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED_CALIBRATOR_SHA256:
        raise ValueError("Message fusion calibrator checksum mismatch")
    artifact = json.loads(raw)
    if artifact.get("fusion_version") != FUSION_VERSION or artifact.get("features") != [
        "logit_scam",
        "logit_spam",
        "rule_score",
    ]:
        raise ValueError("Unsupported message fusion calibrator")
    return artifact


def _logit(value: float) -> float:
    value = min(max(value, EPSILON), 1 - EPSILON)
    return math.log(value / (1 - value))


# Calibrated share of similar historical messages that were scams (measured on held-out data).
def calibrated_scam_score(classification: Classification, rules: RuleAssessment) -> float:
    artifact = calibrator()
    probabilities = classification.probabilities
    if not classification.matched_features:
        # With no vocabulary match the model output is only its prior, which is not evidence about
        # this text. Substitute the fixed training class shares so only rule evidence varies.
        probabilities = NO_FEATURE_PRIOR
    features = (
        _logit(probabilities["SCAM"]),
        _logit(probabilities["SPAM"]),
        rules.score,
    )
    total = artifact["intercept"] + sum(
        weight * value for weight, value in zip(artifact["coefficients"], features, strict=True)
    )
    return 1 / (1 + math.exp(-total))


def thresholds() -> dict[str, float]:
    return calibrator()["thresholds"]


def _category(score: float) -> RiskLevel:
    bands = thresholds()
    if score >= bands["HIGH"]:
        return RiskLevel.HIGH
    if score >= bands["ELEVATED"]:
        return RiskLevel.ELEVATED
    if score >= bands["CAUTION"]:
        return RiskLevel.CAUTION
    return RiskLevel.LOW


# Return the minimum score implied by documented tactics, with the reason that set it.
def _tactic_floor(categories: set[str], rules: RuleAssessment) -> tuple[float, str | None]:
    bands = thresholds()
    for anchor, partners in HIGH_PLAYBOOKS:
        if anchor in categories and categories & partners:
            return bands["HIGH"], "TACTIC_PLAYBOOK"
    if rules.score >= STRONG_RULE_SCORE and len(rules.indicators) >= 3:
        return bands["HIGH"], "STRONG_LOCAL_EVIDENCE"
    for anchor, partners in ELEVATED_PLAYBOOKS:
        if anchor in categories and categories & partners:
            return bands["ELEVATED"], "TACTIC_PLAYBOOK"
    # A single conversational cue (new number, wrong-number opener, app move, discreet favour,
    # payment method, offer or data request) is never treated as safe: verify first.
    if categories & TACTIC_CATEGORIES:
        return bands["CAUTION"], "SOCIAL_ENGINEERING_CUE"
    return 0.0, None


# Accept original text plus classifier/rule/AI outputs and return a FusionResult. Reject only
# inputs with no usable evidence, compute the calibrated score, apply bounded AI corroboration and
# tactic floors, then derive confidence separately.
def fuse(
    text: str, classification: Classification, rules: RuleAssessment, ai: AIReview
) -> FusionResult:
    categories = {indicator.category for indicator in rules.indicators}
    words = re.findall(r"\b\w+\b", text)
    reason = None
    if rules.score < MIN_RULE_CONTEXT and not categories & TACTIC_CATEGORIES:
        if classification.matched_features == 0:
            reason = "OUT_OF_VOCABULARY"
        elif len(words) < 3 and classification.probabilities["SCAM"] < 0.75:
            reason = "LIMITED_TEXT"
    if reason:
        return FusionResult(
            RiskLevel.INSUFFICIENT_EVIDENCE, None, None, "LOW", False, reason=reason
        )

    score = calibrated_scam_score(classification, rules)
    reason = "CALIBRATED_SIGNALS"
    contributed = (
        ai.status == AIStatus.COMPLETED
        and ai.contributed
        and ai.risk_signal is not None
        and ai.confidence is not None
        and ai.confidence >= AI_MIN_CONFIDENCE
    )
    if contributed:
        # Context adds modest corroboration but cannot erase or dominate local evidence.
        raised = min(1.0, score + max(0.0, ai.risk_signal - score) * AI_MAX_CONTRIBUTION)
        contributed = raised > score
        score = max(score, raised)
    # The classifier learned from personal SMS and can be confidently wrong on service notices it
    # never saw. Without any corroborating rule or AI evidence it may reach Elevated, not High.
    if not categories and not contributed and score >= thresholds()["HIGH"]:
        score = thresholds()["HIGH"] - 0.0001
        reason = "UNCORROBORATED_MODEL"

    floor, floor_reason = _tactic_floor(categories, rules)
    if floor > score:
        score = floor
        reason = floor_reason
    if (
        reason == "CALIBRATED_SIGNALS"
        and SAFETY_CONTEXT.search(text)
        and not categories & (ACTION_CATEGORIES | TACTIC_CATEGORIES)
        and score >= thresholds()["ELEVATED"]
    ):
        score = thresholds()["ELEVATED"] - 0.0001
        reason = "PROTECTIVE_NOTICE"
    # Pure safety advice ("never share your OTP") whose every rule match was protective, with no
    # other indicator, is not itself a warning sign.
    if (
        reason == "CALIBRATED_SIGNALS"
        and not categories
        and rules.suppressed_matches
        and SAFETY_CONTEXT.search(text)
        and score < thresholds()["ELEVATED"]
    ):
        score = min(score, thresholds()["CAUTION"] - 0.0001)
        reason = "PROTECTIVE_NOTICE"
    notice_categories = NOTICE_COMPATIBLE | (
        {"SUSPICIOUS_ACTION"} if TRUSTED_CHANNEL.search(text) else set()
    )
    if (
        reason in {"CALIBRATED_SIGNALS", "UNCORROBORATED_MODEL"}
        and SERVICE_NOTICE.search(text)
        and categories <= notice_categories
        and score >= thresholds()["ELEVATED"]
    ):
        score = thresholds()["ELEVATED"] - 0.0001
        reason = "SERVICE_NOTICE"
    risk = _category(score)
    # Unwanted marketing is not fraud, but it is not a message to act on without checking.
    if risk == RiskLevel.LOW and classification.probabilities["SPAM"] >= SPAM_FLOOR_PROBABILITY:
        score = max(score, thresholds()["CAUTION"])
        risk = RiskLevel.CAUTION
        reason = "LIKELY_SPAM"

    evidence_strength = min(1.0, rules.score + (0.1 if contributed else 0.0))
    confidence = min(
        1.0,
        CONFIDENCE_MODEL_WEIGHT * classification.confidence
        + CONFIDENCE_EVIDENCE_WEIGHT * evidence_strength,
    )
    strong_rules = rules.score >= STRONG_RULE_SCORE and len(rules.indicators) >= 3
    disagreement = (classification.label == "LEGITIMATE" and (strong_rules or floor > 0)) or (
        classification.label == "SCAM" and rules.score < MIN_RULE_CONTEXT
    )
    # Conflicting signals lower confidence while the risk floor remains. A low confidence label
    # can therefore coexist with a serious warning.
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
        round(min(score, 1.0), 4),
        round(confidence, 4) if confidence is not None else None,
        level,
        contributed,
        reason=reason,
        disagreement=disagreement,
    )
