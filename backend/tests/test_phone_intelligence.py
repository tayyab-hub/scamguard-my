import json
import socket

import pytest

from app.api.analysis_schemas import AnalysisCreate
from app.phone_intelligence.engine import PhoneIntelligenceEngine
from app.phone_intelligence.parsing import parse_phone_number


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    def blocked(*args, **kwargs):
        raise AssertionError("Phone intelligence attempted network access")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket, "getaddrinfo", blocked)


@pytest.mark.parametrize(
    "value,e164,region,number_type",
    [
        ("+44 20 7946 0958", "+442079460958", "GB", "FIXED_LINE"),
        ("+1 (202) 555-0123", "+12025550123", "US", "FIXED_LINE_OR_MOBILE"),
        ("+60 12-345 6789", "+60123456789", "MY", "MOBILE"),
        ("+44 56 1234 5678", "+445612345678", "GB", "VOIP"),
    ],
)
def test_international_normalization_and_metadata(value, e164, region, number_type):
    parsed = parse_phone_number(value)
    assert parsed.e164 == e164
    assert parsed.region_code == region
    assert parsed.number_type == number_type
    assert parsed.possible is True and parsed.valid is True
    assert parsed.international_format.startswith("+")
    assert parsed.parser_version == "phone-parser-v1"
    assert parsed.metadata_version


@pytest.mark.parametrize(
    "value",
    [
        "",
        "   ",
        "0123456789",
        "+12",
        "+" + "1" * 16,
        "+44 20 CALL NOW",
        "+44 20 7946 0958<script>",
        "+44 20 7946 0958' OR 1=1",
        "+４４ ２０ ７９４６ ０９５８",
        "+44 20 7946\u0000 0958",
        "+44 20 7946\u202e0958",
        "+44 ((20) 7946 0958",
        "++44 20 7946 0958",
        "+44 20 7946 0958" + " " * 64,
        None,
        123,
    ],
)
def test_rejects_ambiguous_malformed_oversized_and_hostile_input(value):
    with pytest.raises((TypeError, ValueError)):
        parse_phone_number(value)


def test_valid_ordinary_number_is_not_called_legitimate_or_safe():
    result = PhoneIntelligenceEngine().analyse("+44 20 7946 0958")
    assert result.risk_level == "INSUFFICIENT_EVIDENCE"
    assert result.risk_score is None
    assert result.confidence_score is None
    assert "Insufficient evidence" in result.summary
    assert "legitimate" not in result.summary.lower()
    assert "safe" not in result.summary.lower()


def test_foreign_mobile_and_voip_are_not_treated_as_scam():
    engine = PhoneIntelligenceEngine()
    for value in ["+61 412 345 678", "+44 56 1234 5678"]:
        result = engine.analyse(value)
        assert result.risk_level == "INSUFFICIENT_EVIDENCE"
        assert result.components["phone_metadata"]["number_type"] in {"MOBILE", "VOIP"}
        assert "fraudulent" in " ".join(result.limitations).lower()


@pytest.mark.parametrize(
    "value,number_type",
    [("+49 900 1 234567", "PREMIUM_RATE"), ("+33 884 01 23 45", "SHARED_COST")],
)
def test_reliable_high_cost_metadata_produces_caution_only(value, number_type):
    result = PhoneIntelligenceEngine().analyse(value)
    assert result.risk_level == "CAUTION"
    assert result.risk_score is None
    assert result.components["phone_metadata"]["number_type"] == number_type
    assert any(item["severity"] == "MEANINGFUL" for item in result.evidence)
    assert any("call back" in action.lower() for action in result.recommended_actions)


def test_invalid_number_is_a_finding_not_a_high_risk_verdict():
    result = PhoneIntelligenceEngine().analyse("+44 1234567")
    assert result.risk_level == "INSUFFICIENT_EVIDENCE"
    assert result.components["phone_metadata"]["valid"] is False
    assert result.evidence[1]["category"] == "INVALID_NUMBERING_PATTERN"
    assert "not proof of fraud" in result.summary.lower()


def test_result_is_deterministic_minimal_and_contains_no_external_provider():
    engine = PhoneIntelligenceEngine()
    first = engine.analyse("+1 202 555 0123")
    second = engine.analyse("+1 202 555 0123")
    assert first == second
    serialized = json.dumps(first.components)
    assert "subscriber" not in serialized.lower()
    assert "provider" not in serialized.lower()
    assert first.components["phone_metadata"]["normalized_e164"] == "+12025550123"


def test_api_schema_requires_international_context_and_limits_phone_content():
    parsed = AnalysisCreate(input_type="PHONE", content=" +60 (12) 345-6789 ")
    assert parsed.content == "+60 (12) 345-6789"
    for value in ["0123456789", "+12", "+" + "1" * 16, "+44<script>"]:
        with pytest.raises(ValueError):
            AnalysisCreate(input_type="PHONE", content=value)
