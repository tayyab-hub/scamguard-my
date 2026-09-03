from collections.abc import Generator

from fastapi import Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings


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


def get_session(request: Request) -> Generator[Session, None, None]:
    factory: sessionmaker[Session] = request.app.state.session_factory
    with factory() as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        # A service must explicitly commit its transaction; reads never implicitly commit.
