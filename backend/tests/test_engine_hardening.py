"""Behavioral/adversarial regressions; fixtures do not measure population accuracy."""

from dataclasses import replace
from types import SimpleNamespace

import pytest

from app.core.config import Settings
from app.ml.ai_review import AIReview, AIStatus
from app.ml.classifier import Classification
from app.ml.engine import build_message_engine
from app.ml.fusion import fuse
from app.ml.rules import RuleAssessment, assess_rules
from app.qr_intelligence.decoder import DecodedQR
from app.qr_intelligence.engine import QRIntelligenceEngine, persisted_payload
from app.url_intelligence.fusion import fuse as fuse_url
from app.url_intelligence.parsing import parse_url
from app.url_intelligence.reputation import ReputationSignal
from app.url_intelligence.rules import assess_rules as url_rules
from tests.qr_fixtures import emv_payment_payload
from tests.test_qr_intelligence import StubEngine


@pytest.fixture(scope="module")
def message_engine():
    return build_message_engine(Settings(_env_file=None, app_env="test"))


@pytest.mark.parametrize("prefix", ["Warning: ", "Security warning: ", "Example bank alert: ", ""])
def test_warning_words_do_not_disable_independent_risk_indicators(message_engine, prefix):
    result = message_engine.analyse(
        prefix + "Urgent: your bank account will be suspended. Provide your OTP immediately."
    )
    assert result.risk_level == "HIGH"
    assert {e["category"] for e in result.evidence} >= {"URGENCY", "THREAT", "CREDENTIAL"}


@pytest.mark.parametrize(
    "secret",
    ["passw0rd", "p\u200bassword", "ｐａｓｓｗｏｒｄ", "p a s s w o r d", "p.a.s.s.w.o.r.d"],
)
def test_rule_spelling_variants_keep_original_evidence(secret):
    text = f"Urgent: bank account suspended. Provide your {secret} immediately."
    result = assess_rules(text)
    credential = next(item for item in result.indicators if item.category == "CREDENTIAL")
    assert secret in credential.snippet
    assert result.normalization_applied
    assert result.score >= 0.72


def test_suppressed_first_occurrence_does_not_hide_later_request():
    result = assess_rules(
        "Never share your password. Now provide your password to verify your account."
    )
    assert result.suppressed_matches >= 1
    assert any(item.category == "CREDENTIAL" for item in result.indicators)


@pytest.mark.parametrize(
    "text",
    [
        "Our bank will not ask you to provide a security code.",
        "Never share your passw0rd or OTP with callers.",
        "Avoid clicking unknown links. Do not pay a fee to claim a prize.",
        "Do not share your password, PIN or security code.",
    ],
)
def test_protective_instructions_do_not_become_warnings(text):
    assert assess_rules(text).score == 0


def test_negated_delay_is_not_protective_wording():
    assert assess_rules("Do not wait: send your password immediately to the bank.").score >= 0.72


@pytest.mark.parametrize("text", ["🤔 👋 🔎", "qzxv qzxv qzxv", "你好 世界 测试"])
def test_no_vocabulary_does_not_invent_a_low_risk_result(message_engine, text):
    result = message_engine.analyse(text)
    assert result.components["local_model"]["matched_features"] == 0
    assert result.risk_level == "INSUFFICIENT_EVIDENCE"
    assert result.risk_score is result.confidence_score is None


def test_conflicting_signals_preserve_warning_but_lower_confidence():
    model = Classification(
        "LEGITIMATE", {"LEGITIMATE": 0.99, "SPAM": 0.005, "SCAM": 0.005}, 0.99, "test", 4
    )
    text = "Urgent bank warning: provide your OTP immediately or your account will be suspended."
    result = fuse(text, model, assess_rules(text), AIReview(AIStatus.DISABLED))
    assert result.risk_level == "HIGH"
    assert result.disagreement and result.confidence_level == "LOW"
    assert result.confidence_score < 0.55


def test_model_only_scam_estimate_is_not_multiple_indicators():
    model = Classification("SCAM", {"LEGITIMATE": 0.01, "SPAM": 0, "SCAM": 0.99}, 0.99, "test", 4)
    result = fuse(
        "Context without rule corroboration",
        model,
        RuleAssessment(0, [], 0),
        AIReview(AIStatus.DISABLED),
    )
    assert result.risk_level == "CAUTION"
    assert result.reason == "UNCORROBORATED_MODEL"


def test_ambiguous_model_with_weak_rules_abstains():
    model = Classification(
        "LEGITIMATE", {"LEGITIMATE": 0.36, "SPAM": 0.32, "SCAM": 0.32}, 0.36, "test", 4
    )
    result = fuse(
        "Some unclear wording here", model, RuleAssessment(0, [], 0), AIReview(AIStatus.DISABLED)
    )
    assert result.risk_level == "INSUFFICIENT_EVIDENCE"


def test_unusable_model_prior_does_not_contribute():
    model = Classification("SCAM", {"LEGITIMATE": 0, "SPAM": 0, "SCAM": 1}, 1, "test", 0)
    rules = assess_rules("Urgent: provide your password to the bank.")
    result = fuse("text", model, rules, AIReview(AIStatus.DISABLED))
    opposite = replace(
        model, label="LEGITIMATE", probabilities={"LEGITIMATE": 1, "SPAM": 0, "SCAM": 0}
    )
    assert (
        result.risk_score == fuse("text", opposite, rules, AIReview(AIStatus.DISABLED)).risk_score
    )
    assert result.confidence_score is None


def test_actions_follow_observed_content(message_engine):
    result = message_engine.analyse(
        "We will meet at the library tomorrow afternoon for the project."
    )
    assert not any(
        "Do not transfer" in action or "supplied link" in action
        for action in result.recommended_actions
    )
    assert result.components["assessment_basis"]["uncertainty"]


@pytest.mark.parametrize(
    "value", ["https://bücher.de/", "https://пример.рф/", "https://example.com/#section"]
)
def test_neutral_url_metadata_is_not_itself_a_warning(value):
    evidence = url_rules(parse_url(value))
    assert all(item.severity == "CONTEXT" for item in evidence)
    assert (
        fuse_url(
            SimpleNamespace(label="LEGITIMATE", confidence=0.99),
            evidence,
            ReputationSignal(status="DISABLED"),
        )
        == "LOW"
    )
    assert fuse_url(None, evidence, ReputationSignal(status="DISABLED")) == "INSUFFICIENT_EVIDENCE"


def test_script_mixing_is_checked_within_labels():
    ordinary = url_rules(parse_url("https://пример.com/"))
    mixed = url_rules(parse_url("https://аpple.com/"))  # Cyrillic a within a Latin label.
    assert "UNICODE_HOMOGLYPH_RISK" not in {e.category for e in ordinary}
    assert "UNICODE_HOMOGLYPH_RISK" in {e.category for e in mixed}


def decoded(payload):
    return DecodedQR(payload, len(payload.encode()), None, None, None, None, source="CAMERA")


@pytest.mark.parametrize("risk", ["LOW", "INSUFFICIENT_EVIDENCE", "CAUTION", "ELEVATED", "HIGH"])
def test_payment_integrity_warning_survives_url_routing(risk):
    url = StubEngine(risk)
    url.result.components["assessment_basis"] = {
        "decision": "Underlying URL policy",
        "supporting": ["Underlying URL signal"],
        "mitigating": ["Underlying observation"],
        "uncertainty": ["Destination not visited"],
    }
    engine = QRIntelligenceEngine(StubEngine(), url, StubEngine())
    payload = emv_payment_payload(embedded_url="https://example.com/", corrupt_crc=True)
    result = engine.analyse(decoded(payload))
    assert result.risk_level == ("CAUTION" if risk in {"LOW", "INSUFFICIENT_EVIDENCE"} else risk)
    assert any("integrity" in action for action in result.recommended_actions)
    basis = result.components["assessment_basis"]
    assert "at least Caution" in basis["decision"]
    assert "payment structure" in basis["supporting"][0]
    assert "Underlying URL signal" in basis["supporting"]
    assert basis["mitigating"] == ["Underlying observation"]
    assert "Destination not visited" in basis["uncertainty"]
    assert url.result.components["assessment_basis"]["decision"] == "Underlying URL policy"


def test_malformed_payment_destination_does_not_fail_whole_analysis():
    url = StubEngine()
    engine = QRIntelligenceEngine(StubEngine(), url, StubEngine())
    result = engine.analyse(decoded(emv_payment_payload(embedded_url="https://[invalid/")))
    assert result.risk_level == "CAUTION"
    assert result.components["qr"]["routed_engine"] is None
    assert not url.calls
    assert "PAYMENT_URL_INVALID" in {e["category"] for e in result.evidence}
    assert "at least Caution" in result.components["assessment_basis"]["decision"]


def test_malformed_url_payload_still_redacts_authority_credentials():
    assert "private-secret" not in persisted_payload("https://person:private-secret@[invalid/")
