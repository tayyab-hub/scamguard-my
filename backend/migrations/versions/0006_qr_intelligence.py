"""Allow first-class QR analyses without changing historical records.

Revision ID: 0006_qr_intelligence
Revises: 0005_auth_profile_polish
"""

from alembic import op

revision = "0006_qr_intelligence"
down_revision = "0005_auth_profile_polish"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("analysis_input_type", "analyses", type_="check")
    op.create_check_constraint(
        "analysis_input_type",
        "analyses",
        "input_type IN ('MESSAGE', 'URL', 'PHONE', 'QR')",
    )
    op.drop_constraint("ck_analyses_content_length", "analyses", type_="check")
    op.create_check_constraint(
        "ck_analyses_content_length",
        "analyses",
        "char_length(content) <= 5000 AND "
        "(input_type != 'URL' OR char_length(content) <= 2048) AND "
        "(input_type != 'PHONE' OR char_length(content) <= 64) AND "
        "(input_type != 'QR' OR char_length(content) <= 5000)",
    )


def downgrade() -> None:
    # QR rows must be removed first. Use this reversal only on an isolated database.
    op.drop_constraint("ck_analyses_content_length", "analyses", type_="check")
    op.create_check_constraint(
        "ck_analyses_content_length",
        "analyses",
        "char_length(content) <= 5000 AND "
        "(input_type != 'URL' OR char_length(content) <= 2048) AND "
        "(input_type != 'PHONE' OR char_length(content) <= 64)",
    )
    op.drop_constraint("analysis_input_type", "analyses", type_="check")
    op.create_check_constraint(
        "analysis_input_type",
        "analyses",
        "input_type IN ('MESSAGE', 'URL', 'PHONE')",
    )
