from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

import phonenumbers
from phonenumbers import PhoneNumberFormat, PhoneNumberType

PARSER_VERSION = "phone-parser-v1"
MAX_PHONE_INPUT_LENGTH = 64
MIN_E164_DIGITS = 7
MAX_E164_DIGITS = 15
_ALLOWED_INPUT = re.compile(r"\+[0-9 ()-]+")

_NUMBER_TYPES = {
    PhoneNumberType.FIXED_LINE: "FIXED_LINE",
    PhoneNumberType.MOBILE: "MOBILE",
    PhoneNumberType.FIXED_LINE_OR_MOBILE: "FIXED_LINE_OR_MOBILE",
    PhoneNumberType.TOLL_FREE: "TOLL_FREE",
    PhoneNumberType.PREMIUM_RATE: "PREMIUM_RATE",
    PhoneNumberType.SHARED_COST: "SHARED_COST",
    PhoneNumberType.VOIP: "VOIP",
    PhoneNumberType.PERSONAL_NUMBER: "PERSONAL_NUMBER",
    PhoneNumberType.PAGER: "PAGER",
    PhoneNumberType.UAN: "UAN",
    PhoneNumberType.VOICEMAIL: "VOICEMAIL",
    PhoneNumberType.UNKNOWN: "UNKNOWN",
}


@dataclass(frozen=True)
class ParsedPhoneNumber:
    e164: str
    international_format: str
    country_calling_code: int
    region_code: str | None
    possible: bool
    valid: bool
    number_type: str
    parser_version: str = PARSER_VERSION
    metadata_version: str = phonenumbers.__version__


def _balanced_parentheses(value: str) -> bool:
    depth = 0
    for character in value:
        if character == "(":
            depth += 1
            if depth > 1:
                return False
        elif character == ")":
            depth -= 1
            if depth < 0:
                return False
    return depth == 0


def parse_phone_number(value: str) -> ParsedPhoneNumber:
    if not isinstance(value, str):
        raise TypeError("Phone number must be text")
    if len(value) > MAX_PHONE_INPUT_LENGTH:
        raise ValueError("Phone number exceeds the input limit")
    if any(unicodedata.category(character) in {"Cc", "Cf", "Cs"} for character in value):
        raise ValueError("Phone number contains unsupported controls")

    normalized_input = value.strip()
    if not normalized_input:
        raise ValueError("Phone number must be non-empty")
    if not normalized_input.startswith("+"):
        raise ValueError("Use an international number beginning with + and a country calling code")
    if not _ALLOWED_INPUT.fullmatch(normalized_input) or not _balanced_parentheses(
        normalized_input
    ):
        raise ValueError("Phone number contains unsupported characters or malformed punctuation")

    digits = "".join(
        character for character in normalized_input if character.isascii() and character.isdigit()
    )
    if len(digits) < MIN_E164_DIGITS:
        raise ValueError("Phone number is too short")
    if len(digits) > MAX_E164_DIGITS:
        raise ValueError("Phone number is too long")

    try:
        parsed = phonenumbers.parse(normalized_input, None)
    except phonenumbers.NumberParseException as exc:
        raise ValueError(
            "Phone number could not be parsed with an international calling code"
        ) from exc

    number_type = _NUMBER_TYPES.get(phonenumbers.number_type(parsed), "UNKNOWN")
    return ParsedPhoneNumber(
        e164=phonenumbers.format_number(parsed, PhoneNumberFormat.E164),
        international_format=phonenumbers.format_number(parsed, PhoneNumberFormat.INTERNATIONAL),
        country_calling_code=parsed.country_code,
        region_code=phonenumbers.region_code_for_number(parsed),
        possible=phonenumbers.is_possible_number(parsed),
        valid=phonenumbers.is_valid_number(parsed),
        number_type=number_type,
    )
