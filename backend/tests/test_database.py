import os
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import get_session
from app.main import create_app


def test_session_rolls_back_and_closes_on_failure():
    session = MagicMock(spec=Session)
    factory = MagicMock()
    factory.return_value.__enter__.return_value = session
    request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(session_factory=factory)))
    dependency = get_session(request)
    assert next(dependency) is session
    with pytest.raises(RuntimeError):
        dependency.throw(RuntimeError("test-only"))
    session.rollback.assert_called_once()
    factory.return_value.__exit__.assert_called_once()
    session.commit.assert_not_called()


@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"),
    reason="TEST_DATABASE_URL is not set; PostgreSQL integration requires a running database",
)
def test_real_postgresql_readiness():
    settings = Settings(
        _env_file=None, app_env="test", database_url=os.environ["TEST_DATABASE_URL"]
    )
    with TestClient(create_app(settings)) as client:
        response = client.get("/api/v1/ready")
        assert response.status_code == 200, response.text
        assert response.json()["database"] == "connected"
