"""Final closure privacy and all-mode ownership regressions on disposable PostgreSQL."""

import json
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models import Analysis
from app.main import create_app
from app.qr_intelligence.engine import persisted_payload
from tests.qr_fixtures import emv_payment_payload, qr_image_bytes
from tests.test_auth import auth_client as shared_client
from tests.test_auth import auth_database as shared_database
from tests.test_auth import signup

auth_client = shared_client
auth_database = shared_database

PRIVATE_FIXTURE = "closure-fixture-password"
PAYLOADS = [
    f"WIFI:P:{PRIVATE_FIXTURE};S:Closure;;",
    f"wifi:p:{PRIVATE_FIXTURE};S:Closure;;",
    f"WIFI:T:WPA;P:{PRIVATE_FIXTURE};S:Closure;;",
    f"WIFI:P:{PRIVATE_FIXTURE}\\;escaped;S:Closure;;",
    emv_payment_payload(embedded_url=f"https://demo:{PRIVATE_FIXTURE}@example.com/pay"),
]


@pytest.mark.parametrize("payload", PAYLOADS)
def test_qr_credential_redaction_covers_first_wifi_field_and_embedded_payment_url(payload):
    saved = persisted_payload(payload)
    assert PRIVATE_FIXTURE not in saved
    assert "[redacted]" in saved
    assert persisted_payload(saved) == saved


@pytest.mark.integration
@pytest.mark.parametrize("payload", [PAYLOADS[0], PAYLOADS[-1]])
@pytest.mark.parametrize("source", ["camera", "upload"])
def test_qr_secrets_never_enter_response_database_history_or_search(auth_client, payload, source):
    client, engine = auth_client
    signup(client)
    if source == "camera":
        response = client.post(
            "/api/v1/analyses/qr/payload", json={"payload": payload, "decoder": "zxing-wasm"}
        )
    else:
        response = client.post(
            "/api/v1/analyses/qr",
            files={"file": ("controlled.png", qr_image_bytes(payload), "image/png")},
        )
    assert response.status_code == 201
    record = response.json()
    assert record["status"] == "COMPLETED"
    assert PRIVATE_FIXTURE not in json.dumps(record)
    if payload.startswith("000201"):
        # Privacy correction must not change the original-byte structural assessment.
        assert record["assessment"]["components"]["payment"]["crc_valid"] is True
    with Session(engine) as session:
        stored = session.get(Analysis, UUID(record["id"]))
        assert PRIVATE_FIXTURE not in stored.content
    assert PRIVATE_FIXTURE not in client.get(f"/api/v1/analyses/{record['id']}").text
    assert PRIVATE_FIXTURE not in client.get("/api/v1/analyses").text
    assert (
        client.post("/api/v1/analyses/search", json={"query": PRIVATE_FIXTURE}).json()["total"] == 0
    )


@pytest.mark.integration
def test_all_modes_are_private_from_a_second_account(auth_client):
    client, _ = auth_client
    owner = signup(client).json()["user"]
    records = []
    for mode, content in [
        ("MESSAGE", "Private closure fixture message for ownership testing."),
        ("URL", "https://example.com/closure-private"),
        ("PHONE", "+44 20 7946 0958"),
    ]:
        response = client.post("/api/v1/analyses", json={"input_type": mode, "content": content})
        assert response.status_code == 201
        records.append(response.json())
    response = client.post(
        "/api/v1/analyses/qr/payload",
        json={"payload": "https://example.com/closure-qr-private", "decoder": "zxing-wasm"},
    )
    assert response.status_code == 201
    records.append(response.json())
    with TestClient(create_app(client.app.state.settings)) as other:
        signup(other, "closure-other@example.com")
        assert other.get("/api/v1/analyses").json()["total"] == 0
        assert other.get("/api/v1/dashboard").json()["total_analyses"] == 0
        for record in records:
            assert (
                other.post(
                    "/api/v1/analyses/search", json={"query": record["content"][:100]}
                ).json()["total"]
                == 0
            )
            assert other.get(f"/api/v1/analyses/{record['id']}").status_code == 404
            assert other.delete(f"/api/v1/analyses/{record['id']}").status_code == 404
        assert (
            other.patch(
                "/api/v1/auth/profile",
                json={
                    "user_id": owner["id"],
                    "full_name": "Unwanted Change",
                    "username": "spoofed",
                },
            ).status_code
            == 422
        )
    assert client.get("/api/v1/auth/me").json()["user"] == owner
    assert client.get("/api/v1/analyses").json()["total"] == 4
