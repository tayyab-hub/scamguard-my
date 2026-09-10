from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from app.core.config import Settings
from app.ml.engine import MessageIntelligenceEngine
from app.phone_intelligence.engine import PhoneIntelligenceEngine
from app.phone_intelligence.parsing import parse_phone_number
from app.qr_intelligence.decoder import DecodedQR, decoder_operational
from app.qr_intelligence.payment import PaymentResult, parse_payment_payload
from app.url_intelligence.engine import URLIntelligenceEngine
from app.url_intelligence.parsing import parse_url

ENGINE_VERSION = "qr-intelligence-v1"
CLASSIFIER_VERSION = "qr-payload-classifier-v1"
FUSION_VERSION = "qr-risk-fusion-v1"


@dataclass(frozen=True)
class QRPayload:
    type: str
    route: str | None
    routed_content: str | None
    payment: PaymentResult | None = None


@dataclass(frozen=True)
class QRAssessment:
    risk_level: str
    risk_score: float | None
    confidence_score: float | None
    confidence_level: str
    summary: str
    evidence: list[dict[str, object]]
    recommended_actions: list[str]
    components: dict[str, object]
    limitations: list[str]
    model_version: str | None = None
    rules_version: str = CLASSIFIER_VERSION
    fusion_version: str = FUSION_VERSION


def _structured_payload(text: str) -> bool:
    # A prose label such as "URGENT: send..." is not treated as a URI scheme. URI-like payloads
    # have non-whitespace content immediately after the colon.
    return bool(re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:\S", text))


def classify_payload(payload: str) -> QRPayload:
    text = payload.strip()
    payment = parse_payment_payload(text)
    if payment is not None:
        return QRPayload(
            "PAYMENT", "URL" if payment.embedded_url else None, payment.embedded_url, payment
        )
    if re.match(r"^https?://", text, re.IGNORECASE):
        try:
            parse_url(text)
            return QRPayload("URL", "URL", text)
        except ValueError:
            return QRPayload("OTHER", None, None)
    if text.lower().startswith("tel:"):
        candidate = text[4:].split(";", 1)[0]
        try:
            parsed = parse_phone_number(candidate)
            return QRPayload("PHONE", "PHONE", parsed.e164)
        except ValueError:
            return QRPayload("PHONE", None, None)
    if re.fullmatch(r"\+[0-9 ()-]{6,63}", text):
        try:
            parsed = parse_phone_number(text)
            return QRPayload("PHONE", "PHONE", parsed.e164)
        except ValueError:
            pass
    lowered = text.lower()
    if lowered.startswith("mailto:"):
        return QRPayload("EMAIL", None, None)
    if lowered.startswith(("sms:", "smsto:")):
        return QRPayload("SMS", None, None)
    if text.upper().startswith("WIFI:"):
        return QRPayload("WIFI", None, None)
    if lowered.startswith("geo:"):
        return QRPayload("GEO", None, None)
    if _structured_payload(text) or any(ord(char) < 32 and char not in "\r\n\t" for char in text):
        return QRPayload("OTHER", None, None)
    # Very short labels are decoded and retained but not forced through a message classifier.
    route = "MESSAGE" if len(text) >= 20 or len(text.split()) >= 3 else None
    return QRPayload("TEXT", route, text if route else None)


def persisted_payload(payload: str) -> str:
    """Return the decoded content that is safe to keep in private history."""
    classified = classify_payload(payload)
    if classified.type == "URL":
        # Match the existing URL submission policy: credentials are never retained.
        return parse_url(payload.strip()).original
    if classified.type == "PHONE" and classified.routed_content:
        return classified.routed_content
    if classified.type == "WIFI":
        # Wi-Fi QR payloads commonly embed a password in the P field. Classification does not
        # need that secret, so do not write it to PostgreSQL or return it from saved history.
        return re.sub(r"(?i)(^|;)P:(?:\\.|[^;])*", r"\1P:[redacted]", payload.strip())
    return payload


def _qr_evidence(category: str, label: str, explanation: str, snippet: str, *, severity="CONTEXT"):
    return {
        "category": category,
        "label": label,
        "explanation": explanation,
        "snippet": snippet,
        "source": "QR_DECODER",
        "severity": severity,
        "family": "qr-decoding",
    }


class QRIntelligenceEngine:
    version = ENGINE_VERSION

    def __init__(
        self,
        message_engine: MessageIntelligenceEngine,
        url_engine: URLIntelligenceEngine,
        phone_engine: PhoneIntelligenceEngine,
    ):
        self.message_engine = message_engine
        self.url_engine = url_engine
        self.phone_engine = phone_engine
        self.operational = decoder_operational()

    def analyse(self, decoded: DecodedQR) -> QRAssessment:
        payload = classify_payload(decoded.payload)
        evidence = [
            _qr_evidence(
                "QR_DECODED",
                "QR code decoded successfully",
                (
                    "The browser reported a camera-decoded payload. The server validated its "
                    "text, but did not receive or independently verify camera frames."
                    if decoded.source == "CAMERA"
                    else "A single QR symbol was decoded locally from the validated raster image."
                ),
                f"Decoded type: {payload.type}",
            )
        ]
        underlying: Any | None = None
        if payload.route == "URL" and payload.routed_content:
            underlying = self.url_engine.analyse(payload.routed_content)
        elif payload.route == "PHONE" and payload.routed_content:
            underlying = self.phone_engine.analyse(payload.routed_content)
        elif payload.route == "MESSAGE" and payload.routed_content:
            underlying = self.message_engine.analyse(payload.routed_content)

        payment_components = None
        if payload.payment:
            payment_components = payload.payment.metadata
            severity = "MEANINGFUL" if not payload.payment.structurally_valid else "CONTEXT"
            evidence.append(
                {
                    "category": "PAYMENT_QR_STRUCTURE",
                    "label": (
                        "Payment QR structure passed CRC validation"
                        if payload.payment.structurally_valid
                        else "Payment QR structure or CRC is invalid"
                    ),
                    "explanation": (
                        "The EMV-style fields and CRC are internally consistent. This does not "
                        "verify the merchant or recipient."
                        if payload.payment.structurally_valid
                        else (
                            "The recognized EMV-style payload has a structural or integrity "
                            "inconsistency."
                        )
                    ),
                    "snippet": (
                        "CRC valid"
                        if payload.payment.crc_valid is True
                        else payload.payment.error or "Malformed payment payload"
                    ),
                    "source": "PAYMENT_STRUCTURE",
                    "severity": severity,
                    "family": "payment-integrity",
                }
            )

        if underlying is not None:
            risk_level = str(underlying.risk_level)
            risk_score = underlying.risk_score
            confidence_score = underlying.confidence_score
            confidence_level = underlying.confidence_level
            evidence.extend(underlying.evidence)
            actions = list(underlying.recommended_actions)
            route_label = payload.route.title()
            summary = (
                f"The QR code itself is not the risk indicator. Its decoded {route_label.lower()} "
                f"content produced this {risk_level.lower().replace('_', ' ')} assessment."
            )
            underlying_components = dict(underlying.components)
        elif payload.payment:
            risk_level = (
                "INSUFFICIENT_EVIDENCE" if payload.payment.structurally_valid else "CAUTION"
            )
            risk_score = None
            confidence_score = None
            confidence_level = "LOW"
            summary = (
                "The payment QR is structurally consistent, but formatting and CRC validity do not "
                "establish merchant legitimacy or payment safety."
                if payload.payment.structurally_valid
                else (
                    "The payment QR has a structural or CRC integrity issue. This warrants caution "
                    "but is not proof of fraud."
                )
            )
            actions = [
                "Confirm the recipient and merchant details before authorizing payment.",
                "Verify unexpected payment requests through an independent trusted channel.",
                "Check the amount and currency shown by the payment application before confirming.",
            ]
            underlying_components = {}
        else:
            risk_level = "INSUFFICIENT_EVIDENCE"
            risk_score = None
            confidence_score = None
            confidence_level = "LOW"
            summary = (
                f"The QR code decoded as {payload.type.lower()} content, but no compatible "
                "intelligence engine can make a defensible risk assessment."
            )
            actions = [
                "Do not act on unknown encoded instructions without independent verification."
            ]
            if payload.type == "PHONE":
                actions = ["Verify the number independently and never disclose passwords or OTPs."]
            underlying_components = {}

        return QRAssessment(
            risk_level=risk_level,
            risk_score=risk_score,
            confidence_score=confidence_score,
            confidence_level=confidence_level,
            summary=summary,
            evidence=evidence,
            recommended_actions=actions,
            components={
                **underlying_components,
                "qr": {
                    "source": decoded.source,
                    "engine_version": ENGINE_VERSION,
                    "decoder_library": decoded.decoder_library,
                    "decoder_version": decoded.decoder_version,
                    "classifier_version": CLASSIFIER_VERSION,
                    "fusion_version": FUSION_VERSION,
                    "payload_type": payload.type,
                    "routed_engine": payload.route,
                    "payload_bytes": decoded.payload_bytes,
                    "image_format": decoded.image_format,
                    "image_width": decoded.width,
                    "image_height": decoded.height,
                    "file_sha256": decoded.file_sha256,
                    "original_image_retained": False,
                },
                **({"payment": payment_components} if payment_components else {}),
            },
            limitations=[
                *(
                    [
                        "Camera capture and decoder identity are client-reported, "
                        "not independently verified."
                    ]
                    if decoded.source == "CAMERA"
                    else []
                ),
                "A QR code is a data carrier, not an intrinsic indicator of fraud.",
                "Decoding does not establish who created or distributed the QR code.",
                "The decoded content was never opened, executed, contacted or fetched.",
                *(
                    underlying.limitations
                    if underlying is not None
                    else [
                        "Unsupported structured content cannot be assessed beyond its decoded form."
                    ]
                ),
                *(
                    [
                        "Payment formatting and CRC consistency do not verify merchant identity, "
                        "account ownership, legitimacy or transaction safety."
                    ]
                    if payload.payment
                    else []
                ),
            ],
            model_version=getattr(underlying, "model_version", None),
        )


def build_qr_engine(
    settings: Settings,
    message_engine: MessageIntelligenceEngine,
    url_engine: URLIntelligenceEngine,
    phone_engine: PhoneIntelligenceEngine,
) -> QRIntelligenceEngine:
    del settings
    return QRIntelligenceEngine(message_engine, url_engine, phone_engine)
