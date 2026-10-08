"""Authentication and diagnostics regressions against isolated real PostgreSQL."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AuthSession
from app.main import create_app
from tests.test_auth import auth_client as shared_client
from tests.test_auth import auth_database as shared_database
from tests.test_auth import login, signup, submit_message

auth_client = shared_client
auth_database = shared_database
pytestmark = pytest.mark.integration


def test_login_rotation_revokes_the_presented_old_session(auth_client):
    client, engine = auth_client
    signup(client)
    old_token = client.cookies.get("scamguard_session")
    assert login(client).status_code == 200
    assert client.cookies.get("scamguard_session") != old_token
    with Session(engine) as session:
        rows = session.scalars(select(AuthSession)).all()
        assert len(rows) == 2
        assert sum(row.revoked_at is not None for row in rows) == 1
    with TestClient(create_app(client.app.state.settings)) as stale:
        stale.cookies.set("scamguard_session", old_token)
        assert stale.get("/api/v1/auth/me").status_code == 401


def test_username_and_email_share_login_budget_across_clients(auth_client, monkeypatch):
    client, _ = auth_client
    signup(client)
    monkeypatch.setattr(client.app.state.settings, "login_rate_limit", 2)
    assert login(client, "owner_user", "wrong").status_code == 401
    assert login(client, "owner@example.com", "wrong").status_code == 401
    with TestClient(create_app(client.app.state.settings), client=("198.51.100.2", 1000)) as other:
        response = login(other, "owner_user", "wrong")
    assert response.status_code == 429
    assert 1 <= int(response.headers["Retry-After"]) <= 900


def test_source_budget_bounds_identifier_spraying_before_password_work(auth_client, monkeypatch):
    client, _ = auth_client
    monkeypatch.setattr(client.app.state.settings, "login_rate_limit", 1)
    for index in range(5):
        assert login(client, f"unknown_{index}", "wrong").status_code == 401
    assert login(client, "another_unknown", "wrong").status_code == 429


def test_account_deletion_password_attempts_are_bounded(auth_client, monkeypatch):
    client, _ = auth_client
    signup(client)
    monkeypatch.setattr(client.app.state.settings, "login_rate_limit", 1)
    assert (
        client.request("DELETE", "/api/v1/auth/account", json={"password": "wrong"}).status_code
        == 401
    )
    assert (
        client.request("DELETE", "/api/v1/auth/account", json={"password": "wrong"}).status_code
        == 429
    )
    assert client.get("/api/v1/auth/me").status_code == 200


def test_engine_failure_logs_correlation_without_private_content(auth_client, monkeypatch, caplog):
    client, _ = auth_client
    signup(client)
    private = "private-content-must-not-be-logged"

    def fail(_content):
        raise RuntimeError(private)

    monkeypatch.setattr(client.app.state.message_engine, "analyse", fail)
    response = submit_message(client, private)
    assert response.status_code == 201
    result = response.json()
    assert result["status"] == "FAILED"
    assert result["id"] in caplog.text
    assert "exception_type=RuntimeError" in caplog.text
    assert private not in caplog.text


def test_capabilities_report_degraded_url_and_unavailable_decoder(auth_client, monkeypatch):
    client, _ = auth_client
    monkeypatch.setattr(client.app.state.url_engine, "classifier", None)
    monkeypatch.setattr(client.app.state.qr_engine, "operational", False)
    result = client.get("/api/v1/capabilities").json()
    assert "QR" not in result["supported_inputs"]
    assert "structural rules only" in result["reason"]
    assert client.get("/api/v1/ready").status_code == 503
