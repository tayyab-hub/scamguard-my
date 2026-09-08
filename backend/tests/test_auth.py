"""Authentication, CSRF, privacy, and multi-user authorization on real PostgreSQL."""

import os
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.models import Analysis, AuthSession, User
from app.db.session import build_engine
from app.main import create_app

pytestmark = pytest.mark.integration
ORIGIN = "http://localhost:5173"
PASSWORD = "correct horse battery staple"


@pytest.fixture(scope="module")
def auth_database():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL is required for real PostgreSQL integration")
    assert make_url(url).database.endswith("_test"), "Use a disposable *_test database"
    config = Settings(_env_file=None, app_env="test", database_url=url, persistence_enabled=True)
    root = Path(__file__).resolve().parents[1]
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=root,
        env={**os.environ, "DATABASE_URL": url},
        check=True,
    )
    engine = build_engine(config)
    yield config, engine
    engine.dispose()


@pytest.fixture
def auth_client(auth_database):
    config, engine = auth_database
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE analyses, auth_sessions, users, auth_rate_limits"))
    with TestClient(create_app(config)) as client:
        yield client, engine


def signup(client: TestClient, email: str = "owner@example.com", password: str = PASSWORD):
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password},
        headers={"Origin": ORIGIN},
    )
    if response.status_code == 201:
        client.headers.update({"Origin": ORIGIN, "X-CSRF-Token": response.json()["csrf_token"]})
    return response


def login(client: TestClient, email: str = "owner@example.com", password: str = PASSWORD):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers={"Origin": ORIGIN},
    )
    if response.status_code == 200:
        client.headers.update({"Origin": ORIGIN, "X-CSRF-Token": response.json()["csrf_token"]})
    return response


def submit_message(client: TestClient, content: str = "Test message"):
    return client.post("/api/v1/analyses", json={"input_type": "MESSAGE", "content": content})


def test_signup_normalizes_email_and_stores_only_argon2_hash(auth_client):
    client, engine = auth_client
    response = signup(client, "  Student@Example.COM ")
    assert response.status_code == 201
    assert set(response.json()["user"]) == {"id", "email", "created_at"}
    assert response.json()["user"]["email"] == "student@example.com"
    UUID(response.json()["user"]["id"])
    assert "scamguard_session=" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "SameSite=lax" in response.headers["set-cookie"]
    with Session(engine) as session:
        user = session.scalar(select(User).where(User.email == "student@example.com"))
        assert user is not None and PASSWORD not in user.password_hash
        assert PasswordHasher().verify(user.password_hash, PASSWORD)


def test_signup_validation_and_duplicate_race_safe_response(auth_client):
    client, _ = auth_client
    assert signup(client, "not-an-email").status_code == 422
    assert signup(client, "person@example.com", "too short").status_code == 422
    assert signup(client, "person@example.com").status_code == 201
    duplicate = signup(client, "PERSON@example.com")
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "ACCOUNT_EXISTS"
    assert "database" not in duplicate.text.lower()


def test_login_uses_generic_failures_and_restores_session(auth_client):
    client, _ = auth_client
    assert signup(client).status_code == 201
    client.cookies.clear()
    wrong = login(client, password="wrong password")
    unknown = login(client, email="unknown@example.com")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"]["message"] == unknown.json()["error"]["message"]
    assert login(client).status_code == 200
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200 and me.json()["user"]["email"] == "owner@example.com"


def test_logout_revokes_server_session_and_clears_cookies(auth_client):
    client, engine = auth_client
    assert signup(client).status_code == 201
    session_cookie = client.cookies.get("scamguard_session")
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401
    client.cookies.set("scamguard_session", session_cookie)
    assert client.get("/api/v1/auth/me").status_code == 401
    with Session(engine) as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(AuthSession)
                .where(AuthSession.revoked_at.is_not(None))
            )
            == 1
        )


def test_invalid_expired_and_missing_sessions_are_rejected(auth_client):
    client, engine = auth_client
    assert client.get("/api/v1/auth/me").status_code == 401
    client.cookies.set("scamguard_session", "invalid-token")
    assert client.get("/api/v1/auth/me").status_code == 401
    client.cookies.clear()
    assert signup(client).status_code == 201
    with Session(engine) as session:
        auth_session = session.scalar(select(AuthSession))
        auth_session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        session.commit()
    assert client.get("/api/v1/auth/me").status_code == 401


def test_origin_and_csrf_protect_state_changes(auth_client):
    client, _ = auth_client
    missing_origin = client.post(
        "/api/v1/auth/signup",
        json={"email": "person@example.com", "password": PASSWORD},
    )
    assert missing_origin.status_code == 403
    assert signup(client).status_code == 201
    csrf = client.headers.pop("X-CSRF-Token")
    assert submit_message(client).status_code == 403
    client.headers["X-CSRF-Token"] = "incorrect"
    assert submit_message(client).status_code == 403
    client.headers["X-CSRF-Token"] = csrf
    assert submit_message(client).status_code == 201


def test_multi_user_history_detail_delete_and_dashboard_are_isolated(auth_client):
    client_a, engine = auth_client
    assert signup(client_a, "a@example.com").status_code == 201
    analysis_a = submit_message(client_a, "Account A private message").json()
    with TestClient(create_app(auth_client[0].app.state.settings)) as client_b:
        assert signup(client_b, "b@example.com").status_code == 201
        history_b = client_b.get("/api/v1/analyses").json()
        dashboard_b = client_b.get("/api/v1/dashboard").json()
        assert history_b["total"] == 0 and history_b["items"] == []
        assert dashboard_b["total_analyses"] == 0
        assert dashboard_b["recent_analyses"] == []
        assert client_b.get(f"/api/v1/analyses/{analysis_a['id']}").status_code == 404
        assert client_b.delete(f"/api/v1/analyses/{analysis_a['id']}").status_code == 404
    assert client_a.get(f"/api/v1/analyses/{analysis_a['id']}").status_code == 200
    assert client_a.get("/api/v1/analyses").json()["total"] == 1
    assert client_a.delete(f"/api/v1/analyses/{analysis_a['id']}").status_code == 204
    assert client_a.get("/api/v1/analyses").json()["total"] == 0
    with Session(engine) as session:
        assert session.get(Analysis, UUID(analysis_a["id"])) is None


def test_user_id_cannot_be_supplied_and_legacy_rows_remain_private(auth_client):
    client, engine = auth_client
    assert signup(client).status_code == 201
    spoofed = client.post(
        "/api/v1/analyses",
        json={"input_type": "MESSAGE", "content": "private", "user_id": str(uuid4())},
    )
    assert spoofed.status_code == 422
    with Session(engine) as session:
        legacy = Analysis(input_type="MESSAGE", content="Legacy unowned analysis")
        session.add(legacy)
        session.commit()
        legacy_id = legacy.id
    assert client.get(f"/api/v1/analyses/{legacy_id}").status_code == 404
    assert client.get("/api/v1/analyses").json()["total"] == 0
    with Session(engine) as session:
        assert session.get(Analysis, legacy_id) is not None


def test_account_deletion_is_transactional_and_cascades_private_data(auth_client):
    client, engine = auth_client
    assert signup(client).status_code == 201
    assert submit_message(client).status_code == 201
    wrong = client.request("DELETE", "/api/v1/auth/account", json={"password": "wrong password"})
    assert wrong.status_code == 401
    deleted = client.request("DELETE", "/api/v1/auth/account", json={"password": PASSWORD})
    assert deleted.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(User)) == 0
        assert session.scalar(select(func.count()).select_from(AuthSession)) == 0
        assert session.scalar(select(func.count()).select_from(Analysis)) == 0


def test_database_backed_login_rate_limit(auth_database):
    config, engine = auth_database
    limited = config.model_copy(update={"login_rate_limit": 2})
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE analyses, auth_sessions, users, auth_rate_limits"))
    with TestClient(create_app(limited)) as client:
        for _ in range(2):
            assert login(client, "unknown@example.com", "wrong password").status_code == 401
        blocked = login(client, "unknown@example.com", "wrong password")
        assert blocked.status_code == 429
        assert int(blocked.headers["retry-after"]) > 0
