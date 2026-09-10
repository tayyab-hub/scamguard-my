"""Authentication, CSRF, privacy, and multi-user authorization on real PostgreSQL."""

import os
import re
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.models import Analysis, AuthSession, PasswordResetToken, User
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
        connection.execute(
            text(
                "TRUNCATE TABLE analyses, auth_sessions, password_reset_tokens, users, "
                "auth_rate_limits"
            )
        )
    with TestClient(create_app(config)) as client:
        yield client, engine


def signup(
    client: TestClient,
    email: str = "owner@example.com",
    password: str = PASSWORD,
    full_name: str = "Owner Example",
    username: str | None = None,
):
    if username is None:
        username = f"{re.sub(r'[^A-Za-z0-9_]', '_', email.split('@')[0])}_user"[:30]
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "full_name": full_name,
            "username": username,
            "email": email,
            "password": password,
        },
        headers={"Origin": ORIGIN},
    )
    if response.status_code == 201:
        client.headers.update({"Origin": ORIGIN, "X-CSRF-Token": response.json()["csrf_token"]})
    return response


def login(client: TestClient, identifier: str = "owner@example.com", password: str = PASSWORD):
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": password},
        headers={"Origin": ORIGIN},
    )
    if response.status_code == 200:
        client.headers.update({"Origin": ORIGIN, "X-CSRF-Token": response.json()["csrf_token"]})
    return response


def submit_message(client: TestClient, content: str = "Test message"):
    return client.post("/api/v1/analyses", json={"input_type": "MESSAGE", "content": content})


def submit_phone(client: TestClient, content: str = "+44 20 7946 0958"):
    return client.post("/api/v1/analyses", json={"input_type": "PHONE", "content": content})


def captured_reset_token(client: TestClient) -> str:
    captured = client.app.state.mail_service.outbox[-1]
    return parse_qs(urlparse(captured.reset_url).query)["token"][0]


def test_signup_normalizes_email_and_stores_only_argon2_hash(auth_client):
    client, engine = auth_client
    response = signup(client, "  Student@Example.COM ", username="Student_User")
    assert response.status_code == 201
    assert set(response.json()["user"]) == {
        "id",
        "full_name",
        "username",
        "email",
        "created_at",
    }
    assert response.json()["user"]["full_name"] == "Owner Example"
    assert response.json()["user"]["username"] == "student_user"
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


@pytest.mark.parametrize(
    "full_name,valid",
    [
        ("", False),
        ("   ", False),
        ("Li", True),
        ("محمد علي", True),
        ("Anne-Marie O'Neill", True),
        ("Jean‑Luc O’Neill", True),
        ("A" * 101, False),
        ("Name\nInjected", False),
        ("<script>alert</script>", False),
    ],
)
def test_full_name_validation(auth_client, full_name, valid):
    client, _ = auth_client
    response = signup(client, "name@example.com", full_name=full_name, username="name_user")
    assert (response.status_code == 201) is valid


@pytest.mark.parametrize(
    "username,valid",
    [
        ("", False),
        ("ab", False),
        ("abc", True),
        ("normal_user_2", True),
        ("has space", False),
        (" user", False),
        ("user-name", False),
        ("<script>", False),
        ("user' OR 1=1", False),
        ("tayyáb", False),
        ("x" * 31, False),
    ],
)
def test_username_validation(auth_client, username, valid):
    client, _ = auth_client
    response = signup(client, "username@example.com", username=username)
    assert (response.status_code == 201) is valid


def test_username_is_normalized_and_unique_case_insensitively(auth_client):
    client, _ = auth_client
    first = signup(client, "first@example.com", username="Mixed_Case")
    assert first.status_code == 201
    assert first.json()["user"]["username"] == "mixed_case"
    duplicate = signup(client, "second@example.com", username="MIXED_CASE")
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "USERNAME_UNAVAILABLE"


def test_login_uses_generic_failures_and_restores_session(auth_client):
    client, _ = auth_client
    assert signup(client).status_code == 201
    client.cookies.clear()
    wrong = login(client, password="wrong password")
    unknown = login(client, identifier="unknown@example.com")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"]["message"] == unknown.json()["error"]["message"]
    assert login(client).status_code == 200
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200 and me.json()["user"]["email"] == "owner@example.com"


def test_login_accepts_email_or_username_and_keeps_failures_generic(auth_client):
    client, _ = auth_client
    assert signup(client, username="Owner_Name").status_code == 201
    client.cookies.clear()
    assert login(client, "owner@example.com").status_code == 200
    client.cookies.clear()
    assert login(client, "OWNER_NAME").status_code == 200
    client.cookies.clear()
    unknown = login(client, "missing_user")
    wrong = login(client, "owner_name", "not the password")
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["error"]["message"] == "Invalid username/email or password."
    assert unknown.json()["error"]["message"] == wrong.json()["error"]["message"]


def test_profile_update_is_owned_validated_unique_and_csrf_protected(auth_client):
    client, engine = auth_client
    assert signup(client, "first@example.com", username="first_user").status_code == 201
    csrf = client.headers.pop("X-CSRF-Token")
    denied = client.patch(
        "/api/v1/auth/profile",
        json={"full_name": "First Updated", "username": "first_updated"},
    )
    assert denied.status_code == 403
    client.headers["X-CSRF-Token"] = csrf
    malformed = client.patch(
        "/api/v1/auth/profile",
        json={"full_name": "<b>Injected</b>", "username": "bad user"},
    )
    assert malformed.status_code == 422
    spoofed = client.patch(
        "/api/v1/auth/profile",
        json={
            "full_name": "First Updated",
            "username": "first_updated",
            "user_id": str(uuid4()),
            "email": "attacker@example.com",
        },
    )
    assert spoofed.status_code == 422
    updated = client.patch(
        "/api/v1/auth/profile",
        json={"full_name": "María O’Neill", "username": "First_Updated"},
    )
    assert updated.status_code == 200
    assert updated.json()["user"]["full_name"] == "María O’Neill"
    assert updated.json()["user"]["username"] == "first_updated"
    assert updated.json()["user"]["email"] == "first@example.com"
    with TestClient(create_app(client.app.state.settings)) as other:
        assert signup(other, "other@example.com", username="other_user").status_code == 201
        duplicate = other.patch(
            "/api/v1/auth/profile",
            json={"full_name": "Other User", "username": "FIRST_UPDATED"},
        )
        assert duplicate.status_code == 409
    with Session(engine) as session:
        first = session.scalar(select(User).where(User.email == "first@example.com"))
        other = session.scalar(select(User).where(User.email == "other@example.com"))
        assert first.username == "first_updated"
        assert other.username == "other_user"


def test_legacy_user_can_sign_in_and_complete_nullable_profile(auth_client):
    client, engine = auth_client
    with Session(engine) as session:
        session.add(User(email="legacy@example.com", password_hash=PasswordHasher().hash(PASSWORD)))
        session.commit()
    restored = login(client, "legacy@example.com")
    assert restored.status_code == 200
    assert restored.json()["user"]["full_name"] is None
    assert restored.json()["user"]["username"] is None
    completed = client.patch(
        "/api/v1/auth/profile",
        json={"full_name": "Legacy User", "username": "legacy_user"},
    )
    assert completed.status_code == 200
    assert completed.json()["user"]["username"] == "legacy_user"


def test_profile_update_requires_authentication(auth_client):
    client, _ = auth_client
    response = client.patch(
        "/api/v1/auth/profile",
        json={"full_name": "Unknown User", "username": "unknown_user"},
        headers={"Origin": ORIGIN, "X-CSRF-Token": "x" * 32},
    )
    assert response.status_code == 401


def test_password_reset_is_generic_digest_only_single_use_and_revokes_sessions(auth_client):
    client, engine = auth_client
    assert signup(client, username="reset_user").status_code == 201
    first_cookie = client.cookies.get("scamguard_session")
    with TestClient(create_app(client.app.state.settings)) as second:
        assert login(second, "reset_user").status_code == 200
        second_cookie = second.cookies.get("scamguard_session")
        existing = client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "owner@example.com"},
            headers={"Origin": ORIGIN},
        )
        missing = client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "missing@example.com"},
            headers={"Origin": ORIGIN},
        )
        assert existing.status_code == missing.status_code == 202
        assert existing.json() == missing.json()
        token = captured_reset_token(client)
        with Session(engine) as session:
            stored = session.scalar(select(PasswordResetToken))
            assert stored is not None
            assert stored.token_hash != token and token not in stored.token_hash
            assert len(stored.token_hash) == 64
        new_password = "a new correct horse battery staple"
        confirmed = client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": token, "password": new_password},
            headers={"Origin": ORIGIN},
        )
        assert confirmed.status_code == 204
        client.cookies.set("scamguard_session", first_cookie)
        second.cookies.set("scamguard_session", second_cookie)
        assert client.get("/api/v1/auth/me").status_code == 401
        assert second.get("/api/v1/auth/me").status_code == 401
        replay = client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": token, "password": "another long replacement password"},
            headers={"Origin": ORIGIN},
        )
        assert replay.status_code == 400
        assert login(client, "reset_user", PASSWORD).status_code == 401
        assert login(client, "reset_user", new_password).status_code == 200


def test_password_reset_rejects_invalid_expired_and_malformed_tokens(auth_client):
    client, engine = auth_client
    assert signup(client, username="expiry_user").status_code == 201
    assert (
        client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "owner@example.com"},
            headers={"Origin": ORIGIN},
        ).status_code
        == 202
    )
    token = captured_reset_token(client)
    malformed = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": "short", "password": "long enough replacement"},
        headers={"Origin": ORIGIN},
    )
    assert malformed.status_code == 422
    weak_password = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": "x" * 43, "password": "too short"},
        headers={"Origin": ORIGIN},
    )
    assert weak_password.status_code == 422
    guessed = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": "x" * 43, "password": "long enough replacement"},
        headers={"Origin": ORIGIN},
    )
    assert guessed.status_code == 400
    with Session(engine) as session:
        stored = session.scalar(select(PasswordResetToken))
        stored.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        session.commit()
    expired = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "password": "long enough replacement"},
        headers={"Origin": ORIGIN},
    )
    assert expired.status_code == 400


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
        json={
            "full_name": "Person Example",
            "username": "person_user",
            "email": "person@example.com",
            "password": PASSWORD,
        },
    )
    assert missing_origin.status_code == 403
    assert signup(client).status_code == 201
    csrf = client.headers.pop("X-CSRF-Token")
    assert submit_message(client).status_code == 403
    client.headers["X-CSRF-Token"] = "incorrect"
    assert submit_message(client).status_code == 403
    client.headers["X-CSRF-Token"] = csrf
    assert submit_message(client).status_code == 201


def test_unauthenticated_phone_submission_is_rejected(auth_client):
    client, _ = auth_client
    response = client.post(
        "/api/v1/analyses",
        json={"input_type": "PHONE", "content": "+44 20 7946 0958"},
        headers={"Origin": ORIGIN},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"


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


def test_phone_analysis_inherits_multi_user_ownership(auth_client):
    client_a, _ = auth_client
    assert signup(client_a, "phone-a@example.com").status_code == 201
    analysis_a = submit_phone(client_a).json()
    assert analysis_a["input_type"] == "PHONE"
    with TestClient(create_app(auth_client[0].app.state.settings)) as client_b:
        assert signup(client_b, "phone-b@example.com").status_code == 201
        assert client_b.get(f"/api/v1/analyses/{analysis_a['id']}").status_code == 404
        assert client_b.delete(f"/api/v1/analyses/{analysis_a['id']}").status_code == 404
        assert client_b.get("/api/v1/analyses").json()["total"] == 0
    assert client_a.get(f"/api/v1/analyses/{analysis_a['id']}").status_code == 200


def test_user_id_cannot_be_supplied_and_legacy_rows_remain_private(auth_client):
    client, engine = auth_client
    assert signup(client).status_code == 201
    spoofed = client.post(
        "/api/v1/analyses",
        json={"input_type": "MESSAGE", "content": "private", "user_id": str(uuid4())},
    )
    assert spoofed.status_code == 422
    spoofed_phone = client.post(
        "/api/v1/analyses",
        json={"input_type": "PHONE", "content": "+44 20 7946 0958", "user_id": str(uuid4())},
    )
    assert spoofed_phone.status_code == 422
    with Session(engine) as session:
        legacy = Analysis(input_type="MESSAGE", content="Legacy unowned analysis")
        session.add(legacy)
        session.commit()
        legacy_id = legacy.id
    assert client.get(f"/api/v1/analyses/{legacy_id}").status_code == 404
    assert client.get("/api/v1/analyses").json()["total"] == 0
    with Session(engine) as session:
        assert session.get(Analysis, legacy_id) is not None


def test_completed_analysis_has_no_mutation_endpoint(auth_client):
    client, _ = auth_client
    assert signup(client).status_code == 201
    record = submit_message(client, "Original immutable evidence").json()
    response = client.patch(
        f"/api/v1/analyses/{record['id']}",
        json={"content": "Changed evidence", "status": "COMPLETED"},
    )
    assert response.status_code == 405
    unchanged = client.get(f"/api/v1/analyses/{record['id']}").json()
    assert unchanged["content"] == "Original immutable evidence"


def test_account_deletion_is_transactional_and_cascades_private_data(auth_client):
    client, engine = auth_client
    assert signup(client).status_code == 201
    assert submit_message(client).status_code == 201
    assert submit_phone(client).status_code == 201
    assert (
        client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "owner@example.com"},
            headers={"Origin": ORIGIN},
        ).status_code
        == 202
    )
    wrong = client.request("DELETE", "/api/v1/auth/account", json={"password": "wrong password"})
    assert wrong.status_code == 401
    deleted = client.request("DELETE", "/api/v1/auth/account", json={"password": PASSWORD})
    assert deleted.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(User)) == 0
        assert session.scalar(select(func.count()).select_from(AuthSession)) == 0
        assert session.scalar(select(func.count()).select_from(PasswordResetToken)) == 0
        assert session.scalar(select(func.count()).select_from(Analysis)) == 0


def test_database_backed_login_rate_limit(auth_database):
    config, engine = auth_database
    limited = config.model_copy(update={"login_rate_limit": 2})
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE TABLE analyses, auth_sessions, password_reset_tokens, users, "
                "auth_rate_limits"
            )
        )
    with TestClient(create_app(limited)) as client:
        for _ in range(2):
            assert login(client, "unknown@example.com", "wrong password").status_code == 401
        blocked = login(client, "unknown@example.com", "wrong password")
        assert blocked.status_code == 429
        assert int(blocked.headers["retry-after"]) > 0


def test_phone_submission_uses_database_backed_analysis_rate_limit(auth_database):
    config, engine = auth_database
    limited = config.model_copy(update={"analysis_rate_limit": 2})
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE TABLE analyses, auth_sessions, password_reset_tokens, users, "
                "auth_rate_limits"
            )
        )
    with TestClient(create_app(limited)) as client:
        assert signup(client, "phone-limit@example.com").status_code == 201
        assert submit_phone(client, "+44 20 7946 0958").status_code == 201
        assert submit_phone(client, "+1 202 555 0123").status_code == 201
        blocked = submit_phone(client, "+60 12 345 6789")
        assert blocked.status_code == 429
        assert blocked.json()["error"]["code"] == "RATE_LIMITED"
        assert int(blocked.headers["retry-after"]) > 0


def test_password_reset_request_and_confirmation_use_database_rate_limits(auth_database):
    config, engine = auth_database
    limited = config.model_copy(
        update={
            "password_reset_request_rate_limit": 1,
            "password_reset_confirm_rate_limit": 1,
        }
    )
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE TABLE analyses, auth_sessions, password_reset_tokens, users, "
                "auth_rate_limits"
            )
        )
    with TestClient(create_app(limited)) as client:
        first = client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "unknown@example.com"},
            headers={"Origin": ORIGIN},
        )
        second = client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "unknown@example.com"},
            headers={"Origin": ORIGIN},
        )
        assert first.status_code == 202
        assert second.status_code == 429
        invalid = {
            "token": "x" * 43,
            "password": "long enough replacement password",
        }
        assert (
            client.post(
                "/api/v1/auth/password-reset/confirm",
                json=invalid,
                headers={"Origin": ORIGIN},
            ).status_code
            == 400
        )
        blocked = client.post(
            "/api/v1/auth/password-reset/confirm",
            json=invalid,
            headers={"Origin": ORIGIN},
        )
        assert blocked.status_code == 429
        assert int(blocked.headers["retry-after"]) > 0
