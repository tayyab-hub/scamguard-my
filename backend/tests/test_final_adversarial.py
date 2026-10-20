"""Authored finalization cases, independent of the held-out corpus.

These check specific safety contracts. They are neither an accuracy benchmark nor
examples used to tune the frozen model, rules, thresholds or fusion policy.
"""

import socket

import pytest

from app.core.config import Settings
from app.ml.engine import build_message_engine


@pytest.fixture(scope="module")
def engine():
    return build_message_engine(Settings(_env_file=None, app_env="test", ai_review_enabled=False))


@pytest.mark.parametrize(
    "text,categories",
    [
        (
            "Security team: urgent account verification. Provide your OTP immediately "
            "or your account will be suspended.",
            {"CREDENTIAL", "THREAT", "IMPERSONATION"},
        ),
        (
            "Your bank account will be blocked. Verify your account and send your "
            "password immediately.",
            {"CREDENTIAL", "THREAT", "DELIVERY_ACCOUNT"},
        ),
        (
            "Guaranteed return: double your money. Transfer a deposit to this crypto "
            "wallet immediately.",
            {"INVESTMENT", "FINANCIAL", "URGENCY"},
        ),
        (
            "Courier notice: your parcel has a customs fee. Pay immediately using the "
            "link https://parcel.example.test/pay.",
            {"DELIVERY_ACCOUNT", "REDIRECTION", "FINANCIAL"},
        ),
        (
            "Thanks for your help with our meeting. However, the bank security team "
            "needs your OTP immediately to verify your account.",
            {"CREDENTIAL", "IMPERSONATION", "SUSPICIOUS_ACTION"},
        ),
        (
            "Urgent bank alert: provide your ｐａｓｓｗ０ｒｄ and O.T.P immediately.",
            {"CREDENTIAL", "IMPERSONATION", "URGENCY"},
        ),
    ],
    ids=["impersonation", "bank", "investment", "delivery", "mixed-context", "obfuscation"],
)
def test_authored_requests_retain_corroborated_warnings(engine, monkeypatch, text, categories):
    def deny_network(*args, **kwargs):
        pytest.fail("Local message inference must not resolve or connect to a destination")

    monkeypatch.setattr(socket, "getaddrinfo", deny_network)
    monkeypatch.setattr(socket.socket, "connect", deny_network)
    result = engine.analyse(text)
    assert result.risk_level in {"ELEVATED", "HIGH"}
    assert categories <= {item["category"] for item in result.evidence}
    assert result.components["external_ai"]["status"] == "DISABLED"
    assert result.recommended_actions
    assert any("not proof" in limit for limit in result.limitations)


@pytest.mark.parametrize(
    "text",
    [
        "Never share your password or OTP with callers. Avoid clicking unknown links.",
        "Our project meeting is at the library tomorrow afternoon. Bring your draft chapter.",
    ],
    ids=["protective-warning", "ordinary-message"],
)
def test_authored_benign_context_does_not_invent_rule_evidence(engine, text):
    result = engine.analyse(text)
    assert result.risk_level == "LOW"
    assert result.evidence == []
    assert any("not proof" in limit for limit in result.limitations)


@pytest.mark.parametrize("text", ["OK", "qzxv fjqz vqxj"], ids=["short", "unknown-vocabulary"])
def test_authored_ambiguous_text_has_no_numeric_assurance(engine, text):
    result = engine.analyse(text)
    assert result.risk_level == "INSUFFICIENT_EVIDENCE"
    assert result.risk_score is None
    assert result.confidence_score is None
