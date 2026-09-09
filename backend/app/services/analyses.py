from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.analysis_schemas import (
    AnalysisCreate,
    AnalysisDetail,
    AnalysisList,
    AnalysisSummary,
    AssessmentResponse,
)
from app.core.errors import ApiError
from app.db.models import Analysis, AnalysisStatus, InputType
from app.ml.engine import MessageIntelligenceEngine
from app.url_intelligence.engine import URLIntelligenceEngine
from app.url_intelligence.parsing import parse_url


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
        risk_level=record.risk_level,
    )


def detail(record: Analysis) -> AnalysisDetail:
    assessment = None
    if record.status == AnalysisStatus.COMPLETED and record.completed_at is not None:
        assessment = AssessmentResponse(
            risk_level=record.risk_level,
            risk_score=record.risk_score,
            confidence_score=record.confidence_score,
            confidence_level=record.confidence_level,
            summary=record.result_summary,
            evidence=record.evidence or [],
            recommended_actions=record.recommended_actions or [],
            components=record.component_details or {},
            limitations=record.limitations or [],
            completed_at=record.completed_at,
        )
    return AnalysisDetail(
        id=record.id,
        input_type=record.input_type,
        content=record.content,
        status=record.status,
        created_at=record.created_at,
        updated_at=record.updated_at,
        assessment=assessment,
        failure_code=record.failure_code,
    )


def record_submission(
    session: Session,
    data: AnalysisCreate,
    engine: MessageIntelligenceEngine,
    url_engine: URLIntelligenceEngine,
    user_id: UUID,
) -> AnalysisDetail:
    content = parse_url(data.content).original if data.input_type == InputType.URL else data.content
    record = Analysis(input_type=data.input_type, content=content, user_id=user_id)
    session.add(record)
    session.commit()  # First durable boundary: the validated intake exists.

    record.status = AnalysisStatus.PROCESSING
    session.commit()
    try:
        result = (url_engine if data.input_type == InputType.URL else engine).analyse(data.content)
        record.status = AnalysisStatus.COMPLETED
        record.risk_level = result.risk_level
        record.risk_score = result.risk_score
        record.confidence_score = result.confidence_score
        record.confidence_level = result.confidence_level
        record.result_summary = result.summary
        record.evidence = result.evidence
        record.recommended_actions = result.recommended_actions
        record.component_details = result.components
        record.limitations = result.limitations
        record.model_version = result.model_version
        record.rules_version = result.rules_version
        record.fusion_version = result.fusion_version
        if data.input_type == InputType.MESSAGE:
            record.ai_provider = result.ai.provider
            record.ai_model = result.ai.model
            record.ai_status = result.ai.status
            record.ai_contributed = result.components["external_ai"]["contributed"]
        record.completed_at = datetime.now(UTC)
        record.failure_code = None
    except Exception:
        record.status = AnalysisStatus.FAILED
        record.failure_code = f"{data.input_type.value}_ANALYSIS_FAILED"
    session.commit()
    # PostgreSQL normalizes timestamptz to the connection timezone; refresh keeps POST and GET
    # representations stable across process restarts.
    session.refresh(record)
    return detail(record)


def list_submissions(session: Session, page: int, page_size: int, user_id: UUID) -> AnalysisList:
    # Keep the count and rows consistent if another request commits between them.
    # This is request-scoped: get_session closes and rolls back the read transaction.
    session.connection(execution_options={"isolation_level": "REPEATABLE READ"})
    total = session.scalar(
        select(func.count()).select_from(Analysis).where(Analysis.user_id == user_id)
    )
    records = session.scalars(
        select(Analysis)
        .where(Analysis.user_id == user_id)
        .order_by(Analysis.created_at.desc(), Analysis.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return AnalysisList(
        items=[summary(record) for record in records], total=total, page=page, page_size=page_size
    )


def get_submission(session: Session, analysis_id: UUID, user_id: UUID) -> AnalysisDetail:
    record = session.scalar(
        select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user_id)
    )
    if record is None:
        raise ApiError(404, "ANALYSIS_NOT_FOUND", "Submission not found.")
    return detail(record)


def delete_submission(session: Session, analysis_id: UUID, user_id: UUID) -> None:
    record = session.scalar(
        select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user_id)
    )
    if record is None:
        raise ApiError(404, "ANALYSIS_NOT_FOUND", "Submission not found.")
    session.delete(record)
    session.commit()
