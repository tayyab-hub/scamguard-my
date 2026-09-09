from datetime import timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.analysis_schemas import AnalysisCreate, AnalysisDetail, AnalysisList
from app.core.auth import (
    AuthenticatedSession,
    enforce_rate_limit,
    require_authenticated_session,
    require_csrf,
)
from app.core.errors import ApiError
from app.db.session import get_session
from app.services.analyses import (
    delete_submission,
    get_submission,
    list_submissions,
    record_submission,
)


def require_persistence(request: Request) -> None:
    if not request.app.state.settings.persistence_enabled:
        raise ApiError(503, "PERSISTENCE_UNAVAILABLE", "Submission storage is unavailable.")


router = APIRouter(
    prefix="/api/v1/analyses", tags=["Submissions"], dependencies=[Depends(require_persistence)]
)
Database = Annotated[Session, Depends(get_session)]


@router.post("", response_model=AnalysisDetail, status_code=201)
def create_analysis(
    data: AnalysisCreate,
    request: Request,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_csrf)],
) -> AnalysisDetail:
    enforce_rate_limit(
        request,
        session,
        scope="analysis",
        discriminator=str(authenticated.user.id),
        limit=request.app.state.settings.analysis_rate_limit,
        window=timedelta(minutes=1),
    )
    return record_submission(
        session,
        data,
        request.app.state.message_engine,
        request.app.state.url_engine,
        authenticated.user.id,
    )


@router.get("", response_model=AnalysisList)
def analyses(
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_authenticated_session)],
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> AnalysisList:
    return list_submissions(session, page, page_size, authenticated.user.id)


@router.get("/{analysis_id}", response_model=AnalysisDetail)
def analysis_detail(
    analysis_id: UUID,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_authenticated_session)],
) -> AnalysisDetail:
    return get_submission(session, analysis_id, authenticated.user.id)


@router.delete("/{analysis_id}", status_code=204)
def analysis_delete(
    analysis_id: UUID,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_csrf)],
) -> None:
    delete_submission(session, analysis_id, authenticated.user.id)
