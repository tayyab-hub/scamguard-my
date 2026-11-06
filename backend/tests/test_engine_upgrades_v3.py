# Regressions for url_rules_v3/url_fusion_v3, phone-rules-v2 and qr-risk-fusion-v3: brand
# impersonation and look-alike hosts, legitimate links with paths, number types used to hide a
# caller, local-number guidance, and payment recipients that impersonate brands or authorities.

import pytest

from app.core.config import Settings
from app.ml.engine import build_message_engine
from app.phone_intelligence.engine import build_phone_engine
from app.phone_intelligence.parsing import parse_phone_number
from app.qr_intelligence.decoder import DecodedQR
from app.qr_intelligence.engine import QRIntelligenceEngine, classify_payload
from app.url_intelligence.brands import brand_findings, edit_distance, skeleton
from app.url_intelligence.engine import build_url_engine
from app.url_intelligence.parsing import parse_url
from tests.qr_fixtures import emv_payment_payload


class _URLSettings:
    url_model_path = None


@pytest.fixture(scope="module")
def url_engine():
    return build_url_engine(_URLSettings())


@pytest.mark.parametrize(
    "url",
    [
        "https://maybank2u-secure-login.com/",
        "http://rnaybank.com/login",
        "https://paypa1.com/signin",
        "https://maybank2u.com.my.secure.top/",
        "https://cimb-verify.000webhostapp.com/login.html",
        "http://192.168.10.5/maybank/login.php",
    ],
)
def test_brand_impersonation_reaches_high(url_engine, url):
    assert url_engine.analyse(url).risk_level == "HIGH"


@pytest.mark.parametrize(
    "url",
    [
        "https://www.maybank2u.com.my/home/m2u/common/login.do",
        "https://accounts.google.com/signin",
        "https://en.wikipedia.org/wiki/Phishing",
        "https://www.lazada.com.my/products/x-i123.html",
    ],
)
def test_legitimate_links_with_paths_are_low(url_engine, url):
    assert url_engine.analyse(url).risk_level == "LOW"


def test_model_judges_host_only(url_engine):
    result = url_engine.analyse("https://en.wikipedia.org/wiki/Phishing")
    assert result.components["url_model"]["input"] == "host_only"
    assert result.fusion_version == "url_fusion_v3"


@pytest.mark.parametrize("host", ["amazonaws.com", "applebees.com", "github.com"])
def test_unrelated_domains_containing_brand_letters_are_not_flagged(host):
    parsed = parse_url(f"https://{host}/")
    assert not brand_findings(
        parsed.hostname, parsed.unicode_hostname, parsed.registrable_domain, parsed.subdomain
    )


def test_confusable_skeleton_and_edit_distance():
    assert skeleton("rnaybank") == skeleton("maybank")
    assert skeleton("раypal") == "paypal"  # Cyrillic р and а
    assert edit_distance("paypa1", "paypal") == 1
    assert edit_distance("mabyank", "maybank") == 1  # adjacent swap


@pytest.mark.parametrize(
    ("number", "level"),
    [
        ("+882 1612 3456", "CAUTION"),
        ("+44 70 1234 5678", "CAUTION"),
        ("+1 900 555 0199", "CAUTION"),
        ("+60 12-345 6789", "INSUFFICIENT_EVIDENCE"),
    ],
)
def test_phone_concealing_types(number, level):
    assert build_phone_engine().analyse(number).risk_level == level


def test_malaysian_landline_gets_spoofing_guidance():
    result = build_phone_engine().analyse("+60 3-2161 1234")
    assert "Caller ID can be faked" in result.recommended_actions[0]
    assert any(e["category"] == "SPOOFABLE_LANDLINE_CONTEXT" for e in result.evidence)


@pytest.mark.parametrize(
    ("text", "hint"), [("012-345 6789", "+60123456789"), ("60123456789", "+60123456789")]
)
def test_local_numbers_get_an_explicit_hint(text, hint):
    with pytest.raises(ValueError, match=r"\+60123456789"):
        parse_phone_number(text)


@pytest.fixture(scope="module")
def qr_engine(url_engine):
    message = build_message_engine(Settings(persistence_enabled=False, ai_review_enabled=False))
    return QRIntelligenceEngine(message, url_engine, build_phone_engine())


def _decoded(payload: str) -> DecodedQR:
    return DecodedQR(payload, len(payload.encode()), None, "PNG", 10, 10)


def test_payment_recipient_brand_mismatch_is_elevated(qr_engine):
    payload = emv_payment_payload(
        merchant_name="MAYBANK BERHAD", embedded_url="https://example.com/pay"
    )
    result = qr_engine.analyse(_decoded(payload))
    assert result.risk_level in {"ELEVATED", "HIGH"}
    assert any(e["category"] == "MERCHANT_BRAND_MISMATCH" for e in result.evidence)


def test_authority_named_recipient_is_at_least_caution(qr_engine):
    result = qr_engine.analyse(_decoded(emv_payment_payload(merchant_name="LHDN TAX REFUND")))
    assert result.risk_level in {"CAUTION", "ELEVATED", "HIGH"}
    assert any(e["category"] == "AUTHORITY_NAMED_RECIPIENT" for e in result.evidence)


def test_ordinary_payment_recipient_is_unchanged(qr_engine):
    result = qr_engine.analyse(_decoded(emv_payment_payload(merchant_name="NASI LEMAK CORNER")))
    assert result.risk_level == "INSUFFICIENT_EVIDENCE"


def test_sms_payloads_are_routed():
    body = classify_payload("SMSTO:+60123456789:Your parcel is held, pay the customs fee here")
    assert (body.type, body.route) == ("SMS", "MESSAGE")
    number = classify_payload("sms:+60123456789")
    assert (number.route, number.routed_content) == ("PHONE", "+60123456789")
