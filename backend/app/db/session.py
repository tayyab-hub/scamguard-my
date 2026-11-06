# SQLAlchemy connection-pool and per-request session lifecycle. An Engine manages PostgreSQL
# connections; a Session tracks ORM work and transactions. Services choose commits explicitly,
# while this dependency handles rollback and closure.

from collections.abc import Generator

from fastapi import Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings


# Build a lazy PostgreSQL pool with connection checks and bounded connect/query waits.
# hide_parameters reduces accidental SQL parameter disclosure; creating the engine does not
# migrate schema.
def build_engine(settings: Settings) -> Engine:
    return create_engine(
        str(settings.database_url),
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_timeout=settings.db_connect_timeout_seconds,
        connect_args={
            "connect_timeout": settings.db_connect_timeout_seconds,
            "options": "-c statement_timeout=5000",
        },
        hide_parameters=True,
    )


# Yield one request-scoped Session from app state. Exceptions roll back uncommitted changes and
# propagate; context exit closes the session. A successful read never implicitly commits a
# write.
def get_session(request: Request) -> Generator[Session, None, None]:
    factory: sessionmaker[Session] = request.app.state.session_factory
    with factory() as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        # A service must explicitly commit its transaction; reads never implicitly commit.
