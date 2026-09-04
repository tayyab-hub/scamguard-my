from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.analysis_schemas import AnalysisCreate, AnalysisDetail, AnalysisList, AnalysisSummary
from app.core.errors import ApiError
from app.db.models import Analysis


def summary(record: Analysis) -> AnalysisSummary:
    preview = " ".join(record.content.split())
    if len(preview) > 160:
        preview = preview[:157] + "…"
    return AnalysisSummary(
        id=record.id,
        input_type=record.input_type,
        status=record.status,
        created_at=record.created_at,
        updated_at=record.updated_at,
        preview=preview,
    )


def record_submission(session: Session, data: AnalysisCreate) -> AnalysisDetail:
    record = Analysis(input_type=data.input_type, content=data.content)
    session.add(record)
    session.commit()  # get_session rolls back and closes on any exception.
    return AnalysisDetail.model_validate(record)


def list_submissions(session: Session, page: int, page_size: int) -> AnalysisList:
    total = session.scalar(select(func.count()).select_from(Analysis))
    records = session.scalars(
        select(Analysis)
        .order_by(Analysis.created_at.desc(), Analysis.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return AnalysisList(
        items=[summary(record) for record in records], total=total, page=page, page_size=page_size
    )


def get_submission(session: Session, analysis_id: UUID) -> AnalysisDetail:
    record = session.get(Analysis, analysis_id)
    if record is None:
        raise ApiError(404, "ANALYSIS_NOT_FOUND", "Submission not found.")
    return AnalysisDetail.model_validate(record)
