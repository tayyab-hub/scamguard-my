from datetime import datetime
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    TypeAdapter,
    field_validator,
    model_validator,
)

from app.db.models import InputType


class AnalysisCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    input_type: InputType
    content: str = Field(strict=True)

    @field_validator("content")
    @classmethod
    def trim_content(cls, value: str) -> str:
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
            try:
                parsed = urlsplit(self.content)
                if (
                    parsed.scheme not in {"http", "https"}
                    or not parsed.hostname
                    or parsed.username is not None
                    or parsed.password is not None
                    or any(char.isspace() or ord(char) < 32 for char in self.content)
                    or "\\" in self.content
                ):
                    raise ValueError("Invalid URL")
                _ = parsed.port
                TypeAdapter(AnyHttpUrl).validate_python(self.content)
            except ValueError as exc:
                raise ValueError("Use an absolute HTTP(S) URL without credentials") from exc
        return self


class AnalysisFields(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    input_type: InputType
    status: Literal["SUBMITTED"]
    created_at: datetime
    updated_at: datetime


class AnalysisDetail(AnalysisFields):
    content: str


class AnalysisSummary(AnalysisFields):
    preview: str


class AnalysisList(BaseModel):
    items: list[AnalysisSummary]
    total: int
    page: int
    page_size: int
