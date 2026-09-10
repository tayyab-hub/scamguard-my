from io import BytesIO
from types import SimpleNamespace

import pytest
from PIL import Image

from app.qr_intelligence.decoder import QRImageError, decode_qr_image, validate_payload_bytes
from app.qr_intelligence.engine import QRIntelligenceEngine, classify_payload, persisted_payload
from app.qr_intelligence.payment import parse_payment_payload
from tests.qr_fixtures import emv_payment_payload, multiple_qr_image_bytes, qr_image_bytes

LIMITS = {
    "max_upload_bytes": 5 * 1024 * 1024,
    "max_dimension": 4096,
    "max_pixels": 16_000_000,
    "max_payload_bytes": 5000,
}


@pytest.mark.parametrize(
    ("image_format", "mime"),
    [("PNG", "image/png"), ("JPEG", "image/jpeg"), ("WEBP", "image/webp")],
)
def test_decoder_accepts_supported_raster_formats(image_format, mime):
    result = decode_qr_image(qr_image_bytes("Welcome to ScamGuard", image_format), mime, **LIMITS)
    assert result.payload == "Welcome to ScamGuard"
    assert result.image_format == image_format
    assert len(result.file_sha256) == 64
    assert result.decoder_library == "zxing-cpp"


@pytest.mark.parametrize(
    ("data", "mime", "code"),
    [
        (b"", "image/png", "QR_IMAGE_EMPTY"),
        (b"plain text renamed to png", "image/png", "QR_IMAGE_INVALID"),
        (qr_image_bytes("test"), "image/svg+xml", "QR_IMAGE_TYPE_UNSUPPORTED"),
        (qr_image_bytes("test"), "image/jpeg", "QR_IMAGE_TYPE_MISMATCH"),
        (b"x" * (5 * 1024 * 1024 + 1), "image/png", "QR_IMAGE_TOO_LARGE"),
    ],
    ids=["empty", "renamed-text", "svg-mime", "mime-mismatch", "oversized"],
)
def test_decoder_rejects_empty_corrupt_misleading_and_oversized_files(data, mime, code):
    with pytest.raises(QRImageError) as error:
        decode_qr_image(data, mime, **LIMITS)
    assert error.value.code == code


def test_decoder_rejects_excessive_dimensions_and_no_qr():
    output = BytesIO()
    Image.new("L", (4097, 2), 255).save(output, format="PNG")
    with pytest.raises(QRImageError) as dimensions:
        decode_qr_image(output.getvalue(), "image/png", **LIMITS)
    assert dimensions.value.code == "QR_IMAGE_DIMENSIONS_EXCEEDED"

    output = BytesIO()
    Image.new("RGB", (300, 300), "white").save(output, format="PNG")
    with pytest.raises(QRImageError) as no_qr:
        decode_qr_image(output.getvalue(), "image/png", **LIMITS)
    assert no_qr.value.code == "QR_NOT_DETECTED"


def test_decoder_rejects_multiple_qr_codes():
    with pytest.raises(QRImageError) as error:
        decode_qr_image(multiple_qr_image_bytes(), "image/png", **LIMITS)
    assert error.value.code == "QR_MULTIPLE_DETECTED"


@pytest.mark.parametrize(
    ("payload", "code"),
    [
        (b"", "QR_PAYLOAD_EMPTY"),
        (b" \n\t", "QR_PAYLOAD_EMPTY"),
        (b"invalid-utf8-\xff", "QR_PAYLOAD_ENCODING_UNSUPPORTED"),
        (b"before\x00after", "QR_PAYLOAD_UNSUPPORTED"),
        (b"x" * 5001, "QR_PAYLOAD_TOO_LARGE"),
    ],
)
def test_decoded_payload_limits_and_controls(payload, code):
    with pytest.raises(QRImageError) as error:
        validate_payload_bytes(payload, 5000)
    assert error.value.code == code


@pytest.mark.parametrize(
    ("payload", "kind", "route"),
    [
        ("https://example.com/path", "URL", "URL"),
        ("+442079460958", "PHONE", "PHONE"),
        ("tel:+442079460958", "PHONE", "PHONE"),
        ("This is a normal controlled message payload", "TEXT", "MESSAGE"),
        ("Welcome", "TEXT", None),
        ("mailto:security@example.com", "EMAIL", None),
        ("SMSTO:+60123456789:Hello", "SMS", None),
        ("WIFI:T:WPA;S:Example;P:not-a-real-secret;;", "WIFI", None),
        ("geo:3.1390,101.6869", "GEO", None),
        ("javascript:alert(1)", "OTHER", None),
        ("custom-scheme:<script>alert(1)</script>", "OTHER", None),
        ("SELECT * FROM users WHERE password = 'x'", "TEXT", "MESSAGE"),
        ("<script>alert('never execute')</script>", "TEXT", "MESSAGE"),
    ],
)
def test_payload_classification_is_conservative(payload, kind, route):
    result = classify_payload(payload)
    assert (result.type, result.route) == (kind, route)


def test_persisted_payload_redacts_credentials_and_normalizes_phone():
    url = "https://alice:super-secret@example.com/pay"
    assert "alice" not in persisted_payload(url)
    assert "super-secret" not in persisted_payload(url)
    assert persisted_payload("tel:+44 20 7946 0958") == "+442079460958"
    wifi = persisted_payload(r"WIFI:T:WPA;S:Example;P:top\;secret;H:false;;")
    assert "top" not in wifi and "secret" not in wifi
    assert "P:[redacted]" in wifi


def test_payment_tlv_and_crc_parsing():
    valid = parse_payment_payload(emv_payment_payload())
    assert valid is not None and valid.structurally_valid and valid.crc_valid
    assert valid.metadata["transaction_currency_code"] == "458"
    assert valid.metadata["transaction_amount"] == "12.34"
    assert valid.metadata["merchant_name"] == "SCAMGUARD"
    assert valid.metadata["merchant_account_information_ids"] == ["26"]

    invalid = parse_payment_payload(emv_payment_payload(corrupt_crc=True))
    assert invalid is not None and not invalid.structurally_valid and invalid.crc_valid is False

    malformed = parse_payment_payload("0002015909TOO-SHORT6304FFFF")
    assert malformed is not None and not malformed.structurally_valid


class StubEngine:
    def __init__(self, risk_level="HIGH"):
        self.calls = []
        self.result = SimpleNamespace(
            risk_level=risk_level,
            risk_score=None,
            confidence_score=None,
            confidence_level="LOW",
            summary="Underlying controlled result",
            evidence=[],
            recommended_actions=["Underlying controlled action"],
            components={"controlled_component": {"version": "test-v1"}},
            limitations=["Underlying controlled limitation"],
            model_version=None,
        )

    def analyse(self, content):
        self.calls.append(content)
        return self.result


def test_qr_fusion_inherits_routed_engine_without_adding_severity():
    message, url, phone = StubEngine("LOW"), StubEngine("HIGH"), StubEngine("CAUTION")
    engine = QRIntelligenceEngine(message, url, phone)
    decoded = decode_qr_image(qr_image_bytes("https://example.com/login"), "image/png", **LIMITS)
    result = engine.analyse(decoded)
    assert result.risk_level == "HIGH"
    assert url.calls == ["https://example.com/login"]
    assert message.calls == phone.calls == []
    assert result.components["qr"]["routed_engine"] == "URL"
    assert result.components["qr"]["original_image_retained"] is False
    assert "QR code itself is not the risk indicator" in result.summary


def test_payment_result_never_claims_legitimacy():
    engine = QRIntelligenceEngine(StubEngine(), StubEngine(), StubEngine())
    decoded = decode_qr_image(qr_image_bytes(emv_payment_payload()), "image/png", **LIMITS)
    result = engine.analyse(decoded)
    assert result.risk_level == "INSUFFICIENT_EVIDENCE"
    assert "not establish merchant legitimacy" in result.summary
    assert result.risk_score is None and result.confidence_score is None


def test_payment_embedded_http_url_routes_to_existing_url_engine():
    message, url, phone = StubEngine(), StubEngine("HIGH"), StubEngine()
    engine = QRIntelligenceEngine(message, url, phone)
    payload = emv_payment_payload(embedded_url="https://evil.example/redirect")
    decoded = decode_qr_image(qr_image_bytes(payload), "image/png", **LIMITS)
    result = engine.analyse(decoded)
    assert result.components["qr"]["payload_type"] == "PAYMENT"
    assert result.components["qr"]["routed_engine"] == "URL"
    assert result.risk_level == "HIGH"
    assert url.calls == ["https://evil.example/redirect"]
    assert message.calls == phone.calls == []


@pytest.mark.parametrize(
    ("payload", "engine_name"),
    [
        ("https://secure-account.example.com@evil.example/login", "url_engine"),
        ("+499001234567", "phone_engine"),
        (
            "URGENT: send your OTP and password immediately to keep your account active",
            "message_engine",
        ),
    ],
)
def test_routed_qr_preserves_existing_engine_result(client, payload, engine_name):
    direct_engine = getattr(client.app.state, engine_name)
    direct = direct_engine.analyse(payload)
    decoded = decode_qr_image(qr_image_bytes(payload), "image/png", **LIMITS)
    routed = client.app.state.qr_engine.analyse(decoded)
    assert routed.risk_level == str(direct.risk_level)
    assert routed.risk_score == direct.risk_score
    assert routed.confidence_score == direct.confidence_score
    assert routed.evidence[1:] == direct.evidence
    assert routed.recommended_actions == direct.recommended_actions
