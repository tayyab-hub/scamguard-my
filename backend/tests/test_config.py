import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.main import create_app


def test_environment_is_read(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "WARNING")
    assert Settings(_env_file=None).log_level == "WARNING"


@pytest.mark.parametrize("url", ["sqlite:///test.db", "postgresql://user:pass@localhost/db"])
def test_requires_postgresql_and_psycopg(url):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, database_url=url)


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "https://site.example/",
        "https://site.example/path",
        "javascript:foo",
        "https://name:pass@site.example",
    ],
)
def test_requires_exact_cors_origins(origin):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, cors_origins=[origin])


def test_production_rejects_development_credentials():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, app_env="production")


def test_production_rejects_http_cors():
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            app_env="production",
            database_url="postgresql+psycopg://app:example-test-password@db/scamguard",
            cors_origins=["http://site.example"],
        )


def test_production_disables_documentation():
    settings = Settings(
        _env_file=None,
        app_env="production",
        database_url="postgresql+psycopg://app:example-test-password@db/scamguard",
        cors_origins=[],
    )
    with TestClient(create_app(settings)) as client:
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404
        assert client.get("/api/v1/health").status_code == 200
