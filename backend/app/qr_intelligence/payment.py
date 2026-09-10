from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

PAYMENT_PARSER_VERSION = "emv-mpm-parser-v1"


@dataclass(frozen=True)
class TLV:
    tag: str
    value: bytes
    start: int


@dataclass(frozen=True)
class PaymentResult:
    recognized: bool
    structurally_valid: bool
    crc_valid: bool | None
    metadata: dict[str, object]
    embedded_url: str | None = None
    error: str | None = None


def _crc16_ccitt(data: bytes) -> int:
    crc = 0xFFFF
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return crc


def _parse_tlv(data: bytes) -> list[TLV]:
    fields: list[TLV] = []
    offset = 0
    while offset < len(data):
        if offset + 4 > len(data):
            raise ValueError("truncated TLV header")
        header = data[offset : offset + 4]
        if not header.isdigit():
            raise ValueError("non-numeric TLV header")
        tag = header[:2].decode("ascii")
        length = int(header[2:])
        value_start = offset + 4
        value_end = value_start + length
        if value_end > len(data):
            raise ValueError("TLV length exceeds payload")
        fields.append(TLV(tag, data[value_start:value_end], offset))
        offset = value_end
    if not fields:
        raise ValueError("empty TLV payload")
    return fields


def _text(value: bytes) -> str:
    return value.decode("utf-8")


def _find_embedded_url(fields: list[TLV], depth: int = 0) -> str | None:
    pattern = re.compile(rb"https?://[^\x00-\x20]+", re.IGNORECASE)
    for field in fields:
        match = pattern.search(field.value)
        if match:
            try:
                return match.group(0).decode("utf-8")
            except UnicodeDecodeError:
                continue
        if depth < 4 and field.tag in {
            *(f"{number:02d}" for number in range(26, 52)),
            "62",
            "64",
        }:
            try:
                nested = _parse_tlv(field.value)
            except ValueError:
                continue
            found = _find_embedded_url(nested, depth + 1)
            if found:
                return found
    return None


def parse_payment_payload(payload: str) -> PaymentResult | None:
    encoded = payload.encode("utf-8")
    # EMVCo merchant-presented payloads begin with ID 00, length 02, value 01.
    if not encoded.startswith(b"000201"):
        return None
    base: dict[str, object] = {
        "parser_version": PAYMENT_PARSER_VERSION,
        "standard": "EMVCo merchant-presented QR (generic structural subset)",
    }
    try:
        fields = _parse_tlv(encoded)
        by_tag = {field.tag: field for field in fields}
        if len(by_tag) != len(fields):
            raise ValueError("duplicate top-level TLV tag")
        if by_tag.get("00") is None or by_tag["00"].value != b"01":
            raise ValueError("unsupported payload format indicator")
        crc_field = by_tag.get("63")
        if crc_field is None or len(crc_field.value) != 4 or crc_field is not fields[-1]:
            raise ValueError("missing or misplaced CRC")
        expected_crc = _text(crc_field.value).upper()
        if not re.fullmatch(r"[0-9A-F]{4}", expected_crc):
            raise ValueError("invalid CRC encoding")
        calculated_crc = f"{_crc16_ccitt(encoded[: crc_field.start + 4]):04X}"
        crc_valid = calculated_crc == expected_crc

        metadata: dict[str, object] = {
            **base,
            "payload_format_indicator": "01",
            "crc_present": True,
            "crc_valid": crc_valid,
            "merchant_account_information_ids": [
                field.tag for field in fields if 26 <= int(field.tag) <= 51
            ],
        }
        text_fields = {
            "01": "point_of_initiation_method",
            "52": "merchant_category_code",
            "53": "transaction_currency_code",
            "54": "transaction_amount",
            "58": "country_code",
            "59": "merchant_name",
            "60": "merchant_city",
        }
        for tag, name in text_fields.items():
            if tag in by_tag:
                metadata[name] = _text(by_tag[tag].value)
        if "transaction_amount" in metadata:
            try:
                amount = Decimal(str(metadata["transaction_amount"]))
                if not amount.is_finite() or amount < 0:
                    raise InvalidOperation
            except InvalidOperation:
                raise ValueError("invalid transaction amount") from None
        return PaymentResult(
            recognized=True,
            structurally_valid=crc_valid,
            crc_valid=crc_valid,
            metadata=metadata,
            embedded_url=_find_embedded_url(fields),
            error=None if crc_valid else "CRC does not match the encoded payment data",
        )
    except (UnicodeDecodeError, ValueError) as exc:
        return PaymentResult(
            recognized=True,
            structurally_valid=False,
            crc_valid=None,
            metadata={**base, "crc_present": b"6304" in encoded},
            error=str(exc),
        )
