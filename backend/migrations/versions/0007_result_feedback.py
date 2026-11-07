# Additive, nullable columns for the owner's private "Was this result right?" answer. Existing
# rows are untouched and the saved assessment itself never changes. Feedback is evaluation
# evidence only and is never used for automatic retraining.

"""Add private per-analysis result feedback.

Revision ID: 0007_result_feedback
Revises: 0006_qr_intelligence
"""

import sqlalchemy as sa
from alembic import op

revision = "0007_result_feedback"
down_revision = "0006_qr_intelligence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("user_feedback", sa.String(length=16), nullable=True))
    op.add_column("analyses", sa.Column("feedback_at", sa.DateTime(timezone=True), nullable=True))
    op.create_check_constraint(
        "ck_analyses_user_feedback",
        "analyses",
        "user_feedback IS NULL OR user_feedback IN ('RIGHT', 'TOO_HIGH', 'TOO_LOW', 'UNSURE')",
    )


def downgrade() -> None:
    # Destructive for collected feedback; use only on an isolated database.
    op.drop_constraint("ck_analyses_user_feedback", "analyses", type_="check")
    op.drop_column("analyses", "feedback_at")
    op.drop_column("analyses", "user_feedback")
