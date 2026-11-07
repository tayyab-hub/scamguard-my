# Regressions for the November improvements: links/numbers inside messages, popular and
# registry-restricted domains, the offline phishing feed, the optional Gemini reviewer and
# private result feedback. No test contacts an external service.

import json
from io import BytesIO
from unittest.mock import patch

import pytest

from app.core.config import Settings
from app.ml.ai_review import GeminiReviewProvider, perform_ai_review
from app.ml.embedded import extract_links, extract_phones
from app.ml.engine import build_message_engine
from app.phone_intelligence.engine import build_phone_engine
from app.url_intelligence.blocklist import PhishingFeedProvider
from app.url_intelligence.engine import URLIntelligenceEngine, build_url_engine


class _URLSettings:
    url_model_path = None


@pytest.fixture(scope="module")
def message_engine():
    engine = build_message_engine(Settings(persistence_enabled=False, ai_review_enabled=False))
    engine.attach_engines(build_url_engine(_URLSettings()), build_phone_engine())
    return engine


def test_link_and_phone_extraction_ignores_emails_and_files():
    text = "Mail ali@example.com, see report.pdf, visit maybank2u-secure.com/login or https://x.top"
    assert extract_links(text) == ["maybank2u-secure.com/login", "https://x.top"]
    assert extract_phones("Call 012-345 6789 or +882 1612 3456 now") == [
        ("+882 1612 3456", None),
        ("+60123456789", "read as a Malaysian number (+60)"),
    ]
    assert extract_links("hello.my friend, see lhdn.gov.my") == ["lhdn.gov.my"]
    assert extract_phones("Call 1300-88-1234 or 082-123456") == [
        ("+6082123456", "read as a Malaysian number (+60)"),
        ("+601300881234", "read as a Malaysian 1300/1800 number (+60)"),
    ]


def test_risky_link_inside_message_raises_result(message_engine):
    result = message_engine.analyse("Please log in at maybank2u-secure-login.com to keep access")
    assert result.risk_level == "HIGH"
    assert result.components["fusion"]["reason"] == "EMBEDDED_LINK"
    assert any(e["source"] == "EMBEDDED_URL" for e in result.evidence)


def test_risky_number_inside_message_is_at_least_caution(message_engine):
    result = message_engine.analyse("Hello, please call our officer at +882 1612 3456 tomorrow")
    assert result.risk_level in {"CAUTION", "ELEVATED", "HIGH"}
    assert any(e["source"] == "EMBEDDED_PHONE" for e in result.evidence)


def test_harmless_link_does_not_raise_ordinary_message(message_engine):
    result = message_engine.analyse("Running late, the slides are on https://github.com/openai")
    assert result.risk_level in {"LOW", "CAUTION"}
    assert result.components["fusion"]["reason"] != "EMBEDDED_LINK"


@pytest.mark.parametrize(
    ("url", "level"),
    [
        ("https://github.com/openai", "LOW"),
        ("https://www.mckl.edu.my/", "LOW"),
        ("https://www.jpj.gov.my/web/main-site/home", "LOW"),
        ("https://someone.github.io/maybank-login", "HIGH"),
    ],
)
def test_popular_and_restricted_domains(url, level):
    assert build_url_engine(_URLSettings()).analyse(url).risk_level == level


def test_phishing_feed_matches_url_or_dedicated_host_only():
    feed = (
        "https://evil-bank.example/login\nhttps://drive.google.com/file/d/abc/view\n"
        "http://dedicated-phish.xyz/\nhttps://bit.ly/abc\n"
        "https://storage.googleapis.com/evilbucket/x.html\n"
    )
    provider = PhishingFeedProvider("unused", 12, fetch=lambda: feed)
    assert provider.review("https://evil-bank.example/").status == "UNAVAILABLE"
    provider.refresh()
    assert provider.review("https://evil-bank.example/login").verdict == "MALICIOUS"
    # A listed page on a possibly compromised site does not flag the rest of that site.
    assert provider.review("https://evil-bank.example/other").verdict == "NO_KNOWN_MATCH"
    # A whole-host entry flags the dedicated host.
    assert provider.review("https://dedicated-phish.xyz/any").verdict == "MALICIOUS"
    # Shared services (shorteners, cloud storage) only match the exact listed URL.
    assert provider.review("https://bit.ly/xyz123").verdict == "NO_KNOWN_MATCH"
    assert provider.review("https://bit.ly/abc").verdict == "MALICIOUS"
    shared = provider.review("https://storage.googleapis.com/mybucket/report.pdf")
    assert shared.verdict == "NO_KNOWN_MATCH"
    assert provider.review("https://drive.google.com/file/d/abc/view").verdict == "MALICIOUS"
    assert provider.review("https://drive.google.com/file/d/xyz/view").verdict == "NO_KNOWN_MATCH"
    engine = URLIntelligenceEngine(None, provider)
    assert engine.analyse("https://evil-bank.example/login").risk_level == "HIGH"


def test_failed_feed_download_keeps_analysis_working_without_retry_storm():
    import time

    attempts = []

    def broken():
        attempts.append(1)
        raise TimeoutError

    provider = PhishingFeedProvider("unused", 12, fetch=broken)
    for _ in range(5):
        assert provider.review("https://example.com/").status == "UNAVAILABLE"
        time.sleep(0.05)
    assert len(attempts) == 1  # one attempt per cooldown window, not one per analysis


def test_feed_is_off_outside_production():
    assert build_url_engine(Settings(persistence_enabled=False)).provider is None


def _gemini_response(payload: dict) -> BytesIO:
    body = {"candidates": [{"content": {"parts": [{"text": json.dumps(payload)}]}}]}
    response = BytesIO(json.dumps(body).encode())
    response.__enter__ = lambda self=response: self
    response.__exit__ = lambda *args: None
    return response


def test_gemini_reviewer_is_grounded_and_trimmed():
    provider = GeminiReviewProvider("test-key", "test-model", 5)
    message = "Your parcel is held, pay the customs fee via this link"
    reply = {
        "risk_signal": 0.8,
        "confidence": 0.7,
        "summary": "x" * 500,
        "tactics": ["delivery_account", "made_up"],
        "evidence_snippets": ["pay the customs fee", "not in the message"],
    }
    with patch("urllib.request.urlopen", return_value=_gemini_response(reply)) as call:
        review = perform_ai_review(provider, message)
    request = call.call_args.args[0]
    assert request.get_header("X-goog-api-key") == "test-key"
    assert review.status == "COMPLETED"
    assert review.evidence_snippets == ("pay the customs fee",)
    assert review.tactics == ("delivery_account",)
    assert len(review.summary) <= 240


def test_gemini_failure_is_reported_not_raised():
    provider = GeminiReviewProvider("test-key", "test-model", 5)
    with patch("urllib.request.urlopen", side_effect=TimeoutError):
        assert perform_ai_review(provider, "hello there friend").status == "ERROR"


def test_gemini_is_selected_only_when_enabled_with_a_key():
    settings = Settings(
        persistence_enabled=False,
        ai_review_enabled=True,
        ai_review_provider="gemini",
        gemini_api_key="test-key",
    )
    assert build_message_engine(settings).provider.provider_name == "gemini"
    default = build_message_engine(Settings(persistence_enabled=False))
    assert default.provider is None


def test_gemini_failure_logs_status_without_secrets(caplog):
    import urllib.error

    provider = GeminiReviewProvider("secret-key-value", "test-model", 5)
    body = BytesIO(json.dumps({"error": {"status": "NOT_FOUND", "message": "x"}}).encode())
    error = urllib.error.HTTPError("https://example.invalid", 404, "Not Found", {}, body)
    with patch("urllib.request.urlopen", side_effect=error):
        with caplog.at_level("WARNING", logger="scamguard.intelligence"):
            assert perform_ai_review(provider, "private message text").status == "ERROR"
    assert "http_status=404" in caplog.text and "provider_status=NOT_FOUND" in caplog.text
    assert "secret-key-value" not in caplog.text and "private message" not in caplog.text


def test_gemini_request_asks_for_low_thinking():
    provider = GeminiReviewProvider("k", "m", 5)
    reply = {
        "risk_signal": 0.1,
        "confidence": 0.5,
        "summary": "ok",
        "tactics": [],
        "evidence_snippets": [],
    }
    with patch("urllib.request.urlopen", return_value=_gemini_response(reply)) as call:
        provider.review("hello there")
    sent = json.loads(call.call_args.args[0].data)
    assert sent["generationConfig"]["thinkingConfig"] == {"thinkingLevel": "low"}


def test_gemini_key_whitespace_and_quotes_are_removed():
    provider = GeminiReviewProvider(' "AQ.Ab-12\n34-xyz" \n', "m", 5)
    assert provider._api_key == "AQ.Ab-1234-xyz"
