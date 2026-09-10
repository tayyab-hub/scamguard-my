from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.api.analysis_schemas import AnalysisSummary
from app.db.models import InputType


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["scamguard-api"] = "scamguard-api"
    version: str = "0.1.0"


class ReadinessResponse(BaseModel):
    status: Literal["ready"] = "ready"
    database: Literal["connected"] = "connected"
    message_intelligence: Literal["ready"] = "ready"
    url_intelligence: Literal["ready"] = "ready"
    phone_intelligence: Literal["ready"] = "ready"
    qr_intelligence: Literal["ready"] = "ready"


class DashboardResponse(BaseModel):
    # None means unavailable; zero is returned only after querying PostgreSQL.
    status: Literal["not_configured", "ready"] = "not_configured"
    total_analyses: int | None = None
    flagged_analyses: int | None = None
    last_analysis_at: datetime | None = None
    recent_analyses: list[AnalysisSummary] = []
    type_counts: dict[str, int] | None = None
    risk_counts: dict[str, int] | None = None
    unassessed_analyses: int | None = None


class CapabilitiesResponse(BaseModel):
    submission_available: bool = False
    submission_inputs: list[InputType] = []
    analysis_available: bool = False
    supported_inputs: list[InputType] = []
    reason: str = "Analysis is not enabled in this release."
