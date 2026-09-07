"""Offline domain/security, ML and decision-table tests using inert URL strings."""

import json
import socket
from pathlib import Path

import httpx
import pytest
import requests

from app.api.analysis_schemas import AnalysisCreate
from app.url_intelligence.classifier import EXPECTED_ARTIFACT_SHA256, Classification, URLClassifier
from app.url_intelligence.engine import URLIntelligenceEngine
from app.url_intelligence.features import features
from app.url_intelligence.fusion import fuse
from app.url_intelligence.parsing import parse_url
from app.url_intelligence.reputation import ReputationSignal, review
from app.url_intelligence.rules import assess_rules

ARTIFACT = Path(__file__).resolve().parents[1] / "app/url_intelligence/artifacts/url_model_v1.json"


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    def blocked(*args, **kwargs):
        raise AssertionError("URL intelligence attempted network access")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket, "getaddrinfo", blocked)
    monkeypatch.setattr(requests.sessions.Session, "request", blocked)
    monkeypatch.setattr(httpx.Client, "request", blocked)


@pytest.fixture(scope="module")
def classifier():
    return URLClassifier(ARTIFACT)


@pytest.mark.parametrize(
    "value",
    [
        "",
        "  ",
        "/relative",
        "https:example.com",
        "javascript:alert(1)",
        "data:text/plain,x",
        "file:///etc/passwd",
        "ftp://example.com",
        "http://",
        "http://%",
        "http://example.com:99999",
        "http://example.com:",
        "http://example.com:0",
        "https://example.com/a b",
        "http://example.com/%zz",
        "http://example.com/\r\n",
        "\thttps://example.com",
        "http://example.com/\x00",
        "http://\ud800.com/",
        "https://example.com/\u202e",
        "http://[::1",
        "https://foo..com",
        "http://%65xample.com",
        "http://[fe80::1%25eth0]",
        "https://example.com/" + "x" * 2048,
        None,
        123,
    ],
)
def test_invalid_input(value):
    with pytest.raises((ValueError, TypeError)):
        parse_url(value)


@pytest.mark.parametrize(
    "value,domain",
    [
        ("HTTPS://Accounts.Example.CO.UK.:443/a%2Fb?q=1#part", "example.co.uk"),
        ("https://tenant.github.io/", "tenant.github.io"),
        ("https://www.example.com/", "example.com"),
    ],
)
def test_suffix_normalization(value, domain):
    u = parse_url(value)
    assert u.registrable_domain == domain
    assert "#" not in u.normalized and ":443" not in u.normalized
    assert u.normalized.startswith("https://")
    assert features(u) == features(parse_url(u.original))


def test_credentials_redacted_without_losing_evidence():
    u = parse_url("https://alice:super-secret@example.com/a?x=1#frag")
    assert "alice" not in u.original and "super-secret" not in u.original
    assert u.has_credentials and "@" not in u.normalized
    assert "EMBEDDED_CREDENTIALS" in {e.category for e in assess_rules(u)}
    assert "super-secret" not in json.dumps([e.to_dict() for e in assess_rules(u)])


def test_idna_and_mixed_script_context():
    u = parse_url("https://bücher.example/")
    assert u.hostname == "xn--bcher-kva.example"
    assert {e.category for e in assess_rules(u)} >= {"PUNYCODE"}
    mixed = parse_url("https://аpple.example.com/")  # Cyrillic a, no exact-brand claim
    assert "UNICODE_HOMOGLYPH_RISK" in {e.category for e in assess_rules(mixed)}


@pytest.mark.parametrize(
    "value,category",
    [
        ("http://192.0.2.10/login", "IP_ADDRESS_HOST"),
        ("https://[2001:db8::1]/", "NONSTANDARD_HOST_REPRESENTATION"),
        ("http://0x7f000001/", "NONSTANDARD_HOST_REPRESENTATION"),
        ("https://a.b.c.d.example.com/", "EXCESSIVE_SUBDOMAINS"),
        ("https://paypal.com.secure-login.example.net/verify", "SUSPICIOUS_SUBDOMAIN_BRANDING"),
        ("https://example.org/microsoft/login", "BRAND_LIKE_TOKEN_MISMATCH"),
        ("https://example.com:8088/", "UNUSUAL_PORT"),
        ("https://bit.ly/inert", "URL_SHORTENER"),
        ("https://example.net/login?redirect=https%3A%2F%2Fother.example", "REDIRECT_PARAMETER"),
        ("https://example.net/?next=a&url=b", "MULTIPLE_REDIRECT_PARAMETERS"),
        ("https://example.com/%252f%2540", "ENCODING_OBFUSCATION"),
        ("https://example.com/account/settings", "SUSPICIOUS_KEYWORDS"),
        ("https://example.com/file.exe", "SUSPICIOUS_FILE_EXTENSION"),
        ("https://localhost/", "MISSING_MEANINGFUL_DOMAIN"),
        ("https://example.com/" + "a" * 260, "EXCESSIVE_URL_LENGTH"),
        ("https://example.com/" + "a/" * 8, "EXCESSIVE_PATH_DEPTH"),
        (
            "https://example.com/?" + "&".join(f"q{i}=v" for i in range(12)),
            "EXCESSIVE_QUERY_PARAMETERS",
        ),
        ("https://example.com/AbCDefG1234567890hIJKLmnoPqRsTUV", "HIGH_ENTROPY_TOKENS"),
    ],
)
def test_detectors(value, category):
    evidence = assess_rules(parse_url(value))
    assert category in {e.category for e in evidence}
    assert all(e.explanation and e.snippet and e.label for e in evidence)


@pytest.mark.parametrize(
    "host",
    [
        "localhost",
        "127.0.0.1",
        "10.0.0.1",
        "172.16.1.1",
        "192.168.1.1",
        "169.254.169.254",
        "[::1]",
        "[fe80::1]",
        "2130706433",
        "0x7f000001",
    ],
)
def test_hostile_host_analysis_never_connects(host, classifier):
    result = URLIntelligenceEngine(classifier).analyse(f"http://{host}:8088/login")
    assert result.risk_level in {"CAUTION", "ELEVATED", "HIGH"}
    assert result.components["reputation"]["status"] == "DISABLED"


@pytest.mark.parametrize(
    "value",
    [
        "https://www.example.com/",
        "https://docs.python.org/3/",
        "https://example.org/account/settings",
        "https://subdomain.example.co.uk/",
        "https://example.com/?" + "&".join(f"param{i}=legitimatevalue" for i in range(40)),
        "http://example.com/",
        "https://example.com:8088/",
        "https://xn--bcher-kva.de/",
        "https://example.com/a%20b",
        "https://192.0.2.1/",
    ],
)
def test_weak_signals_do_not_dominate_even_strong_ml(value):
    evidence = assess_rules(parse_url(value))
    assert (
        fuse(Classification("PHISHING", 0.99), evidence, ReputationSignal(status="DISABLED"))
        == "CAUTION"
    )


def test_fusion_exact_table_and_disagreement():
    disabled = ReputationSignal(status="DISABLED")
    ml = Classification("PHISHING", 0.99)
    u = parse_url("https://paypal.example.net/%252f/file.exe")
    ev = assess_rules(u)
    assert fuse(ml, ev, disabled) == "HIGH"
    assert fuse(Classification("LEGITIMATE", 0.99), ev, disabled) == "ELEVATED"
    one = assess_rules(parse_url("https://paypal.example.net/login"))
    assert fuse(ml, one, disabled) == "ELEVATED"
    assert fuse(Classification("LEGITIMATE", 0.99), one, disabled) == "CAUTION"
    assert fuse(Classification("LEGITIMATE", 0.99), [], disabled) == "LOW"
    assert fuse(None, [], disabled) == "INSUFFICIENT_EVIDENCE"
    assert fuse(ml, ev, ReputationSignal(status="ERROR")) == "HIGH"
    assert (
        fuse(
            Classification("LEGITIMATE", 0.99),
            [],
            ReputationSignal(
                status="COMPLETED", provider="mock", version="v1", verdict="MALICIOUS"
            ),
        )
        == "HIGH"
    )


class Stub:
    def __init__(self, result=None, error=None):
        self.result, self.error = result, error

    def review(self, url):
        if self.error:
            raise self.error
        assert "@" not in url
        return self.result


@pytest.mark.parametrize(
    "error,status",
    [
        (TimeoutError("private"), "TIMEOUT"),
        (RuntimeError("private"), "ERROR"),
        (ValueError("private"), "INVALID"),
    ],
)
def test_reputation_failure_keeps_local_risk(classifier, error, status):
    value = "https://paypal.example.net/%252f/file.exe"
    local = URLIntelligenceEngine(classifier).analyse(value)
    result = URLIntelligenceEngine(classifier, Stub(error=error)).analyse(value)
    assert result.risk_level == local.risk_level
    assert result.components["reputation"]["status"] == status
    assert "private" not in json.dumps(result.components)


def test_mocked_reputation_and_invalid_response(classifier):
    signal = ReputationSignal(
        status="COMPLETED", provider="mock-only", version="v1", verdict="MALICIOUS"
    )
    result = URLIntelligenceEngine(classifier, Stub(signal)).analyse(
        "https://user:secret@example.com/"
    )
    assert result.risk_level == "HIGH"
    assert result.evidence[-1]["source"] == "REPUTATION"
    assert (
        review(Stub({"status": "COMPLETED", "verdict": "MALICIOUS"}), "https://example.com").status
        == "INVALID"
    )
    assert review(Stub({"status": "NOPE"}), "https://example.com").status == "INVALID"


def test_model_integrity_determinism_and_version(classifier, tmp_path):
    u = parse_url("https://example.org/account/settings")
    assert classifier.predict(u) == classifier.predict(u)
    assert classifier.predict(u).model_version == "url_ml_v1"
    assert classifier.predict(u).label in {"LEGITIMATE", "PHISHING"}
    assert 0.5 <= classifier.predict(u).confidence <= 1
    path = tmp_path / "bad.json"
    path.write_text("{}")
    with pytest.raises(ValueError, match="checksum"):
        URLClassifier(path)
    import hashlib

    assert hashlib.sha256(ARTIFACT.read_bytes()).hexdigest() == EXPECTED_ARTIFACT_SHA256


def test_input_boundary_does_not_strip_controls_before_validation():
    with pytest.raises(ValueError):
        AnalysisCreate(input_type="URL", content="\nhttps://example.com")


def test_model_missing_is_explicit():
    result = URLIntelligenceEngine(None).analyse("https://www.example.com/")
    assert result.risk_level == "INSUFFICIENT_EVIDENCE"
    assert result.confidence_score is None
    assert result.components["url_model"]["status"] == "UNAVAILABLE"


def test_original_spelling_and_max_length_userinfo_survive_redaction():
    original = "HTTPS://Example.COM:443/path%2f?x=1#"
    assert parse_url(original).original == original
    submitted = "https://x@example.com/" + "a" * (2048 - len("https://x@example.com/"))
    parsed = parse_url(submitted)
    assert len(parsed.original) <= 2048
    assert parse_url(parsed.original).has_credentials
    assert "FRAGMENT_CONTENT" in {
        e.category for e in assess_rules(parse_url("https://example.com/#section"))
    }


def test_many_empty_query_fields_remain_bounded_and_analysable(classifier):
    value = "https://example.com/?" + "&" * 1500
    result = URLIntelligenceEngine(classifier).analyse(value)
    assert result.risk_level in {"LOW", "CAUTION"}
