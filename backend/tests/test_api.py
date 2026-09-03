from unittest.mock import MagicMock
from uuid import UUID

from fastapi import Query
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.db.session import get_session


def test_health_is_liveness_and_does_not_need_a_database(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "scamguard-my-api", "version": "0.1.0"}
    UUID(response.headers["x-request-id"])
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_dashboard_is_unconfigured_not_fabricated_statistics(client):
    response = client.get("/api/v1/dashboard")
    assert response.status_code == 200
    assert response.json() == {
        "status": "not_configured",
        "total_analyses": None,
        "flagged_analyses": None,
        "last_analysis_at": None,
        "recent_analyses": [],
    }


def test_capabilities_do_not_enable_analysis(client):
    response = client.get("/api/v1/capabilities")
    assert response.json() == {
        "analysis_available": False,
        "supported_inputs": [],
        "reason": "Analysis is not enabled in this release.",
    }
    assert client.post("/api/v1/analyse", json={"content": "test-only"}).status_code == 404


def test_readiness_probes_database(app, client):
    session = MagicMock(spec=Session)
    app.dependency_overrides[get_session] = lambda: session
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "connected"}
    assert str(session.execute.call_args.args[0]) == "SELECT 1"


def test_readiness_returns_safe_503_when_database_fails(app, client):
    session = MagicMock(spec=Session)
    session.execute.side_effect = OperationalError("SELECT 1", {}, Exception("secret-connection"))
    app.dependency_overrides[get_session] = lambda: session
    response = client.get("/api/v1/ready")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "DATABASE_UNAVAILABLE"
    assert "secret-connection" not in response.text
    assert response.json()["error"]["request_id"] == response.headers["x-request-id"]


def test_missing_route_and_method_use_error_envelope(client):
    missing = client.get("/missing")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "HTTP_404"
    method = client.post("/api/v1/health")
    assert method.status_code == 405
    assert method.json()["error"]["code"] == "HTTP_405"
    assert "GET" in method.headers["allow"]


def test_cors_only_allows_configured_origins(client):
    accepted = client.get("/api/v1/health", headers={"Origin": "http://localhost:5173"})
    assert accepted.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "X-Request-ID" in accepted.headers["access-control-expose-headers"]
    rejected = client.get("/api/v1/health", headers={"Origin": "https://untrusted.example"})
    assert "access-control-allow-origin" not in rejected.headers


def test_unhandled_errors_are_safe_and_keep_request_headers(app):
    @app.get("/test-only/failure")
    def fail():
        raise RuntimeError("secret-user-content")

    with TestClient(app) as client:
        response = client.get("/test-only/failure", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert response.json()["error"]["request_id"] == response.headers["x-request-id"]
    assert "secret-user-content" not in response.text
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_validation_errors_do_not_echo_input(app):
    @app.get("/test-only/validation")
    def validate(count: int = Query()):
        return {"count": count}

    with TestClient(app) as client:
        response = client.get("/test-only/validation?count=private-value")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert response.json()["error"]["details"] == [
        {"field": "query.count", "message": "Invalid value."}
    ]
    assert "private-value" not in response.text


def test_client_request_id_cannot_spoof_server_reference(client):
    response = client.get("/api/v1/health", headers={"X-Request-ID": "spoofed"})
    assert response.headers["x-request-id"] != "spoofed"
