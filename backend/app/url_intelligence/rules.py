"""Small evidence detectors. Thresholds are versioned review heuristics, not probabilities."""

import re
import unicodedata
from dataclasses import asdict, dataclass
from urllib.parse import unquote, urlsplit

from app.url_intelligence.features import KEYWORDS, REDIRECT_KEYS, entropy, features
from app.url_intelligence.parsing import ParsedURL

RULES_VERSION = "url_rules_v1"
BRANDS = {
    "paypal": {"paypal.com"},
    "microsoft": {"microsoft.com", "microsoftonline.com", "live.com"},
    "apple": {"apple.com", "icloud.com"},
    "google": {"google.com"},
}


@dataclass(frozen=True)
class Evidence:
    category: str
    severity: str
    label: str
    explanation: str
    snippet: str
    family: str
    source: str = "DETERMINISTIC_RULE"

    def to_dict(self):
        return asdict(self)


def item(category, severity, label, explanation, snippet, family):
    return Evidence(category, severity, label, explanation, str(snippet)[:180], family)


def host_evidence(u, f):
    out = []
    if u.ip_version:
        out.append(
            item(
                "IP_ADDRESS_HOST",
                "WEAK",
                "IP address host",
                (
                    "A numeric address provides less recognisable organisation "
                    "context; it is not proof of phishing."
                ),
                u.hostname,
                "host",
            )
        )
    if u.ip_version == 6 or u.nonstandard_host:
        out.append(
            item(
                "NONSTANDARD_HOST_REPRESENTATION",
                "WEAK",
                "Alternative host representation",
                "IPv6 is valid; numeric or hexadecimal host forms can be harder to recognise.",
                u.hostname,
                "host",
            )
        )
    if not u.registrable_domain and not u.ip_version:
        out.append(
            item(
                "MISSING_MEANINGFUL_DOMAIN",
                "WEAK",
                "Limited domain context",
                "The offline suffix snapshot cannot identify a registrable public domain.",
                u.hostname,
                "host",
            )
        )
    if f["subdomain_count"] >= 4:
        out.append(
            item(
                "EXCESSIVE_SUBDOMAINS",
                "WEAK",
                "Many subdomain labels",
                "Four or more subdomain labels can obscure the registrable domain.",
                f"{int(f['subdomain_count'])} labels; {u.registrable_domain}",
                "host",
            )
        )
    if f["punycode"]:
        out.append(
            item(
                "PUNYCODE",
                "CONTEXT",
                "Internationalised hostname",
                (
                    "Punycode represents Unicode names. Internationalised "
                    "domains are not inherently malicious."
                ),
                u.hostname,
                "unicode",
            )
        )
    scripts = {unicodedata.name(c, "").split(" ")[0] for c in u.unicode_hostname if c.isalpha()}
    if ("CYRILLIC" in scripts or "GREEK" in scripts) and "LATIN" in scripts:
        out.append(
            item(
                "UNICODE_HOMOGLYPH_RISK",
                "WEAK",
                "Mixed-script hostname",
                (
                    "Latin mixed with Greek or Cyrillic can create look-alike "
                    "characters. No intended brand is inferred."
                ),
                u.hostname,
                "unicode",
            )
        )
    outside = unquote(u.subdomain + "/" + u.path).lower()
    tokens = set(re.findall(r"[a-z]+", outside))
    for brand, domains in BRANDS.items():
        if brand in tokens and u.registrable_domain not in domains:
            category = (
                "SUSPICIOUS_SUBDOMAIN_BRANDING"
                if brand in re.findall(r"[a-z]+", u.subdomain)
                else "BRAND_LIKE_TOKEN_MISMATCH"
            )
            out.append(
                item(
                    category,
                    "MEANINGFUL",
                    "Brand-like token outside its domain",
                    (
                        "A limited known brand token appears outside its listed "
                        "registrable domains; affiliation is unverified."
                    ),
                    f"{brand}; actual domain: {u.registrable_domain or u.hostname}",
                    "branding",
                )
            )
    return out


def authority_evidence(u, f):
    out = []
    if u.has_credentials:
        out.extend(
            [
                item(
                    "EMBEDDED_CREDENTIALS",
                    "MEANINGFUL",
                    "Embedded credentials",
                    (
                        "User information before @ is not the destination host. Its "
                        "value was removed before storage."
                    ),
                    "[redacted]@" + u.hostname,
                    "authority",
                ),
                item(
                    "AT_SIGN_CONFUSION",
                    "WEAK",
                    "Authority uses @",
                    "Read the hostname after the final @ to identify the destination.",
                    u.hostname,
                    "authority",
                ),
            ]
        )
    if f["unusual_port"]:
        out.append(
            item(
                "UNUSUAL_PORT",
                "WEAK",
                "Non-standard web port",
                "A custom port is unusual for public login pages but can be legitimate.",
                u.port,
                "transport",
            )
        )
    if u.scheme == "http":
        out.append(
            item(
                "HTTP_ONLY",
                "WEAK",
                "Unencrypted HTTP",
                (
                    "HTTP does not encrypt data in transit. HTTPS alone would "
                    "not establish legitimacy."
                ),
                "http://",
                "transport",
            )
        )
    return out


def complexity_evidence(u, f):
    out = []
    for feature, threshold, category, title in [
        ("url_length", 256, "EXCESSIVE_URL_LENGTH", "Long URL"),
        ("path_depth", 8, "EXCESSIVE_PATH_DEPTH", "Deeply nested path"),
        ("query_count", 12, "EXCESSIVE_QUERY_PARAMETERS", "Many query parameters"),
    ]:
        if f[feature] >= threshold:
            out.append(
                item(
                    category,
                    "WEAK",
                    title,
                    (
                        "This review threshold indicates complexity, which is common "
                        "in legitimate URLs too."
                    ),
                    f"{int(f[feature])}; threshold {threshold}",
                    "complexity",
                )
            )
    if f["double_encoding"] or f["encoded_delimiters"] >= 3 or f["percent_count"] >= 6:
        severity = "MEANINGFUL" if f["double_encoding"] else "WEAK"
        out.append(
            item(
                "ENCODING_OBFUSCATION",
                severity,
                "Encoded URL structure",
                (
                    "Repeated encoding or encoded delimiters can obscure "
                    "structure; ordinary encoding is also legitimate."
                ),
                f"{int(f['percent_count'])} escapes; {int(f['double_encoding'])} double encodings",
                "encoding",
            )
        )
    random_tokens = [
        t
        for t in re.findall(r"[A-Za-z0-9]+", u.path + "?" + u.query)
        if len(t) >= 24 and entropy(t) >= 4.2
    ]
    if random_tokens:
        out.append(
            item(
                "HIGH_ENTROPY_TOKENS",
                "WEAK",
                "Random-looking token",
                (
                    "Long varied tokens may be tracking or session identifiers; "
                    "this alone is weak evidence."
                ),
                f"{len(random_tokens)} tokens; values withheld",
                "complexity",
            )
        )
    return out


def destination_evidence(u, f):
    out = []
    tokens = sorted(
        set(re.findall(r"[a-z]+", unquote(u.hostname + u.path + "?" + u.query).lower())) & KEYWORDS
    )
    if tokens:
        out.append(
            item(
                "SUSPICIOUS_KEYWORDS",
                "WEAK",
                "Account or payment language",
                (
                    "These words occur in legitimate services too; they do not "
                    "identify phishing by themselves."
                ),
                ", ".join(tokens),
                "language",
            )
        )
    if f["shortener"]:
        out.append(
            item(
                "URL_SHORTENER",
                "WEAK",
                "Shortened destination",
                (
                    "A shortener conceals the final destination. No expansion or "
                    "redirect request was made."
                ),
                u.hostname,
                "transparency",
            )
        )
    if u.fragment:
        out.append(
            item(
                "FRAGMENT_CONTENT",
                "CONTEXT",
                "Fragment content",
                "A fragment may select content inside a site. "
                "It was retained but not interpreted or fetched.",
                f"{len(u.fragment)} fragment characters; value withheld",
                "transparency",
            )
        )
    redirects = [(k, v) for k, v in u.parameters if k.lower() in REDIRECT_KEYS]
    if redirects:
        # Decode at most one additional layer, extract only inert hostnames; never recurse or fetch.
        hosts = []
        for _, value in redirects[:8]:
            try:
                nested = urlsplit(unquote(value))
                if nested.scheme.lower() in {"http", "https"} and nested.hostname:
                    hosts.append(nested.hostname[:80])
            except ValueError:
                pass
        out.append(
            item(
                "MULTIPLE_REDIRECT_PARAMETERS" if len(redirects) > 1 else "REDIRECT_PARAMETER",
                "WEAK",
                "Destination parameter",
                (
                    "A query parameter may select another destination; its "
                    "presence does not prove an actual redirect."
                ),
                f"{len(redirects)} parameters; nested hosts: "
                f"{', '.join(hosts) or 'not identifiable'}",
                "transparency",
            )
        )
    extension = re.search(
        r"\.(exe|scr|msi|bat|cmd|ps1|js|vbs|zip|rar|7z|apk)$", unquote(u.path), re.I
    )
    if extension:
        out.append(
            item(
                "SUSPICIOUS_FILE_EXTENSION",
                "MEANINGFUL",
                "Download-like extension",
                (
                    "An executable, script or archive-looking path warrants "
                    "checking the source before downloading."
                ),
                extension.group(0),
                "download",
            )
        )
    return out


DETECTORS = (host_evidence, authority_evidence, complexity_evidence, destination_evidence)


def assess_rules(url: ParsedURL) -> list[Evidence]:
    values = features(url)
    return [evidence for detector in DETECTORS for evidence in detector(url, values)]
