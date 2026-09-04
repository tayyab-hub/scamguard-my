from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.schemas import (
    CapabilitiesResponse,
    DashboardResponse,
    HealthResponse,
    ReadinessResponse,
)
from app.core.errors import ApiError
from app.db.models import Analysis, InputType
from app.db.session import get_session
from app.services.analyses import list_submissions

router = APIRouter(prefix="/api/v1")


@router.get("/health", response_model=HealthResponse, tags=["Operations"])
def health() -> HealthResponse:
    """Liveness only. Does not assert database or analysis-service availability."""
    return HealthResponse()


@router.get("/ready", response_model=ReadinessResponse, tags=["Operations"])
def readiness(
    request: Request, session: Annotated[Session, Depends(get_session)]
) -> ReadinessResponse:
    try:
        session.execute(text("SELECT 1"))
        if request.app.state.settings.persistence_enabled:
            session.execute(select(Analysis.id).limit(1))
    except SQLAlchemyError as exc:
        raise ApiError(503, "DATABASE_UNAVAILABLE", "Database connection is unavailable.") from exc
    return ReadinessResponse()


@router.get("/dashboard", response_model=DashboardResponse, tags=["Workspace"])
def dashboard(
    request: Request, session: Annotated[Session, Depends(get_session)]
) -> DashboardResponse:
    if not request.app.state.settings.persistence_enabled:
        return DashboardResponse()
    records = list_submissions(session, 1, 5)
    return DashboardResponse(
        status="ready",
        total_analyses=records.total,
        last_analysis_at=records.items[0].created_at if records.items else None,
        recent_analyses=records.items,
    )


@router.get("/capabilities", response_model=CapabilitiesResponse, tags=["Workspace"])
def capabilities(
    request: Request, session: Annotated[Session, Depends(get_session)]
) -> CapabilitiesResponse:
    if not request.app.state.settings.persistence_enabled:
        return CapabilitiesResponse()
    try:
        session.execute(select(Analysis.id).limit(1))
    except SQLAlchemyError:
        session.rollback()
        return CapabilitiesResponse()
    return CapabilitiesResponse(submission_available=True, submission_inputs=list(InputType))
