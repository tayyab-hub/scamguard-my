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


class AnalysisCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    input_type: InputType
    content: str = Field(strict=True)

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


class AnalysisFields(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    input_type: InputType
    status: AnalysisStatus
    created_at: datetime
    updated_at: datetime


RiskFilter = Literal["LOW", "CAUTION", "ELEVATED", "HIGH", "INSUFFICIENT_EVIDENCE"]
HistorySort = Literal["newest", "oldest", "risk"]


class HistorySearch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(default="", max_length=200, strict=True)
    input_type: InputType | None = None
    risk_level: RiskFilter | None = None
    sort: HistorySort = "newest"
    page: int = Field(default=1, ge=1, le=10000)
    page_size: int = Field(default=10, ge=1, le=100)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        if any(ord(char) < 32 for char in value):
            raise ValueError("Search cannot contain control characters")
        value.encode("utf-8")
        return value.strip()


class CameraQRCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    payload: str = Field(strict=True, min_length=1, max_length=5000)
    decoder: Literal["BarcodeDetector", "zxing-wasm"]

    @field_validator("payload")
    @classmethod
    def validate_payload(cls, value: str) -> str:
        return validate_payload_bytes(value.encode("utf-8"), 5000)


class AnalysisDetail(AnalysisFields):
    content: str
    assessment: "AssessmentResponse | None" = None
    failure_code: str | None = None


class AnalysisSummary(AnalysisFields):
    preview: str
    risk_level: str | None = None
    payload_type: str | None = None


class AnalysisList(BaseModel):
    items: list[AnalysisSummary]
    total: int
    page: int
    page_size: int


class EvidenceResponse(BaseModel):
    category: str
    label: str
    snippet: str
    source: str


class URLEvidenceResponse(EvidenceResponse):
    severity: str
    explanation: str
    family: str


class PhoneEvidenceResponse(EvidenceResponse):
    severity: str
    explanation: str
    family: str


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
