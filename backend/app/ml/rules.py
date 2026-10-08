from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

RULES_VERSION = "message-rules-v2"
URGENCY_COMBINATION_WEIGHT = 0.16
AUTHORITY_COMBINATION_WEIGHT = 0.14
PRIZE_COMBINATION_WEIGHT = 0.12


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
    normalization_applied: bool = False


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
        "Credential language",
        r"\b(otp|one[- ]time pass(?:word|code)|password|pin|security code|login details)\b",
        0.21,
    ),
    rule(
        "FINANCIAL",
        "Money or payment language",
        r"\b(transfer|send|pay|payment|bank account|card details|crypto|wallet|deposit|fee)\b",
        0.13,
    ),
    rule(
        "IMPERSONATION",
        "Authority reference",
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

# Negation must describe a protective action in the same clause. Generic words like
# 'warning' also appear in account-threat scams and must never disable detection.
SAFETY_CONTEXT = re.compile(
    r"\b(?:never|do not|don't|avoid|should not|must not|will not|won't)\s+"
    r"(?:ever\s+)?(?:share|send|provide|give|disclose|enter|click(?:ing)?|open(?:ing)?|"
    r"follow(?:ing)?|pay(?:ing)?|transfer(?:ring)?|reply(?:ing)?|ask)\b",
    re.IGNORECASE,
)
CLAUSE_BREAK = re.compile(r"[.!?;\n]|\b(?:but|however|instead)\b", re.IGNORECASE)
SPACED_WORD = re.compile(r"(?<!\w)(?:[a-z][ ._-]){2,}[a-z](?!\w)", re.IGNORECASE)
LEET = str.maketrans("013457", "oieast")


def rule_text(text: str) -> tuple[str, list[int]]:
    """Rules-only normalization with offsets back to original evidence.

    Do not feed this representation to the frozen ML model: its preprocessing is versioned
    independently. Compatibility glyphs, invisible separators and simple mixed alphanumeric
    substitutions are treated as spelling variants, never as independent evidence of fraud.
    """
    characters: list[str] = []
    offsets: list[int] = []
    for index, character in enumerate(text):
        if character in "\u200b\u200c\u200d\u2060\ufeff":
            continue
        normalized = unicodedata.normalize("NFKC", character).casefold().replace("’", "'")
        characters.extend(normalized)
        offsets.extend([index] * len(normalized))
    normalized = "".join(characters)
    for token in re.finditer(r"\b[a-z0-9]+\b", normalized):
        if any(c.isalpha() for c in token.group()) and any(c.isdigit() for c in token.group()):
            characters[token.start() : token.end()] = token.group().translate(LEET)
    normalized = "".join(characters)
    removed = {
        index
        for match in SPACED_WORD.finditer(normalized)
        for index in range(match.start(), match.end())
        if not normalized[index].isalpha()
    }
    return (
        "".join(c for i, c in enumerate(normalized) if i not in removed),
        [offset for i, offset in enumerate(offsets) if i not in removed],
    )


def protective_context(text: str, start: int, end: int) -> bool:
    left = 0
    right = len(text)
    for separator in CLAUSE_BREAK.finditer(text):
        if separator.end() <= start:
            left = separator.end()
        elif separator.start() >= end:
            right = separator.start()
            break
    return bool(SAFETY_CONTEXT.search(text[left:right]))


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
    normalized, offsets = rule_text(text)
    for definition in DEFINITIONS:
        for match in definition.pattern.finditer(normalized):
            if protective_context(normalized, match.start(), match.end()):
                suppressed += 1
                continue
            indicators.append(
                Indicator(
                    category=definition.category,
                    label=definition.label,
                    snippet=_snippet(text, offsets[match.start()], offsets[match.end() - 1] + 1),
                    weight=definition.weight,
                )
            )
            break  # Repeated wording cannot inflate a category's contribution.

    categories = {indicator.category for indicator in indicators}
    score = sum(indicator.weight for indicator in indicators)
    if "URGENCY" in categories and categories & {"CREDENTIAL", "FINANCIAL", "REDIRECTION"}:
        score += URGENCY_COMBINATION_WEIGHT
    if "IMPERSONATION" in categories and categories & {"THREAT", "CREDENTIAL", "FINANCIAL"}:
        score += AUTHORITY_COMBINATION_WEIGHT
    if "PRIZE" in categories and categories & {"FINANCIAL", "REDIRECTION", "SUSPICIOUS_ACTION"}:
        score += PRIZE_COMBINATION_WEIGHT
    return RuleAssessment(
        score=min(score, 1.0),
        indicators=indicators,
        suppressed_matches=suppressed,
        normalization_applied=normalized != text.casefold(),
    )
