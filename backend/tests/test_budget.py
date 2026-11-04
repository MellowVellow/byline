import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import asyncio
import os
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app import budget, llm
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_budget(tmp_path):
    with patch.dict(os.environ, {"USAGE_DB_PATH": str(tmp_path / "usage.db"), "IP_BUDGET_ENABLED": "1"}):
        budget.reset_for_tests()
        yield
        budget.reset_for_tests()


def test_reserve_settle_and_snapshot():
    rid = budget.reserve("1.2.3.4", 500, "/api/complete")
    assert rid is not None
    snap = budget.snapshot("1.2.3.4")
    assert snap["used_tokens"] == 500
    assert snap["remaining_tokens"] == snap["limit_tokens"] - 500

    budget.settle(rid, {"prompt_tokens": 100, "completion_tokens": 40}, "muse", "baseten")
    snap = budget.snapshot("1.2.3.4")
    assert snap["used_tokens"] == 140
    assert snap["by_provider"]["baseten"]["tokens"] == 140


def test_budget_exceeded_and_release():
    with patch.dict(os.environ, {"IP_TOKEN_BUDGET": "100"}):
        rid = budget.reserve("5.5.5.5", 80)
        assert rid is not None
        assert budget.snapshot("5.5.5.5")["used_tokens"] == 80
        budget.release(rid)
        assert budget.snapshot("5.5.5.5")["used_tokens"] == 0
        with pytest.raises(budget.BudgetExceeded):
            budget.reserve("5.5.5.5", 101)


def test_usd_budget_exceeded():
    with patch.dict(os.environ, {"IP_BUDGET_USD": "0.01", "IP_TOKEN_BUDGET": "0"}):
        rid = budget.reserve("7.7.7.7", 1000, "/api/complete", estimated_usd=0.005)
        assert rid is not None
        snap = budget.snapshot("7.7.7.7")
        assert snap["used_usd"] == 0.005
        assert snap["limit_usd"] == 0.01
        assert snap["remaining_usd"] == 0.005
        with pytest.raises(budget.BudgetExceeded) as exc:
            budget.reserve("7.7.7.7", 1000, "/api/complete", estimated_usd=0.006)
        assert exc.value.unit == "usd"


def test_mock_settlement_is_free():
    rid = budget.reserve("6.6.6.6", 900)
    budget.settle(rid, {"total_tokens": 900}, "mock:model", "mock", mock=True)
    assert budget.snapshot("6.6.6.6")["used_tokens"] == 0


def test_provider_routing_explicit_has_no_fallback():
    baseten = AsyncMock(return_value=("b", {}, "meta-models/muse-spark-open-1026", "baseten"))
    meta = AsyncMock(return_value=("m", {}, "muse-spark-1.3", "meta"))
    auto = AsyncMock(return_value=None)
    with patch("app.llm._baseten_attempt", baseten), \
         patch("app.llm._meta_attempt", meta), \
         patch("app.llm._openrouter_attempt", auto):
        token = budget.provider_ctx.set("baseten")
        try:
            c, _, model = asyncio.run(llm.chat("s", "u"))
            assert (c, model) == ("b", "meta-models/muse-spark-open-1026")
            baseten.assert_awaited()
            meta.assert_not_awaited()
        finally:
            budget.provider_ctx.reset(token)

        token = budget.provider_ctx.set("meta")
        try:
            c, _, model = asyncio.run(llm.chat("s", "u"))
            assert (c, model) == ("m", "muse-spark-1.3")
            meta.assert_awaited()
        finally:
            budget.provider_ctx.reset(token)


def test_provider_routing_fails_closed():
    with patch("app.llm._baseten_attempt", AsyncMock(return_value=None)):
        token = budget.provider_ctx.set("baseten")
        try:
            with pytest.raises(llm.ProviderUnavailable):
                asyncio.run(llm.chat("s", "u"))
        finally:
            budget.provider_ctx.reset(token)


def test_endpoint_uses_header_provider_and_records_usage():
    calls = []

    async def fake_call(url, key, model, system, user, max_tokens, temperature, **kw):
        calls.append((url, model))
        return "the cat sat down here", {"prompt_tokens": 120, "completion_tokens": 40}

    env = {"BASETEN_API_KEY": "b", "META_API_KEY": "", "OPENROUTER_API_KEY": "",
           "LOCAL_BASE_URL": "", "LOCAL_PREFER": ""}
    with patch.dict(os.environ, env), patch("app.llm._call", side_effect=fake_call):
        r = client.post(
            "/api/complete",
            json={"context": "cats", "level": "General", "assist_level": "Phrase",
                  "before": "Cats are ", "after": "", "version": 1},
            headers={"X-Byline-Provider": "baseten"},
        )
        assert r.status_code == 200 and r.json()["ok"] is True
        assert "baseten.co" in calls[0][0]

        u = client.get("/api/usage").json()
        assert u["ok"] is True
        assert u["used_tokens"] == 160
        assert u["by_provider"]["baseten"]["tokens"] == 160


def test_invalid_provider_header_rejected():
    r = client.post("/api/complete", json={}, headers={"X-Byline-Provider": "openai"})
    assert r.status_code == 400
    assert r.json()["error"] == "invalid_provider"


def test_metrics_endpoint_requires_admin_token():
    with patch.dict(os.environ, {"ADMIN_TOKEN": ""}):
        assert client.get("/api/metrics/usage").status_code == 404
    with patch.dict(os.environ, {"ADMIN_TOKEN": "secret"}):
        assert client.get("/api/metrics/usage").status_code == 401
        r = client.get("/api/metrics/usage", headers={"X-Admin-Token": "secret"})
        assert r.status_code == 200 and r.json()["ok"] is True


def test_reasoning_tokens_are_billable():
    rid = budget.reserve("9.9.9.9", 500, "/api/complete")
    budget.settle(
        rid,
        {"prompt_tokens": 100, "completion_tokens": 40,
         "completion_tokens_details": {"reasoning_tokens": 60}},
        "muse", "baseten",
    )
    snap = budget.snapshot("9.9.9.9")
    assert snap["used_tokens"] == 200
    assert snap["tokens_in"] == 100
    assert snap["tokens_out"] == 40
    assert snap["tokens_reasoning"] == 60
    assert snap["by_provider"]["baseten"]["tokens"] == 200
    assert snap["by_provider"]["baseten"]["tokens_reasoning"] == 60
    # Reasoning bills at output rate.
    assert snap["est_usd"] == budget.estimate_usd(100, 40, 60)


def test_aggregate_has_totals_endpoints_and_distinct_ips():
    r1 = budget.reserve("10.0.0.1", 10, "/api/complete")
    budget.settle(r1, {"prompt_tokens": 10, "completion_tokens": 5,
                       "completion_tokens_details": {"reasoning_tokens": 2}},
                  "m", "baseten")
    r2 = budget.reserve("10.0.0.2", 10, "/api/research")
    budget.settle(r2, {"prompt_tokens": 20, "completion_tokens": 10}, "m", "meta")
    agg = budget.aggregate()
    assert agg["distinct_ips"] == 2
    assert agg["requests"] == 2
    assert agg["tokens_in"] == 30
    assert agg["tokens_out"] == 15
    assert agg["tokens_reasoning"] == 2
    assert agg["tokens_total"] == 47
    assert agg["window_hours"] > 0
    eps = {e["endpoint"]: e for e in agg["by_endpoint"]}
    assert eps["/api/complete"]["requests"] == 1
    assert eps["/api/research"]["requests"] == 1
    assert eps["/api/complete"]["tokens"] == 17
    ips = {r["ip"]: r for r in agg["top_ips"]}
    assert ips["10.0.0.1"]["tokens"] == 17
    assert ips["10.0.0.1"]["tokens_reasoning"] == 2
    assert ips["10.0.0.1"]["last_seen"] > 0


def test_metrics_usage_accepts_window_params():
    with patch.dict(os.environ, {"ADMIN_TOKEN": "secret"}):
        r = client.get(
            "/api/metrics/usage?window_hours=1&limit_ips=5&limit_endpoints=5",
            headers={"X-Admin-Token": "secret"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["window_hours"] == 1
        assert "distinct_ips" in body and "by_endpoint" in body
        assert "tokens_reasoning" in body and "tokens_total" in body


def test_prod_chat_fails_closed_without_keys():
    env = {"ENV": "prod", "BASETEN_API_KEY": "", "META_API_KEY": "",
           "OPENROUTER_API_KEY": "", "LOCAL_BASE_URL": "", "LOCAL_PREFER": ""}
    with patch.dict(os.environ, env):
        token = budget.provider_ctx.set("auto")
        try:
            with pytest.raises(llm.ProviderUnavailable):
                asyncio.run(llm.chat("s", "u"))
        finally:
            budget.provider_ctx.reset(token)


def test_prod_responses_call_fails_closed_without_key():
    with patch.dict(os.environ, {"ENV": "prod", "META_API_KEY": ""}):
        with pytest.raises(llm.ProviderUnavailable):
            asyncio.run(llm.responses_call("q"))
