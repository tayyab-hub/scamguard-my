"""Task 8 query/privacy and camera entry-point regressions on disposable PostgreSQL."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Analysis, AnalysisStatus, AuthSession, InputType
from app.main import create_app
from tests.test_auth import auth_client as shared_client
from tests.test_auth import auth_database as shared_database
from tests.test_auth import signup

auth_client = shared_client
auth_database = shared_database

pytestmark = pytest.mark.integration


def test_csrf_survives_other_tab_restoration_and_new_session_is_distinct(auth_client):
    client, engine = auth_client
    first = signup(client).json()["csrf_token"]
    assert client.get("/api/v1/auth/me").json()["csrf_token"] == first
    assert client.get("/api/v1/auth/me").json()["csrf_token"] == first
    assert (
        client.patch(
            "/api/v1/auth/profile",
            json={"full_name": "Two Tab User", "username": "two_tabs"},
            headers={"X-CSRF-Token": first},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            "/api/v1/auth/profile",
            json={"full_name": "Two Tab User", "username": "two_tabs"},
            headers={"X-CSRF-Token": "x" * 64},
        ).status_code
        == 403
    )
    with Session(engine) as session:
        row = session.scalar(select(AuthSession))
        assert row.csrf_token_hash != first
        assert row.token_hash != first
    login = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": "two_tabs",
            "password": "correct horse battery staple",
        },
    )
    assert login.status_code == 200
    assert login.json()["csrf_token"] != first


@pytest.mark.parametrize(
    "payload,payload_type",
    [
        ("https://example.com/camera", "URL"),
        ("tel:+442079460958", "PHONE"),
        ("WIFI:T:WPA;S:Example;P:private-camera-password;;", "WIFI"),
        ("javascript:alert(1)", "OTHER"),
        ("<script>window.location='https://example.com'</script>", "TEXT"),
        ("mailto:example@example.com", "EMAIL"),
        ("sms:+442079460958?body=example", "SMS"),
        ("geo:1,2", "GEO"),
    ],
)
def test_camera_payload_is_owned_inert_and_uses_qr_pipeline(auth_client, payload, payload_type):
    client, engine = auth_client
    owner = signup(client).json()["user"]["id"]
    response = client.post(
        "/api/v1/analyses/qr/payload",
        json={
            "payload": payload,
            "decoder": "zxing-wasm",
        },
    )
    assert response.status_code == 201
    record = response.json()
    qr = record["assessment"]["components"]["qr"]
    assert qr["source"] == "CAMERA"
    assert qr["payload_type"] == payload_type
    assert qr["image_format"] is None and qr["file_sha256"] is None
    assert qr["image_width"] is None and qr["image_height"] is None
    assert qr["decoder_version"] == "client-reported"
    assert qr["original_image_retained"] is False
    if payload_type == "WIFI":
        assert "private-camera-password" not in response.text
    if payload_type not in {"URL", "TEXT"}:
        assert record["assessment"]["risk_level"] == "INSUFFICIENT_EVIDENCE"
    with Session(engine) as session:
        row = session.get(Analysis, UUID(record["id"]))
        assert str(row.user_id) == owner
        assert "private-camera-password" not in row.content
    assert client.get(f"/api/v1/analyses/{record['id']}").json() == record
    assert client.delete(f"/api/v1/analyses/{record['id']}").status_code == 204


@pytest.mark.parametrize(
    "body",
    [
        {"payload": "", "decoder": "BarcodeDetector"},
        {"payload": "漢" * 2000, "decoder": "zxing-wasm"},
        {"payload": "a\x00b", "decoder": "zxing-wasm"},
        {"payload": "valid", "decoder": "invented-decoder"},
        {"payload": "valid", "decoder": "zxing-wasm", "user_id": "spoofed"},
        {"payload": 123, "decoder": "zxing-wasm"},
    ],
)
def test_camera_rejects_invalid_text_metadata_and_spoofing_without_persistence(auth_client, body):
    client, _ = auth_client
    signup(client)
    assert client.post("/api/v1/analyses/qr/payload", json=body).status_code == 422
    assert client.get("/api/v1/dashboard").json()["total_analyses"] == 0


def test_camera_and_search_require_session_origin_csrf_and_camera_rate_limit(
    auth_client, monkeypatch
):
    client, _ = auth_client
    body = {"payload": "https://example.com", "decoder": "BarcodeDetector"}
    assert client.post("/api/v1/analyses/qr/payload", json=body).status_code == 401
    signup(client)
    for path, data in [("/analyses/qr/payload", body), ("/analyses/search", {"query": "private"})]:
        assert (
            client.post(
                f"/api/v1{path}", json=data, headers={"X-CSRF-Token": "invalid"}
            ).status_code
            == 403
        )
        assert (
            client.post(
                f"/api/v1{path}", json=data, headers={"Origin": "https://untrusted.example"}
            ).status_code
            == 403
        )
    monkeypatch.setattr(client.app.state.settings, "analysis_rate_limit", 1)
    assert client.post("/api/v1/analyses/qr/payload", json=body).status_code == 201
    assert client.post("/api/v1/analyses/qr/payload", json=body).status_code == 429


def test_search_filters_pagination_literal_matching_and_scoped_distribution(auth_client):
    client, engine = auth_client
    owner = UUID(signup(client).json()["user"]["id"])
    now = datetime(2026, 9, 1, tzinfo=UTC)
    risks = ["HIGH", "ELEVATED", "CAUTION", "LOW", "INSUFFICIENT_EVIDENCE", None]
    with Session(engine) as session:
        for index in range(15):
            session.add(
                Analysis(
                    user_id=owner,
                    input_type=list(InputType)[index % 4],
                    status=AnalysisStatus.COMPLETED
                    if risks[index % 6]
                    else AnalysisStatus.SUBMITTED,
                    content=f"Case {index:02d} with literal 50%_offer"
                    if index == 4
                    else f"Case {index:02d}",
                    risk_level=risks[index % 6],
                    result_summary="Specific evidence summary",
                    created_at=now + timedelta(days=index),
                )
            )
        session.add(
            Analysis(user_id=None, input_type=InputType.MESSAGE, content="hidden legacy 50%_offer")
        )
        session.commit()

    def search(**values):
        return client.post("/api/v1/analyses/search", json=values)

    assert search(query="50%_offer").json()["total"] == 1
    assert search(query="SPECIFIC evidence").json()["total"] == 15
    assert search(query="%' OR 1=1 --").json()["total"] == 0
    assert search(input_type="PHONE", risk_level="CAUTION").json()["total"] == 2
    oldest = search(sort="oldest").json()
    assert oldest["items"][0]["preview"] == "Case 00"
    first = search(sort="newest").json()
    second = search(sort="newest", page=2).json()
    assert first["total"] == second["total"] == 15
    assert len(first["items"]) == 10 and len(second["items"]) == 5
    assert not ({row["id"] for row in first["items"]} & {row["id"] for row in second["items"]})
    ranked = search(sort="risk", page_size=100).json()["items"]
    assert [row["risk_level"] for row in ranked[:3]] == ["HIGH"] * 3
    assert all(row["risk_level"] in {None, "INSUFFICIENT_EVIDENCE"} for row in ranked[-4:])
    dashboard = client.get("/api/v1/dashboard").json()
    assert dashboard["type_counts"] == {"MESSAGE": 4, "URL": 4, "PHONE": 4, "QR": 3}
    assert sum(dashboard["risk_counts"].values()) + dashboard["unassessed_analyses"] == 15
    assert dashboard["flagged_analyses"] == 6
    for invalid in [{"sort": "sql"}, {"page": 0}, {"query": "x" * 201}, {"risk_level": "SAFE"}]:
        assert search(**invalid).status_code == 422
    with TestClient(create_app(client.app.state.settings)) as other:
        signup(other, "other@example.com")
        assert other.post("/api/v1/analyses/search", json={"query": "Case"}).json()["total"] == 0
        assert other.get("/api/v1/dashboard").json()["total_analyses"] == 0
        assert other.get(f"/api/v1/analyses/{first['items'][0]['id']}").status_code == 404
