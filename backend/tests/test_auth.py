import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import os
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.security import reset_for_tests as _reset_buckets
import pytest as _pytest

client = TestClient(app)


@_pytest.fixture(autouse=True)
def _clean_buckets():
    _reset_buckets()
    yield
    _reset_buckets()


def test_open_when_no_key_configured():
    with patch.dict(os.environ, {"API_KEY": ""}):
        assert client.get("/api/health").status_code == 200
        # Missing/invalid bodies may 422, but never 401.
        assert client.post("/api/complete", json={}).status_code != 401


def test_auth_enforced_when_key_set():
    with patch.dict(os.environ, {"API_KEY": "secret"}):
        r = client.post("/api/complete", json={})
        assert r.status_code == 401
        assert r.json()["error"] == "unauthorized"

        r = client.post("/api/complete", json={}, headers={"X-API-Key": "wrong"})
        assert r.status_code == 401

        r = client.post("/api/complete", json={}, headers={"X-API-Key": "secret"})
        assert r.status_code != 401

        r = client.post("/api/complete", json={}, headers={"Authorization": "Bearer secret"})
        assert r.status_code != 401


def test_public_endpoints_exempt():
    with patch.dict(os.environ, {"API_KEY": "secret"}):
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/models").status_code == 200
        r = client.post("/api/waitlist", json={"email": "t@example.com"})
        assert r.status_code == 200
        assert r.json().get("error") != "unauthorized"


def test_waitlist_throttle():
    with patch.dict(os.environ, {"API_KEY": ""}):
        statuses = [
            client.post("/api/waitlist", json={"email": f"throttle{i}@example.com"}).status_code
            for i in range(12)
        ]
        assert 429 in statuses


def test_security_headers():
    with patch.dict(os.environ, {"API_KEY": ""}):
        r = client.get("/api/health")
        assert r.headers.get("x-frame-options") == "DENY"
        assert "frame-ancestors 'none'" in r.headers.get("content-security-policy", "")
        assert "strict-transport-security" not in r.headers
    with patch.dict(os.environ, {"ENV": "prod", "API_KEY": "k"}):
        r = client.get("/api/health")
        assert "max-age=63072000" in r.headers.get("strict-transport-security", "")
