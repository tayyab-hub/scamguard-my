from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.api.analysis_schemas import AnalysisSummary
from app.db.models import InputType


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["scamguard-my-api"] = "scamguard-my-api"
    version: str = "0.1.0"


class ReadinessResponse(BaseModel):
    status: Literal["ready"] = "ready"
    database: Literal["connected"] = "connected"


class DashboardResponse(BaseModel):
    # None means unavailable; zero is returned only after querying PostgreSQL.
    status: Literal["not_configured", "ready"] = "not_configured"
    total_analyses: int | None = None
    flagged_analyses: None = None
    last_analysis_at: datetime | None = None
    recent_analyses: list[AnalysisSummary] = []


class CapabilitiesResponse(BaseModel):
    submission_available: bool = False
    submission_inputs: list[InputType] = []
    analysis_available: Literal[False] = False
    supported_inputs: list[str] = []
    reason: Literal["Analysis is not enabled in this release."] = (
        "Analysis is not enabled in this release."
    )
