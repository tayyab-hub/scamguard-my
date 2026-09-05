from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.analysis_schemas import AnalysisCreate, AnalysisDetail, AnalysisList
from app.core.errors import ApiError
from app.db.session import get_session
from app.services.analyses import get_submission, list_submissions, record_submission


def require_persistence(request: Request) -> None:
    if not request.app.state.settings.persistence_enabled:
        raise ApiError(503, "PERSISTENCE_UNAVAILABLE", "Submission storage is unavailable.")


router = APIRouter(
    prefix="/api/v1/analyses", tags=["Submissions"], dependencies=[Depends(require_persistence)]
)
Database = Annotated[Session, Depends(get_session)]


@router.post("", response_model=AnalysisDetail, status_code=201)
def create_analysis(data: AnalysisCreate, request: Request, session: Database) -> AnalysisDetail:
    return record_submission(session, data, request.app.state.message_engine)


@router.get("", response_model=AnalysisList)
def analyses(
    session: Database,
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> AnalysisList:
    return list_submissions(session, page, page_size)


@router.get("/{analysis_id}", response_model=AnalysisDetail)
def analysis_detail(analysis_id: UUID, session: Database) -> AnalysisDetail:
    return get_submission(session, analysis_id)
