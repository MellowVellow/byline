import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import asyncio
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app import cache

client = TestClient(app)


def test_health_and_models_shapes():
    h = client.get("/api/health")
    assert h.status_code == 200
    d = h.json()
    assert d["ok"] is True and "provider" in d and "model" in d

    m = client.get("/api/models")
    assert m.status_code == 200
    d = m.json()
    assert d["ok"] is True
    assert "approved_models" in d and "active_model" in d and "active_provider" in d
    assert d["active_provider"] in ("baseten_hackathon", "meta_api", "openrouter", "mock_engine")
    # Allowlist must stay Meta-only
    assert all("llama" in x or "muse" in x for x in d["approved_models"])


def test_openrouter_fallback_wired():
    import os
    from app import llm
    async def run():
        with patch.dict(os.environ, {"BASETEN_API_KEY": "", "META_API_KEY": "", "OPENROUTER_API_KEY": "or-key",
                                      "OPENROUTER_MODEL": "meta-llama/llama-3.3-70b-instruct",
                                      "FALLBACK_MODEL": "meta-llama/llama-3.3-70b-instruct"}, clear=False), \
             patch("app.llm._call", new_callable=AsyncMock) as mock_call:
            mock_call.return_value = ("hello", {"total_tokens": 5})
            c, u, m = await llm.chat("sys", "usr")
            assert c == "hello"
            assert m == "meta-llama/llama-3.3-70b-instruct"
            called_url = mock_call.call_args[0][0]
            assert "openrouter.ai" in called_url
    asyncio.run(run())


def test_complete_remote_first_by_default():
    import os
    with patch.dict(os.environ, {"LOCAL_PREFER": "", "LOCAL_BASE_URL": ""}, clear=False), \
         patch("app.routers.complete.llm.timed_text", new_callable=AsyncMock) as mock_remote, \
         patch("app.routers.complete.llm.local_text", new_callable=AsyncMock) as mock_local:
        mock_remote.return_value = ("continued thought here.", {"total_tokens": 10}, "meta-llama/llama-3.3-70b-instruct", 0.05)
        r = client.post("/api/complete", json={
            "context": "essay", "level": "General", "assist_level": "Phrase",
            "before": "Cats are ", "after": "", "version": 1})
        assert r.status_code == 200
        assert r.json()["ok"] is True
        mock_remote.assert_awaited()
        mock_local.assert_not_awaited()


def test_complete_local_first_when_prefer():
    import os
    with patch.dict(os.environ, {"LOCAL_PREFER": "1", "LOCAL_BASE_URL": "http://localhost:9999/v1"}, clear=False), \
         patch("app.routers.complete.llm.local_text", new_callable=AsyncMock) as mock_local, \
         patch("app.routers.complete.llm.timed_text", new_callable=AsyncMock) as mock_remote:
        mock_local.return_value = "preferred local continuation"
        r = client.post("/api/complete", json={
            "context": "essay", "level": "General", "assist_level": "Phrase",
            "before": "Cats are ", "after": "", "version": 1})
        assert r.status_code == 200
        mock_local.assert_awaited()
        mock_remote.assert_not_awaited()


def test_mock_responses_tagged_and_filtered():
    import os
    from app import llm
    async def run():
        with patch.dict(os.environ, {"META_API_KEY": ""}, clear=False):
            try:
                await llm.responses_call("test")
            except llm.ProviderUnavailable:
                pass
            else:
                raise AssertionError("expected ProviderUnavailable")
    asyncio.run(run())

    # /api/readings with mock responses_call must not leak mock.local citations
    with patch("app.routers.research.llm.json_call", new_callable=AsyncMock) as mock_json, \
         patch("app.routers.research.llm.responses_call", new_callable=AsyncMock) as mock_resp:
        mock_json.return_value = ({"claims": [{"quote": "Cats sleep.", "context": "Cats sleep a lot. Cats sleep.", "query": "cat sleep"}]}, {}, "mock:m")
        mock_resp.return_value = {"text": "qualifies", "search_results": [{"title": "Mock", "url": "https://mock.local/offline-evidence"}], "annotations": [], "usage": {}, "model": "mock:m", "mock": True}
        r = client.post("/api/readings", json={"text": "Cats sleep a lot. Cats sleep.", "level": "General"})
        assert r.status_code == 200
        assert r.json()["readings"] == []


def test_synonyms_reactions_lint_cite_http():
    with patch("app.routers.annotate.llm.json_call", new_callable=AsyncMock) as m:
        m.return_value = ({"Synonyms": ["fast"], "Paraphrase": ["quick"], "Tone": ["speedy"], "synonyms": ["fast"]}, {}, "mock:m")
        r = client.post("/api/synonyms", json={"word": "quick", "sentence": "A quick fox.", "level": "General"})
        assert r.json()["ok"] is True and "fast" in r.json()["synonyms"]

    with patch("app.routers.annotate.llm.json_call", new_callable=AsyncMock) as m:
        m.return_value = ({"reactions": [{"quote": "clearly", "context": "it is clearly so", "kind": "critique", "text": "premature"}]}, {}, "mock:m")
        r = client.post("/api/reactions", json={"text": "it is clearly so", "level": "General"})
        assert r.json()["ok"] is True

    with patch("app.routers.lint.llm.json_call", new_callable=AsyncMock) as m:
        m.return_value = ({"lint_results": [{"rule_id": "R1", "target": "very good", "context": "it is very good indeed", "message": "hedge", "suggestion": "good"}]}, {}, "mock:m")
        r = client.post("/api/lint", json={"text": "it is very good indeed", "context": "essay",
            "active_rules": [{"id": "R1", "category": "amber", "rule": "avoid hedges"}]})
        assert r.json()["lint_results"][0]["rule_id"] == "R1"

    r = client.post("/api/cite", json={"source_title": "Study", "url": "https://example.com", "locator": "p.1", "style": "apa"})
    assert r.json()["ok"] is True and "inline" in r.json()


def test_cache_evicts_without_growth():
    for i in range(600):
        cache.set(f"k{i}", {"v": i}, ttl=300)
    assert len(cache._store) <= 501
