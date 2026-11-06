# Shared API fixtures for tests that do not request persistent storage. Explicit test settings
# avoid importing private developer environment values; TestClient context runs the same FastAPI
# lifespan setup and cleanup as a server.

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


# Build a test-configured FastAPI app for dependency overrides and contract assertions.
@pytest.fixture
def app():
    return create_app(Settings(_env_file=None, app_env="test"))


# Yield a context-managed TestClient so startup resources exist during the test and are disposed
# afterward.
@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client
