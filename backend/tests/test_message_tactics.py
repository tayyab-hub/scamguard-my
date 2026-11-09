# message-rules-v3 / message-fusion-v3 regressions: conversational scams without classic trigger
# words must not come back Low, documented playbooks must reach High, and genuine notices or
# ordinary chat must not be escalated. Messages are authored examples, not challenge-set rows.

import pytest

from app.core.config import Settings
from app.ml.engine import build_message_engine
from app.ml.fusion import calibrator


@pytest.fixture(scope="module")
def engine():
    return build_message_engine(Settings(persistence_enabled=False, ai_review_enabled=False))


@pytest.mark.parametrize(
    ("text", "minimum"),
    [
        (
            "Hi mum new number, can you transfer RM450 to my friend account, pay you back tomorrow",
            "HIGH",
        ),
        ("Are you at your desk? Need you to buy 5 google play cards for a client quietly", "HIGH"),
        (
            "Grandpa it's me, I had an accident, please don't tell Mum, can you send money now",
            "HIGH",
        ),
        (
            "We found your profile. Flexible remote role, daily pay RM300-800. Add me on telegram",
            "ELEVATED",
        ),
        (
            "Your loan is approved. Pay the RM350 processing fee first then we release the money",
            "ELEVATED",
        ),
        ("Hi dad, I dropped my phone, this is my new number. Message me here when free", "CAUTION"),
        ("Hey, is this Sarah? We met at the dinner last week", "CAUTION"),
        (
            "LHDN: Anda layak menerima bayaran balik cukai RM1,128. Sila isi maklumat bank "
            "anda di lhdn-refund.example-pay.my",
            "HIGH",
        ),
    ],
)
def test_conversational_scams_are_not_low(engine, text, minimum):
    order = ["LOW", "CAUTION", "ELEVATED", "HIGH"]
    result = engine.analyse(text)
    assert result.risk_level in order
    assert order.index(result.risk_level) >= order.index(minimum)
    assert result.recommended_actions


@pytest.mark.parametrize(
    "text",
    [
        "Running 10 mins late, grab a table and order me a latte please",
        "Can you send the slides before the meeting? I'm in a meeting till 3",
        "Can you lend me your calculator for the exam tomorrow? I'll return it after.",
        "Never share your password or OTP with callers. Avoid clicking unknown links.",
    ],
)
def test_ordinary_messages_stay_low(engine, text):
    assert engine.analyse(text).risk_level == "LOW"


@pytest.mark.parametrize(
    "text",
    [
        "Your Maybank TAC is 123456 for transfer to Ali. Do not share this code with anyone",
        "JPJ: Your driving licence expires on 30/11/2026. Renew at any JPJ counter or via MyJPJ.",
    ],
)
def test_genuine_notices_are_not_escalated(engine, text):
    assert engine.analyse(text).risk_level in {"LOW", "CAUTION"}


def test_low_result_does_not_claim_safety(engine):
    result = engine.analyse("Running 10 mins late, grab a table and order me a latte please")
    assert "does not confirm" in result.summary
    assert result.components["fusion"]["version"] == "message-fusion-v4"


def test_calibrator_artifact_is_checksum_pinned_and_ordered():
    artifact = calibrator()
    bands = artifact["thresholds"]
    assert bands["CAUTION"] < bands["ELEVATED"] < bands["HIGH"]
    assert artifact["rules_version"] == "message-rules-v4"


def test_engine_startup_rejects_a_tampered_calibrator(monkeypatch):
    # A checksum mismatch must fail at startup (blocking the deploy health check) rather than
    # turning every later Message submission into MESSAGE_ANALYSIS_FAILED.
    from app.ml import fusion

    fusion.calibrator.cache_clear()
    monkeypatch.setattr(fusion, "EXPECTED_CALIBRATOR_SHA256", "0" * 64)
    try:
        with pytest.raises(ValueError, match="checksum"):
            build_message_engine(Settings(persistence_enabled=False, ai_review_enabled=False))
    finally:
        fusion.calibrator.cache_clear()
