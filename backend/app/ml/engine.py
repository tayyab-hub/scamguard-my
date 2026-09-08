from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.core.config import Settings
from app.ml.ai_review import (
    AIReview,
    AIReviewProvider,
    AIStatus,
    OpenAIReviewProvider,
    perform_ai_review,
)
from app.ml.classifier import MessageClassifier
from app.ml.fusion import FusionResult, RiskLevel, fuse
from app.ml.rules import RuleAssessment, assess_rules


@dataclass(frozen=True)
class MessageAssessment:
    risk_level: RiskLevel
    risk_score: float | None
    confidence_score: float
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


class MessageIntelligenceEngine:
    def __init__(
        self,
        classifier: MessageClassifier,
        provider: AIReviewProvider | None = None,
        unavailable_ai: bool = False,
    ):
        self.classifier = classifier
        self.provider = provider
        self.unavailable_ai = unavailable_ai

    def analyse(self, text: str) -> MessageAssessment:
        classification = self.classifier.predict(text)
        rules = assess_rules(text)
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
        return self._present(classification, rules, ai, result)

    @staticmethod
    def _present(classification, rules: RuleAssessment, ai: AIReview, result: FusionResult):
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
        if result.risk_level == RiskLevel.INSUFFICIENT_EVIDENCE:
            summary = "The message is too short or context-poor for a meaningful risk assessment."
            actions = ["Ask for more context before acting on the message."]
        elif result.risk_level == RiskLevel.LOW:
            summary = "No strong social-engineering pattern was found in the available text."
            actions = ["Confirm unexpected requests through an independent contact channel."]
        elif result.risk_level == RiskLevel.CAUTION:
            summary = "Some patterns warrant caution, but the evidence is limited or mixed."
            actions = ["Pause and verify the sender independently before responding."]
        elif result.risk_level == RiskLevel.ELEVATED:
            summary = "Multiple indicators suggest a meaningful social-engineering risk."
            actions = ["Do not follow links or share credentials until independently verified."]
        else:
            summary = "Strong combined indicators suggest a high social-engineering risk."
            actions = [
                "Do not send money, credentials or verification codes.",
                "Contact the claimed organisation using an official channel you locate yourself.",
            ]
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
                },
                "deterministic_rules": {
                    "used": True,
                    "version": rules.version,
                    "score": round(rules.score, 4),
                    "indicator_count": len(rules.indicators),
                    "contextual_suppressions": rules.suppressed_matches,
                },
                "external_ai": {
                    "status": ai.status,
                    "provider": ai.provider,
                    "model": ai.model,
                    "contributed": result.ai_contributed,
                },
                "fusion": {"version": result.version},
            },
            limitations=[
                "This is decision support, not proof that a message or sender is safe or "
                "fraudulent.",
                "The local model was evaluated on an imbalanced, mainly English historical "
                "SMS dataset.",
                "Links, phone numbers, identities and external claims were not checked.",
            ],
            model_version=classification.model_version,
            rules_version=rules.version,
            fusion_version=result.version,
            ai=ai,
        )


def build_message_engine(settings: Settings) -> MessageIntelligenceEngine:
    artifact_path = (
        Path(settings.message_model_path)
        if settings.message_model_path
        else Path(__file__).resolve().parent / "artifacts/message_tfidf_v1.json"
    )
    if settings.message_model_path and not artifact_path.is_absolute():
        artifact_path = Path(__file__).resolve().parents[3] / artifact_path
    classifier = MessageClassifier(artifact_path)
    provider = None
    if settings.ai_review_enabled and settings.openai_api_key:
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
