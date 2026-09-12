from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.schemas import (
    CapabilitiesResponse,
    DashboardResponse,
    HealthResponse,
    ReadinessResponse,
)
from app.core.auth import AuthenticatedSession, require_authenticated_session
from app.core.errors import ApiError
from app.db.models import (
    Analysis,
    AuthSession,
    InputType,
    PasswordResetToken,
    RateLimitBucket,
    User,
)
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
    if request.app.state.url_engine.classifier is None:
        raise ApiError(
            503,
            "INTELLIGENCE_UNAVAILABLE",
            "A required local intelligence model is unavailable.",
        )
    if request.app.state.phone_engine is None:
        raise ApiError(
            503,
            "INTELLIGENCE_UNAVAILABLE",
            "A required local intelligence component is unavailable.",
        )
    if request.app.state.qr_engine is None or not request.app.state.qr_engine.operational:
        raise ApiError(
            503,
            "INTELLIGENCE_UNAVAILABLE",
            "A required local intelligence component is unavailable.",
        )
    try:
        session.execute(text("SELECT 1"))
        if request.app.state.settings.persistence_enabled:
            session.execute(select(Analysis.id).limit(1))
            session.execute(select(User.id).limit(1))
            session.execute(select(AuthSession.id).limit(1))
            session.execute(select(PasswordResetToken.id).limit(1))
            session.execute(select(RateLimitBucket.key_hash).limit(1))
    except SQLAlchemyError as exc:
        raise ApiError(503, "DATABASE_UNAVAILABLE", "Database connection is unavailable.") from exc
    return ReadinessResponse()


@router.get("/dashboard", response_model=DashboardResponse, tags=["Workspace"])
def dashboard(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    authenticated: Annotated[AuthenticatedSession, Depends(require_authenticated_session)],
) -> DashboardResponse:
    if not request.app.state.settings.persistence_enabled:
        return DashboardResponse()
    records = list_submissions(session, 1, 5, authenticated.user.id)
    counts = session.execute(
        select(Analysis.input_type, Analysis.risk_level, func.count())
        .where(Analysis.user_id == authenticated.user.id)
        .group_by(Analysis.input_type, Analysis.risk_level)
    ).all()
    type_counts = {mode.value: 0 for mode in InputType}
    risk_counts = {
        risk: 0 for risk in ("LOW", "CAUTION", "ELEVATED", "HIGH", "INSUFFICIENT_EVIDENCE")
    }
    unassessed = 0
    for input_type, risk, count in counts:
        type_counts[input_type.value] += count
        if risk in risk_counts:
            risk_counts[risk] += count
        else:
            unassessed += count
    return DashboardResponse(
        status="ready",
        total_analyses=records.total,
        flagged_analyses=risk_counts["HIGH"] + risk_counts["ELEVATED"],
        last_analysis_at=records.items[0].created_at if records.items else None,
        recent_analyses=records.items,
        type_counts=type_counts,
        risk_counts=risk_counts,
        unassessed_analyses=unassessed,
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
    return CapabilitiesResponse(
        submission_available=True,
        submission_inputs=list(InputType),
        analysis_available=True,
        supported_inputs=list(InputType),
        reason=(
            "Local Message, URL, Phone and QR intelligence are available; decoded content is "
            "never automatically opened, URLs are never fetched and phone numbers are never "
            "contacted."
        ),
    )
