"""Shared HTTP helpers for routers. Soft-fail envelope: {ok, ...}."""
import logging

log = logging.getLogger("byline.api")

def ok(**kw): return {"ok": True, **kw}
def fail(**kw): return {"ok": False, **kw}
def err(e: Exception):
    log.warning("endpoint error: %s: %s", type(e).__name__, str(e)[:300])
    return fail(error="upstream_error")
def meta(endpoint, system, user, usage, model, ms=0, temperature=0, max_tokens=0):
    return {"endpoint": endpoint, "model": model or "", "ms": int(ms or 0),
            "usage": {"in": (usage or {}).get("prompt_tokens", 0), "out": (usage or {}).get("completion_tokens", 0),
                      "reasoning": ((usage or {}).get("completion_tokens_details") or {}).get("reasoning_tokens", 0)},
            "params": {"temperature": temperature, "max_tokens": max_tokens, "reasoning_effort": "minimal"},
            "prompt": {"system": (system or "")[:20000], "user": (user or "")[:20000]}}
