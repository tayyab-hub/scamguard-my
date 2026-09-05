from __future__ import annotations

import re
from dataclasses import dataclass

RULES_VERSION = "message-rules-v1"


@dataclass(frozen=True)
class IndicatorDefinition:
    category: str
    label: str
    pattern: re.Pattern[str]
    weight: float


@dataclass(frozen=True)
class Indicator:
    category: str
    label: str
    snippet: str
    weight: float


@dataclass(frozen=True)
class RuleAssessment:
    score: float
    indicators: list[Indicator]
    suppressed_matches: int
    version: str = RULES_VERSION


def rule(category: str, label: str, expression: str, weight: float) -> IndicatorDefinition:
    return IndicatorDefinition(category, label, re.compile(expression, re.IGNORECASE), weight)


DEFINITIONS = (
    rule(
        "URGENCY",
        "Urgent deadline",
        r"\b(urgent|immediately|act now|within \d+ (?:hour|minute)s?|last chance)\b",
        0.14,
    ),
    rule(
        "THREAT",
        "Threat or fear",
        r"\b(account (?:will be )?(?:blocked|suspended|closed)|legal action|arrest|"
        r"penalty|unauthori[sz]ed activity)\b",
        0.18,
    ),
    rule(
        "CREDENTIAL",
        "Credential request",
        r"\b(otp|one[- ]time pass(?:word|code)|password|pin|security code|login details)\b",
        0.21,
    ),
    rule(
        "FINANCIAL",
        "Money or payment request",
        r"\b(transfer|send|pay|payment|bank account|card details|crypto|wallet|deposit|fee)\b",
        0.13,
    ),
    rule(
        "IMPERSONATION",
        "Authority impersonation",
        r"\b(bank|police|tax department|government|courier|support team|security team)\b",
        0.09,
    ),
    rule(
        "PRIZE",
        "Prize or reward",
        r"\b(won|winner|prize|reward|claim (?:your|now)|free gift|lottery|bonus)\b",
        0.16,
    ),
    rule(
        "INVESTMENT",
        "Investment promise",
        r"\b(guaranteed return|double your money|investment opportunity|high return|"
        r"risk[- ]free profit)\b",
        0.20,
    ),
    rule(
        "JOB_TASK",
        "Job or task offer",
        r"\b(easy task|part[- ]time job|earn (?:daily|weekly)|commission task|work from home)\b",
        0.13,
    ),
    rule(
        "DELIVERY_ACCOUNT",
        "Delivery or account issue",
        r"\b(parcel|delivery failed|customs fee|verify your account|account verification)\b",
        0.12,
    ),
    rule(
        "SECRECY",
        "Secrecy pressure",
        r"\b(don't tell|do not tell|keep (?:this|it) secret|confidential between us)\b",
        0.19,
    ),
    rule(
        "REDIRECTION",
        "External redirection",
        r"\b(click(?:ing)?|tap|open|visit|follow)\b.{0,45}\b(links?|urls?|websites?)\b|"
        r"https?://|\bwww\.",
        0.15,
    ),
    rule(
        "SUSPICIOUS_ACTION",
        "Requested risky action",
        r"\b(reply|call|download|install|scan|confirm|verify|share|provide)\b.{0,55}\b(code|details|identity|account|app|number)\b",
        0.16,
    ),
)

SAFETY_CONTEXT = re.compile(
    r"\b(never|do not|don't|avoid|beware|warning|safety|training|example|education|"
    r"will not|won't|should not|reporting|reported)\b",
    re.IGNORECASE,
)


def _snippet(text: str, start: int, end: int) -> str:
    left = max(0, start - 36)
    right = min(len(text), end + 50)
    value = " ".join(text[left:right].split())
    if left:
        value = "…" + value
    if right < len(text):
        value += "…"
    return value[:180]


def assess_rules(text: str) -> RuleAssessment:
    indicators: list[Indicator] = []
    suppressed = 0
    for definition in DEFINITIONS:
        match = definition.pattern.search(text)
        if not match:
            continue
        context = text[max(0, match.start() - 70) : min(len(text), match.end() + 40)]
        if SAFETY_CONTEXT.search(context):
            suppressed += 1
            continue
        indicators.append(
            Indicator(
                category=definition.category,
                label=definition.label,
                snippet=_snippet(text, match.start(), match.end()),
                weight=definition.weight,
            )
        )

    categories = {indicator.category for indicator in indicators}
    score = sum(indicator.weight for indicator in indicators)
    if "URGENCY" in categories and categories & {"CREDENTIAL", "FINANCIAL", "REDIRECTION"}:
        score += 0.16
    if "IMPERSONATION" in categories and categories & {"THREAT", "CREDENTIAL", "FINANCIAL"}:
        score += 0.14
    if "PRIZE" in categories and categories & {"FINANCIAL", "REDIRECTION", "SUSPICIOUS_ACTION"}:
        score += 0.12
    return RuleAssessment(
        score=min(score, 1.0), indicators=indicators, suppressed_matches=suppressed
    )
