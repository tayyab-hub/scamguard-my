# Offline URL orchestration: parse text, derive structural evidence, optionally use the local
# model, apply categorical fusion and assemble explanations. Default construction installs no
# live reputation adapter and never requests the submitted destination.

import logging
from dataclasses import dataclass
from pathlib import Path

from app.url_intelligence.blocklist import PhishingFeedProvider
from app.url_intelligence.classifier import URLClassifier
from app.url_intelligence.fusion import FUSION_VERSION, fuse
from app.url_intelligence.parsing import PARSER_VERSION, parse_url
from app.url_intelligence.reputation import URLReputationProvider, review
from app.url_intelligence.rules import RULES_VERSION, assess_rules


# Persistable URL result with categorical risk, optional model confidence and a deliberately
# null risk_score. Model/rule/fusion versions support later explanation.
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


# Shared classifier/provider container. A missing classifier permits degraded structural
# analysis without inventing a model prediction.
def host_only_url(url):
    host = f"[{url.hostname}]" if url.ip_version == 6 else url.hostname
    port = f":{url.port}" if url.port else ""
    return parse_url(f"{url.scheme}://{host}{port}/")


class URLIntelligenceEngine:
    # Accept a loaded classifier or None and an optional reputation interface, enabling
    # controlled tests and explicit degraded operation.
    def __init__(
        self, classifier: URLClassifier | None, provider: URLReputationProvider | None = None
    ):
        self.classifier, self.provider = classifier, provider

    # Return URLAssessment from an input string using parser, rules, classifier and reputation
    # status. Generate actions from observed categories and preserve the boundary between model
    # confidence and advisory risk.
    def analyse(self, text: str) -> URLAssessment:
        url = parse_url(text)
        evidence = assess_rules(url)
        # url_ml_v1 learned from legitimate URLs that were all bare homepages, so any path looked
        # suspicious to it. Judging only scheme://host/ compares like with like; the path is left
        # to the structural rules.
        classification = self.classifier.predict(host_only_url(url)) if self.classifier else None
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
        if categories & {
            "BRAND_IN_UNOFFICIAL_DOMAIN",
            "BRAND_IN_SUBDOMAIN",
            "LOOKALIKE_DOMAIN",
            "OFFICIAL_DOMAIN_IN_SUBDOMAIN",
        }:
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
                    "input": "host_only",
                },
                "url_rules": {
                    "version": RULES_VERSION,
                    "indicator_count": len(evidence),
                    "status": "COMPLETED",
                },
                "reputation": reputation.model_dump(),
                "fusion": {"version": FUSION_VERSION},
                "assessment_basis": {
                    "decision": (
                        "The URL policy counts independent meaningful evidence families, such as "
                        "brand impersonation, free hosting with account wording or embedded "
                        "credentials. High risk needs two families, one family confirmed by a "
                        "strongly phishing-like host, or an authoritative reputation result."
                    ),
                    "supporting": [e.label for e in evidence if e.severity != "CONTEXT"],
                    "mitigating": [
                        "The local model favours LEGITIMATE; the website itself remains unverified."
                    ]
                    if classification and classification.label == "LEGITIMATE"
                    else [],
                    "uncertainty": [
                        "Neutral URL metadata does not increase risk by itself.",
                        "No destination was visited. "
                        + (
                            "The link was compared with a downloaded phishing list; a missing "
                            "match does not prove the site is genuine."
                            if reputation.status == "COMPLETED"
                            else "No phishing-list comparison was available for this check."
                        ),
                        *(
                            [
                                "The local model is unavailable; "
                                "this result uses structural rules only."
                            ]
                            if not classification
                            else []
                        ),
                    ],
                },
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
                    "Phishing lists only contain reported sites. A missing match does not prove "
                    "legitimacy."
                ),
            ],
            classification.model_version if classification else None,
            confidence,
            ("HIGH" if confidence >= 0.9 else "MEDIUM" if confidence >= 0.75 else "LOW")
            if confidence
            else "LOW",
        )


# Load the configured/bundled artifact. On recognized loading/validation failure, log only
# exception type and construct a rules-only engine; readiness can still report the missing
# required model.
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
    except (OSError, ValueError, KeyError, TypeError) as exc:
        logging.getLogger("scamguard.intelligence").warning(
            "event=model_unavailable engine=URL exception_type=%s", type(exc).__name__
        )
        classifier = None  # Rules remain useful; never invent a model prediction.
    # The OpenPhish feed is on by default only in production so tests and local runs stay
    # offline; PHISHING_FEED_ENABLED overrides either way.
    enabled = getattr(settings, "phishing_feed_enabled", None)
    if enabled is None:
        enabled = getattr(settings, "app_env", "development") == "production"
    provider = None
    if enabled:
        provider = PhishingFeedProvider(
            settings.phishing_feed_url, settings.phishing_feed_refresh_hours
        )
        provider.refresh_in_background()
    return URLIntelligenceEngine(classifier, provider)
