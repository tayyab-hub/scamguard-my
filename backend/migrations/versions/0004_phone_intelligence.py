"""Allow PHONE analyses while preserving existing Message and URL records.

Revision ID: 0004_phone_intelligence
Revises: 0003_auth_ownership
"""

from alembic import op

revision = "0004_phone_intelligence"
down_revision = "0003_auth_ownership"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("analysis_input_type", "analyses", type_="check")
    op.create_check_constraint(
        "analysis_input_type",
        "analyses",
        "input_type IN ('MESSAGE', 'URL', 'PHONE')",
    )
    op.drop_constraint("ck_analyses_content_length", "analyses", type_="check")
    op.create_check_constraint(
        "ck_analyses_content_length",
        "analyses",
        "char_length(content) <= 5000 AND "
        "(input_type != 'URL' OR char_length(content) <= 2048) AND "
        "(input_type != 'PHONE' OR char_length(content) <= 64)",
    )


def downgrade() -> None:
    # This DDL reversal requires PHONE rows to be removed first. Use only on an isolated database.
    op.drop_constraint("ck_analyses_content_length", "analyses", type_="check")
    op.create_check_constraint(
        "ck_analyses_content_length",
        "analyses",
        "char_length(content) <= 5000 AND (input_type != 'URL' OR char_length(content) <= 2048)",
    )
    op.drop_constraint("analysis_input_type", "analyses", type_="check")
    op.create_check_constraint(
        "analysis_input_type",
        "analyses",
        "input_type IN ('MESSAGE', 'URL')",
    )
