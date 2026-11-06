# Extension boundary for validated URL reputation results. build_url_engine currently supplies
# no provider, so runtime returns DISABLED here. The interface is not evidence that a live
# blacklist or destination lookup is implemented.

"""Optional reputation boundary. No live adapter or network-capable client is installed here."""

from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field


# Validated status/provider/version/verdict envelope. NO_KNOWN_MATCH still cannot prove a URL
# legitimate.
class ReputationSignal(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    status: Literal["DISABLED", "UNAVAILABLE", "COMPLETED", "ERROR", "TIMEOUT", "INVALID"]
    provider: str | None = Field(default=None, max_length=80)
    version: str | None = Field(default=None, max_length=80)
    verdict: Literal["UNKNOWN", "NO_KNOWN_MATCH", "MALICIOUS"] = "UNKNOWN"


class URLReputationProvider(Protocol):
    """Future reviewed adapters must enforce a transport timeout and fixed provider endpoint."""

    # Interface for a future reviewed adapter; supplied input is normalized URL text, not
    # authorization to browse it.
    def review(self, normalized_url: str) -> ReputationSignal: ...


# Return DISABLED without a provider. Otherwise validate the returned envelope and convert
# timeout, invalid output or other failure to explicit status rather than crashing the local
# analysis.
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
