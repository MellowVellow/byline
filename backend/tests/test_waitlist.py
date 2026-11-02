import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import os
from unittest.mock import AsyncMock, patch
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


def test_waitlist_rejects_invalid_email():
    r = client.post("/api/waitlist", json={"email": "not-an-email"})
    assert r.status_code == 422


def test_waitlist_writes_to_supabase():
    with patch.dict(os.environ, {"SUPABASE_URL": "https://db.example.co", "SUPABASE_SERVICE_KEY": "svc"}), \
         patch("app.routers.system._supabase_add", new_callable=AsyncMock) as add:
        add.return_value = "added"
        r = client.post("/api/waitlist", json={"email": "Writer@Gmail.com", "note": "hi"})
        assert r.json() == {"ok": True, "store": "supabase", "already": False}
        add.assert_awaited_once_with("writer@gmail.com", "hi")


def test_waitlist_duplicate_is_ok():
    with patch.dict(os.environ, {"SUPABASE_URL": "https://db.example.co", "SUPABASE_SERVICE_KEY": "svc"}), \
         patch("app.routers.system._supabase_add", new_callable=AsyncMock) as add:
        add.return_value = "duplicate"
        r = client.post("/api/waitlist", json={"email": "writer@gmail.com"})
        assert r.json()["ok"] is True and r.json()["already"] is True


def test_waitlist_fails_closed_when_supabase_unavailable():
    with patch.dict(os.environ, {"SUPABASE_URL": "https://db.example.co", "SUPABASE_SERVICE_KEY": "svc",
                                 "WAITLIST_LOCAL_FALLBACK": ""}), \
         patch("app.routers.system._supabase_add", new_callable=AsyncMock, side_effect=RuntimeError("down")):
        r = client.post("/api/waitlist", json={"email": "writer@gmail.com"})
        assert r.json() == {"ok": False, "error": "waitlist_unavailable"}


def test_waitlist_unconfigured_without_fallback():
    with patch.dict(os.environ, {"SUPABASE_URL": "", "SUPABASE_SERVICE_KEY": "",
                                 "WAITLIST_LOCAL_FALLBACK": ""}):
        r = client.post("/api/waitlist", json={"email": "writer@gmail.com"})
        assert r.json() == {"ok": False, "error": "waitlist_unconfigured"}


def test_waitlist_honeypot_is_silent():
    r = client.post("/api/waitlist", json={"email": "bot@gmail.com", "company": "Acme"})
    assert r.json() == {"ok": True, "store": "ignored"}


def test_waitlist_local_fallback(tmp_path):
    with patch.dict(os.environ, {"SUPABASE_URL": "", "SUPABASE_SERVICE_KEY": "",
                                 "WAITLIST_LOCAL_FALLBACK": "1"}), \
         patch("app.routers.system.ROOT", tmp_path):
        r = client.post("/api/waitlist", json={"email": "writer@gmail.com", "note": "local"})
        assert r.json() == {"ok": True, "store": "local-file"}
        text = (tmp_path / "data" / "waitlist.jsonl").read_text()
        assert '"writer@gmail.com"' in text
