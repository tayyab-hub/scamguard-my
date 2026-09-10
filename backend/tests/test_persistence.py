"""Real PostgreSQL tests. TEST_DATABASE_URL must name a disposable *_test database."""

import os
import subprocess
import sys
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import hash_password
from app.core.config import Settings
from app.db.models import Analysis, InputType, User
from app.db.session import build_engine
from app.main import create_app
from app.services.analyses import list_submissions
from tests.qr_fixtures import multiple_qr_image_bytes, qr_image_bytes

pytestmark = pytest.mark.integration
ORIGIN = "http://localhost:5173"
PASSWORD = "correct horse battery staple"


def sign_in(client: TestClient, email: str = "owner@example.com") -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": email, "password": PASSWORD},
        headers={"Origin": ORIGIN},
    )
    assert response.status_code == 200
    client.headers.update({"Origin": ORIGIN, "X-CSRF-Token": response.json()["csrf_token"]})


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
    assert {
        "analyses",
        "users",
        "auth_sessions",
        "auth_rate_limits",
        "password_reset_tokens",
    }.issubset(inspect(engine).get_table_names())
    subprocess.run([sys.executable, "-m", "alembic", "check"], cwd=root, env=env, check=True)
    # A Task 6.1 profile and owned analysis survive the 0005 -> 0006 QR constraint upgrade.
    migrate("0005_auth_profile_polish", "downgrade")
    task_6_1_user_id = uuid4()
    task_6_1_analysis_id = uuid4()
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO users (id, full_name, username, email, password_hash) VALUES "
                "(:id, 'Preserved User', 'preserved_user', 'preserved@example.com', 'test-hash')"
            ),
            {"id": task_6_1_user_id},
        )
        connection.execute(
            text(
                "INSERT INTO analyses (id, user_id, input_type, status, content) VALUES "
                "(:id, :user_id, 'MESSAGE', 'COMPLETED', 'Preserved Task 6.1 analysis')"
            ),
            {"id": task_6_1_analysis_id, "user_id": task_6_1_user_id},
        )
    migrate("head")
    with engine.begin() as connection:
        assert (
            connection.scalar(
                text("SELECT count(*) FROM users WHERE id = :id AND username = 'preserved_user'"),
                {"id": task_6_1_user_id},
            )
            == 1
        )
        assert (
            connection.scalar(
                text("SELECT count(*) FROM analyses WHERE id = :id AND input_type = 'MESSAGE'"),
                {"id": task_6_1_analysis_id},
            )
            == 1
        )
        connection.execute(
            text(
                "TRUNCATE TABLE analyses, auth_sessions, password_reset_tokens, users, "
                "auth_rate_limits"
            )
        )
    # An actual Task 5/6 user and owned analysis survive the staged 0004 -> 0005 upgrade.
    migrate("0004_phone_intelligence", "downgrade")
    legacy_user_id = uuid4()
    legacy_analysis_id = uuid4()
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO users (id, email, password_hash) "
                "VALUES (:id, 'legacy@example.com', 'legacy-test-hash')"
            ),
            {"id": legacy_user_id},
        )
        connection.execute(
            text(
                "INSERT INTO analyses (id, user_id, input_type, status, content) VALUES "
                "(:id, :user_id, 'PHONE', 'COMPLETED', '+442079460958')"
            ),
            {"id": legacy_analysis_id, "user_id": legacy_user_id},
        )
    migrate("head")
    with engine.begin() as connection:
        legacy = connection.execute(
            text("SELECT full_name, username, email FROM users WHERE id = :id"),
            {"id": legacy_user_id},
        ).one()
        assert legacy == (None, None, "legacy@example.com")
        assert (
            connection.scalar(
                text("SELECT count(*) FROM analyses WHERE id = :id AND user_id = :user_id"),
                {"id": legacy_analysis_id, "user_id": legacy_user_id},
            )
            == 1
        )
        connection.execute(
            text(
                "TRUNCATE TABLE analyses, auth_sessions, password_reset_tokens, users, "
                "auth_rate_limits"
            )
        )
    # The round-trip is intentionally destructive and only runs against *_test.
    # Clear Task 6 PHONE rows before restoring the older MESSAGE/URL-only constraint.
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE TABLE analyses, auth_sessions, password_reset_tokens, users, "
                "auth_rate_limits"
            )
        )
    migrate("0003_auth_ownership", "downgrade")
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO analyses (id, input_type, status, content) VALUES "
                "(:message_id, 'MESSAGE', 'SUBMITTED', 'preserved message'), "
                "(:url_id, 'URL', 'SUBMITTED', 'https://example.com/preserved')"
            ),
            {"message_id": uuid4(), "url_id": uuid4()},
        )
    migrate("head")
    with engine.begin() as connection:
        preserved = connection.execute(
            text("SELECT input_type, content FROM analyses ORDER BY input_type")
        ).all()
        assert preserved == [
            ("MESSAGE", "preserved message"),
            ("URL", "https://example.com/preserved"),
        ]
        connection.execute(
            text(
                "TRUNCATE TABLE analyses, auth_sessions, password_reset_tokens, users, "
                "auth_rate_limits"
            )
        )
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
        connection.execute(
            text(
                "TRUNCATE TABLE analyses, auth_sessions, password_reset_tokens, users, "
                "auth_rate_limits"
            )
        )
    with TestClient(create_app(config)) as client:
        response = client.post(
            "/api/v1/auth/signup",
            json={
                "full_name": "Owner Example",
                "username": "owner_user",
                "email": "owner@example.com",
                "password": PASSWORD,
            },
            headers={"Origin": ORIGIN},
        )
        assert response.status_code == 201
        client.headers.update({"Origin": ORIGIN, "X-CSRF-Token": response.json()["csrf_token"]})
        yield client
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE TABLE analyses, auth_sessions, password_reset_tokens, users, "
                "auth_rate_limits"
            )
        )


@pytest.mark.parametrize(
    "mode,content",
    [
        ("MESSAGE", "  Private test message  "),
        ("URL", " https://example.com/path?q=test "),
        ("PHONE", " +44 (20) 7946-0958 "),
    ],
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
    elif mode == "URL":
        assert record["status"] == "COMPLETED"
        assert record["assessment"]["components"]["url_model"]["status"] == "COMPLETED"
    else:
        assert record["status"] == "COMPLETED"
        assert record["assessment"]["risk_level"] == "INSUFFICIENT_EVIDENCE"
        assert record["assessment"]["components"]["phone_metadata"]["valid"] is True
    assert record["content"] == ("+442079460958" if mode == "PHONE" else content.strip())
    assert persistent.get(f"/api/v1/analyses/{record['id']}").json() == record
    # A fresh application/engine reads the committed row, not in-memory state.
    with TestClient(create_app(database[0])) as restarted:
        sign_in(restarted)
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
        {"input_type": "PHONE", "content": "202 555 0100"},
        {"input_type": "PHONE", "content": "+44<script>"},
        {"input_type": "PHONE", "content": "+" + "1" * 16},
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
        "type_counts": {"MESSAGE": 0, "URL": 0, "PHONE": 0, "QR": 0},
        "risk_counts": {
            "LOW": 0,
            "CAUTION": 0,
            "ELEVATED": 0,
            "HIGH": 0,
            "INSUFFICIENT_EVIDENCE": 0,
        },
        "unassessed_analyses": 0,
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
            "payload_type",
        }
    assert persistent.get("/api/v1/analyses?page=9999").json()["items"] == []


def test_list_count_and_rows_use_one_database_snapshot(database):
    _, engine = database
    inserted = False
    with Session(engine) as session:
        user = User(email="snapshot@example.com", password_hash=hash_password("test password only"))
        session.add(user)
        session.commit()
        user_id = user.id

    def insert_after_count(_connection, _cursor, statement, _parameters, _context, _many):
        nonlocal inserted
        if inserted or "count(*)" not in statement.lower():
            return
        inserted = True
        with engine.begin() as writer:
            writer.execute(
                text(
                    "INSERT INTO analyses (id, user_id, input_type, status, content) "
                    "VALUES (:id, :user_id, 'MESSAGE', 'SUBMITTED', "
                    "'Concurrent test submission')"
                ),
                {"id": uuid4(), "user_id": user_id},
            )

    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE analyses"))
    event.listen(engine, "after_cursor_execute", insert_after_count)
    try:
        with Session(engine) as session:
            result = list_submissions(session, page=1, page_size=10, user_id=user_id)
    finally:
        event.remove(engine, "after_cursor_execute", insert_after_count)

    assert inserted is True
    assert result.total == 0
    assert result.items == []
    with Session(engine) as session:
        assert list_submissions(session, page=1, page_size=10, user_id=user_id).total == 1


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


def test_ready_and_capability_advertise_all_available_intelligence(persistent):
    assert persistent.get("/api/v1/ready").status_code == 200
    caps = persistent.get("/api/v1/capabilities").json()
    assert caps["submission_available"] is True
    assert caps["submission_inputs"] == ["MESSAGE", "URL", "PHONE", "QR"]
    assert caps["analysis_available"] is True
    assert caps["supported_inputs"] == ["MESSAGE", "URL", "PHONE", "QR"]


def test_phone_history_dashboard_deletion_and_persisted_metadata(persistent, database):
    response = persistent.post(
        "/api/v1/analyses",
        json={"input_type": "PHONE", "content": "+49 900 1 234567"},
    )
    assert response.status_code == 201
    record = response.json()
    assert record["content"] == "+499001234567"
    assert record["assessment"]["risk_level"] == "CAUTION"
    assert record["assessment"]["components"]["phone_metadata"]["number_type"] == "PREMIUM_RATE"
    history = persistent.get("/api/v1/analyses").json()
    assert history["items"][0]["input_type"] == "PHONE"
    assert history["items"][0]["preview"] == "+499001234567"
    dashboard = persistent.get("/api/v1/dashboard").json()
    assert dashboard["total_analyses"] == 1
    assert dashboard["recent_analyses"][0]["input_type"] == "PHONE"
    with Session(database[1]) as session:
        row = session.get(Analysis, record["id"])
        assert row.model_version is None
        assert row.rules_version == "phone-rules-v1"
        assert row.fusion_version == "phone-fusion-v1"
    assert persistent.delete(f"/api/v1/analyses/{record['id']}").status_code == 204
    assert persistent.get("/api/v1/analyses").json()["total"] == 0


def test_qr_upload_history_dashboard_ownership_and_deletion(persistent, database):
    payload = "https://example.com/controlled-qr"
    response = persistent.post(
        "/api/v1/analyses/qr",
        files={"file": ("odd <script> name", qr_image_bytes(payload), "image/png")},
    )
    assert response.status_code == 201
    record = response.json()
    assert record["input_type"] == "QR"
    assert record["content"] == payload
    assert record["status"] == "COMPLETED"
    assert record["assessment"]["components"]["qr"]["payload_type"] == "URL"
    assert record["assessment"]["components"]["qr"]["routed_engine"] == "URL"
    assert record["assessment"]["components"]["qr"]["original_image_retained"] is False
    assert record["assessment"]["components"]["url_structure"]["hostname"] == "example.com"
    assert persistent.get(f"/api/v1/analyses/{record['id']}").json() == record
    history = persistent.get("/api/v1/analyses").json()
    assert history["items"][0]["input_type"] == "QR"
    assert history["items"][0]["payload_type"] == "URL"
    dashboard = persistent.get("/api/v1/dashboard").json()
    assert dashboard["total_analyses"] == 1
    assert dashboard["recent_analyses"][0]["input_type"] == "QR"

    with TestClient(create_app(database[0])) as other:
        signup = other.post(
            "/api/v1/auth/signup",
            json={
                "full_name": "Other User",
                "username": "other_qr_user",
                "email": "other-qr@example.com",
                "password": PASSWORD,
            },
            headers={"Origin": ORIGIN},
        )
        other.headers.update({"Origin": ORIGIN, "X-CSRF-Token": signup.json()["csrf_token"]})
        assert other.get(f"/api/v1/analyses/{record['id']}").status_code == 404
        assert other.delete(f"/api/v1/analyses/{record['id']}").status_code == 404
        assert other.get("/api/v1/analyses").json()["total"] == 0

    assert persistent.delete(f"/api/v1/analyses/{record['id']}").status_code == 204
    assert persistent.get("/api/v1/analyses").json()["total"] == 0
    with Session(database[1]) as session:
        assert session.get(Analysis, UUID(record["id"])) is None


def test_anonymous_qr_upload_is_rejected_before_analysis(database):
    with TestClient(create_app(database[0])) as anonymous:
        response = anonymous.post(
            "/api/v1/analyses/qr",
            files={"file": ("qr.png", qr_image_bytes("private QR payload"), "image/png")},
            headers={"Origin": ORIGIN},
        )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"


@pytest.mark.parametrize(
    ("files", "code"),
    [
        ({"file": ("renamed.png", b"not an image", "image/png")}, "QR_IMAGE_INVALID"),
        (
            {"file": ("multiple.png", multiple_qr_image_bytes(), "image/png")},
            "QR_MULTIPLE_DETECTED",
        ),
        (
            [
                ("file", ("one.png", qr_image_bytes("one QR"), "image/png")),
                ("file", ("two.png", qr_image_bytes("two QR"), "image/png")),
            ],
            "QR_FILE_COUNT_INVALID",
        ),
    ],
    ids=["renamed-text", "multiple-symbols", "multiple-files"],
)
def test_invalid_qr_uploads_never_persist(persistent, files, code):
    response = persistent.post("/api/v1/analyses/qr", files=files)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == code
    assert persistent.get("/api/v1/analyses").json()["total"] == 0


@pytest.mark.parametrize(
    ("payload", "forbidden", "expected"),
    [
        (
            "https://alice:super-secret@example.com/pay",
            ["alice", "super-secret"],
            "https://@example.com/pay",
        ),
        (
            r"WIFI:T:WPA;S:Example;P:top\;secret;;",
            ["top", "secret"],
            r"WIFI:T:WPA;S:Example;P:[redacted];;",
        ),
    ],
)
def test_qr_history_redacts_embedded_credentials(persistent, payload, forbidden, expected):
    created = persistent.post(
        "/api/v1/analyses/qr",
        files={"file": ("private.png", qr_image_bytes(payload), "image/png")},
    )
    assert created.status_code == 201
    saved = persistent.get(f"/api/v1/analyses/{created.json()['id']}").json()
    assert saved["content"] == expected
    for secret in forbidden:
        assert secret not in saved["content"]


def test_phone_pipeline_failure_is_persisted_and_safe(persistent, monkeypatch):
    def fail(content):
        raise RuntimeError("private phone content must not leak")

    monkeypatch.setattr(persistent.app.state.phone_engine, "analyse", fail)
    result = persistent.post(
        "/api/v1/analyses", json={"input_type": "PHONE", "content": "+1 202 555 0123"}
    ).json()
    assert result["status"] == "FAILED"
    assert result["failure_code"] == "PHONE_ANALYSIS_FAILED"
    assert result["assessment"] is None


def test_database_constraints_and_rollback(database, persistent):
    with Session(database[1]) as session:
        user_id = session.scalar(select(User.id).where(User.email == "owner@example.com"))
        session.add(Analysis(input_type=InputType.MESSAGE, content="", user_id=user_id))
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()
        session.add(
            Analysis(input_type=InputType.MESSAGE, content="Valid after rollback", user_id=user_id)
        )
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
        sign_in(restarted)
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
        assert persistent.get(f"/api/v1/analyses/{identity}").status_code == 404
    with Session(database[1]) as session:
        assert session.query(Analysis).filter(Analysis.id.in_(ids)).count() == 2
