# Cross-checks for links and phone numbers written inside a message (message-embedded-v1). The
# existing offline URL and Phone engines assess what they find; nothing is opened, fetched, called
# or messaged. Their category can only raise the Message result, never lower it.

"""Extract links/phone numbers from message text and reuse the URL and Phone engines."""

from __future__ import annotations

import re
from dataclasses import dataclass

EMBEDDED_VERSION = "message-embedded-v1"
MAX_LINKS = 3
MAX_PHONES = 3

# Explicit http(s) links, or bare host names with a dot-separated ending (people often write
# "maybank2u-secure.com/login" without a scheme). An address after "@" is an email, not a link.
_LINK = re.compile(
    r"(?<![@\w.-])(?:https?://[^\s<>\"']+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+"
    r"[a-z]{2,24}(?::\d{2,5})?(?:/[^\s<>\"']*)?)",
    re.IGNORECASE,
)
# International numbers with "+", or Malaysian local numbers (01x mobile, 0[3-9] landline).
_INTERNATIONAL_PHONE = re.compile(r"(?<![\w+])\+\d[\d ()-]{6,18}\d")
_MALAYSIAN_LOCAL = re.compile(
    r"(?<![\w+])0(?:1\d|[3-7]|9)[ -]?\d{3,4}[ -]?\d{4}(?!\d)"
    r"|(?<![\w+])08\d[ -]?\d{6}(?!\d)"
)
# Malaysian 1300/1800 service numbers (shared-cost and toll-free); no leading 0.
_MALAYSIAN_SERVICE = re.compile(r"(?<![\w+])1[38]00[ -]?\d{2}[ -]?\d{4}(?!\d)")
_TRAILING = ".,;:!?)]}'\""
# Common file names and abbreviations that look like host names but are not links.
_NOT_HOSTS = re.compile(
    r"\.(?:jpg|jpeg|png|gif|pdf|docx?|xlsx?|pptx?|txt|zip|mp3|mp4)$|^(?:e\.g|i\.e|a\.m|p\.m)$",
    re.IGNORECASE,
)
ORDER = ["INSUFFICIENT_EVIDENCE", "LOW", "CAUTION", "ELEVATED", "HIGH"]
# URL-engine evidence labels for hand-reviewed popular sites and registry-restricted domains.
TRUSTED_SITE_LABELS = frozenset({"Well-known website", "Government or education domain"})
# Addresses written without http(s):// or www. must end in a commonly used ending. Casual text
# often omits the space after a full stop ("friday.hope", "days.so"), and some such endings are
# real but rare top-level domains.
BARE_ENDINGS = frozenset(
    "com net org info biz io co app dev site online xyz top icu click shop vip cc link live "
    "store tk ml ga cf gq me ly gl to sg my uk au asia cn hk tw jp kr in id ph th vn page web "
    "buzz cyou rest cfd sbs bond fun club win bid loan work support".split()
)


@dataclass(frozen=True)
class EmbeddedFinding:
    kind: str  # LINK or PHONE
    shown: str  # host or normalised number shown to the reader
    risk_level: str
    labels: list[str]
    actions: list[str]
    assumed: str | None = None  # explains any interpretation, e.g. "https:// added"
    source: str | None = None  # the link as written in the message
    trusted: bool = False  # Low risk on a recognised official or well-known site


def extract_links(text: str) -> list[str]:
    found: list[str] = []
    for match in _LINK.finditer(text):
        candidate = match.group(0).rstrip(_TRAILING)
        explicit = re.match(r"^(?:https?://|www\.)", candidate, re.IGNORECASE)
        host = re.sub(r"^https?://", "", candidate, flags=re.IGNORECASE).split("/")[0]
        host = host.split(":")[0].lower()
        if _NOT_HOSTS.search(host) or host.replace(".", "").isdigit() and not explicit:
            continue
        if not explicit and host.rsplit(".", 1)[-1] not in BARE_ENDINGS:
            continue
        # ".my" alone is also a word ("hello.my friend"); bare Malaysian addresses need a
        # second-level label such as com.my or gov.my.
        if not explicit and host.endswith(".my") and host.count(".") < 2:
            continue
        if candidate.lower() not in (item.lower() for item in found):
            found.append(candidate)
        if len(found) == MAX_LINKS:
            break
    return found


def extract_phones(text: str) -> list[tuple[str, str | None]]:
    """Return (international form, assumption note) pairs; local numbers are labelled as +60."""
    found: list[tuple[str, str | None]] = []
    for match in _INTERNATIONAL_PHONE.finditer(text):
        found.append((match.group(0), None))
    for match in _MALAYSIAN_LOCAL.finditer(text):
        digits = re.sub(r"\D", "", match.group(0))
        found.append((f"+60{digits[1:]}", "read as a Malaysian number (+60)"))
    for match in _MALAYSIAN_SERVICE.finditer(text):
        digits = re.sub(r"\D", "", match.group(0))
        found.append((f"+60{digits}", "read as a Malaysian 1300/1800 number (+60)"))
    unique: list[tuple[str, str | None]] = []
    seen: set[str] = set()
    for number, note in found:
        key = re.sub(r"\D", "", number)
        if key not in seen:
            seen.add(key)
            unique.append((number, note))
    return unique[:MAX_PHONES]


def assess_embedded(text: str, url_engine, phone_engine) -> list[EmbeddedFinding]:
    findings: list[EmbeddedFinding] = []
    if url_engine is not None:
        for link in extract_links(text):
            assumed = None
            target = link
            if not re.match(r"^https?://", link, re.IGNORECASE):
                target, assumed = "https://" + link, "https:// added to assess the address"
            try:
                result = url_engine.analyse(target)
            except ValueError:
                continue
            host = result.components["url_structure"]["hostname"]
            labels = [e["label"] for e in result.evidence if e.get("severity") != "CONTEXT"]
            recognised = any(e["label"] in TRUSTED_SITE_LABELS for e in result.evidence)
            findings.append(
                EmbeddedFinding(
                    "LINK",
                    host,
                    result.risk_level,
                    labels,
                    result.recommended_actions,
                    assumed,
                    source=link,
                    trusted=str(result.risk_level) == "LOW" and recognised,
                )
            )
    if phone_engine is not None:
        for number, note in extract_phones(text):
            try:
                result = phone_engine.analyse(number)
            except ValueError:
                continue
            labels = [e["label"] for e in result.evidence if e.get("severity") == "MEANINGFUL"]
            shown = result.components["phone_metadata"]["international_format"]
            findings.append(
                EmbeddedFinding(
                    "PHONE", shown, result.risk_level, labels, result.recommended_actions, note
                )
            )
    return findings


def strongest(findings: list[EmbeddedFinding]) -> EmbeddedFinding | None:
    ranked = [f for f in findings if f.risk_level in ORDER]
    return max(ranked, key=lambda f: ORDER.index(f.risk_level), default=None)
