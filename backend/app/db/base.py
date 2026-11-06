# Shared SQLAlchemy declarative metadata used by all current models and Alembic. The existing
# class docstring below describes the historical Task 1 baseline; models.py now declares
# analyses, users, sessions, reset tokens and rate buckets.

from sqlalchemy.orm import DeclarativeBase


# DeclarativeBase collects table definitions from subclasses. Alembic compares this metadata to
# the database; inheriting it does not create tables at runtime.
class Base(DeclarativeBase):
    """Shared metadata for future domain models. Task 1 intentionally has no domain tables."""
