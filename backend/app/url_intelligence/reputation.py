"""Optional reputation boundary. No live adapter or network-capable client is installed here."""

from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field


class ReputationSignal(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    status: Literal["DISABLED", "UNAVAILABLE", "COMPLETED", "ERROR", "TIMEOUT", "INVALID"]
    provider: str | None = Field(default=None, max_length=80)
    version: str | None = Field(default=None, max_length=80)
    verdict: Literal["UNKNOWN", "NO_KNOWN_MATCH", "MALICIOUS"] = "UNKNOWN"


class URLReputationProvider(Protocol):
    """Future reviewed adapters must enforce a transport timeout and fixed provider endpoint."""

    def review(self, normalized_url: str) -> ReputationSignal: ...


def review(provider: URLReputationProvider | None, url: str) -> ReputationSignal:
    if provider is None:
        return ReputationSignal(status="DISABLED")
    try:
        result = ReputationSignal.model_validate(provider.review(url))
        if result.status == "COMPLETED" and (not result.provider or not result.version):
            return ReputationSignal(status="INVALID")
        if result.status != "COMPLETED" and result.verdict != "UNKNOWN":
            return ReputationSignal(status="INVALID")
        return result
    except TimeoutError:
        return ReputationSignal(status="TIMEOUT")
    except (ValueError, TypeError):
        return ReputationSignal(status="INVALID")
    except Exception:
        return ReputationSignal(status="ERROR")
