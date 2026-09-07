"""Strict string parsing; never resolves hosts or retrieves public suffix updates."""

import ipaddress
import re
import unicodedata
from dataclasses import dataclass
from urllib.parse import parse_qsl, urlsplit, urlunsplit

import idna
import tldextract

PARSER_VERSION = "url_parser_v1"
EXTRACT = tldextract.TLDExtract(
    suffix_list_urls=(), cache_dir=None, fallback_to_snapshot=True, include_psl_private_domains=True
)


@dataclass(frozen=True)
class ParsedURL:
    original: str  # credential-redacted, otherwise preserves submitted spelling
    normalized: str  # no userinfo or fragment; path/query escaping preserved
    hostname: str
    unicode_hostname: str
    registrable_domain: str | None
    subdomain: str
    scheme: str
    port: int | None
    path: str
    query: str
    fragment: str
    has_credentials: bool
    ip_version: int | None
    nonstandard_host: bool

    @property
    def parameters(self) -> list[tuple[str, str]]:
        return parse_qsl(self.query, keep_blank_values=True, max_num_fields=2048)


def parse_url(value: str) -> ParsedURL:
    if not isinstance(value, str) or len(value.strip()) > 2048:
        raise ValueError("URL must be text of at most 2048 characters")
    # Check before stripping: urlsplit silently removes CR/LF/tab otherwise.
    if any(unicodedata.category(c) in {"Cc", "Cs", "Cf"} for c in value):
        raise ValueError("URL contains unsupported controls")
    value = value.strip()
    if not value or any(c.isspace() for c in value) or "\\" in value:
        raise ValueError("URL contains whitespace or a backslash")
    if not re.match(r"^https?://", value, re.I) or re.search(r"%(?![0-9a-fA-F]{2})", value):
        raise ValueError("Use a valid absolute HTTP(S) URL")
    parts = urlsplit(value)
    host = parts.hostname
    if not host or parts.netloc.endswith(":"):
        raise ValueError("Missing host or port")
    port = parts.port
    if port is not None and not 1 <= port <= 65535:
        raise ValueError("Invalid port")
    host = host.rstrip(".") if host.endswith(".") and not host.endswith("..") else host
    if "%" in host:
        raise ValueError("Encoded hostnames and IPv6 zone identifiers are unsupported")
    ip_version = None
    try:
        ip = ipaddress.ip_address(host)
        ascii_host, unicode_host, ip_version = ip.compressed, ip.compressed, ip.version
    except ValueError:
        ascii_host = idna.encode(host, uts46=True, std3_rules=True).decode("ascii").lower()
        unicode_host = idna.decode(ascii_host)
    if not ascii_host or len(ascii_host) > 253:
        raise ValueError("Invalid hostname")
    ext = EXTRACT(ascii_host)
    domain = ext.top_domain_under_public_suffix or None
    nonstandard = (
        bool(re.fullmatch(r"(?:0x[0-9a-f]+|[0-9]+)(?:\.(?:0x[0-9a-f]+|[0-9]+))*", ascii_host))
        and not ip_version
    )
    has_credentials = "@" in parts.netloc
    authority = parts.netloc.rsplit("@", 1)[-1]
    # Even malformed/multiple userinfo sections are discarded in full.
    safe_authority = ("@" if has_credentials else "") + authority
    authority_start = value.index("://") + 3
    original = (
        value[:authority_start] + safe_authority + value[authority_start + len(parts.netloc) :]
    )
    canonical_host = f"[{ascii_host}]" if ip_version == 6 else ascii_host
    default_port = 443 if parts.scheme.lower() == "https" else 80
    normalized_authority = canonical_host + (f":{port}" if port and port != default_port else "")
    normalized = urlunsplit(
        (parts.scheme.lower(), normalized_authority, parts.path or "/", parts.query, "")
    )
    return ParsedURL(
        original,
        normalized,
        ascii_host,
        unicode_host,
        domain,
        ext.subdomain,
        parts.scheme.lower(),
        port,
        parts.path or "/",
        parts.query,
        parts.fragment,
        has_credentials,
        ip_version,
        nonstandard,
    )
