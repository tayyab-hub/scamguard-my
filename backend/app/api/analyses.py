# Authenticated submission and private-history HTTP routes. FastAPI validates request schemas
# and resolves Depends before calling these handlers; services/analyses.py owns persistence and
# engine selection. Ownership always comes from the validated session, never a client-supplied
# user ID.

from datetime import timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.api.analysis_schemas import (
    AnalysisCreate,
    AnalysisDetail,
    AnalysisList,
    CameraQRCreate,
    HistorySearch,
)
from app.core.auth import (
    AuthenticatedSession,
    enforce_rate_limit,
    require_authenticated_session,
    require_csrf,
)
from app.core.errors import ApiError
from app.db.session import get_session
from app.qr_intelligence.decoder import (
    DecodedQR,
    QRImageError,
    decode_qr_image,
    validate_payload_bytes,
)
from app.services.analyses import (
    delete_submission,
    get_submission,
    list_submissions,
    record_qr_submission,
    record_submission,
)


# Reject all routes in this router with 503 when storage is disabled; the UI having an Analyse
# button does not imply the backend can save submissions.
def require_persistence(request: Request) -> None:
    if not request.app.state.settings.persistence_enabled:
        raise ApiError(503, "PERSISTENCE_UNAVAILABLE", "Submission storage is unavailable.")


router = APIRouter(
    prefix="/api/v1/analyses", tags=["Submissions"], dependencies=[Depends(require_persistence)]
)
# Annotated attaches dependency metadata to a Python type. FastAPI supplies a SQLAlchemy Session
# and closes it after the request; callers do not construct it themselves.
Database = Annotated[Session, Depends(get_session)]


# Accept validated Message, URL or Phone content, charge the authenticated user's analysis
# budget, and return the saved detail with HTTP 201. require_csrf combines session
# authentication, exact Origin and token checks.
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
        request.app.state.phone_engine,
        authenticated.user.id,
    )


# Accept exactly one multipart image, read at most the byte limit plus one, and close uploads on
# both success and failure. Decode/validate before creating a record, so invalid images produce
# 422 without a saved analysis.
@router.post("/qr", response_model=AnalysisDetail, status_code=201)
def create_qr_analysis(
    request: Request,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_csrf)],
    file: Annotated[list[UploadFile], File(description="One PNG, JPEG or WebP QR image")],
) -> AnalysisDetail:
    enforce_rate_limit(
        request,
        session,
        scope="analysis",
        discriminator=str(authenticated.user.id),
        limit=request.app.state.settings.analysis_rate_limit,
        window=timedelta(minutes=1),
    )
    if len(file) != 1:
        for upload in file:
            upload.file.close()
        raise ApiError(422, "QR_FILE_COUNT_INVALID", "Upload exactly one QR image.")
    upload = file[0]
    declared_mime = upload.content_type
    try:
        data = upload.file.read(request.app.state.settings.qr_max_upload_bytes + 1)
    finally:
        upload.file.close()
    try:
        decoded = decode_qr_image(
            data,
            declared_mime,
            max_upload_bytes=request.app.state.settings.qr_max_upload_bytes,
            max_dimension=request.app.state.settings.qr_max_dimension,
            max_pixels=request.app.state.settings.qr_max_pixels,
            max_payload_bytes=request.app.state.settings.qr_max_payload_bytes,
        )
    except QRImageError as exc:
        raise ApiError(422, exc.code, exc.message) from exc
    return record_qr_submission(
        session,
        decoded,
        request.app.state.qr_engine,
        authenticated.user.id,
    )


# Return a bounded page of summaries belonging to the authenticated user. Query validation
# limits page size and offset; the service keeps count and rows in one read snapshot.
@router.get("", response_model=AnalysisList)
def analyses(
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_authenticated_session)],
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> AnalysisList:
    return list_submissions(session, page, page_size, authenticated.user.id)


# Return owned history matching a validated JSON filter object. Although read-only, this POST
# requires CSRF and keeps private search text out of the request URL.
@router.post("/search", response_model=AnalysisList)
def search_analyses(
    data: HistorySearch,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_csrf)],
) -> AnalysisList:
    # Search text belongs in the body, not in access-log URLs or browser history.
    return list_submissions(session, data.page, data.page_size, authenticated.user.id, filters=data)


# Accept already-decoded browser text and validate its UTF-8 byte length again. Return a saved
# QR assessment with CAMERA provenance and null image fields: the server has not seen or
# verified camera frames.
@router.post("/qr/payload", response_model=AnalysisDetail, status_code=201)
def create_camera_qr_analysis(
    data: CameraQRCreate,
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
    try:
        validate_payload_bytes(
            data.payload.encode("utf-8"), request.app.state.settings.qr_max_payload_bytes
        )
    except QRImageError as exc:
        raise ApiError(422, exc.code, exc.message) from exc
    decoded = DecodedQR(
        payload=data.payload,
        payload_bytes=len(data.payload.encode("utf-8")),
        file_sha256=None,
        image_format=None,
        width=None,
        height=None,
        decoder_library=data.decoder,
        decoder_version="client-reported",
        source="CAMERA",
    )
    return record_qr_submission(
        session, decoded, request.app.state.qr_engine, authenticated.user.id
    )


# Read one UUID only within the current user's records. Missing and foreign IDs share the same
# 404, so knowing an ID does not grant access.
@router.get("/{analysis_id}", response_model=AnalysisDetail)
def analysis_detail(
    analysis_id: UUID,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_authenticated_session)],
) -> AnalysisDetail:
    return get_submission(session, analysis_id, authenticated.user.id)


# Delete one owned analysis after CSRF validation; success has HTTP 204 and no response body.
# The service commits the deletion explicitly.
@router.delete("/{analysis_id}", status_code=204)
def analysis_delete(
    analysis_id: UUID,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_csrf)],
) -> None:
    delete_submission(session, analysis_id, authenticated.user.id)
