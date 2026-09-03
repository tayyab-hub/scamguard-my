import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def app():
    return create_app(Settings(_env_file=None, app_env="test"))


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client
