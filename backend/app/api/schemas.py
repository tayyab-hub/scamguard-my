from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["scamguard-my-api"] = "scamguard-my-api"
    version: str = "0.1.0"


class ReadinessResponse(BaseModel):
    status: Literal["ready"] = "ready"
    database: Literal["connected"] = "connected"


class DashboardResponse(BaseModel):
    # None means unavailable, never a measured zero. No live counters exist in Task 1.
    status: Literal["not_configured"] = "not_configured"
    total_analyses: None = None
    flagged_analyses: None = None
    last_analysis_at: None = None
    recent_analyses: list[dict[str, str]] = []


class CapabilitiesResponse(BaseModel):
    analysis_available: Literal[False] = False
    supported_inputs: list[str] = []
    reason: Literal["Analysis is not enabled in this release."] = (
        "Analysis is not enabled in this release."
    )
