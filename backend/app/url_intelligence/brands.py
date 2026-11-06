# Offline brand-impersonation detection for url_rules_v3. A reviewed list maps commonly
# impersonated Malaysian and global brands to their official registrable domains. Nothing is
# fetched: the checks compare spelling only (brand inside another domain, one-or-two-character
# look-alikes, confusable characters and an official domain hidden inside a subdomain).

"""Brand look-alike checks against a small reviewed list of official domains."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

# brand key -> (display name, tokens that name the brand, official registrable domains).
# Tokens shorter than five characters are only matched exactly, never fuzzily.
BRANDS: dict[str, tuple[str, tuple[str, ...], frozenset[str]]] = {
    "maybank": (
        "Maybank",
        ("maybank", "maybank2u"),
        frozenset({"maybank2u.com.my", "maybank.com", "maybank.com.my", "maybank2u.com"}),
    ),
    "cimb": (
        "CIMB",
        ("cimb", "cimbclicks"),
        frozenset({"cimb.com.my", "cimbclicks.com.my", "cimb.com", "cimbbank.com.my"}),
    ),
    "publicbank": (
        "Public Bank",
        ("publicbank", "pbebank"),
        frozenset({"pbebank.com", "publicbank.com.my"}),
    ),
    "rhb": ("RHB", ("rhb", "rhbgroup", "rhbbank"), frozenset({"rhbgroup.com", "rhbbank.com.my"})),
    "hongleong": (
        "Hong Leong Bank",
        ("hongleong", "hlbank", "hlb"),
        frozenset({"hlb.com.my", "hongleong.com.my"}),
    ),
    "ambank": (
        "AmBank",
        ("ambank", "ambankgroup"),
        frozenset({"ambank.com.my", "ambankgroup.com"}),
    ),
    "bankislam": ("Bank Islam", ("bankislam",), frozenset({"bankislam.com", "bankislam.com.my"})),
    "bsn": ("BSN", ("bsn", "mybsn"), frozenset({"mybsn.com.my", "bsn.com.my"})),
    "affin": (
        "Affin Bank",
        ("affinbank", "affinalways"),
        frozenset({"affinalways.com", "affinbank.com.my"}),
    ),
    "alliance": ("Alliance Bank", ("alliancebank",), frozenset({"alliancebank.com.my"})),
    "touchngo": (
        "Touch 'n Go",
        ("touchngo", "tngdigital", "tngewallet"),
        frozenset({"touchngo.com.my", "tngdigital.com.my"}),
    ),
    "boost": ("Boost", ("myboost",), frozenset({"myboost.com.my"})),
    "grab": ("Grab", ("grab", "grabpay"), frozenset({"grab.com"})),
    "shopee": ("Shopee", ("shopee",), frozenset({"shopee.com.my", "shopee.com", "shopee.sg"})),
    "lazada": ("Lazada", ("lazada",), frozenset({"lazada.com.my", "lazada.com", "lazada.sg"})),
    "pos": (
        "Pos Malaysia",
        ("poslaju", "posmalaysia"),
        frozenset({"pos.com.my", "poslaju.com.my"}),
    ),
    "jnt": ("J&T Express", ("jtexpress", "jnt"), frozenset({"jtexpress.my", "jtexpress.com"})),
    "ninjavan": ("Ninja Van", ("ninjavan",), frozenset({"ninjavan.co"})),
    "lhdn": ("LHDN / HASiL", ("lhdn", "hasil", "mytax"), frozenset({"hasil.gov.my"})),
    "kwsp": ("KWSP / EPF", ("kwsp", "epf", "iakaun"), frozenset({"kwsp.gov.my"})),
    "jpj": ("JPJ", ("jpj", "myjpj"), frozenset({"jpj.gov.my"})),
    "pdrm": ("PDRM", ("pdrm", "polis"), frozenset({"rmp.gov.my"})),
    "bnm": ("Bank Negara Malaysia", ("bnm", "banknegara"), frozenset({"bnm.gov.my"})),
    "tnb": ("TNB", ("tnb", "mytnb"), frozenset({"tnb.com.my", "mytnb.com.my"})),
    "unifi": ("Unifi / TM", ("unifi",), frozenset({"unifi.com.my", "tm.com.my"})),
    "maxis": ("Maxis", ("maxis", "hotlink"), frozenset({"maxis.com.my", "hotlink.com.my"})),
    "celcomdigi": (
        "CelcomDigi",
        ("celcom", "celcomdigi"),
        frozenset({"celcom.com.my", "digi.com.my", "celcomdigi.com"}),
    ),
    "paypal": ("PayPal", ("paypal",), frozenset({"paypal.com", "paypal.me"})),
    "microsoft": (
        "Microsoft",
        ("microsoft", "office365", "outlook", "onedrive"),
        frozenset(
            {
                "microsoft.com",
                "microsoftonline.com",
                "live.com",
                "office.com",
                "outlook.com",
                "sharepoint.com",
            }
        ),
    ),
    "apple": ("Apple", ("apple", "icloud", "appleid"), frozenset({"apple.com", "icloud.com"})),
    "google": (
        "Google",
        ("google", "gmail"),
        frozenset({"google.com", "google.com.my", "gmail.com", "youtube.com", "goo.gl"}),
    ),
    "facebook": (
        "Facebook / Meta",
        ("facebook", "instagram", "whatsapp"),
        frozenset({"facebook.com", "fb.com", "meta.com", "instagram.com", "whatsapp.com", "wa.me"}),
    ),
    "netflix": ("Netflix", ("netflix",), frozenset({"netflix.com"})),
    "amazon": ("Amazon", ("amazon",), frozenset({"amazon.com", "amazon.sg"})),
    "dhl": ("DHL", ("dhl",), frozenset({"dhl.com", "dhl.com.my"})),
    "fedex": ("FedEx", ("fedex",), frozenset({"fedex.com"})),
    "steam": (
        "Steam",
        ("steampowered", "steamcommunity"),
        frozenset({"steampowered.com", "steamcommunity.com"}),
    ),
    "binance": ("Binance", ("binance",), frozenset({"binance.com"})),
}
OFFICIAL_DOMAINS = frozenset(domain for _, _, domains in BRANDS.values() for domain in domains)

# Letters that render alike. Mapping both sides to one skeleton makes "rnaybank" and "maybank",
# or Cyrillic "раypal" and "paypal", compare equal.
_SEQUENCES = (("rn", "m"), ("vv", "w"), ("cl", "d"))
_CHARACTERS = str.maketrans(
    {
        "0": "o",
        "1": "l",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "8": "b",
        "9": "g",
        "i": "l",
        "|": "l",
        "!": "l",
        "а": "a",
        "е": "e",
        "о": "o",
        "р": "p",
        "с": "c",
        "у": "y",
        "х": "x",
        "к": "k",
        "м": "m",
        "т": "t",
        "в": "b",
        "н": "h",
        "і": "l",
        "ј": "j",
        "ѕ": "s",
        "ԁ": "d",
        "α": "a",
        "ο": "o",
        "ρ": "p",
        "ε": "e",
        "ι": "l",
        "κ": "k",
        "ν": "v",
        "τ": "t",
    }
)


def skeleton(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold().translate(_CHARACTERS)
    for sequence, replacement in _SEQUENCES:
        value = value.replace(sequence, replacement)
    return re.sub(r"[^a-z0-9]", "", value)


def edit_distance(left: str, right: str) -> int:
    """Optimal string alignment (Damerau-Levenshtein with adjacent swaps)."""
    previous2: list[int] = []
    previous = list(range(len(right) + 1))
    for i, a in enumerate(left, 1):
        current = [i] + [0] * len(right)
        for j, b in enumerate(right, 1):
            current[j] = min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a != b))
            if i > 1 and j > 1 and a == right[j - 2] and left[i - 2] == b:
                current[j] = min(current[j], previous2[j - 2] + 1)
        previous2, previous = previous, current
    return previous[-1]


@dataclass(frozen=True)
class BrandFinding:
    # BRAND_IN_UNOFFICIAL_DOMAIN, BRAND_IN_SUBDOMAIN, LOOKALIKE_DOMAIN or
    # OFFICIAL_DOMAIN_IN_SUBDOMAIN
    category: str
    brand: str
    detail: str


def is_official(registrable_domain: str | None) -> bool:
    return bool(registrable_domain) and registrable_domain in OFFICIAL_DOMAINS


# Words commonly glued to a brand in scam domains ("maybanksecure", "shopee-rebate").
SCAM_AFFIXES = frozenset(
    "secure security login signin verify verification account accounts update online my "
    "bank banking pay payment payments wallet rewards reward rebate refund refunds promo bonus "
    "claim gift support help service services helpdesk portal official auth billing confirm "
    "unlock id my2u my2 2u web app mobile semakan check track tracking parcel delivery hq "
    "malaysia my-my".split()
)


def _brand_in_label(token: str, label: str, parts: list[str]) -> bool:
    """True when a brand stands as its own part of the label or is glued to a scam affix."""
    if label == token:
        return False
    if len(parts) > 1 and token in parts:
        return True
    if len(token) < 5:
        return False
    for part in parts:
        if part == token or not part.startswith(token) and not part.endswith(token):
            continue
        rest = part[len(token) :] if part.startswith(token) else part[: -len(token)]
        if rest.isdigit() or rest in SCAM_AFFIXES:
            return True
    return False


def _fuzzy_limit(token: str) -> int:
    if len(token) < 5:
        return 0
    return 1 if len(token) < 9 else 2


def brand_findings(
    hostname: str, unicode_hostname: str, registrable_domain: str | None, subdomain: str
) -> list[BrandFinding]:
    """Return impersonation findings for a host; official registrable domains return none."""
    if not registrable_domain or is_official(registrable_domain):
        return []
    findings: list[BrandFinding] = []
    label = registrable_domain.split(".")[0]
    unicode_label = unicode_hostname.split(".")[-len(registrable_domain.split(".")) :][0]
    parts = [part for part in re.split(r"[-_]", label) if part]
    skeleton_label = skeleton(unicode_label)
    sub_parts = {part for part in re.split(r"[-_.]", subdomain) if part} - {"www"}
    seen: set[str] = set()
    for key, (name, tokens, domains) in BRANDS.items():
        detail = None
        category = None
        for official in domains:
            if f"{official}." in f"{subdomain}." or f".{official}." in f".{subdomain}.":
                category, detail = "OFFICIAL_DOMAIN_IN_SUBDOMAIN", official
                break
        if category is None:
            for token in tokens:
                if _brand_in_label(token, label, parts):
                    category, detail = "BRAND_IN_UNOFFICIAL_DOMAIN", token
                    break
                if token in sub_parts:
                    category, detail = "BRAND_IN_SUBDOMAIN", token
                    break
        if category is None:
            for token in tokens:
                limit = _fuzzy_limit(token)
                candidates = {skeleton_label, *(skeleton(part) for part in parts)}
                for candidate in candidates:
                    if not candidate or candidate in tokens and candidate == label:
                        continue
                    if candidate == skeleton(token) and candidate != label:
                        category, detail = "LOOKALIKE_DOMAIN", token
                    elif limit and abs(len(candidate) - len(token)) <= limit:
                        if 0 < edit_distance(candidate, token) <= limit:
                            category, detail = "LOOKALIKE_DOMAIN", token
                    if category:
                        break
                if category:
                    break
        if category and key not in seen:
            seen.add(key)
            findings.append(BrandFinding(category, name, detail))
    return findings
