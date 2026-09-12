import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, Request
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.db.models import AuthSession, RateLimitBucket, User
from app.db.session import get_session

PASSWORD_HASHER = PasswordHasher(time_cost=3, memory_cost=65_536, parallelism=2, hash_len=32)
DUMMY_PASSWORD_HASH = PASSWORD_HASHER.hash("SCAMGUARD timing-only password")


@dataclass(frozen=True)
class AuthenticatedSession:
    user: User
    session: AuthSession


def hash_password(password: str) -> str:
    return PASSWORD_HASHER.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return PASSWORD_HASHER.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def verify_dummy_password(password: str) -> None:
    verify_password(DUMMY_PASSWORD_HASH, password)


def secret_hash(request: Request, value: str) -> str:
    pepper = request.app.state.settings.auth_token_pepper.get_secret_value().encode()
    return hmac.new(pepper, value.encode(), hashlib.sha256).hexdigest()


def new_secret() -> str:
    return secrets.token_urlsafe(32)


def session_csrf_token(request: Request, raw_session: str) -> str:
    # Domain separation makes this token unrecoverable from the stored session digest.
    # Stable within a session so restoring another tab does not invalidate its peers.
    return secret_hash(request, f"csrf-session-v1:{raw_session}")


def require_allowed_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin not in request.app.state.settings.cors_origins:
        raise ApiError(403, "ORIGIN_NOT_ALLOWED", "This request origin is not allowed.")


Database = Annotated[Session, Depends(get_session, use_cache=False)]


def require_authenticated_session(request: Request, session: Database) -> AuthenticatedSession:
    raw_token = request.cookies.get(request.app.state.settings.session_cookie_name)
    if not raw_token:
        raise ApiError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.")
    token_hash = secret_hash(request, raw_token)
    row = session.execute(
        select(AuthSession, User)
        .join(User, User.id == AuthSession.user_id)
        .where(AuthSession.token_hash == token_hash)
    ).one_or_none()
    now = datetime.now(UTC)
    if row is None or row.AuthSession.revoked_at is not None or row.AuthSession.expires_at <= now:
        raise ApiError(401, "INVALID_SESSION", "Your session is no longer valid. Sign in again.")
    auth_session = row.AuthSession
    if auth_session.last_used_at <= now - timedelta(minutes=5):
        auth_session.last_used_at = now
        session.commit()
    return AuthenticatedSession(user=row.User, session=auth_session)


def require_csrf(
    request: Request,
    authenticated: Annotated[AuthenticatedSession, Depends(require_authenticated_session)],
) -> AuthenticatedSession:
    require_allowed_origin(request)
    header_token = request.headers.get("x-csrf-token")
    if not header_token or not secrets.compare_digest(
        secret_hash(request, header_token), authenticated.session.csrf_token_hash
    ):
        raise ApiError(
            403, "CSRF_VALIDATION_FAILED", "Security validation failed. Refresh and try again."
        )
    return authenticated


def enforce_rate_limit(
    request: Request,
    session: Session,
    *,
    scope: str,
    discriminator: str,
    limit: int,
    window: timedelta,
) -> None:
    key_hash = secret_hash(request, f"rate:{scope}:{discriminator}")
    advisory_key = int.from_bytes(bytes.fromhex(key_hash[:16]), byteorder="big", signed=True)
    session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": advisory_key})
    now = datetime.now(UTC)
    bucket = session.get(RateLimitBucket, key_hash)
    if bucket is None:
        bucket = RateLimitBucket(
            key_hash=key_hash, scope=scope, window_started_at=now, request_count=1
        )
        session.add(bucket)
    elif bucket.window_started_at <= now - window:
        bucket.window_started_at = now
        bucket.request_count = 1
    else:
        bucket.request_count += 1
    session.commit()
    if bucket.request_count > limit:
        retry_after = max(1, int((bucket.window_started_at + window - now).total_seconds()))
        raise ApiError(
            429,
            "RATE_LIMITED",
            "Too many attempts. Please wait and try again.",
            headers={"Retry-After": str(retry_after)},
        )
