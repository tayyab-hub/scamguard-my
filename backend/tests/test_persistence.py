"""Real PostgreSQL tests. TEST_DATABASE_URL must name a disposable *_test database."""

import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.models import Analysis, InputType
from app.db.session import build_engine
from app.main import create_app
from app.services.analyses import list_submissions

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def database():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL is required for real PostgreSQL integration")
    assert make_url(url).database.endswith("_test"), "Use a disposable *_test database"
    config = Settings(_env_file=None, app_env="test", database_url=url, persistence_enabled=True)
    engine = build_engine(config)
    env = {**os.environ, "DATABASE_URL": url}
    root = Path(__file__).resolve().parents[1]

    def migrate(target, direction="upgrade"):
        subprocess.run(
            [sys.executable, "-m", "alembic", direction, target], cwd=root, env=env, check=True
        )

    migrate("head")
    assert "analyses" in inspect(engine).get_table_names()
    subprocess.run([sys.executable, "-m", "alembic", "check"], cwd=root, env=env, check=True)
    migrate("base", "downgrade")
    assert "analyses" not in inspect(engine).get_table_names()
    migrate("head")
    assert "analyses" in inspect(engine).get_table_names()
    yield config, engine
    engine.dispose()


@pytest.fixture
def persistent(database):
    config, engine = database
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE analyses"))
    with TestClient(create_app(config)) as client:
        yield client
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE analyses"))


@pytest.mark.parametrize(
    "mode,content",
    [("MESSAGE", "  Private test message  "), ("URL", " https://example.com/path?q=test ")],
)
def test_create_read_and_restart(persistent, database, mode, content):
    response = persistent.post("/api/v1/analyses", json={"input_type": mode, "content": content})
    assert response.status_code == 201
    record = response.json()
    assert set(record) == {
        "id",
        "input_type",
        "content",
        "status",
        "created_at",
        "updated_at",
        "assessment",
        "failure_code",
    }
    if mode == "MESSAGE":
        assert record["status"] == "COMPLETED"
        assert record["assessment"]["risk_level"] in {
            "LOW",
            "CAUTION",
            "ELEVATED",
            "HIGH",
            "INSUFFICIENT_EVIDENCE",
        }
        assert record["assessment"]["components"]["local_model"]["used"] is True
    else:
        assert record["status"] == "COMPLETED"
        assert record["assessment"]["components"]["url_model"]["status"] == "COMPLETED"
    assert record["content"] == content.strip()
    assert persistent.get(f"/api/v1/analyses/{record['id']}").json() == record
    # A fresh application/engine reads the committed row, not in-memory state.
    with TestClient(create_app(database[0])) as restarted:
        assert restarted.get(f"/api/v1/analyses/{record['id']}").json() == record


@pytest.mark.parametrize(
    "payload",
    [
        {"input_type": "MESSAGE", "content": "  "},
        {"input_type": "MESSAGE", "content": "x" * 5001},
        {"input_type": "MESSAGE", "content": "bad\u0000text"},
        {"input_type": "URL", "content": "not a URL"},
        {"input_type": "URL", "content": "javascript:alert(1)"},
        {"input_type": "URL", "content": "https://example.com:99999"},
        {"input_type": "URL", "content": "https://%"},
        {"input_type": "URL", "content": "https://example.com/" + "x" * 2048},
        {"input_type": "PHONE", "content": "+1 202 555 0100"},
        {"input_type": "QR", "content": "test image"},
        {"input_type": "OTHER", "content": "private"},
        {"input_type": "MESSAGE", "content": 123},
        {"input_type": "MESSAGE", "content": "private", "status": "COMPLETED"},
    ],
)
def test_invalid_submissions_never_persist(persistent, payload):
    response = persistent.post("/api/v1/analyses", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "secret" not in response.text and "private" not in response.text
    assert persistent.get("/api/v1/analyses").json()["total"] == 0


def test_real_dashboard_order_pagination_and_safe_previews(persistent):
    empty = persistent.get("/api/v1/dashboard").json()
    assert empty == {
        "status": "ready",
        "total_analyses": 0,
        "flagged_analyses": 0,
        "last_analysis_at": None,
        "recent_analyses": [],
    }
    ids = []
    for number in range(7):
        response = persistent.post(
            "/api/v1/analyses",
            json={"input_type": "MESSAGE", "content": f"Test {number} " + "long " * 100},
        )
        ids.append(response.json()["id"])
    first = persistent.get("/api/v1/analyses?page_size=3").json()
    second = persistent.get("/api/v1/analyses?page_size=3&page=2").json()
    assert first["total"] == second["total"] == 7
    assert [item["id"] for item in first["items"]] == list(reversed(ids))[:3]
    assert [item["id"] for item in second["items"]] == list(reversed(ids))[3:6]
    dashboard = persistent.get("/api/v1/dashboard").json()
    assert dashboard["total_analyses"] == 7
    assert isinstance(dashboard["flagged_analyses"], int)
    assert dashboard["last_analysis_at"] == first["items"][0]["created_at"]
    assert [item["id"] for item in dashboard["recent_analyses"]] == list(reversed(ids))[:5]
    for item in dashboard["recent_analyses"]:
        assert len(item["preview"]) <= 160
        assert set(item) == {
            "id",
            "input_type",
            "status",
            "created_at",
            "updated_at",
            "preview",
            "risk_level",
        }
    assert persistent.get("/api/v1/analyses?page=9999").json()["items"] == []


def test_list_count_and_rows_use_one_database_snapshot(database):
    _, engine = database
    inserted = False

    def insert_after_count(_connection, _cursor, statement, _parameters, _context, _many):
        nonlocal inserted
        if inserted or "count(*)" not in statement.lower():
            return
        inserted = True
        with engine.begin() as writer:
            writer.execute(
                text(
                    "INSERT INTO analyses (id, input_type, status, content) "
                    "VALUES (:id, 'MESSAGE', 'SUBMITTED', 'Concurrent test submission')"
                ),
                {"id": uuid4()},
            )

    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE analyses"))
    event.listen(engine, "after_cursor_execute", insert_after_count)
    try:
        with Session(engine) as session:
            result = list_submissions(session, page=1, page_size=10)
    finally:
        event.remove(engine, "after_cursor_execute", insert_after_count)

    assert inserted is True
    assert result.total == 0
    assert result.items == []
    with Session(engine) as session:
        assert list_submissions(session, page=1, page_size=10).total == 1


@pytest.mark.parametrize(
    "query", ["page=0", "page=-1", "page=10001", "page_size=0", "page_size=101"]
)
def test_pagination_bounds(persistent, query):
    assert persistent.get(f"/api/v1/analyses?{query}").status_code == 422


def test_detail_errors(persistent):
    assert persistent.get("/api/v1/analyses/not-a-uuid").status_code == 422
    response = persistent.get(f"/api/v1/analyses/{uuid4()}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ANALYSIS_NOT_FOUND"


def test_ready_and_capability_distinguish_message_from_url_intelligence(persistent):
    assert persistent.get("/api/v1/ready").status_code == 200
    caps = persistent.get("/api/v1/capabilities").json()
    assert caps["submission_available"] is True
    assert caps["submission_inputs"] == ["MESSAGE", "URL"]
    assert caps["analysis_available"] is True
    assert caps["supported_inputs"] == ["MESSAGE", "URL"]


def test_database_constraints_and_rollback(database, persistent):
    with Session(database[1]) as session:
        session.add(Analysis(input_type=InputType.MESSAGE, content=""))
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()
        session.add(Analysis(input_type=InputType.MESSAGE, content="Valid after rollback"))
        session.commit()
    assert persistent.get("/api/v1/analyses").json()["total"] == 1


def test_request_size_limit_and_post_cors(persistent):
    response = persistent.post(
        "/api/v1/analyses", content=b"x" * 70000, headers={"Origin": "http://localhost:5173"}
    )
    assert response.status_code == 413
    assert response.json()["error"]["request_id"] == response.headers["x-request-id"]
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    preflight = persistent.options(
        "/api/v1/analyses",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert preflight.status_code == 200
    assert "POST" in preflight.headers["access-control-allow-methods"]


def test_url_credentials_removed_and_history_never_reanalyses(persistent, database, monkeypatch):
    import json

    from app.url_intelligence.engine import URLIntelligenceEngine
    from app.url_intelligence.reputation import ReputationSignal

    class Provider:
        calls = 0

        def review(self, url):
            self.calls += 1
            assert "secret" not in url and "@" not in url
            return ReputationSignal(
                status="COMPLETED", provider="test-only", version="v1", verdict="MALICIOUS"
            )

    provider = Provider()
    persistent.app.state.url_engine.provider = provider
    response = persistent.post(
        "/api/v1/analyses",
        json={"input_type": "URL", "content": "https://alice:secret@example.com/login"},
    )
    result = response.json()
    assert result["status"] == "COMPLETED" and result["assessment"]["risk_level"] == "HIGH"
    assert "alice" not in response.text and "secret" not in response.text
    assert provider.calls == 1
    with Session(database[1]) as session:
        row = session.get(Analysis, result["id"])
        assert row.model_version == "url_ml_v1" and row.rules_version == "url_rules_v1"
        assert row.fusion_version == "url_fusion_v1" and row.ai_provider is None
        assert "secret" not in json.dumps(row.component_details) + row.content

    def forbidden(*args):
        raise AssertionError("History must not run intelligence")

    monkeypatch.setattr(URLIntelligenceEngine, "analyse", forbidden)
    assert persistent.get(f"/api/v1/analyses/{result['id']}").json() == result
    with TestClient(create_app(database[0])) as restarted:
        assert restarted.get(f"/api/v1/analyses/{result['id']}").json() == result
    assert provider.calls == 1


def test_url_pipeline_failure_is_persisted_and_safe(persistent, monkeypatch):
    def fail(content):
        raise RuntimeError("private submitted content must not leak")

    monkeypatch.setattr(persistent.app.state.url_engine, "analyse", fail)
    result = persistent.post(
        "/api/v1/analyses", json={"input_type": "URL", "content": "https://example.com/"}
    ).json()
    assert result["status"] == "FAILED" and result["failure_code"] == "URL_ANALYSIS_FAILED"
    assert result["assessment"] is None


def test_historical_message_and_url_intake_still_read(persistent, database):
    with Session(database[1]) as session:
        message = Analysis(input_type=InputType.MESSAGE, content="Historical message intake")
        url = Analysis(input_type=InputType.URL, content="https://example.org/historical")
        session.add_all([message, url])
        session.commit()
        ids = [str(message.id), str(url.id)]
    for identity in ids:
        result = persistent.get(f"/api/v1/analyses/{identity}").json()
        assert result["status"] == "SUBMITTED" and result["assessment"] is None
