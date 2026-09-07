"""Conservative categorical decision table; ML confidence is not a scam probability."""

from app.url_intelligence.reputation import ReputationSignal
from app.url_intelligence.rules import Evidence

FUSION_VERSION = "url_fusion_v1"


def fuse(classification, evidence: list[Evidence], reputation: ReputationSignal) -> str:
    if reputation.status == "COMPLETED" and reputation.verdict == "MALICIOUS":
        return "HIGH"
    # Related indicators count once, so @/userinfo, length/depth/query cannot stack to High.
    meaningful = {e.family for e in evidence if e.severity == "MEANINGFUL"}
    strong_ml = (
        classification is not None
        and classification.label == "PHISHING"
        and classification.confidence >= 0.90
    )
    if len(meaningful) >= 2:
        return "HIGH" if strong_ml else "ELEVATED"
    if meaningful and strong_ml:
        return "ELEVATED"
    if evidence or (
        classification and (classification.label == "PHISHING" or classification.confidence < 0.75)
    ):
        return "CAUTION"
    return "LOW" if classification else "INSUFFICIENT_EVIDENCE"
