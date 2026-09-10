"""Add transitional profiles and secure password-reset tokens.

Revision ID: 0005_auth_profile_polish
Revises: 0004_phone_intelligence
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_auth_profile_polish"
down_revision = "0004_phone_intelligence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Nullable is intentional: production users created before Task 6.1 must remain valid and
    # can complete their profile in the application without fabricated personal information.
    op.add_column("users", sa.Column("full_name", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("username", sa.String(length=30), nullable=True))
    op.create_check_constraint(
        "ck_users_full_name_length",
        "users",
        "full_name IS NULL OR (char_length(btrim(full_name)) BETWEEN 2 AND 100)",
    )
    op.create_check_constraint(
        "ck_users_username_normalized",
        "users",
        "username IS NULL OR username = lower(username)",
    )
    op.create_check_constraint(
        "ck_users_username_format",
        "users",
        "username IS NULL OR username ~ '^[a-z0-9_]{3,30}$'",
    )
    op.create_index(
        "ix_users_username",
        "users",
        ["username"],
        unique=True,
        postgresql_where=sa.text("username IS NOT NULL"),
    )
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_password_reset_tokens_token_hash",
        "password_reset_tokens",
        ["token_hash"],
        unique=True,
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    op.create_index("ix_password_reset_tokens_expires_at", "password_reset_tokens", ["expires_at"])


def downgrade() -> None:
    # Destructive only for Task 6.1 profile/reset data; use isolated databases for this check.
    op.drop_index("ix_password_reset_tokens_expires_at", table_name="password_reset_tokens")
    op.drop_index("ix_password_reset_tokens_user_id", table_name="password_reset_tokens")
    op.drop_index("ix_password_reset_tokens_token_hash", table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_constraint("ck_users_username_format", "users", type_="check")
    op.drop_constraint("ck_users_username_normalized", "users", type_="check")
    op.drop_constraint("ck_users_full_name_length", "users", type_="check")
    op.drop_column("users", "username")
    op.drop_column("users", "full_name")
