"""Persisted intake only; no detection results or risk fields."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, Enum, Index, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InputType(StrEnum):
    MESSAGE = "MESSAGE"
    URL = "URL"


class AnalysisStatus(StrEnum):
    SUBMITTED = "SUBMITTED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Analysis(Base):
    __tablename__ = "analyses"
    __table_args__ = (
        CheckConstraint("input_type IN ('MESSAGE', 'URL')", name="analysis_input_type"),
        CheckConstraint(
            "status IN ('SUBMITTED', 'PROCESSING', 'COMPLETED', 'FAILED')", name="analysis_status"
        ),
        CheckConstraint("char_length(btrim(content)) > 0", name="ck_analyses_content_nonempty"),
        CheckConstraint(
            "char_length(content) <= 5000 AND "
            "(input_type != 'URL' OR char_length(content) <= 2048)",
            name="ck_analyses_content_length",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    input_type: Mapped[InputType] = mapped_column(
        Enum(InputType, native_enum=False, name="analysis_input_type")
    )
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus, native_enum=False, name="analysis_status"),
        default=AnalysisStatus.SUBMITTED,
        server_default="SUBMITTED",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


Index("ix_analyses_created_id", Analysis.created_at.desc(), Analysis.id.desc())
