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
    assert result.components["fusion"]["version"] == "message-fusion-v5"


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


# --- rules v4 / fusion v5 / model v3 (November 2026) ---


@pytest.fixture(scope="module")
def full_engine():
    # As in the running app: links and numbers in the text are checked by the URL/Phone engines.
    from app.phone_intelligence.engine import build_phone_engine
    from app.url_intelligence.engine import build_url_engine

    class _URLSettings:
        url_model_path = None

    built = build_message_engine(Settings(persistence_enabled=False, ai_review_enabled=False))
    built.attach_engines(build_url_engine(_URLSettings()), build_phone_engine())
    return built


@pytest.mark.parametrize(
    "text",
    [
        "Sorry I accidentally sent my OTP to your number, can you forward it to me? thanks",
        "Hai, saya terhantar kod pengesahan ke nombor awak. Boleh screenshot dan hantar balik?",
        "Notis Bank Negara: akaun anda dikaitkan dengan sindiket. Pindahkan semua baki ke akaun "
        "selamat yang diberikan pegawai kami.",
        "Nak duit lebih? Sewa akaun bank anda kepada kami RM500 seminggu. Serah kad ATM & TAC.",
        "Bank Islam: Akaun anda telah disekat. Sila balas dengan No IC, nombor kad ATM dan "
        "password perbankan untuk pengaktifan semula.",
    ],
)
def test_v4_tactics_are_warned_strongly_in_english_and_malay(engine, text):
    assert engine.analyse(text).risk_level in {"ELEVATED", "HIGH"}


@pytest.mark.parametrize(
    "text",
    [
        "JPJ: Lesen memandu anda tamat tempoh pada 15/12/2026. Perbaharui di kaunter JPJ atau "
        "dalam talian melalui www.jpj.gov.my",
        "Lazada: Your package is out for delivery today. Track it at lazada.com.my/order-tracking.",
    ],
)
def test_notice_pointing_only_to_an_official_site_is_not_warned(full_engine, text):
    result = full_engine.analyse(text)
    assert result.risk_level == "LOW"
    assert any("official" in item for item in result.components["assessment_basis"]["mitigating"])


def test_official_channel_cap_needs_an_official_link_and_nothing_else(full_engine):
    lookalike = full_engine.analyse(
        "JPJ: Lesen memandu anda tamat tempoh. Perbaharui segera di jpj-renew-lesen.top/bayar"
    )
    assert lookalike.risk_level in {"ELEVATED", "HIGH"}
    with_number = full_engine.analyse(
        "Maybank: unusual login detected. See maybank2u.com.my or call our officer at "
        "+60 11-2345 6789 now."
    )
    assert with_number.components["fusion"]["reason"] != "OFFICIAL_CHANNEL_NOTICE"
    # A form on a trusted domain is user content, not an official channel.
    form = full_engine.analyse(
        "Bank update: fill in your account number and IC at https://docs.google.com/forms/d/e/abc"
    )
    assert form.components["fusion"]["reason"] != "OFFICIAL_CHANNEL_NOTICE"
    assert form.risk_level != "LOW"


def test_protective_statements_in_malay_and_english_are_not_requests(engine):
    for text in [
        "LHDN tidak meminta maklumat bank melalui SMS.",
        "Bank Negara Malaysia does not ask the public to move money into any 'safe account'.",
    ]:
        assert engine.analyse(text).risk_level in {"LOW", "CAUTION", "INSUFFICIENT_EVIDENCE"}
