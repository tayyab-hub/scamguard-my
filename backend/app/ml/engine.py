# Message orchestration and result explanation. Runs frozen local classification and
# deterministic rules, optionally requests review for ambiguous text, applies fusion, and
# produces the assessment saved by services/analyses.py. No training occurs during a request.

from __future__ import annotations

from dataclasses import dataclass, replace
from pathlib import Path

from app.core.config import Settings
from app.ml.ai_review import (
    AIReview,
    AIReviewProvider,
    AIStatus,
    GeminiReviewProvider,
    OpenAIReviewProvider,
    perform_ai_review,
)
from app.ml.classifier import MessageClassifier
from app.ml.embedded import EMBEDDED_VERSION, ORDER, EmbeddedFinding, assess_embedded, strongest
from app.ml.fusion import FusionResult, RiskLevel, calibrator, fuse, thresholds
from app.ml.rules import RuleAssessment, assess_rules


# Engine-to-service result object containing the final decision, evidence, actions, limitations
# and component versions, including optional review status.
@dataclass(frozen=True)
class MessageAssessment:
    risk_level: RiskLevel
    risk_score: float | None
    confidence_score: float | None
    confidence_level: str
    summary: str
    evidence: list[dict[str, object]]
    recommended_actions: list[str]
    components: dict[str, object]
    limitations: list[str]
    model_version: str
    rules_version: str
    fusion_version: str
    ai: AIReview


# Reusable model/provider container shared across requests. Each analyse call creates its own
# evidence and result objects.
class MessageIntelligenceEngine:
    # Accept an already-loaded classifier and optional reviewer. unavailable_ai distinguishes
    # requested-but-unavailable review from deliberately disabled review.
    def __init__(
        self,
        classifier: MessageClassifier,
        provider: AIReviewProvider | None = None,
        unavailable_ai: bool = False,
    ):
        self.classifier = classifier
        self.provider = provider
        self.unavailable_ai = unavailable_ai
        self.url_engine = None
        self.phone_engine = None

    # Share the app's URL and Phone engines so links and numbers written inside a message are
    # assessed with the same offline policy as direct URL/Phone submissions.
    def attach_engines(self, url_engine, phone_engine) -> None:
        self.url_engine = url_engine
        self.phone_engine = phone_engine

    # Given message text, run local components and review only eligible ambiguous cases when a
    # provider exists. Fuse outputs and return a presentation-ready MessageAssessment; provider
    # failures are converted to status by perform_ai_review.
    def analyse(self, text: str) -> MessageAssessment:
        classification = self.classifier.predict(text)
        embedded = assess_embedded(text, self.url_engine, self.phone_engine)
        trusted = tuple(f.source for f in embedded if f.kind == "LINK" and f.trusted and f.source)
        rules = assess_rules(text, trusted)
        ambiguous = classification.confidence < 0.78 or (
            classification.label == "LEGITIMATE" and rules.score >= 0.25
        )
        if self.provider is None:
            ai = AIReview(status=AIStatus.UNAVAILABLE if self.unavailable_ai else AIStatus.DISABLED)
        elif ambiguous:
            ai = perform_ai_review(self.provider, text)
        else:
            ai = AIReview(
                status=AIStatus.NOT_NEEDED,
                provider=self.provider.provider_name,
                model=self.provider.model_name,
            )
        result = fuse(text, classification, rules, ai)
        result = self._apply_embedded(result, embedded)
        result = self._official_channel(result, rules, embedded)
        return self._present(classification, rules, ai, result, embedded)

    # A risky link or number inside the message raises the Message category to the same level;
    # it never lowers the text assessment.
    @staticmethod
    def _apply_embedded(result: FusionResult, embedded: list[EmbeddedFinding]) -> FusionResult:
        # Links raise the message only at Elevated/High: a Caution link usually reflects the
        # host-only model's weak leaning. Numbers raise it from Caution (risky number types).
        raising = [
            f
            for f in embedded
            if (f.kind == "LINK" and f.risk_level in {"ELEVATED", "HIGH"})
            or (f.kind == "PHONE" and f.risk_level in {"CAUTION", "ELEVATED", "HIGH"})
        ]
        top = strongest(raising)
        if top is None:
            return result
        if ORDER.index(top.risk_level) <= ORDER.index(str(result.risk_level)):
            return result
        floor = thresholds()[top.risk_level]
        return replace(
            result,
            risk_level=RiskLevel(top.risk_level),
            risk_score=round(max(result.risk_score or 0.0, floor), 4),
            reason="EMBEDDED_LINK" if top.kind == "LINK" else "EMBEDDED_PHONE",
        )

    # A notice whose only way to act is a recognised official site, with no phone number, no
    # other link and no request, threat, deadline or other tactic, gives a scammer nothing to
    # gain. The model's resemblance to scam wording is then capped: below Caution when the rules
    # found at most a sender name or delivery wording, at Caution when money words also appear.
    @staticmethod
    def _official_channel(
        result: FusionResult, rules: RuleAssessment, embedded: list[EmbeddedFinding]
    ) -> FusionResult:
        links = [f for f in embedded if f.kind == "LINK"]
        if (
            not links
            or not all(f.trusted for f in links)
            or any(f.kind == "PHONE" for f in embedded)
            or result.risk_score is None
            or result.reason not in {"CALIBRATED_SIGNALS", "UNCORROBORATED_MODEL", "LIKELY_SPAM"}
        ):
            return result
        categories = {indicator.category for indicator in rules.indicators}
        bands = thresholds()
        if categories <= {"IMPERSONATION", "DELIVERY_ACCOUNT"}:
            cap, level = bands["CAUTION"] - 0.0001, RiskLevel.LOW
        elif categories <= {"IMPERSONATION", "DELIVERY_ACCOUNT", "FINANCIAL"}:
            cap, level = bands["ELEVATED"] - 0.0001, RiskLevel.CAUTION
        else:
            return result
        if result.risk_score <= cap:
            return result
        return replace(
            result,
            risk_level=level,
            risk_score=round(cap, 4),
            reason="OFFICIAL_CHANNEL_NOTICE",
        )

    # Turn component evidence and FusionResult into user-readable reasons/actions plus saved
    # audit metadata. Model class estimates remain separate from the final category and do not
    # verify sender identity.
    @staticmethod
    def _present(
        classification,
        rules: RuleAssessment,
        ai: AIReview,
        result: FusionResult,
        embedded: list[EmbeddedFinding] | None = None,
    ):
        embedded = embedded or []
        evidence = [
            {
                "category": indicator.category,
                "label": indicator.label,
                "snippet": indicator.snippet,
                "source": "DETERMINISTIC_RULE",
            }
            for indicator in rules.indicators
        ]
        if ai.contributed:
            evidence.extend(
                {
                    "category": "CONTEXT",
                    "label": "Contextual review observation",
                    "snippet": snippet,
                    "source": "EXTERNAL_AI",
                }
                for snippet in ai.evidence_snippets
            )
        for finding in embedded:
            noun = "Link" if finding.kind == "LINK" else "Phone number"
            level = finding.risk_level.replace("_", " ").lower()
            reasons = "; ".join(finding.labels[:3]) or "no structural warning"
            evidence.append(
                {
                    "category": "EMBEDDED_" + finding.kind,
                    "label": f"{noun} in the message: {level}",
                    "snippet": f"{finding.shown} — {reasons}"
                    + (f" ({finding.assumed})" if finding.assumed else ""),
                    "source": "EMBEDDED_URL" if finding.kind == "LINK" else "EMBEDDED_PHONE",
                }
            )
        if result.risk_level == RiskLevel.INSUFFICIENT_EVIDENCE:
            summary = {
                "OUT_OF_VOCABULARY": (
                    "The local model has no vocabulary evidence for this text, "
                    "and local rules are insufficient."
                ),
                "AMBIGUOUS_MODEL": (
                    "The model is uncertain and local rules provide too little corroboration "
                    "for a meaningful assessment."
                ),
            }.get(
                result.reason,
                "The message is too short or context-poor for a meaningful risk assessment.",
            )
            actions = ["Ask for more context before acting on the message."]
        elif result.risk_level == RiskLevel.LOW:
            # Absence of known patterns is not proof of safety: many scams read like ordinary
            # chat, so the wording says what was (not) found rather than calling it safe.
            summary = (
                "No known scam pattern was found in this text. That does not confirm the "
                "message or sender is genuine."
            )
            actions = [
                "If it asks for money, codes, personal details or a move to another app, "
                "verify the sender through a contact you already trust."
            ]
        elif result.risk_level == RiskLevel.CAUTION:
            summary = (
                "A common scam tactic or limited warning evidence was found. Verify before "
                "you reply."
                if result.reason in {"SOCIAL_ENGINEERING_CUE", "LIKELY_SPAM"}
                else "Some patterns warrant caution, but the evidence is limited or mixed."
            )
            if result.reason == "LIKELY_SPAM":
                summary = "This looks like unsolicited marketing. Treat offers and links with care."
            actions = ["Pause and verify the sender independently before responding."]
        elif result.risk_level == RiskLevel.ELEVATED:
            summary = "Multiple indicators suggest a meaningful social-engineering risk."
            actions = ["Pause and verify the request through an independent trusted channel."]
        else:
            summary = "Strong combined indicators suggest a high social-engineering risk."
            actions = ["Do not act on this request until independently verified."]
        categories = {item.category for item in rules.indicators}
        if "CREDENTIAL" in categories:
            actions.append("Do not share passwords, PINs or one-time verification codes.")
        if categories & {"FINANCIAL", "INVESTMENT", "PRIZE"}:
            actions.append("Do not transfer funds or pay a fee based only on this message.")
        if "REDIRECTION" in categories:
            actions.append(
                "Do not open the supplied link; locate the official website independently."
            )
        if "IMPERSONATION" in categories:
            actions.append(
                "Contact the claimed organisation using an official channel you locate yourself."
            )
        if "SECRECY" in categories or "DISCREET_REQUEST" in categories:
            actions.append("Discuss the request with someone you trust before acting.")
        if "IDENTITY_CHANGE" in categories:
            actions.append(
                "Call the person on the number you already have saved before replying or "
                "sending anything."
            )
        if "UNSOLICITED_CONTACT" in categories:
            actions.append(
                "Do not continue a chat with an unknown contact who starts a friendly "
                "conversation out of nowhere."
            )
        if "PLATFORM_SHIFT" in categories:
            actions.append("Be wary of anyone who asks to move the conversation to another app.")
        if categories & {"IRREVERSIBLE_PAYMENT", "MONEY_REQUEST"}:
            actions.append(
                "Gift cards, crypto and transfers to new accounts are hard to recover; "
                "never pay based only on a message."
            )
        if "UNSOLICITED_OFFER" in categories:
            actions.append(
                "Genuine employers and investments do not recruit by unsolicited messages "
                "promising daily pay or guaranteed profit."
            )
        if "PERSONAL_DATA" in categories:
            actions.append("Do not send IC, bank or card details in reply to a message.")
        for finding in embedded:
            if finding.risk_level in {"CAUTION", "ELEVATED", "HIGH"}:
                for action in finding.actions[:2]:
                    if action not in actions:
                        actions.append(action)
        supporting = [item.label for item in rules.indicators]
        supporting.extend(
            f"{'Link' if f.kind == 'LINK' else 'Phone number'} {f.shown} assessed as "
            f"{f.risk_level.replace('_', ' ').lower()} by the offline "
            f"{'URL' if f.kind == 'LINK' else 'Phone'} check"
            for f in embedded
            if f.risk_level in {"CAUTION", "ELEVATED", "HIGH"}
        )
        if classification.label == "SCAM" and classification.matched_features:
            supporting.append(
                "The local model favours the SCAM class; this alone cannot establish fraud."
            )
        mitigating = []
        if classification.label == "LEGITIMATE" and classification.matched_features:
            mitigating.append(
                "The local model favours LEGITIMATE; this does not verify the sender."
            )
        for finding in embedded:
            if finding.kind == "LINK" and finding.trusted:
                mitigating.append(
                    f"Link {finding.shown} is a recognised official or well-known site "
                    "(checked offline, not opened)."
                )
        if rules.suppressed_matches:
            mitigating.append(
                "Protective wording caused local rule matches to be discounted within their clause."
            )
        uncertainty = [
            "The risk score is calibrated on held-out historical SMS data: it estimates how "
            "often similar messages there were scams. It is not a guarantee for this message.",
            "Model confidence is a separate, uncalibrated signal strength.",
        ]
        if result.reason in {"TACTIC_PLAYBOOK", "SOCIAL_ENGINEERING_CUE", "STRONG_LOCAL_EVIDENCE"}:
            uncertainty.append(
                "A documented scam tactic raised the score to its category minimum; that "
                "minimum is a policy floor, not a measured rate."
            )
        if result.disagreement:
            uncertainty.append(
                "Model and rule signals disagree. Confidence is capped at low "
                "while strong warnings remain visible."
            )
        if not classification.matched_features:
            uncertainty.append(
                "No trained vocabulary features matched. "
                "The model's prior alone is not usable evidence."
            )
        decisions = {
            "OUT_OF_VOCABULARY": (
                "Insufficient evidence: no model vocabulary matched and rule evidence is weak."
            ),
            "LIMITED_TEXT": (
                "Insufficient evidence: the text is too short for a contextual assessment."
            ),
            "AMBIGUOUS_MODEL": (
                "Insufficient evidence: an uncertain model is not corroborated by local rules."
            ),
            "CALIBRATED_SIGNALS": (
                "A calibrator learned from held-out data combines the model's class estimates "
                "with local rule evidence; fixed score bands set the category."
            ),
            "TACTIC_PLAYBOOK": (
                "A documented scam playbook was detected (for example a new-number claim with a "
                "money request, or an unsolicited offer that moves to another app)."
            ),
            "SOCIAL_ENGINEERING_CUE": (
                "A conversational scam tactic was detected. Messages like this are not treated "
                "as safe even without classic warning words."
            ),
            "EMBEDDED_LINK": (
                "A link written in the message was checked offline with the URL engine and its "
                "warning raised the result; the link was not opened."
            ),
            "EMBEDDED_PHONE": (
                "A phone number written in the message was checked with the Phone engine and its "
                "warning raised the result; the number was not contacted."
            ),
            "PROTECTIVE_NOTICE": (
                "The text warns the reader not to share or act and asks for nothing, which is "
                "typical of genuine notices; the warning is capped at Caution."
            ),
            "OFFICIAL_CHANNEL_NOTICE": (
                "The only way to act on this text is a recognised official site, and it asks for "
                "no reply, call, details or payment elsewhere; the model's resemblance to scam "
                "wording is capped. Type the address yourself rather than trusting the sender."
            ),
            "SERVICE_NOTICE": (
                "The text reads like a service notice that points to a channel you already "
                "have and asks for no link, details or payment; the warning is capped at Caution."
            ),
            "LIKELY_SPAM": (
                "The model considers this unsolicited marketing; spam is not the same as fraud."
            ),
            "STRONG_LOCAL_EVIDENCE": (
                "Several local indicators meet the strong-evidence policy. "
                "Their risk floor cannot be reduced by optional AI review."
            ),
            "UNCORROBORATED_MODEL": (
                "A model-only warning is capped below High because no local indicator "
                "corroborates it."
            ),
            "COMBINED_SIGNALS": (
                "The versioned policy combines model and local rule signals, "
                "with bounded optional contextual corroboration."
            ),
        }
        probabilities = {
            key: round(value, 4) for key, value in classification.probabilities.items()
        }
        return MessageAssessment(
            risk_level=result.risk_level,
            risk_score=result.risk_score,
            confidence_score=result.confidence_score,
            confidence_level=result.confidence_level,
            summary=summary,
            evidence=evidence,
            recommended_actions=actions,
            components={
                "local_model": {
                    "used": True,
                    "version": classification.model_version,
                    "class_estimate": classification.label,
                    "class_probabilities": probabilities,
                    "confidence": round(classification.confidence, 4),
                    "matched_features": classification.matched_features,
                },
                "deterministic_rules": {
                    "used": True,
                    "version": rules.version,
                    "score": round(rules.score, 4),
                    "indicator_count": len(rules.indicators),
                    "contextual_suppressions": rules.suppressed_matches,
                    "normalization_applied": rules.normalization_applied,
                },
                "external_ai": {
                    "status": ai.status,
                    "provider": ai.provider,
                    "model": ai.model,
                    "contributed": result.ai_contributed,
                },
                "fusion": {
                    "version": result.version,
                    "reason": result.reason,
                    "disagreement": result.disagreement,
                },
                "embedded_checks": {
                    "version": EMBEDDED_VERSION,
                    "items": [
                        {"kind": f.kind, "shown": f.shown, "risk_level": f.risk_level}
                        for f in embedded
                    ],
                },
                "assessment_basis": {
                    "decision": decisions[result.reason],
                    "supporting": supporting,
                    "mitigating": mitigating,
                    "uncertainty": uncertainty,
                },
            },
            limitations=[
                "This is decision support, not proof that a message or sender is safe or "
                "fraudulent.",
                "The local model learned from an imbalanced, mainly English historical SMS "
                "dataset, machine translations of it into Malay and Manglish, and written "
                "examples of notices; real messages can differ.",
                "Links and phone numbers in the text are checked offline for structure only; "
                "they are never opened or contacted. Identities and claims are not verified.",
                "The risk score is calibrated on historical SMS data, not on this sender; "
                "new scam styles may differ.",
                "Some scams read exactly like a genuine message. Without knowing the sender, "
                "text alone cannot prove a message is safe.",
            ],
            model_version=classification.model_version,
            rules_version=rules.version,
            fusion_version=result.version,
            ai=ai,
        )


# Locate the reviewed artifact, initialize its classifier and optionally construct the
# configured OpenAI reviewer. Model loading failures propagate to startup; no replacement
# artifact is downloaded.
def build_message_engine(settings: Settings) -> MessageIntelligenceEngine:
    artifact_path = (
        Path(settings.message_model_path)
        if settings.message_model_path
        else Path(__file__).resolve().parent / "artifacts/message_tfidf_v3.json"
    )
    if settings.message_model_path and not artifact_path.is_absolute():
        artifact_path = Path(__file__).resolve().parents[3] / artifact_path
    classifier = MessageClassifier(artifact_path)
    # Verify the checksum-pinned fusion calibrator at startup, not on the first analysis: a bad
    # artifact must stop the deploy at the health check instead of failing every submission.
    calibrator()
    provider = None
    if settings.ai_review_enabled:
        if settings.ai_review_provider == "gemini" and settings.gemini_api_key:
            provider = GeminiReviewProvider(
                settings.gemini_api_key.get_secret_value(),
                settings.gemini_model,
                settings.ai_timeout_seconds,
            )
        elif settings.ai_review_provider == "openai" and settings.openai_api_key:
            provider = OpenAIReviewProvider(
                settings.openai_api_key.get_secret_value(),
                settings.openai_model,
                settings.ai_timeout_seconds,
            )
    return MessageIntelligenceEngine(
        classifier,
        provider,
        unavailable_ai=settings.ai_review_enabled and provider is None,
    )
