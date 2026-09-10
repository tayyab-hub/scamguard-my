from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import parse_qs, urlparse

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
    qr_max_upload_bytes: int = Field(default=5_242_880, ge=262_144, le=10_485_760)
    qr_max_dimension: int = Field(default=4096, ge=512, le=8192)
    qr_max_pixels: int = Field(default=16_000_000, ge=262_144, le=33_554_432)
    qr_max_payload_bytes: int = Field(default=5000, ge=256, le=5000)
    port: int = Field(default=8000, ge=1, le=65535)
    message_model_path: str | None = None
    url_model_path: str | None = None
    ai_review_enabled: bool = False
    openai_api_key: SecretStr | None = Field(default=None, repr=False)
    openai_model: str = "gpt-5-mini-2025-08-07"
    ai_timeout_seconds: float = Field(default=8.0, ge=1.0, le=30.0)
    auth_token_pepper: SecretStr = Field(
        default=SecretStr("local-development-only-change-me"), repr=False
    )
    session_cookie_name: str = "scamguard_session"
    session_ttl_hours: int = Field(default=168, ge=1, le=720)
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    login_rate_limit: int = Field(default=10, ge=1, le=100)
    signup_rate_limit: int = Field(default=5, ge=1, le=100)
    analysis_rate_limit: int = Field(default=30, ge=1, le=1000)
    password_reset_request_rate_limit: int = Field(default=5, ge=1, le=100)
    password_reset_confirm_rate_limit: int = Field(default=10, ge=1, le=100)
    password_reset_ttl_minutes: int = Field(default=30, ge=10, le=120)
    frontend_base_url: str = "http://localhost:5173"
    mail_provider: Literal["development", "resend"] = "development"
    resend_api_key: SecretStr | None = Field(default=None, repr=False)
    resend_from_email: str | None = None

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_postgres_driver(cls, value: object) -> object:
        if isinstance(value, str) and value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

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

    @field_validator("frontend_base_url")
    @classmethod
    def validate_frontend_base_url(cls, value: str) -> str:
        normalized = value.rstrip("/")
        parsed = urlparse(normalized)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.path
            or parsed.query
            or parsed.fragment
            or parsed.username
            or parsed.password
        ):
            raise ValueError("FRONTEND_BASE_URL must be an HTTP(S) origin without a path")
        return normalized

    @model_validator(mode="after")
    def validate_production(self) -> "Settings":
        if self.app_env == "production":
            hosts = self.database_url.hosts()
            if any(host.get("password") in {None, "", "scamguard_local_only"} for host in hosts):
                raise ValueError("Production requires an explicit, non-default database password")
            if any(not origin.startswith("https://") for origin in self.cors_origins):
                raise ValueError("Production CORS origins must use HTTPS (or an empty list)")
            if not self.persistence_enabled:
                raise ValueError("Production requires persistence")
            if not self.cors_origins:
                raise ValueError("Production requires at least one exact HTTPS frontend origin")
            if not self.cookie_secure or self.cookie_samesite != "none":
                raise ValueError(
                    "Cross-origin production authentication requires Secure SameSite=None cookies"
                )
            pepper = self.auth_token_pepper.get_secret_value()
            if pepper == "local-development-only-change-me" or len(pepper) < 32:
                raise ValueError("Production AUTH_TOKEN_PEPPER must be at least 32 characters")
            query = parse_qs(urlparse(str(self.database_url)).query)
            if query.get("sslmode", [""])[0] not in {"require", "verify-ca", "verify-full"}:
                raise ValueError("Production DATABASE_URL must require PostgreSQL TLS")
            if not self.frontend_base_url.startswith("https://"):
                raise ValueError("Production FRONTEND_BASE_URL must use HTTPS")
            if self.mail_provider != "resend":
                raise ValueError("Production MAIL_PROVIDER must be resend")
            if self.resend_api_key is None or not self.resend_api_key.get_secret_value().strip():
                raise ValueError("Production RESEND_API_KEY is required")
            if self.resend_from_email is None or "@" not in self.resend_from_email:
                raise ValueError("Production RESEND_FROM_EMAIL is required")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
