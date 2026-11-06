# Pydantic request/response boundaries for analyses. These classes validate runtime JSON, unlike
# TypeScript types which disappear at build time. Extra request fields are forbidden; response
# classes describe saved data without executing analysis.

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationInfo,
    field_validator,
    model_validator,
)

from app.db.models import AnalysisStatus, InputType
from app.phone_intelligence.parsing import parse_phone_number
from app.qr_intelligence.decoder import validate_payload_bytes
from app.url_intelligence.parsing import parse_url


# Input contract for the shared text endpoint. input_type selects validation and content limits;
# QR uses separate image or camera endpoints.
class AnalysisCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    input_type: InputType
    content: str = Field(strict=True)

    # Validate URL/Phone raw text before trimming so hidden controls are not silently removed.
    # Return trimmed, nonempty Unicode text or raise ValueError for FastAPI's 422 handler.
    @field_validator("content")
    @classmethod
    def trim_content(cls, value: str, info: ValidationInfo) -> str:
        if info.data.get("input_type") == InputType.URL:
            parse_url(value)
        elif info.data.get("input_type") == InputType.PHONE:
            parse_phone_number(value)
        value = value.strip()
        if not value or "\x00" in value:
            raise ValueError("Content must be non-empty text")
        try:
            value.encode("utf-8")
        except UnicodeEncodeError as exc:
            raise ValueError("Content must be valid Unicode") from exc
        return value

    # Enforce modality-specific character limits after field validation and reject QR on this
    # endpoint. Reparse supported structured inputs so invalid combinations cannot reach
    # persistence.
    @model_validator(mode="after")
    def validate_input(self) -> "AnalysisCreate":
        if self.input_type == InputType.QR:
            raise ValueError("QR images must use the authenticated QR upload endpoint")
        limit = {
            InputType.MESSAGE: 5000,
            InputType.URL: 2048,
            InputType.PHONE: 64,
        }[self.input_type]
        if len(self.content) > limit:
            raise ValueError("Content exceeds the input limit")
        if self.input_type == InputType.URL:
            parse_url(self.content)
        elif self.input_type == InputType.PHONE:
            parse_phone_number(self.content)
        return self


# Common record identity and timestamps. from_attributes allows reading attributes from objects;
# it does not query or authorize access to them.
class AnalysisFields(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    input_type: InputType
    status: AnalysisStatus
    created_at: datetime
    updated_at: datetime


RiskFilter = Literal["LOW", "CAUTION", "ELEVATED", "HIGH", "INSUFFICIENT_EVIDENCE"]
HistorySort = Literal["newest", "oldest", "risk"]


# Bound filters, search text, sort and pagination from a private POST body. The service adds
# ownership separately; no user ID is accepted here.
class HistorySearch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(default="", max_length=200, strict=True)
    input_type: InputType | None = None
    risk_level: RiskFilter | None = None
    sort: HistorySort = "newest"
    page: int = Field(default=1, ge=1, le=10000)
    page_size: int = Field(default=10, ge=1, le=100)

    # Reject control characters and invalid UTF-8, then trim search text. Empty text means no
    # text filter, not an invalid search.
    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        if any(ord(char) < 32 for char in value):
            raise ValueError("Search cannot contain control characters")
        value.encode("utf-8")
        return value.strip()


# Contract for client-reported camera text and decoder identity. Character and encoded-byte
# limits both apply because Unicode characters can use several UTF-8 bytes.
class CameraQRCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    payload: str = Field(strict=True, min_length=1, max_length=5000)
    decoder: Literal["BarcodeDetector", "zxing-wasm"]

    # Reuse the backend QR byte validator so image uploads and camera text obey the same payload
    # boundary.
    @field_validator("payload")
    @classmethod
    def validate_payload(cls, value: str) -> str:
        return validate_payload_bytes(value.encode("utf-8"), 5000)


# Full owned record. assessment can be absent for historical intake or failure; failure_code
# supports diagnosis without exposing exception text.
class AnalysisDetail(AnalysisFields):
    content: str
    assessment: "AssessmentResponse | None" = None
    failure_code: str | None = None


# Small history/dashboard view, including a bounded preview and optional QR subtype; fetching it
# does not load a full assessment.
class AnalysisSummary(AnalysisFields):
    preview: str
    risk_level: str | None = None
    payload_type: str | None = None


# One page plus total count and paging metadata, allowing the UI to enable Previous/Next without
# inventing records.
class AnalysisList(BaseModel):
    items: list[AnalysisSummary]
    total: int
    page: int
    page_size: int


# Common evidence fields for Message indicators; structured URL/Phone evidence adds severity,
# explanation and family.
class EvidenceResponse(BaseModel):
    category: str
    label: str
    snippet: str
    source: str


# URL evidence contract: family groups related warnings so several descriptions need not mean
# several independent signals.
class URLEvidenceResponse(EvidenceResponse):
    severity: str
    explanation: str
    family: str


# Numbering evidence contract; metadata descriptions are not predictions from a learned fraud
# model.
class PhoneEvidenceResponse(EvidenceResponse):
    severity: str
    explanation: str
    family: str


# Shared persisted result envelope. Nullable scores preserve abstention and modalities without
# numeric estimates; component details retain engine versions and the basis of the decision.
class AssessmentResponse(BaseModel):
    risk_level: str
    risk_score: float | None
    confidence_score: float | None
    confidence_level: str
    summary: str
    evidence: list[URLEvidenceResponse | PhoneEvidenceResponse | EvidenceResponse]
    recommended_actions: list[str]
    components: dict[str, Any]
    limitations: list[str]
    completed_at: datetime


AnalysisDetail.model_rebuild()
