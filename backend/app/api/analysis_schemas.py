from datetime import datetime
from typing import Any
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
        limit = 5000 if self.input_type == InputType.MESSAGE else 2048
        if len(self.content) > limit:
            raise ValueError("Content exceeds the input limit")
        if self.input_type == InputType.URL:
            parse_url(self.content)
        return self


class AnalysisFields(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    input_type: InputType
    status: AnalysisStatus
    created_at: datetime
    updated_at: datetime


class AnalysisDetail(AnalysisFields):
    content: str
    assessment: "AssessmentResponse | None" = None
    failure_code: str | None = None


class AnalysisSummary(AnalysisFields):
    preview: str
    risk_level: str | None = None


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


class AssessmentResponse(BaseModel):
    risk_level: str
    risk_score: float | None
    confidence_score: float | None
    confidence_level: str
    summary: str
    evidence: list[URLEvidenceResponse | EvidenceResponse]
    recommended_actions: list[str]
    components: dict[str, Any]
    limitations: list[str]
    completed_at: datetime


AnalysisDetail.model_rebuild()
