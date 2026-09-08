"""Migrate an explicitly isolated browser-test DB. Never seed application data."""

import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

url = os.environ["DATABASE_URL"]
if not make_url(url).database.endswith("_e2e"):
    raise RuntimeError("Use a dedicated *_e2e database")
subprocess.run(
    [sys.executable, "-m", "alembic", "upgrade", "head"],
    cwd=Path(__file__).resolve().parents[1],
    check=True,
)
engine = create_engine(url, hide_parameters=True)
try:
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE analyses, auth_sessions, users, auth_rate_limits"))
finally:
    engine.dispose()
