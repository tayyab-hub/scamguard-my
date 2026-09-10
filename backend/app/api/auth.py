import re
import unicodedata
from datetime import UTC, datetime, timedelta
from typing import Annotated
from urllib.parse import urlencode

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import (
    AuthenticatedSession,
    enforce_rate_limit,
    hash_password,
    new_secret,
    require_allowed_origin,
    require_authenticated_session,
    require_csrf,
    secret_hash,
    verify_dummy_password,
    verify_password,
)
from app.core.errors import ApiError
from app.db.models import AuthSession, PasswordResetToken, User
from app.db.session import get_session
from app.services.mail import MailDeliveryError

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
Database = Annotated[Session, Depends(get_session)]


def normalized_email(value: str) -> str:
    try:
        result = validate_email(value.strip(), check_deliverability=False)
    except EmailNotValidError as exc:
        raise ValueError("Enter a valid email address") from exc
    if not result.normalized:
        raise ValueError("Enter a valid email address")
    return result.normalized.lower()


def normalized_full_name(value: str) -> str:
    value = unicodedata.normalize("NFC", value.strip())
    if any(unicodedata.category(character).startswith("C") for character in value):
        raise ValueError("Full name cannot contain control characters")
    allowed_punctuation = {"-", "‐", "‑", "'", "’", "."}
    for character in value:
        category = unicodedata.category(character)
        if not (
            category.startswith("L")
            or category.startswith("M")
            or category == "Zs"
            or character in allowed_punctuation
        ):
            raise ValueError("Use letters, spaces, hyphens, apostrophes, or periods")
    value = " ".join(value.split())
    if not 2 <= len(value) <= 100:
        raise ValueError("Full name must be between 2 and 100 characters")
    return value


def normalized_username(value: str) -> str:
    if value != value.strip():
        raise ValueError("Username cannot begin or end with whitespace")
    if not re.fullmatch(r"[A-Za-z0-9_]{3,30}", value, flags=re.ASCII):
        raise ValueError("Username must be 3–30 letters, numbers, or underscores")
    return value.lower()


def meaningful_password(value: SecretStr) -> SecretStr:
    if not value.get_secret_value().strip():
        raise ValueError("Password cannot contain only whitespace")
    return value


class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str
    username: str
    email: str = Field(min_length=3, max_length=320)
    password: SecretStr = Field(min_length=12, max_length=128)

    _normalize_full_name = field_validator("full_name")(normalized_full_name)
    _normalize_username = field_validator("username")(normalized_username)
    _normalize_email = field_validator("email")(normalized_email)
    _meaningful_password = field_validator("password")(meaningful_password)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    identifier: str = Field(min_length=1, max_length=320)
    password: SecretStr = Field(min_length=1, max_length=128)

    @field_validator("identifier")
    @classmethod
    def normalize_identifier(cls, value: str) -> str:
        value = value.strip().lower()
        if not value or any(unicodedata.category(character).startswith("C") for character in value):
            raise ValueError("Enter a username or email")
        return value


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str
    username: str

    _normalize_full_name = field_validator("full_name")(normalized_full_name)
    _normalize_username = field_validator("username")(normalized_username)


class PasswordResetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=3, max_length=320)

    _normalize_email = field_validator("email")(normalized_email)


class PasswordResetConfirmRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(min_length=32, max_length=256)
    password: SecretStr = Field(min_length=12, max_length=128)

    _meaningful_password = field_validator("password")(meaningful_password)


class AccountDeleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: SecretStr = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str | None
    username: str | None
    email: str
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserResponse
    csrf_token: str


class ProfileResponse(BaseModel):
    user: UserResponse


class PasswordResetRequestedResponse(BaseModel):
    message: str


def public_user(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        full_name=user.full_name,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
    )


def client_discriminator(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def set_auth_cookie(request: Request, response: Response, user: User, session: Session) -> str:
    settings = request.app.state.settings
    raw_session = new_secret()
    raw_csrf = new_secret()
    expires_at = datetime.now(UTC) + timedelta(hours=settings.session_ttl_hours)
    session.add(
        AuthSession(
            user_id=user.id,
            token_hash=secret_hash(request, raw_session),
            csrf_token_hash=secret_hash(request, raw_csrf),
            expires_at=expires_at,
            last_used_at=datetime.now(UTC),
        )
    )
    session.commit()
    max_age = settings.session_ttl_hours * 60 * 60
    response.set_cookie(
        settings.session_cookie_name,
        raw_session,
        max_age=max_age,
        expires=expires_at,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
        path="/",
    )
    return raw_csrf


def clear_auth_cookies(request: Request, response: Response) -> None:
    settings = request.app.state.settings
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(
    data: SignupRequest, request: Request, response: Response, session: Database
) -> AuthResponse:
    require_allowed_origin(request)
    settings = request.app.state.settings
    enforce_rate_limit(
        request,
        session,
        scope="signup",
        discriminator=client_discriminator(request),
        limit=settings.signup_rate_limit,
        window=timedelta(hours=1),
    )
    existing_email = session.scalar(select(User.id).where(User.email == data.email))
    if existing_email is not None:
        raise ApiError(409, "ACCOUNT_EXISTS", "An account already exists for this email.")
    existing_username = session.scalar(select(User.id).where(User.username == data.username))
    if existing_username is not None:
        raise ApiError(409, "USERNAME_UNAVAILABLE", "That username is not available.")
    user = User(
        full_name=data.full_name,
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password.get_secret_value()),
    )
    session.add(user)
    try:
        session.flush()
    except IntegrityError as exc:
        session.rollback()
        raise ApiError(
            409,
            "ACCOUNT_CONFLICT",
            "An account already uses that email or username.",
        ) from exc
    csrf_token = set_auth_cookie(request, response, user, session)
    return AuthResponse(user=public_user(user), csrf_token=csrf_token)


@router.post("/login", response_model=AuthResponse)
def login(
    data: LoginRequest, request: Request, response: Response, session: Database
) -> AuthResponse:
    require_allowed_origin(request)
    settings = request.app.state.settings
    enforce_rate_limit(
        request,
        session,
        scope="login",
        discriminator=f"{client_discriminator(request)}:{data.identifier}",
        limit=settings.login_rate_limit,
        window=timedelta(minutes=15),
    )
    if "@" in data.identifier:
        user = session.scalar(select(User).where(User.email == data.identifier))
    elif re.fullmatch(r"[a-z0-9_]{3,30}", data.identifier, flags=re.ASCII):
        user = session.scalar(select(User).where(User.username == data.identifier))
    else:
        user = None
    password = data.password.get_secret_value()
    if user is None:
        verify_dummy_password(password)
    if user is None or not verify_password(user.password_hash, password):
        raise ApiError(401, "INVALID_CREDENTIALS", "Invalid username/email or password.")
    csrf_token = set_auth_cookie(request, response, user, session)
    return AuthResponse(user=public_user(user), csrf_token=csrf_token)


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_csrf)],
) -> None:
    current_session = session.get(AuthSession, authenticated.session.id)
    if current_session is not None:
        current_session.revoked_at = datetime.now(UTC)
    session.commit()
    clear_auth_cookies(request, response)


@router.get("/me", response_model=AuthResponse)
def me(
    request: Request,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_authenticated_session)],
) -> AuthResponse:
    csrf_token = new_secret()
    current_session = session.get(AuthSession, authenticated.session.id)
    if current_session is None:
        raise ApiError(401, "INVALID_SESSION", "Your session is no longer valid. Sign in again.")
    current_session.csrf_token_hash = secret_hash(request, csrf_token)
    session.commit()
    return AuthResponse(user=public_user(authenticated.user), csrf_token=csrf_token)


@router.patch("/profile", response_model=ProfileResponse)
def update_profile(
    data: ProfileUpdateRequest,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_csrf)],
) -> ProfileResponse:
    duplicate = session.scalar(
        select(User.id).where(
            User.username == data.username,
            User.id != authenticated.user.id,
        )
    )
    if duplicate is not None:
        raise ApiError(409, "USERNAME_UNAVAILABLE", "That username is not available.")
    user = session.get(User, authenticated.user.id)
    if user is None:
        raise ApiError(401, "INVALID_SESSION", "Your session is no longer valid. Sign in again.")
    user.full_name = data.full_name
    user.username = data.username
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise ApiError(409, "USERNAME_UNAVAILABLE", "That username is not available.") from exc
    return ProfileResponse(user=public_user(user))


RESET_REQUEST_MESSAGE = (
    "If an account exists for that email, password reset instructions have been sent."
)


@router.post(
    "/password-reset/request",
    response_model=PasswordResetRequestedResponse,
    status_code=202,
)
def request_password_reset(
    data: PasswordResetRequest,
    request: Request,
    session: Database,
) -> PasswordResetRequestedResponse:
    require_allowed_origin(request)
    settings = request.app.state.settings
    enforce_rate_limit(
        request,
        session,
        scope="password_reset_request",
        discriminator=client_discriminator(request),
        limit=settings.password_reset_request_rate_limit,
        window=timedelta(hours=1),
    )
    user = session.scalar(select(User).where(User.email == data.email))
    if user is not None:
        now = datetime.now(UTC)
        session.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=now)
        )
        raw_token = new_secret()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=secret_hash(request, raw_token),
            expires_at=now + timedelta(minutes=settings.password_reset_ttl_minutes),
        )
        session.add(reset_token)
        session.commit()
        reset_url = f"{settings.frontend_base_url}/reset-password?{urlencode({'token': raw_token})}"
        try:
            request.app.state.mail_service.send_password_reset(user.email, reset_url)
        except MailDeliveryError:
            # Public behavior remains identical; provider failures never expose account existence
            # or reset secrets. Operational provider monitoring is external to request logs.
            pass
    return PasswordResetRequestedResponse(message=RESET_REQUEST_MESSAGE)


@router.post("/password-reset/confirm", status_code=204)
def confirm_password_reset(
    data: PasswordResetConfirmRequest,
    request: Request,
    session: Database,
) -> None:
    require_allowed_origin(request)
    settings = request.app.state.settings
    enforce_rate_limit(
        request,
        session,
        scope="password_reset_confirm",
        discriminator=client_discriminator(request),
        limit=settings.password_reset_confirm_rate_limit,
        window=timedelta(minutes=15),
    )
    now = datetime.now(UTC)
    reset_token = session.scalar(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == secret_hash(request, data.token))
        .with_for_update()
    )
    if reset_token is None or reset_token.used_at is not None or reset_token.expires_at <= now:
        raise ApiError(
            400,
            "INVALID_RESET_TOKEN",
            "This password reset link is invalid or has expired.",
        )
    user = session.get(User, reset_token.user_id)
    if user is None:
        raise ApiError(
            400, "INVALID_RESET_TOKEN", "This password reset link is invalid or has expired."
        )
    user.password_hash = hash_password(data.password.get_secret_value())
    reset_token.used_at = now
    session.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=now)
    )
    session.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    session.commit()


@router.delete("/account", status_code=204)
def delete_account(
    data: AccountDeleteRequest,
    request: Request,
    response: Response,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_csrf)],
) -> None:
    if not verify_password(authenticated.user.password_hash, data.password.get_secret_value()):
        raise ApiError(401, "INVALID_CREDENTIALS", "Invalid username/email or password.")
    user = session.get(User, authenticated.user.id)
    if user is None:
        raise ApiError(401, "INVALID_SESSION", "Your session is no longer valid. Sign in again.")
    session.delete(user)
    session.commit()
    clear_auth_cookies(request, response)
