import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import asyncio
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.services import explore_service as svc

client = TestClient(app)


def test_validate_finding_ok_and_bad():
    pages = {"https://a.com/x": "Cognitive offloading means relying on tools. " + "x" * 600}
    ok, v = svc.validate_finding({"url": "https://a.com/x", "excerpt": "Cognitive offloading means relying on tools."}, pages)
    assert ok and v == "supported"
    ok2, v2 = svc.validate_finding({"url": "https://a.com/x", "excerpt": "Invented claim not present anywhere here."}, pages)
    assert not ok2 and v2 == "unverified"
    ok3, _ = svc.validate_finding({"url": "https://unknown.com/", "excerpt": "Cognitive offloading means relying on tools."}, pages)
    assert not ok3


def test_plan_queries_fallback():
    async def run():
        with patch("app.services.explore_service.llm.json_call", new_callable=AsyncMock) as m:
            m.side_effect = Exception("boom")
            assert await svc.plan_queries("Does AI reduce thinking?") == ["Does AI reduce thinking?"]
    asyncio.run(run())


def test_search_dedupes_and_skips_mock():
    async def run():
        with patch("app.services.explore_service.llm.responses_call", new_callable=AsyncMock) as m:
            m.return_value = {"search_results": [
                {"title": "A", "url": "https://a.com/1"},
                {"title": "A dup", "url": "https://a.com/1"},
                {"title": "Mock", "url": "https://mock.local/x"}],
                "annotations": [], "mock": False}
            out = await svc.search_candidates(["q1"])
            assert len(out) == 1 and out[0]["url"] == "https://a.com/1"
    asyncio.run(run())


def test_sse_stream_empty_query():
    r = client.get("/api/explore/stream", params={"query": ""})
    assert r.status_code == 200
    assert "empty query" in r.text


def test_explore_post_offline_shape():
    with patch("app.services.explore_service.llm.responses_call", new_callable=AsyncMock) as mr, \
         patch("app.services.explore_service.llm.json_call", new_callable=AsyncMock) as mj:
        mr.return_value = {"text": "", "search_results": [], "annotations": [], "usage": {}, "model": "mock:m", "mock": True}
        mj.return_value = ({"angles": [{"type": "Question", "text": "Does the boost last?", "why": "Open"}]}, {}, "mock:m")
        r = client.post("/api/explore", json={"query": "Does AI reduce thinking?", "count": 8})
        d = r.json()
        assert d["ok"] is True and d["angles"][0]["text"] == "Does the boost last?"
        assert d["mock"] is True
