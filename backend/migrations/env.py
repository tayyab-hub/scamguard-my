# Alembic entry point for schema changes. Import ORM metadata for migration tooling and resolve
# the configured PostgreSQL connection; application startup itself does not run these
# operations.

from logging.config import fileConfig

from alembic import context

from app.core.config import get_settings
from app.db import models  # noqa: F401 -- register models for Alembic metadata comparison
from app.db.base import Base
from app.db.session import build_engine

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata


# Configure Alembic to emit SQL without opening a database connection. Literal binds make
# generated statements self-contained; this mode does not apply them.
def run_migrations_offline() -> None:
    context.configure(
        url=str(get_settings().database_url),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# Open a short-lived connection with NullPool and run pending revisions inside Alembic
# transaction management. Metadata describes the models; version scripts define the actual
# changes.
def run_migrations_online() -> None:
    engine = build_engine(get_settings())
    try:
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata)
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
