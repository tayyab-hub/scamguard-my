"""Persist Message/URL intake without intelligence fields.

Revision ID: 0001_analysis_intake
Revises: None
"""

import sqlalchemy as sa
from alembic import op

revision = "0001_analysis_intake"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "analyses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("input_type", sa.String(7), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(10), server_default="SUBMITTED", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("input_type IN ('MESSAGE', 'URL')", name="analysis_input_type"),
        sa.CheckConstraint(
            "status IN ('SUBMITTED', 'PROCESSING', 'COMPLETED', 'FAILED')", name="analysis_status"
        ),
        sa.CheckConstraint("char_length(btrim(content)) > 0", name="ck_analyses_content_nonempty"),
        sa.CheckConstraint(
            "char_length(content) <= 5000 AND "
            "(input_type != 'URL' OR char_length(content) <= 2048)",
            name="ck_analyses_content_length",
        ),
    )
    op.create_index(
        "ix_analyses_created_id", "analyses", [sa.text("created_at DESC"), sa.text("id DESC")]
    )


def downgrade() -> None:
    # Explicitly destructive; use only on a disposable test database or with a reviewed backup.
    op.drop_index("ix_analyses_created_id", table_name="analyses")
    op.drop_table("analyses")
