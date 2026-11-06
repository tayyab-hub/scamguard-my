# Conservative Phone assessment from offline numbering metadata, with no trained classifier or
# external lookup. phone-rules-v2: premium/shared-cost services and number types commonly abused
# to hide a caller (VoIP, personal-forwarding, pager, universal-access and satellite/international
# network codes) warrant CAUTION; other parseable numbers remain INSUFFICIENT_EVIDENCE with
# guidance. Numeric fraud/confidence estimates are deliberately absent.

from __future__ import annotations

from dataclasses import dataclass

from app.phone_intelligence.parsing import ParsedPhoneNumber, parse_phone_number

ENGINE_VERSION = "phone-intelligence-v1"
RULES_VERSION = "phone-rules-v2"
FUSION_VERSION = "phone-fusion-v1"
HIGH_COST_TYPES = {"PREMIUM_RATE", "SHARED_COST"}
# Types that are not tied to a fixed location or a named mobile subscriber and are favoured for
# spoofed or forwarded scam calls. Legitimate services use them too, so this is Caution only.
CONCEALING_TYPES = {"VOIP", "PERSONAL_NUMBER", "PAGER", "UAN"}
# ITU global codes without a country: satellite (870, 881) and international networks (882,
# 883), plus the premium international code 979.
NON_GEOGRAPHIC_CODES = {870, 881, 882, 883, 979}


# Shared service-compatible result object whose model_version, risk_score and confidence_score
# remain None because no learned fraud estimate exists.
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


# Build an evidence dictionary with NUMBERING_METADATA as its source and an explicit
# family/severity for result presentation.
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


# Stateless metadata/rule engine reused for direct Phone input and supported QR phone payloads.
class PhoneIntelligenceEngine:
    version = ENGINE_VERSION

    # Parse the input, identify only reliable higher-cost service metadata, and return bounded
    # advisory evidence/actions. Invalid numbering is a format finding, not proof of fraud.
    def analyse(self, text: str) -> PhoneAssessment:
        phone = parse_phone_number(text)
        evidence = self._present_evidence(phone)
        high_cost = phone.valid and phone.number_type in HIGH_COST_TYPES
        concealing = (
            phone.valid
            and not high_cost
            and (
                phone.number_type in CONCEALING_TYPES
                or phone.country_calling_code in NON_GEOGRAPHIC_CODES
            )
        )
        if high_cost:
            risk_level = "CAUTION"
            summary = (
                "Numbering-plan metadata identifies a potentially higher-cost service. "
                "This does not establish who operates the number or whether the call is fraudulent."
            )
        elif concealing:
            risk_level = "CAUTION"
            summary = (
                "This number type can be used without a fixed location or a named mobile "
                "subscriber, which makes it convenient for forwarded or disguised calls. Many "
                "legitimate services use it too."
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
        if concealing:
            actions.insert(
                0,
                "Be cautious if this caller claims to be a local bank, courier or government "
                "office; verify through that organisation's published number.",
            )
        if phone.region_code == "MY" and phone.number_type in {
            "FIXED_LINE",
            "FIXED_LINE_OR_MOBILE",
        }:
            actions.insert(
                0,
                "Caller ID can be faked. Police, courts, LHDN and banks will not ask you to "
                "transfer money or install an app during a call; hang up and call the official "
                "number yourself.",
            )
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
                    "concealing_type_indicator": concealing,
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

    # Describe format, numbering validity and service type, separating neutral context from the
    # limited higher-cost warning.
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
        high_cost = phone.valid and phone.number_type in HIGH_COST_TYPES
        concealing = phone.valid and not high_cost and phone.number_type in CONCEALING_TYPES
        risk_relevant = high_cost or concealing
        evidence.append(
            _evidence(
                "NUMBER_TYPE",
                f"Number type: {label}",
                (
                    "The numbering plan classifies this as a potentially higher-cost service, "
                    "which can justify extra caution before calling back."
                    if high_cost
                    else "This type is not tied to a fixed location or named mobile subscriber "
                    "and is often used to forward or disguise calls; it is also used legitimately."
                    if concealing
                    else "This service classification is descriptive metadata and does not "
                    "indicate whether the caller is honest or fraudulent."
                ),
                label,
                severity="MEANINGFUL" if risk_relevant else "CONTEXT",
                family="service_type",
            )
        )
        if phone.valid and phone.country_calling_code in NON_GEOGRAPHIC_CODES:
            evidence.append(
                _evidence(
                    "NON_GEOGRAPHIC_NETWORK",
                    "Satellite or international network code",
                    f"The +{phone.country_calling_code} code belongs to a global satellite or "
                    "international network rather than a country. Unexpected calls from such "
                    "numbers are uncommon and can be costly to return.",
                    f"+{phone.country_calling_code}",
                    severity="MEANINGFUL",
                    family="network",
                )
            )
        if phone.region_code == "MY" and phone.number_type in {
            "FIXED_LINE",
            "FIXED_LINE_OR_MOBILE",
        }:
            evidence.append(
                _evidence(
                    "SPOOFABLE_LANDLINE_CONTEXT",
                    "Malaysian landline format",
                    "Scam calls claiming to be police, courts or banks often display Malaysian "
                    "landline numbers because caller ID can be spoofed. The format alone does not "
                    "show who is calling.",
                    phone.international_format,
                    family="context",
                )
            )
        return evidence


# Construct the offline stateless engine; the pinned library already contains the numbering
# metadata.
def build_phone_engine() -> PhoneIntelligenceEngine:
    return PhoneIntelligenceEngine()
