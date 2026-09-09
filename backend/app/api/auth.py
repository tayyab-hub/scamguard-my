from datetime import UTC, datetime, timedelta
from typing import Annotated

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator
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
from app.db.models import AuthSession, User
from app.db.session import get_session

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


class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=3, max_length=320)
    password: SecretStr = Field(min_length=12, max_length=128)

    _normalize_email = field_validator("email")(normalized_email)

    @field_validator("password")
    @classmethod
    def meaningful_password(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().strip():
            raise ValueError("Password cannot contain only whitespace")
        return value


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=3, max_length=320)
    password: SecretStr = Field(min_length=1, max_length=128)

    _normalize_email = field_validator("email")(normalized_email)


class AccountDeleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: SecretStr = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserResponse
    csrf_token: str


def public_user(user: User) -> UserResponse:
    return UserResponse(id=str(user.id), email=user.email, created_at=user.created_at)


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
    user = User(email=data.email, password_hash=hash_password(data.password.get_secret_value()))
    session.add(user)
    try:
        session.flush()
    except IntegrityError as exc:
        session.rollback()
        raise ApiError(409, "ACCOUNT_EXISTS", "An account already exists for this email.") from exc
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
        discriminator=f"{client_discriminator(request)}:{data.email}",
        limit=settings.login_rate_limit,
        window=timedelta(minutes=15),
    )
    user = session.query(User).filter(User.email == data.email).one_or_none()
    password = data.password.get_secret_value()
    if user is None:
        verify_dummy_password(password)
    if user is None or not verify_password(user.password_hash, password):
        raise ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.")
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


@router.delete("/account", status_code=204)
def delete_account(
    data: AccountDeleteRequest,
    request: Request,
    response: Response,
    session: Database,
    authenticated: Annotated[AuthenticatedSession, Depends(require_csrf)],
) -> None:
    if not verify_password(authenticated.user.password_hash, data.password.get_secret_value()):
        raise ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.")
    user = session.get(User, authenticated.user.id)
    if user is None:
        raise ApiError(401, "INVALID_SESSION", "Your session is no longer valid. Sign in again.")
    session.delete(user)
    session.commit()
    clear_auth_cookies(request, response)
