"""Persisted analysis intake and additive Task 3 message-assessment fields."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InputType(StrEnum):
    MESSAGE = "MESSAGE"
    URL = "URL"
    PHONE = "PHONE"


class AnalysisStatus(StrEnum):
    SUBMITTED = "SUBMITTED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("email = lower(email)", name="ck_users_email_normalized"),)

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    csrf_token_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RateLimitBucket(Base):
    __tablename__ = "auth_rate_limits"

    key_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    scope: Mapped[str] = mapped_column(String(32))
    window_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    request_count: Mapped[int] = mapped_column(default=1)


class Analysis(Base):
    __tablename__ = "analyses"
    __table_args__ = (
        CheckConstraint("input_type IN ('MESSAGE', 'URL', 'PHONE')", name="analysis_input_type"),
        CheckConstraint(
            "status IN ('SUBMITTED', 'PROCESSING', 'COMPLETED', 'FAILED')", name="analysis_status"
        ),
        CheckConstraint("char_length(btrim(content)) > 0", name="ck_analyses_content_nonempty"),
        CheckConstraint(
            "char_length(content) <= 5000 AND "
            "(input_type != 'URL' OR char_length(content) <= 2048) AND "
            "(input_type != 'PHONE' OR char_length(content) <= 64)",
            name="ck_analyses_content_length",
        ),
        CheckConstraint(
            "risk_level IS NULL OR risk_level IN "
            "('LOW','CAUTION','ELEVATED','HIGH','INSUFFICIENT_EVIDENCE')",
            name="ck_analyses_risk_level",
        ),
        CheckConstraint(
            "confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)",
            name="ck_analyses_confidence",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
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
    risk_level: Mapped[str | None] = mapped_column(String(32))
    risk_score: Mapped[float | None] = mapped_column(Float)
    confidence_score: Mapped[float | None] = mapped_column(Float)
    confidence_level: Mapped[str | None] = mapped_column(String(10))
    result_summary: Mapped[str | None] = mapped_column(Text)
    evidence: Mapped[list[dict[str, object]] | None] = mapped_column(JSON)
    recommended_actions: Mapped[list[str] | None] = mapped_column(JSON)
    component_details: Mapped[dict[str, object] | None] = mapped_column(JSON)
    limitations: Mapped[list[str] | None] = mapped_column(JSON)
    model_version: Mapped[str | None] = mapped_column(String(80))
    rules_version: Mapped[str | None] = mapped_column(String(80))
    fusion_version: Mapped[str | None] = mapped_column(String(80))
    ai_provider: Mapped[str | None] = mapped_column(String(40))
    ai_model: Mapped[str | None] = mapped_column(String(80))
    ai_status: Mapped[str | None] = mapped_column(String(24))
    ai_contributed: Mapped[bool | None] = mapped_column(Boolean)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failure_code: Mapped[str | None] = mapped_column(String(80))


Index("ix_analyses_created_id", Analysis.created_at.desc(), Analysis.id.desc())
Index(
    "ix_analyses_user_created_id",
    Analysis.user_id,
    Analysis.created_at.desc(),
    Analysis.id.desc(),
)
