from __future__ import annotations

from dataclasses import dataclass

from app.phone_intelligence.parsing import ParsedPhoneNumber, parse_phone_number

ENGINE_VERSION = "phone-intelligence-v1"
RULES_VERSION = "phone-rules-v1"
FUSION_VERSION = "phone-fusion-v1"
HIGH_COST_TYPES = {"PREMIUM_RATE", "SHARED_COST"}


@dataclass(frozen=True)
class PhoneAssessment:
    risk_level: str
    summary: str
    evidence: list[dict[str, object]]
    recommended_actions: list[str]
    components: dict[str, object]
    limitations: list[str]
    model_version: None = None
    confidence_score: None = None
    confidence_level: str = "LOW"
    rules_version: str = RULES_VERSION
    fusion_version: str = FUSION_VERSION
    risk_score: None = None


def _evidence(
    category: str,
    label: str,
    explanation: str,
    snippet: str,
    *,
    severity: str = "CONTEXT",
    family: str,
) -> dict[str, object]:
    return {
        "category": category,
        "label": label,
        "explanation": explanation,
        "snippet": snippet,
        "source": "NUMBERING_METADATA",
        "severity": severity,
        "family": family,
    }


class PhoneIntelligenceEngine:
    version = ENGINE_VERSION

    def analyse(self, text: str) -> PhoneAssessment:
        phone = parse_phone_number(text)
        evidence = self._present_evidence(phone)
        high_cost = phone.valid and phone.number_type in HIGH_COST_TYPES
        if high_cost:
            risk_level = "CAUTION"
            summary = (
                "Numbering-plan metadata identifies a potentially higher-cost service. "
                "This does not establish who operates the number or whether the call is fraudulent."
            )
        elif not phone.possible or not phone.valid:
            risk_level = "INSUFFICIENT_EVIDENCE"
            summary = (
                "The number could be parsed, but it is not a valid possible number in the "
                "available numbering-plan metadata. This is not proof of fraud."
            )
        else:
            risk_level = "INSUFFICIENT_EVIDENCE"
            summary = (
                "Insufficient evidence to identify this number as malicious. Valid numbering "
                "metadata does not verify the caller's identity or intent."
            )

        actions = [
            "Do not share passwords, PINs or one-time verification codes during an "
            "unexpected call.",
            "Verify unexpected callers using an official number obtained independently.",
            "Do not transfer money solely because of instructions received by phone.",
            "Contact a claimed organisation through its official website or published contact "
            "information.",
        ]
        if high_cost:
            actions.insert(
                0,
                "Do not call back an unfamiliar premium-rate or shared-cost number without "
                "verification.",
            )

        return PhoneAssessment(
            risk_level=risk_level,
            summary=summary,
            evidence=evidence,
            recommended_actions=actions,
            components={
                "phone_metadata": {
                    "engine_version": ENGINE_VERSION,
                    "parser_version": phone.parser_version,
                    "library": "python-phonenumbers",
                    "library_version": phone.metadata_version,
                    "normalized_e164": phone.e164,
                    "international_format": phone.international_format,
                    "country_calling_code": phone.country_calling_code,
                    "region_code": phone.region_code,
                    "possible": phone.possible,
                    "valid": phone.valid,
                    "number_type": phone.number_type,
                },
                "phone_rules": {
                    "version": RULES_VERSION,
                    "high_cost_indicator": high_cost,
                },
                "fusion": {"version": FUSION_VERSION},
            },
            limitations=[
                "A phone number's numbering metadata cannot by itself establish whether the "
                "caller is fraudulent.",
                "Validity means the number matches a numbering-plan pattern; it does not prove "
                "the number is assigned, active or trustworthy.",
                "No call, message, subscriber lookup, social-media search or external reputation "
                "request was performed.",
                "Number type and region depend on the bundled library metadata and may change as "
                "numbering plans evolve.",
            ],
        )

    @staticmethod
    def _present_evidence(phone: ParsedPhoneNumber) -> list[dict[str, object]]:
        evidence = [
            _evidence(
                "INTERNATIONAL_FORMAT",
                "International number parsed",
                "The supplied country calling code allowed deterministic international "
                "normalization.",
                phone.international_format,
                family="format",
            )
        ]
        if phone.possible and phone.valid:
            evidence.append(
                _evidence(
                    "VALID_NUMBERING_PATTERN",
                    "Valid international numbering format",
                    "The number matches the possible lengths and valid pattern in the bundled "
                    "numbering metadata. This does not verify assignment or ownership.",
                    f"E.164 {phone.e164}",
                    family="validity",
                )
            )
        else:
            evidence.append(
                _evidence(
                    "INVALID_NUMBERING_PATTERN",
                    "Numbering pattern is not valid",
                    "The parsed digits do not match a valid possible number in the available "
                    "numbering metadata. Invalid formatting is not evidence of criminal intent.",
                    f"Possible: {'yes' if phone.possible else 'no'} · "
                    f"Valid: {'yes' if phone.valid else 'no'}",
                    family="validity",
                )
            )

        label = phone.number_type.replace("_", " ").title()
        risk_relevant = phone.valid and phone.number_type in HIGH_COST_TYPES
        evidence.append(
            _evidence(
                "NUMBER_TYPE",
                f"Number type: {label}",
                (
                    "The numbering plan classifies this as a potentially higher-cost service, "
                    "which can justify extra caution before calling back."
                    if risk_relevant
                    else "This service classification is descriptive metadata and does not "
                    "indicate whether the caller is honest or fraudulent."
                ),
                label,
                severity="MEANINGFUL" if risk_relevant else "CONTEXT",
                family="service_type",
            )
        )
        return evidence


def build_phone_engine() -> PhoneIntelligenceEngine:
    return PhoneIntelligenceEngine()
