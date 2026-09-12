"""Read-only frozen-model reproduction and controlled fixtures; no network, DB or retraining.

Run from any directory with the existing backend environment. Only authored demo/evidence files
are written. These fixtures measure bounded behavior, not population scam-detection accuracy.
"""

import binascii
import csv
import hashlib
import json
import platform
import re
import socket
import statistics
import sys
import time
import unicodedata
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import Settings
from app.ml.classifier import MessageClassifier
from app.ml.engine import build_message_engine
from app.phone_intelligence.engine import PhoneIntelligenceEngine
from app.qr_intelligence.decoder import QRImageError, decode_qr_image
from app.qr_intelligence.engine import QRIntelligenceEngine, classify_payload
from app.qr_intelligence.payment import parse_payment_payload
from app.url_intelligence.engine import build_url_engine
from app.url_intelligence.parsing import parse_url
from app.url_intelligence.rules import assess_rules
from tests.qr_fixtures import emv_payment_payload, multiple_qr_image_bytes, qr_image_bytes

ROOT = Path(__file__).resolve().parents[2]
LIMITS = dict(
    max_upload_bytes=5_242_880, max_dimension=4096, max_pixels=16_000_000, max_payload_bytes=5000
)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def metrics(matrix, classes):
    total = sum(map(sum, matrix))
    report = {"accuracy": sum(matrix[i][i] for i in range(len(classes))) / total}
    f1s = []
    weighted = 0
    for index, label in enumerate(classes):
        support = sum(matrix[index])
        predicted = sum(row[index] for row in matrix)
        precision = matrix[index][index] / predicted if predicted else 0
        recall = matrix[index][index] / support if support else 0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
        report[label] = dict(precision=precision, recall=recall, f1=f1, support=support)
        f1s.append(f1)
        weighted += f1 * support
    return {**report, "macro_f1": statistics.mean(f1s), "weighted_f1": weighted / total}


def message_reproduction():
    original = json.loads((ROOT / "docs/model_evaluation_v1.json").read_text())
    source = ROOT / "data/raw/mendeley_sms_phishing_v1/source/Dataset_5971.csv"
    assert digest(source) == original["dataset"]["source_sha256"]
    artifact = ROOT / "backend/app/ml/artifacts/message_tfidf_v1.json"
    model = MessageClassifier(artifact)
    classes = original["untouched_test"]["class_order"]
    with source.open(encoding="utf-8-sig", newline="") as handle:
        source_rows = list(csv.DictReader(handle))
    manifest = ROOT / "data/processed/message_split_manifest_v1.csv"
    with manifest.open() as handle:
        rows = list(csv.DictReader(handle))
    groups = defaultdict(set)
    hashes = set()
    matrix = [[0] * 3 for _ in range(3)]
    mapping = {"ham": "LEGITIMATE", "spam": "SPAM", "smishing": "SCAM"}
    for row in rows:
        source_row = source_rows[int(row["source_row"]) - 2]
        text = source_row["TEXT"].strip()
        normalized = re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text).casefold()).strip()
        assert hashlib.sha256(normalized.encode()).hexdigest() == row["text_sha256"]
        assert mapping[source_row["LABEL"].strip().casefold()] == row["label"]
        assert row["text_sha256"] not in hashes
        hashes.add(row["text_sha256"])
        groups[row["near_duplicate_group"]].add(row["split"])
        if row["split"] == "test":
            predicted = model.predict(text).label
            matrix[classes.index(row["label"])][classes.index(predicted)] += 1
    assert all(len(partitions) == 1 for partitions in groups.values())
    assert matrix == original["untouched_test"]["confusion_matrix"]
    return dict(
        artifact_sha256=digest(artifact),
        manifest_sha256=digest(manifest),
        checked_manifest_rows=len(rows),
        split_counts=dict(Counter(r["split"] for r in rows)),
        class_order=classes,
        confusion_matrix=matrix,
        metrics=metrics(matrix, classes),
        interpretation="Frozen runtime reproduction, not a new independent test set or retraining.",
    )


def row(name, expected, observed, **extra):
    return dict(
        case=name, expected=expected, observed=observed, passed=expected == observed, **extra
    )


def controlled_evaluation():
    # Never read local secrets or enable the optional external AI provider.
    settings = Settings(_env_file=None, app_env="test", ai_review_enabled=False)
    message = build_message_engine(settings)
    url = build_url_engine(settings)
    phone = PhoneIntelligenceEngine()
    qr = QRIntelligenceEngine(message, url, phone)
    url_cases = [
        ("conventional", "https://example.com/", None),
        ("ip_host", "http://192.0.2.10/login", "IP_ADDRESS_HOST"),
        ("userinfo", "https://example.com@other.example/", "EMBEDDED_CREDENTIALS"),
        ("subdomains", "https://a.b.c.d.example.com/", "EXCESSIVE_SUBDOMAINS"),
        ("punycode", "https://bücher.example/", "PUNYCODE"),
        ("mixed_script", "https://аpple.example.com/", "UNICODE_HOMOGLYPH_RISK"),
        ("port", "https://example.com:8088/", "UNUSUAL_PORT"),
        ("encoded", "https://example.com/%252f%2540", "ENCODING_OBFUSCATION"),
        ("keywords", "https://example.com/account/settings", "SUSPICIOUS_KEYWORDS"),
        (
            "brand_structure",
            "https://paypal.com.secure-login.example.net/verify",
            "SUSPICIOUS_SUBDOMAIN_BRANDING",
        ),
    ]
    urls = []
    for name, value, category in url_cases:
        parsed = parse_url(value)
        categories = [e.category for e in assess_rules(parsed)]
        valid = category in categories if category else not categories
        urls.append(
            row(
                name,
                True,
                valid,
                input=value,
                rule_categories=categories,
                fused_risk=str(url.analyse(value).risk_level),
            )
        )
    for value in ["example.com", "javascript:alert(1)", "https://"]:
        try:
            parse_url(value)
            rejected = False
        except ValueError:
            rejected = True
        urls.append(row("malformed_" + str(len(urls)), True, rejected, input=value))
    phone_cases = [
        (
            "mobile",
            "+60 12-345 6789",
            "+60123456789",
            "MY",
            "MOBILE",
            True,
            "INSUFFICIENT_EVIDENCE",
        ),
        (
            "fixed",
            "+44 20 7946 0958",
            "+442079460958",
            "GB",
            "FIXED_LINE",
            True,
            "INSUFFICIENT_EVIDENCE",
        ),
        (
            "foreign",
            "+1 (202) 555-0123",
            "+12025550123",
            "US",
            "FIXED_LINE_OR_MOBILE",
            True,
            "INSUFFICIENT_EVIDENCE",
        ),
        ("voip", "+44 56 1234 5678", "+445612345678", "GB", "VOIP", True, "INSUFFICIENT_EVIDENCE"),
        ("premium", "+49 900 1 234567", "+499001234567", "DE", "PREMIUM_RATE", True, "CAUTION"),
        ("shared_cost", "+33 884 01 23 45", "+33884012345", "FR", "SHARED_COST", True, "CAUTION"),
        ("invalid", "+44 1234567", "+441234567", None, "UNKNOWN", False, "INSUFFICIENT_EVIDENCE"),
    ]
    phones = []
    for name, value, e164, region, kind, valid, risk in phone_cases:
        result = phone.analyse(value)
        meta = result.components["phone_metadata"]
        observed = [
            meta["normalized_e164"],
            meta["region_code"],
            meta["number_type"],
            meta["valid"],
            result.risk_level,
        ]
        phones.append(row(name, [e164, region, kind, valid, risk], observed, input=value))
    for value in ["0123456789", "+12", "+44 20 CALL NOW"]:
        try:
            phone.analyse(value)
            rejected = False
        except ValueError:
            rejected = True
        phones.append(row("rejected_" + str(len(phones)), True, rejected, input=value))
    benign = "Hello, our project meeting is at the library tomorrow afternoon."
    suspicious = (
        "Your bank account is locked. Send your password and OTP immediately to avoid arrest."
    )
    payloads = [
        ("url", "https://example.com/", "URL", "URL"),
        ("phone", "tel:+44 20 7946 0958", "PHONE", "PHONE"),
        ("message", suspicious, "TEXT", "MESSAGE"),
        ("plain_text", "Hello", "TEXT", None),
        ("payment", emv_payment_payload(), "PAYMENT", None),
        ("invalid_crc", emv_payment_payload(corrupt_crc=True), "PAYMENT", None),
        ("unknown", "custom:inert-demo", "OTHER", None),
        ("unsafe_scheme", "javascript:alert(1)", "OTHER", None),
        ("wifi", "WIFI:T:nopass;S:SCAMGUARD-DEMO;;", "WIFI", None),
        ("sms", "SMSTO:+442079460958:Hello", "SMS", None),
        ("email", "mailto:demo@example.com", "EMAIL", None),
        ("payment_url", emv_payment_payload(embedded_url="https://example.com/"), "PAYMENT", "URL"),
    ]
    demo = ROOT / "data/demo/task9"
    demo.mkdir(parents=True, exist_ok=True)
    qrs = []
    for name, value, kind, route in payloads:
        image = qr_image_bytes(value)
        (demo / f"{name}.png").write_bytes(image)
        decoded = decode_qr_image(image, "image/png", **LIMITS)
        classified = classify_payload(decoded.payload)
        assessment = qr.analyse(decoded)
        qrs.append(
            row(
                name,
                [True, kind, route],
                [decoded.payload == value, classified.type, classified.route],
                fused_risk=assessment.risk_level,
                image_sha256=hashlib.sha256(image).hexdigest(),
            )
        )
    for name, image, expected in [
        ("multiple", multiple_qr_image_bytes(), "QR_MULTIPLE_DETECTED"),
        ("corrupt", b"not an image", "QR_IMAGE_INVALID"),
    ]:
        try:
            decode_qr_image(image, "image/png", **LIMITS)
            code = "accepted"
        except QRImageError as error:
            code = error.code
        qrs.append(row(name, expected, code))
    from io import BytesIO

    from PIL import Image

    blank = BytesIO()
    Image.new("L", (200, 200), 255).save(blank, format="PNG")
    try:
        decode_qr_image(blank.getvalue(), "image/png", **LIMITS)
        code = "accepted"
    except QRImageError as error:
        code = error.code
    qrs.append(row("no_code", "QR_NOT_DETECTED", code))
    prefix = "0002016304"
    minimal = prefix + f"{binascii.crc_hqx(prefix.encode(), 0xFFFF):04X}"
    payments = []
    for name, value, expected in [
        ("valid_subset", emv_payment_payload(), [True, True]),
        ("invalid_crc", emv_payment_payload(corrupt_crc=True), [False, False]),
        ("malformed_tlv", "0002015999TOO-SHORT6304FFFF", [False, None]),
        ("missing_crc", "000201", [False, None]),
    ]:
        result = parse_payment_payload(value)
        payments.append(row(name, expected, [result.structurally_valid, result.crc_valid]))
    result = parse_payment_payload(minimal)
    payment_limitation = dict(
        case="missing_merchant_fields_with_valid_crc",
        expected_complete_standard_validation=False,
        observed_subset_structurally_valid=result.structurally_valid,
        limitation="Mandatory merchant fields are not exhaustively validated; subset TLV/CRC only.",
    )
    timings = {}
    for name, call in [
        ("message", lambda: message.analyse(suspicious)),
        ("url", lambda: url.analyse("https://example.com/")),
        ("phone", lambda: phone.analyse("+44 20 7946 0958")),
        (
            "qr_decode_and_assess",
            lambda: qr.analyse(
                decode_qr_image((demo / "url.png").read_bytes(), "image/png", **LIMITS)
            ),
        ),
    ]:
        call()
        samples = []
        for _ in range(30):
            start = time.perf_counter()
            call()
            samples.append((time.perf_counter() - start) * 1000)
        timings[name] = dict(
            n=30,
            median_ms=statistics.median(samples),
            p95_ms=sorted(samples)[28],
            max_ms=max(samples),
        )
    fixtures = dict(
        warning=(
            "Controlled demonstration only. Never open URLs, call numbers or authorize payment."
        ),
        messages={"benign": benign, "scam_like": suspicious, "insufficient": "hello"},
        urls={name: value for name, value, _ in url_cases},
        phones={item[0]: item[1] for item in phone_cases},
        qr={name: value for name, value, _, _ in payloads},
        message_observed_risks={
            label: str(message.analyse(value).risk_level)
            for label, value in {
                "benign": benign,
                "scam_like": suspicious,
                "insufficient": "hello",
            }.items()
        },
    )
    (demo / "fixtures.json").write_text(
        json.dumps(fixtures, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return dict(
        url=urls,
        phone=phones,
        qr=qrs,
        payment=payments,
        payment_subset_limitation=payment_limitation,
        timings=timings,
    )


def main():
    def blocked(*args, **kwargs):
        raise AssertionError("Evaluation attempted network access")

    with (
        patch.object(socket.socket, "connect", blocked),
        patch.object(socket, "getaddrinfo", blocked),
    ):
        message = message_reproduction()
        controlled = controlled_evaluation()
    report = dict(
        measured_at_utc=datetime.now(UTC).isoformat(),
        python=platform.python_version(),
        platform=platform.system(),
        message=message,
        controlled=controlled,
        boundaries=(
            "Local frozen models and authored synthetic fixtures; no user records, no network."
        ),
    )
    destination = ROOT / "docs/evidence/final_evaluation.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "message_test_rows": sum(map(sum, message["confusion_matrix"])),
                "fixtures": {
                    name: {
                        "passed": sum(r["passed"] for r in controlled[name]),
                        "total": len(controlled[name]),
                    }
                    for name in ["url", "phone", "qr", "payment"]
                },
                "payment_subset_limitation": controlled["payment_subset_limitation"],
            }
        )
    )
    assert all(r["passed"] for name in ["url", "phone", "qr", "payment"] for r in controlled[name])


if __name__ == "__main__":
    main()
