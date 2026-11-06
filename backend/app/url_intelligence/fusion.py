# Categorical URL policy (url_fusion_v3). Independent structural evidence families decide most of
# the category; the classifier now judges only the host (see engine.host_only_url) because its
# training data had no legitimate URLs with paths. No numeric URL risk score is produced.

"""Categorical decision table; ML confidence is not a scam probability."""

from app.url_intelligence.reputation import ReputationSignal
from app.url_intelligence.rules import Evidence

FUSION_VERSION = "url_fusion_v3"
HOST_MODEL_STRONG = 0.90
HOST_MODEL_LEANING = 0.50


# Probability-like model output for the PHISHING class (the classifier stores max(p, 1-p)).
def phishing_strength(classification) -> float | None:
    if classification is None:
        return None
    if classification.label == "PHISHING":
        return classification.confidence
    return 1 - classification.confidence


# HIGH needs two independent meaningful families, one meaningful family confirmed by a strongly
# phishing-like host, or an authoritative reputation match. One meaningful family, or weak
# evidence on a strongly phishing-like host, is Elevated (measured: +49 points of phishing
# detection for 0.1% of legitimate links with paths). Weak evidence alone never reaches High; a
# host the model merely leans towards phishing is Caution.
def fuse(classification, evidence: list[Evidence], reputation: ReputationSignal) -> str:
    if reputation.status == "COMPLETED" and reputation.verdict == "MALICIOUS":
        return "HIGH"
    meaningful = {e.family for e in evidence if e.severity == "MEANINGFUL"}
    weak = any(e.severity == "WEAK" for e in evidence)
    strength = phishing_strength(classification)
    strong_host = strength is not None and strength >= HOST_MODEL_STRONG
    if len(meaningful) >= 2 or (meaningful and strong_host):
        return "HIGH"
    if meaningful or (strong_host and weak):
        return "ELEVATED"
    # A reviewed official brand domain with only weak signals (login wording, a path) is not
    # warned about; the evidence still notes that official pages can be misused.
    if any(e.category == "KNOWN_OFFICIAL_DOMAIN" for e in evidence):
        return "LOW"
    if weak or (strength is not None and strength >= HOST_MODEL_LEANING):
        return "CAUTION"
    return "LOW" if classification else "INSUFFICIENT_EVIDENCE"
