# Deterministic QR payload classification, credential-redacted history text and routing to
# Message/URL/Phone engines. Decoding is not trust. Payment integrity adds a Caution floor when
# needed; ordinary routed content inherits its engine result. The shared Message engine can use
# optional AI if configured.

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
from app.url_intelligence.brands import BRANDS
from app.url_intelligence.engine import URLIntelligenceEngine
from app.url_intelligence.parsing import parse_url

RISK_ORDER = ["INSUFFICIENT_EVIDENCE", "LOW", "CAUTION", "ELEVATED", "HIGH"]
# Payment recipients named after authorities, refunds or fines are a common Malaysian QR lure:
# a sticker or message asks the reader to "settle" a summons or claim a refund by paying.
AUTHORITY_LURE = re.compile(
    r"\b(lhdn|hasil|pdrm|polis|police|mahkamah|court|bank negara|bnm|kastam|customs|jpj|"
    r"imigresen|immigration|refund|tax|cukai|saman|summons|fine|denda|penalty|kerajaan|"
    r"government)\b",
    re.IGNORECASE,
)


def _brand_in_name(name: str) -> tuple[str, frozenset[str]] | None:
    words = set(re.findall(r"[a-z0-9]+", name.casefold()))
    compact = re.sub(r"[^a-z0-9]", "", name.casefold())
    for display, tokens, domains in BRANDS.values():
        if any(token in words or (len(token) >= 5 and token in compact) for token in tokens):
            return display, domains
    return None


ENGINE_VERSION = "qr-intelligence-v1"
CLASSIFIER_VERSION = "qr-payload-classifier-v3"
FUSION_VERSION = "qr-risk-fusion-v3"


# Classified payload type, optional engine route/content and payment findings. Recognizing
# EMAIL/WIFI/etc. does not execute those instructions.
@dataclass(frozen=True)
class QRPayload:
    type: str
    route: str | None
    routed_content: str | None
    payment: PaymentResult | None = None


# Persistable wrapper combining decoded provenance, routed evidence, payment findings and
# advisory limitations; there is no independent trained QR fraud model.
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


# Recognize URI-like scheme:value content without mistaking prose such as URGENT: send for an
# executable scheme.
def _structured_payload(text: str) -> bool:
    # A prose label such as "URGENT: send..." is not treated as a URI scheme. URI-like payloads
    # have non-whitespace content immediately after the colon.
    return bool(re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:\S", text))


# Classify payment first, then HTTP(S), international phone and supported structured prefixes,
# with suitable remaining text routed to Message. Unknown schemes/short labels are retained
# conservatively without forced inference.
def classify_payload(payload: str) -> QRPayload:
    text = payload.strip()
    payment = parse_payment_payload(text)
    if payment is not None:
        destination = payment.embedded_url
        if destination:
            try:
                parse_url(destination)
            except ValueError:
                destination = None
        return QRPayload("PAYMENT", "URL" if destination else None, destination, payment)
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
        # sms:+60123456789?body=... or SMSTO:+60123456789:body. The body is the message the
        # reader is nudged to send, so it is assessed as text; otherwise the number is.
        rest = text.split(":", 1)[1]
        number, _, body = re.split(r"[?:]", rest, maxsplit=1)[0], None, ""
        match = re.search(r"(?:\?|&)body=([^&]*)|^[^:?]*:(.*)$", rest, re.IGNORECASE)
        if match:
            from urllib.parse import unquote

            body = unquote(match.group(1) or match.group(2) or "").strip()
        if len(body) >= 20 or len(body.split()) >= 3:
            return QRPayload("SMS", "MESSAGE", body)
        try:
            return QRPayload("SMS", "PHONE", parse_phone_number(number.strip()).e164)
        except ValueError:
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


# Prepare private history text by removing recognized URL userinfo and Wi-Fi password fields and
# normalizing supported phones. This is targeted redaction, not a guarantee that arbitrary
# payloads contain no personal data.
def persisted_payload(payload: str) -> str:
    """Return the decoded content that is safe to keep in private history."""
    classified = classify_payload(payload)
    if classified.type == "URL":
        # Match the existing URL submission policy: credentials are never retained.
        return parse_url(payload.strip()).original
    if re.match(r"^https?://", payload.strip(), re.IGNORECASE):
        # Malformed URL-shaped payloads still must not retain authority credentials.
        return re.sub(r"(?i)^(https?://)[^/\s?#]*@", r"\1@", payload.strip())
    if classified.type == "PHONE" and classified.routed_content:
        return classified.routed_content
    if classified.type == "WIFI":
        # Wi-Fi QR payloads commonly embed a password in the P field. Classification does not
        # need that secret, so do not write it to PostgreSQL or return it from saved history.
        text = payload.strip()
        # The password can be the first field immediately after WIFI:, not only after ';'.
        return text[:5] + re.sub(r"(?i)(^|;)P:(?:\\.|[^;])*", r"\1P:[redacted]", text[5:])
    if classified.type == "PAYMENT":
        # Analysis uses the original decoded bytes. Saved text must not retain userinfo in
        # embedded HTTP(S) URLs, including URLs beyond the first routed one. Redaction can
        # change TLV lengths/CRC: the saved text is a private record, not a payment instruction.
        return re.sub(r"(?i)(https?://)[^/\s?#]*@", r"\1[redacted]@", payload)
    return payload


# Build a decoder-origin observation with a bounded, explicit evidence family; successful
# decoding itself is neutral context.
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


# Reuse the app's existing engine instances for supported payloads. No camera-frame processing
# occurs here; uploaded images were decoded before this method is called.
class QRIntelligenceEngine:
    version = ENGINE_VERSION

    # Retain shared engines and imported decoder readiness. Reusing the Message instance also
    # reuses its configured optional reviewer.
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

    # Given validated DecodedQR, classify/routinely route its original payload, combine
    # provenance and payment evidence, and return QRAssessment. Unsupported content abstains;
    # integrity/destination warnings preserve at least CAUTION without erasing higher routed
    # risk.
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
            # This calls the same Message pipeline as direct text submission, including optional
            # ambiguous-text review when an operator has enabled/configured it. QR decoding does
            # not itself contact that provider.
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
            if payload.payment.embedded_url and not payload.route:
                evidence.append(
                    _qr_evidence(
                        "PAYMENT_URL_INVALID",
                        "Embedded URL could not be assessed",
                        "The embedded destination is malformed or outside the URL input limits. "
                        "It was not opened.",
                        "Destination value withheld",
                        severity="MEANINGFUL",
                    )
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

        # Payment consistency is separate from destination structure. A benign-looking URL
        # cannot cancel a corrupt payment payload; a stronger destination warning is retained.
        if payload.payment:
            payment_warning = not payload.payment.structurally_valid or (
                payload.payment.embedded_url is not None and payload.route is None
            )
            if payment_warning and risk_level in {"LOW", "INSUFFICIENT_EVIDENCE"}:
                risk_level = "CAUTION"
                risk_score = None
                confidence_score = None
                confidence_level = "LOW"
                summary = (
                    "The payment QR has an integrity issue or an unassessable destination. "
                    "Verify the payment details independently before acting."
                )
            if underlying is not None:
                actions.append(
                    "Confirm the recipient, amount and currency independently "
                    "before authorizing payment."
                )
            if payment_warning:
                actions.insert(
                    0,
                    "Do not authorize payment from this code until the integrity "
                    "or destination issue is resolved.",
                )
                basis = underlying_components.get("assessment_basis", {})
                underlying_components["assessment_basis"] = {
                    "decision": (
                        "Payment integrity or destination warnings require at least Caution. "
                        "Any higher warning from the destination assessment is retained."
                    ),
                    "supporting": [
                        "The payment structure or embedded destination could not be validated.",
                        *basis.get("supporting", []),
                    ],
                    "mitigating": basis.get("mitigating", []),
                    "uncertainty": [
                        "Payment formatting and CRC checks cannot authenticate the recipient "
                        "or establish transaction safety.",
                        *basis.get("uncertainty", []),
                    ],
                }

        # qr-risk-fusion-v3: the recipient name is what the payer sees. A brand name whose
        # embedded link is not on that brand's official domains, or a recipient named after an
        # authority/refund/fine, raises the floor without lowering any routed warning.
        if payload.payment:
            name = str(payload.payment.metadata.get("merchant_name") or "")
            floor = None
            brand = _brand_in_name(name) if name else None
            if brand and payload.payment.embedded_url:
                try:
                    domain = parse_url(payload.payment.embedded_url).registrable_domain
                except ValueError:
                    domain = None
                if domain not in brand[1]:
                    floor = "ELEVATED"
                    evidence.append(
                        {
                            "category": "MERCHANT_BRAND_MISMATCH",
                            "label": "Recipient name and link do not match",
                            "explanation": (
                                f"The recipient is named after {brand[0]}, but the embedded link "
                                "is not on one of its official domains."
                            ),
                            "snippet": f"{name[:60]} · {domain or 'unparseable link'}",
                            "source": "PAYMENT_STRUCTURE",
                            "severity": "MEANINGFUL",
                            "family": "payment-recipient",
                        }
                    )
            if name and AUTHORITY_LURE.search(name):
                floor = floor or "CAUTION"
                evidence.append(
                    {
                        "category": "AUTHORITY_NAMED_RECIPIENT",
                        "label": "Recipient named after an authority, refund or fine",
                        "explanation": (
                            "Government agencies and banks do not collect fines or release "
                            "refunds through QR codes sent by message or stuck in public places."
                        ),
                        "snippet": name[:80],
                        "source": "PAYMENT_STRUCTURE",
                        "severity": "MEANINGFUL",
                        "family": "payment-recipient",
                    }
                )
            if floor and RISK_ORDER.index(risk_level) < RISK_ORDER.index(floor):
                risk_level = floor
                risk_score = None
                confidence_score = None
                confidence_level = "LOW"
                summary = (
                    "The payment recipient's name suggests impersonation. Confirm who you are "
                    "paying through an official channel before authorizing payment."
                )
            if floor:
                actions.insert(
                    0,
                    "Check the recipient name shown by your banking app; do not pay a QR that "
                    "claims to settle a fine, tax or refund.",
                )

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


# Construct the router around already-loaded engines. settings is currently unused here; input
# limits are applied by the API/decoder.
def build_qr_engine(
    settings: Settings,
    message_engine: MessageIntelligenceEngine,
    url_engine: URLIntelligenceEngine,
    phone_engine: PhoneIntelligenceEngine,
) -> QRIntelligenceEngine:
    del settings
    return QRIntelligenceEngine(message_engine, url_engine, phone_engine)
