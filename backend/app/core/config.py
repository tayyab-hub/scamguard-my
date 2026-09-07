from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from pydantic import Field, PostgresDsn, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    database_url: PostgresDsn = Field(
        default="postgresql+psycopg://scamguard@127.0.0.1:5432/scamguard",
        repr=False,
    )
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    db_connect_timeout_seconds: int = Field(default=3, ge=1, le=30)
    persistence_enabled: bool = False
    max_request_bytes: int = Field(default=65_536, ge=32_768, le=1_048_576)
    port: int = Field(default=8000, ge=1, le=65535)
    message_model_path: str = "backend/app/ml/artifacts/message_tfidf_v1.json"
    url_model_path: str | None = None
    ai_review_enabled: bool = False
    openai_api_key: SecretStr | None = Field(default=None, repr=False)
    openai_model: str = "gpt-5-mini-2025-08-07"
    ai_timeout_seconds: float = Field(default=8.0, ge=1.0, le=30.0)

    @field_validator("database_url")
    @classmethod
    def require_psycopg(cls, value: PostgresDsn) -> PostgresDsn:
        if value.scheme != "postgresql+psycopg":
            raise ValueError("DATABASE_URL must use postgresql+psycopg://")
        return value

    @field_validator("cors_origins")
    @classmethod
    def validate_origins(cls, values: list[str]) -> list[str]:
        for value in values:
            parsed = urlparse(value)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.path
                or parsed.query
                or parsed.fragment
                or parsed.username
                or parsed.password
                or "*" in value
            ):
                raise ValueError("CORS origins must be exact HTTP(S) origins without paths")
        return values

    @model_validator(mode="after")
    def validate_production(self) -> "Settings":
        if self.app_env == "production":
            hosts = self.database_url.hosts()
            if any(host.get("password") in {None, "", "scamguard_local_only"} for host in hosts):
                raise ValueError("Production requires an explicit, non-default database password")
            if any(not origin.startswith("https://") for origin in self.cors_origins):
                raise ValueError("Production CORS origins must use HTTPS (or an empty list)")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
