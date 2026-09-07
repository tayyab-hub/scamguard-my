"""Stable URL-only numeric features shared by preparation, training and inference."""

import math
import re
from collections import Counter
from urllib.parse import unquote

from app.url_intelligence.parsing import ParsedURL

FEATURE_VERSION = "url_features_v1"
KEYWORDS = frozenset(
    (
        "login verify verification secure account update wallet bank "
        "payment invoice unlock reset signin confirm"
    ).split()
)
SHORTENERS = frozenset(
    "bit.ly t.co tinyurl.com goo.gl ow.ly is.gd buff.ly rebrand.ly cutt.ly".split()
)
REDIRECT_KEYS = frozenset("url redirect redirect_uri next target continue return returnurl".split())


def entropy(value: str) -> float:
    return (
        -sum((n / len(value)) * math.log2(n / len(value)) for n in Counter(value).values())
        if value
        else 0.0
    )


def features(url: ParsedURL) -> dict[str, float]:
    value = url.normalized
    tokens = re.findall(r"[a-z]+", unquote(value).lower())
    return {
        "url_length": len(value),
        "host_length": len(url.hostname),
        "path_length": len(url.path),
        "query_length": len(url.query),
        "dots": value.count("."),
        "subdomain_count": len(url.subdomain.split(".")) if url.subdomain else 0,
        "path_depth": len([p for p in url.path.split("/") if p]),
        "query_count": len(url.parameters),
        "digit_fraction": sum(c.isdigit() for c in value) / len(value),
        "hyphens": value.count("-"),
        "percent_count": value.count("%"),
        "encoded_delimiters": len(re.findall(r"%(?:2f|3a|40|3f|26|3d|5c)", value, re.I)),
        "double_encoding": len(re.findall(r"%25[0-9a-f]{2}", value, re.I)),
        "ip_host": int(url.ip_version is not None),
        "punycode": int("xn--" in url.hostname),
        "unusual_port": int(url.port is not None and url.port not in (80, 443)),
        "https": int(url.scheme == "https"),
        "keyword_count": sum(t in KEYWORDS for t in tokens),
        "host_entropy": entropy(url.hostname),
        "path_entropy": entropy(url.path),
        "redirect_count": sum(k.lower() in REDIRECT_KEYS for k, _ in url.parameters),
        "shortener": int(url.hostname in SHORTENERS),
        "credentials": int(url.has_credentials),
        "nonstandard_host": int(url.nonstandard_host),
        "longest_token": max(map(len, re.findall(r"[a-zA-Z0-9]+", value)), default=0),
        "equals": value.count("="),
        "underscores": value.count("_"),
    }
