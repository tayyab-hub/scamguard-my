# Persistence boundary between API routes and intelligence engines. Writes save owned intake
# before analysis and then save a completed assessment or failure code. History reads stored
# results; they do not rerun models or optional providers.

import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Row, case, func, or_, select
from sqlalchemy.orm import Session

from app.api.analysis_schemas import (
    AnalysisCreate,
    AnalysisDetail,
    AnalysisList,
    AnalysisSummary,
    AssessmentResponse,
    HistorySearch,
)
from app.core.errors import ApiError
from app.db.models import Analysis, AnalysisStatus, InputType
from app.ml.engine import MessageIntelligenceEngine
from app.phone_intelligence.engine import PhoneIntelligenceEngine
from app.phone_intelligence.parsing import parse_phone_number
from app.qr_intelligence.decoder import DecodedQR
from app.qr_intelligence.engine import QRIntelligenceEngine, persisted_payload
from app.url_intelligence.engine import URLIntelligenceEngine
from app.url_intelligence.parsing import parse_url

logger = logging.getLogger("scamguard.analysis")


# Log identifiers and exception type for diagnosis without logging the submitted content or an
# exception message that might contain it.
def log_analysis_failure(record: Analysis, exc: Exception) -> None:
    # IDs correlate stored failures; exception messages may contain submitted content or secrets.
    logger.error(
        "event=analysis_failed analysis_id=%s input_type=%s exception_type=%s",
        record.id,
        record.input_type.value,
        type(exc).__name__,
    )


# Convert an ORM record or projected query row into a compact API summary. Collapse whitespace
# and cap the preview at 160 characters; full content remains available through the owned detail
# route.
def summary(record: Analysis | Row) -> AnalysisSummary:
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
        payload_type=record.payload_type,
    )


# Serialize a stored Analysis into AnalysisDetail. Only a completed row with a completion
# timestamp receives an assessment; older intake and failed rows remain representable without
# invented results.
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


# Given validated input, available engines and a trusted user ID, return a persisted
# AnalysisDetail. URL storage removes userinfo and Phone storage uses E.164; inference still
# receives the submitted content. Separate commits preserve intake if later engine work fails.
def record_submission(
    session: Session,
    data: AnalysisCreate,
    engine: MessageIntelligenceEngine,
    url_engine: URLIntelligenceEngine,
    phone_engine: PhoneIntelligenceEngine,
    user_id: UUID,
) -> AnalysisDetail:
    if data.input_type == InputType.URL:
        content = parse_url(data.content).original
    elif data.input_type == InputType.PHONE:
        content = parse_phone_number(data.content).e164
    else:
        content = data.content
    record = Analysis(input_type=data.input_type, content=content, user_id=user_id)
    session.add(record)
    session.commit()  # First durable boundary: the validated intake exists.

    record.status = AnalysisStatus.PROCESSING
    session.commit()
    try:
        selected_engine = (
            url_engine
            if data.input_type == InputType.URL
            else phone_engine
            if data.input_type == InputType.PHONE
            else engine
        )
        result = selected_engine.analyse(data.content)
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
    except Exception as exc:
        log_analysis_failure(record, exc)
        record.status = AnalysisStatus.FAILED
        record.failure_code = f"{data.input_type.value}_ANALYSIS_FAILED"
    session.commit()
    # PostgreSQL normalizes timestamptz to the connection timezone; refresh keeps POST and GET
    # representations stable across process restarts.
    session.refresh(record)
    return detail(record)


# Save credential-redacted decoded content, then assess the original DecodedQR and persist its
# derived result. This deliberately separates safe history text from original bytes needed for
# payment CRC and routing. Binary images never become database columns.
def record_qr_submission(
    session: Session,
    decoded: DecodedQR,
    qr_engine: QRIntelligenceEngine,
    user_id: UUID,
) -> AnalysisDetail:
    # The validated image has already been decoded. Persist only its text payload and derived
    # metadata; the original binary image never enters PostgreSQL.
    record = Analysis(
        input_type=InputType.QR,
        content=persisted_payload(decoded.payload),
        user_id=user_id,
    )
    session.add(record)
    session.commit()
    record.status = AnalysisStatus.PROCESSING
    session.commit()
    try:
        result = qr_engine.analyse(decoded)
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
        record.completed_at = datetime.now(UTC)
        record.failure_code = None
    except Exception as exc:
        log_analysis_failure(record, exc)
        record.status = AnalysisStatus.FAILED
        record.failure_code = "QR_ANALYSIS_FAILED"
    session.commit()
    session.refresh(record)
    return detail(record)


# Return paginated, filtered summaries for user_id. A repeatable-read transaction makes total
# and rows agree during concurrent writes. Select small summary columns instead of loading
# complete evidence JSON; sorting uses UUID as a stable tie breaker.
def list_submissions(
    session: Session,
    page: int,
    page_size: int,
    user_id: UUID,
    *,
    filters: HistorySearch | None = None,
) -> AnalysisList:
    # Keep the count and rows consistent if another request commits between them.
    # This is request-scoped: get_session closes and rolls back the read transaction.
    # This must be the first database operation on this service session. Authentication uses a
    # separate dependency session so it cannot accidentally start this read transaction at a
    # different isolation level.
    session.connection(execution_options={"isolation_level": "REPEATABLE READ"})
    conditions = [Analysis.user_id == user_id]
    order = [Analysis.created_at.desc(), Analysis.id.desc()]
    if filters:
        if filters.input_type:
            conditions.append(Analysis.input_type == filters.input_type)
        if filters.risk_level:
            conditions.append(Analysis.risk_level == filters.risk_level)
        if filters.query:
            conditions.append(
                or_(
                    # autoescape makes SQL wildcard characters in a search literal; SQLAlchemy
                    # binds values instead of concatenating user text into SQL.
                    Analysis.content.icontains(filters.query, autoescape=True),
                    Analysis.result_summary.icontains(filters.query, autoescape=True),
                )
            )
        if filters.sort == "oldest":
            order = [Analysis.created_at.asc(), Analysis.id.asc()]
        elif filters.sort == "risk":
            # Insufficient evidence is unranked, never treated as a low/safe result.
            rank = case(
                {"HIGH": 4, "ELEVATED": 3, "CAUTION": 2, "LOW": 1},
                value=Analysis.risk_level,
                else_=0,
            )
            order = [rank.desc(), *order]
    total = session.scalar(select(func.count()).select_from(Analysis).where(*conditions))
    records = session.execute(
        select(
            Analysis.id,
            Analysis.input_type,
            Analysis.status,
            Analysis.created_at,
            Analysis.updated_at,
            Analysis.content,
            Analysis.risk_level,
            Analysis.component_details["qr"]["payload_type"].as_string().label("payload_type"),
        )
        .where(*conditions)
        .order_by(*order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return AnalysisList(
        items=[summary(record) for record in records], total=total, page=page, page_size=page_size
    )


# Look up a UUID together with its owner ID and serialize its saved result. A shared not-found
# response hides whether another user owns that UUID.
def get_submission(session: Session, analysis_id: UUID, user_id: UUID) -> AnalysisDetail:
    record = session.scalar(
        select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user_id)
    )
    if record is None:
        raise ApiError(404, "ANALYSIS_NOT_FOUND", "Submission not found.")
    return detail(record)


# Find an owned row, delete it and commit. Return nothing on success; raise the same 404 for an
# absent or foreign record.
def delete_submission(session: Session, analysis_id: UUID, user_id: UUID) -> None:
    record = session.scalar(
        select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user_id)
    )
    if record is None:
        raise ApiError(404, "ANALYSIS_NOT_FOUND", "Submission not found.")
    session.delete(record)
    session.commit()
