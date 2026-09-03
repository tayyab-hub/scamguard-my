from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.schemas import (
    CapabilitiesResponse,
    DashboardResponse,
    HealthResponse,
    ReadinessResponse,
)
from app.core.errors import ApiError
from app.db.session import get_session

router = APIRouter(prefix="/api/v1")


@router.get("/health", response_model=HealthResponse, tags=["Operations"])
def health() -> HealthResponse:
    """Liveness only. Does not assert database or analysis-service availability."""
    return HealthResponse()


@router.get("/ready", response_model=ReadinessResponse, tags=["Operations"])
def readiness(session: Annotated[Session, Depends(get_session)]) -> ReadinessResponse:
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise ApiError(503, "DATABASE_UNAVAILABLE", "Database connection is unavailable.") from exc
    return ReadinessResponse()


@router.get("/dashboard", response_model=DashboardResponse, tags=["Workspace"])
def dashboard() -> DashboardResponse:
    """An explicit unconfigured state, not a fabricated live dashboard or persisted history."""
    return DashboardResponse()


@router.get("/capabilities", response_model=CapabilitiesResponse, tags=["Workspace"])
def capabilities() -> CapabilitiesResponse:
    return CapabilitiesResponse()
