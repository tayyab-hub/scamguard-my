from dataclasses import dataclass
from pathlib import Path

from app.url_intelligence.classifier import URLClassifier
from app.url_intelligence.fusion import FUSION_VERSION, fuse
from app.url_intelligence.parsing import PARSER_VERSION, parse_url
from app.url_intelligence.reputation import URLReputationProvider, review
from app.url_intelligence.rules import RULES_VERSION, assess_rules


@dataclass(frozen=True)
class URLAssessment:
    risk_level: str
    summary: str
    evidence: list[dict]
    recommended_actions: list[str]
    components: dict
    limitations: list[str]
    model_version: str | None
    confidence_score: float | None
    confidence_level: str
    rules_version: str = RULES_VERSION
    fusion_version: str = FUSION_VERSION
    risk_score: None = None


class URLIntelligenceEngine:
    def __init__(
        self, classifier: URLClassifier | None, provider: URLReputationProvider | None = None
    ):
        self.classifier, self.provider = classifier, provider

    def analyse(self, text: str) -> URLAssessment:
        url = parse_url(text)
        evidence = assess_rules(url)
        classification = self.classifier.predict(url) if self.classifier else None
        reputation = review(self.provider, url.normalized)
        risk = fuse(classification, evidence, reputation)
        summaries = {
            "LOW": "No strong structural warning was found. The destination has not been verified.",
            "CAUTION": (
                "Some URL patterns warrant caution; the available evidence is limited or mixed."
            ),
            "ELEVATED": "Combined URL indicators suggest a meaningful phishing risk.",
            "HIGH": ("Strong combined URL indicators suggest high risk."),
            "INSUFFICIENT_EVIDENCE": (
                "The local model is unavailable and no useful structural warning was found."
            ),
        }
        if reputation.status == "COMPLETED" and reputation.verdict == "MALICIOUS":
            summaries["HIGH"] = "The configured reputation provider reports this URL as malicious."
        categories = {e.category for e in evidence}
        actions = ["Verify the destination through an independent trusted source before acting."]
        if categories & {"SUSPICIOUS_SUBDOMAIN_BRANDING", "BRAND_LIKE_TOKEN_MISMATCH"}:
            actions.append(
                "Access the service through its official website or app instead of this link."
            )
        if categories & {"EMBEDDED_CREDENTIALS", "SUSPICIOUS_KEYWORDS"}:
            actions.append(
                "Do not enter passwords, OTPs or payment details until the "
                "domain is independently verified."
            )
        if "HTTP_ONLY" in categories:
            actions.append("Avoid entering sensitive information over an unencrypted connection.")
        if "URL_SHORTENER" in categories:
            actions.append(
                "Verify the final destination using a trusted link-checking "
                "service before visiting."
            )
        if categories & {
            "ENCODING_OBFUSCATION",
            "REDIRECT_PARAMETER",
            "MULTIPLE_REDIRECT_PARAMETERS",
            "SUSPICIOUS_FILE_EXTENSION",
        }:
            actions.append(
                "Do not open or download from this URL until its destination "
                "is verified independently."
            )
        if risk in {"ELEVATED", "HIGH"}:
            actions.append(
                "Contact the organisation through an official channel you locate independently."
            )
        confidence = classification.confidence if classification else None
        presented = [e.to_dict() for e in evidence]
        if reputation.status == "COMPLETED" and reputation.verdict == "MALICIOUS":
            presented.append(
                {
                    "category": "REPUTATION_MATCH",
                    "severity": "MEANINGFUL",
                    "label": "Reported malicious reputation",
                    "explanation": (
                        "The configured provider returned a malicious verdict for this URL."
                    ),
                    "snippet": reputation.provider,
                    "source": "REPUTATION",
                    "family": "reputation",
                }
            )
        return URLAssessment(
            risk,
            summaries[risk],
            presented,
            actions,
            {
                "url_model": {
                    "status": "COMPLETED" if classification else "UNAVAILABLE",
                    "version": classification.model_version if classification else None,
                    "class_estimate": classification.label if classification else None,
                    "confidence": confidence,
                },
                "url_rules": {
                    "version": RULES_VERSION,
                    "indicator_count": len(evidence),
                    "status": "COMPLETED",
                },
                "reputation": reputation.model_dump(),
                "fusion": {"version": FUSION_VERSION},
                "url_structure": {
                    "parser_version": PARSER_VERSION,
                    "hostname": url.hostname,
                    "registrable_domain": url.registrable_domain,
                    "scheme": url.scheme,
                    "credentials_removed": url.has_credentials,
                    "fragment_excluded": bool(url.fragment),
                },
            },
            [
                "This assessment is advisory, not proof of safety or phishing.",
                (
                    "No website, DNS, redirect, page content or file was "
                    "fetched. HTTPS does not guarantee safety."
                ),
                (
                    "The local model uses a historical research dataset with "
                    "collection bias; confidence is uncalibrated classifier "
                    "strength, not a scam probability."
                ),
                (
                    "No live reputation provider is configured by default. A "
                    "missing match does not prove legitimacy."
                ),
            ],
            classification.model_version if classification else None,
            confidence,
            ("HIGH" if confidence >= 0.9 else "MEDIUM" if confidence >= 0.75 else "LOW")
            if confidence
            else "LOW",
        )


def build_url_engine(settings):
    path = (
        Path(settings.url_model_path)
        if settings.url_model_path
        else Path(__file__).resolve().parent / "artifacts/url_model_v1.json"
    )
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[3] / path
    try:
        classifier = URLClassifier(path)
    except (OSError, ValueError, KeyError, TypeError):
        classifier = None  # Rules remain useful; never invent a model prediction.
    return URLIntelligenceEngine(classifier)
