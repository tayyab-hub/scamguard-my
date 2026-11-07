# Explainable structural URL detectors grouped by evidence family. CONTEXT is descriptive, WEAK
# warrants caution, and MEANINGFUL supports stronger combined warnings. Small brand/shortener
# lists and string heuristics are incomplete; no detector verifies a website.

"""Small evidence detectors. Thresholds are versioned review heuristics, not probabilities."""

import re
import unicodedata
from dataclasses import asdict, dataclass
from urllib.parse import unquote, urlsplit

from app.url_intelligence.brands import BRANDS, brand_findings, is_official
from app.url_intelligence.features import KEYWORDS, REDIRECT_KEYS, entropy, features
from app.url_intelligence.parsing import ParsedURL
from app.url_intelligence.popular import is_popular, is_restricted_registry

RULES_VERSION = "url_rules_v4"
# v3 lists. Free hosting and dynamic DNS let anyone publish under a reputable parent domain;
# these TLDs are cheap and over-represented in phishing reports. Both are weak alone and become
# meaningful only with a brand or account/payment wording. Shorteners extend the model's v1 list
# here so the frozen model inputs do not change.
FREE_HOSTING = frozenset(
    (
        "000webhostapp.com weebly.com weeblysite.com wixsite.com wix.com github.io vercel.app "
        "netlify.app pages.dev workers.dev firebaseapp.com web.app blogspot.com glitch.me "
        "repl.co replit.app herokuapp.com onrender.com duckdns.org ngrok.io ngrok-free.app "
        "ngrok.app trycloudflare.com azurewebsites.net square.site webflow.io godaddysites.com "
        "sites.google.com forms.gle carrd.co mystrikingly.com jimdosite.com"
    ).split()
)
RISKY_TLDS = frozenset(
    "xyz top icu click shop buzz cyou rest cfd sbs bond quest monster online site live vip "
    "cc tk ml ga cf gq work support loan win bid".split()
)
EXTRA_SHORTENERS = frozenset(
    "s.id shorturl.at rb.gy t.ly tiny.cc linktr.ee bit.do cutt.us v.gd qrco.de shorturl.asia "
    "short.gy tinyurl.is urlz.fr t.me".split()
)


# One bounded observation with severity, explanation, source and family. Fusion counts
# independent meaningful families, not the number of displayed bullets.
@dataclass(frozen=True)
class Evidence:
    category: str
    severity: str
    label: str
    explanation: str
    snippet: str
    family: str
    source: str = "DETERMINISTIC_RULE"

    # Convert the dataclass to plain fields for result JSON and database persistence.
    def to_dict(self):
        return asdict(self)


# Construct a consistent evidence record and cap its snippet at 180 characters.
def item(category, severity, label, explanation, snippet, family):
    return Evidence(category, severity, label, explanation, str(snippet)[:180], family)


# Inspect numeric hosts, domain depth, Unicode scripts and limited brand tokens. Punycode alone
# is neutral context; brand mismatch is a heuristic, not verified impersonation.
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
    # Latin suffixes do not make an otherwise single-script label a look-alike.
    label_scripts = [
        {unicodedata.name(c, "").split(" ")[0] for c in label if c.isalpha()}
        for label in u.unicode_hostname.split(".")
    ]
    if any(scripts & {"CYRILLIC", "GREEK"} and "LATIN" in scripts for scripts in label_scripts):
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
    labels = {
        "BRAND_IN_UNOFFICIAL_DOMAIN": (
            "Brand name in an unofficial domain",
            "names a known brand, but its registrable domain is not one of that brand's "
            "official domains",
        ),
        "BRAND_IN_SUBDOMAIN": (
            "Brand name in a subdomain",
            "places a known brand in a subdomain of an unrelated domain",
        ),
        "LOOKALIKE_DOMAIN": (
            "Look-alike domain",
            "is spelled one or two characters away from, or with characters that look like, "
            "a known brand",
        ),
        "OFFICIAL_DOMAIN_IN_SUBDOMAIN": (
            "Official domain used as a disguise",
            "starts with a real brand domain, but the actual destination is the domain at the end",
        ),
    }
    for finding in brand_findings(
        u.hostname, u.unicode_hostname, u.registrable_domain, u.subdomain
    ):
        title, explanation = labels[finding.category]
        out.append(
            item(
                finding.category,
                "MEANINGFUL",
                title,
                f"This hostname {explanation}. Affiliation is unverified.",
                f"{finding.brand} ({finding.detail}); actual domain: "
                f"{u.registrable_domain or u.hostname}",
                "branding",
            )
        )
    # A brand named only in the path ("example.org/microsoft/login") of an unofficial domain.
    # News and reference pages mention brands in paths too, so it is weak unless account or
    # payment wording is present.
    if not is_official(u.registrable_domain) and not any(e.family == "branding" for e in out):
        path_tokens = set(re.findall(r"[a-z0-9]+", unquote(u.path).lower()))
        named = next(
            (
                (display, token)
                for display, tokens, _ in BRANDS.values()
                for token in tokens
                if len(token) >= 5 and token in path_tokens
            ),
            None,
        )
        if named:
            account_path = bool(path_tokens & KEYWORDS)
            out.append(
                item(
                    "BRAND_LIKE_TOKEN_MISMATCH",
                    "MEANINGFUL" if account_path else "WEAK",
                    "Brand name in the path of an unrelated site",
                    "A known brand appears in the path of a domain that is not one of its official "
                    "domains; affiliation is unverified.",
                    f"{named[0]} ({named[1]}); actual domain: {u.registrable_domain or u.hostname}",
                    "branding",
                )
            )
    host = u.hostname.lower()
    hosting = next(
        (domain for domain in FREE_HOSTING if host == domain or host.endswith("." + domain)),
        None,
    )
    tld = host.rsplit(".", 1)[-1] if "." in host and not u.ip_version else ""
    account_words = bool(
        set(re.findall(r"[a-z]+", unquote(u.hostname + u.path).lower())) & KEYWORDS
    )
    branded = any(e.family == "branding" for e in out)
    if hosting:
        out.append(
            item(
                "FREE_HOSTING",
                "MEANINGFUL" if branded or account_words else "WEAK",
                "Free hosting or tunnelling service",
                "Anyone can publish a page under this shared service; the parent domain's "
                "reputation does not cover this page.",
                hosting,
                "hosting",
            )
        )
    if tld in RISKY_TLDS:
        out.append(
            item(
                "HIGH_RISK_TLD",
                "MEANINGFUL" if branded or account_words else "WEAK",
                "Frequently abused domain ending",
                "This low-cost ending is over-represented in phishing reports; many sites using "
                "it are legitimate.",
                "." + tld,
                "hosting",
            )
        )
    if u.ip_version and (branded or account_words):
        out.append(
            item(
                "IP_HOST_WITH_ACCOUNT_CONTEXT",
                "MEANINGFUL",
                "Numeric address with login or brand wording",
                "Genuine banks and services use named domains for sign-in pages.",
                u.hostname,
                "authority",
            )
        )
    if is_official(u.registrable_domain):
        out.append(
            item(
                "KNOWN_OFFICIAL_DOMAIN",
                "CONTEXT",
                "Listed official domain",
                "The registrable domain is on the reviewed list of official brand domains. "
                "Pages on official domains can still be misused.",
                u.registrable_domain,
                "branding",
            )
        )
    # v4: well-known sites and registry-restricted Malaysian endings. Not applied to free-hosting
    # pages, where anyone can publish under the shared parent domain.
    if not hosting and not is_official(u.registrable_domain):
        if is_restricted_registry(u.registrable_domain):
            out.append(
                item(
                    "RESTRICTED_REGISTRY_DOMAIN",
                    "CONTEXT",
                    "Government or education domain",
                    "Only Malaysian government bodies or recognised institutions can register "
                    "this ending. Individual pages can still be misused.",
                    u.registrable_domain,
                    "reputation",
                )
            )
        elif is_popular(u.registrable_domain):
            out.append(
                item(
                    "POPULAR_DOMAIN",
                    "CONTEXT",
                    "Well-known website",
                    "The registrable domain is on a reviewed list of widely used legitimate "
                    "sites, so the host-only model is not used to raise a warning. Pages and "
                    "user content on popular sites can still be misused.",
                    u.registrable_domain,
                    "reputation",
                )
            )
    return out


# Describe userinfo/@ confusion and unusual/unencrypted transport. Related credential indicators
# share one family so they do not independently inflate fusion.
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


# Compare string lengths/depth/counts with authored thresholds and inspect encoding/entropy.
# Long random tokens may be legitimate tracking values; their values are withheld from evidence.
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


# Inspect keywords, shorteners, fragments, redirect-like query keys and download-like paths.
# Nested destinations are parsed only to bounded inert hostnames, never requested.
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
    if f["shortener"] or u.hostname.lower() in EXTRA_SHORTENERS:
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


# Extract features once, run the four detector groups and flatten their evidence in detector
# order. No learned score is calculated here.
def assess_rules(url: ParsedURL) -> list[Evidence]:
    values = features(url)
    return [evidence for detector in DETECTORS for evidence in detector(url, values)]
