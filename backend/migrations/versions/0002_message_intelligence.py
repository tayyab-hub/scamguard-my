"""Add persisted Task 3 message assessment fields without changing Task 2 records.

Revision ID: 0002_message_intelligence
Revises: 0001_analysis_intake
"""

import sqlalchemy as sa
from alembic import op

revision = "0002_message_intelligence"
down_revision = "0001_analysis_intake"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for column in (
        sa.Column("risk_level", sa.String(32), nullable=True),
        sa.Column("risk_score", sa.Float(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("confidence_level", sa.String(10), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("evidence", sa.JSON(), nullable=True),
        sa.Column("recommended_actions", sa.JSON(), nullable=True),
        sa.Column("component_details", sa.JSON(), nullable=True),
        sa.Column("limitations", sa.JSON(), nullable=True),
        sa.Column("model_version", sa.String(80), nullable=True),
        sa.Column("rules_version", sa.String(80), nullable=True),
        sa.Column("fusion_version", sa.String(80), nullable=True),
        sa.Column("ai_provider", sa.String(40), nullable=True),
        sa.Column("ai_model", sa.String(80), nullable=True),
        sa.Column("ai_status", sa.String(24), nullable=True),
        sa.Column("ai_contributed", sa.Boolean(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_code", sa.String(80), nullable=True),
    ):
        op.add_column("analyses", column)
    op.create_check_constraint(
        "ck_analyses_risk_level",
        "analyses",
        "risk_level IS NULL OR risk_level IN "
        "('LOW','CAUTION','ELEVATED','HIGH','INSUFFICIENT_EVIDENCE')",
    )
    op.create_check_constraint(
        "ck_analyses_confidence",
        "analyses",
        "confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_analyses_confidence", "analyses", type_="check")
    op.drop_constraint("ck_analyses_risk_level", "analyses", type_="check")
    for name in (
        "failure_code",
        "completed_at",
        "ai_contributed",
        "ai_status",
        "ai_model",
        "ai_provider",
        "fusion_version",
        "rules_version",
        "model_version",
        "limitations",
        "component_details",
        "recommended_actions",
        "evidence",
        "result_summary",
        "confidence_level",
        "confidence_score",
        "risk_score",
        "risk_level",
    ):
        op.drop_column("analyses", name)
