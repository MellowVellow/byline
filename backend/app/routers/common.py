"""Shared HTTP helpers for routers. Soft-fail envelope: {ok, ...}."""
import logging

log = logging.getLogger("byline.api")

def ok(**kw): return {"ok": True, **kw}
def fail(**kw): return {"ok": False, **kw}
def err(e: Exception):
    from .. import budget
    from ..llm import ProviderUnavailable
    if isinstance(e, budget.BudgetExceeded):
        from fastapi.responses import JSONResponse
        return JSONResponse(
            {"ok": False, "error": "budget_exhausted", "limit": e.limit,
             "used": e.used, "reset_at": e.reset_at},
            status_code=429,
        )
    if isinstance(e, ProviderUnavailable):
        from fastapi.responses import JSONResponse
        log.warning("provider unavailable: %s", str(e)[:300])
        return JSONResponse(
            {"ok": False, "error": "provider_unavailable", "detail": str(e)[:300]},
            status_code=503,
        )
    log.warning("endpoint error: %s: %s", type(e).__name__, str(e)[:300])
    return fail(error="upstream_error")

def meta(endpoint, system, user, usage, model, ms=0, temperature=0, max_tokens=0):
    """Telemetry metadata. Never returns prompt text (draft stays in the browser)."""
    from .. import budget
    tok_in = (usage or {}).get("prompt_tokens", 0) or (usage or {}).get("input_tokens", 0) or 0
    tok_out = (usage or {}).get("completion_tokens", 0) or (usage or {}).get("output_tokens", 0) or 0
    reasoning = (((usage or {}).get("completion_tokens_details") or {}).get("reasoning_tokens", 0)
                 or ((usage or {}).get("output_tokens_details") or {}).get("reasoning_tokens", 0) or 0)
    return {"endpoint": endpoint, "model": model or "", "provider": budget.last_provider(),
            "ms": int(ms or 0),
            "usage": {"in": tok_in, "out": tok_out, "reasoning": reasoning},
            "est_usd": budget.estimate_usd(tok_in, tok_out, reasoning),
            "params": {"temperature": temperature, "max_tokens": max_tokens, "reasoning_effort": "minimal"}}
