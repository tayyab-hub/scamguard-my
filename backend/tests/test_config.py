import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.main import create_app


def test_environment_is_read(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "WARNING")
    assert Settings(_env_file=None).log_level == "WARNING"


def test_requires_postgresql():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, database_url="sqlite:///test.db")


def test_standard_postgresql_url_is_normalized_for_psycopg():
    settings = Settings(_env_file=None, database_url="postgresql://user:pass@localhost/db")
    assert str(settings.database_url).startswith("postgresql+psycopg://")


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
        database_url=(
            "postgresql+psycopg://app:example-test-password@db/scamguard?sslmode=require"
        ),
        cors_origins=["https://scamguard.example"],
        persistence_enabled=True,
        cookie_secure=True,
        cookie_samesite="none",
        auth_token_pepper="a-production-only-pepper-over-32-characters",
        frontend_base_url="https://scamguard.example",
        mail_provider="resend",
        resend_api_key="resend-test-key-not-a-real-secret",
        resend_from_email="SCAMGUARD <security@scamguard.example>",
    )
    with TestClient(create_app(settings)) as client:
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404
        assert client.get("/api/v1/health").status_code == 200
