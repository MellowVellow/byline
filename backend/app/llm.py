"""Meta Muse primary (reasoning_effort=minimal), OpenRouter Gemini fallback. Soft-fail only."""
from __future__ import annotations
import json, logging, re, time
from typing import Any
import httpx
from .config import settings

log = logging.getLogger("byline.llm")

class LLMError(RuntimeError): pass

_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)

def extract_json(content: str) -> dict[str, Any]:
    content = (content or "").strip()
    if not content: raise LLMError("empty response")
    cands = [content]
    m = _FENCE.search(content)
    if m: cands.append(m.group(1).strip())
    for op, cl in (("{", "}"), ("[", "]")):
        s, e = content.find(op), content.rfind(cl)
        if s != -1 and e > s: cands.append(content[s:e + 1])
    for c in cands:
        try:
            p = json.loads(c)
            if isinstance(p, list): return {"items": p}
            if isinstance(p, dict): return p
        except json.JSONDecodeError: continue
    raise LLMError("unparseable JSON")

async def _call(url: str, key: str, model: str, system: str, user: str, max_tokens: int, temp: float, meta: bool) -> tuple[str, dict]:
    body: dict[str, Any] = {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                            "max_tokens": max_tokens, "temperature": temp}
    if meta: body["reasoning_effort"] = "minimal"  # bench: without this reasoning tokens eat output
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if not meta: headers["X-Title"] = "Byline"
    async with httpx.AsyncClient(timeout=settings.request_timeout) as cl:
        r = await cl.post(url, json=body, headers=headers)
        r.raise_for_status()
        d = r.json()
    content = (d["choices"][0]["message"].get("content") or "") if d.get("choices") else ""
    return content, d.get("usage") or {}

async def chat(system: str, user: str, *, max_tokens: int = 800, temperature: float = 0.7) -> tuple[str, dict, str]:
    """Return (content, usage, model_used). Raise LLMError after both providers fail."""
    errors = []
    if settings.meta_api_key:
        try:
            c, u = await _call(f"{settings.meta_base_url}/chat/completions", settings.meta_api_key, settings.meta_model, system, user, max_tokens, temperature, True)
            if c.strip(): return c, u, settings.meta_model
            errors.append("meta: empty content")
        except Exception as e:  # noqa: BLE001
            errors.append(f"meta: {type(e).__name__}: {e}")
    if settings.openrouter_api_key:
        try:
            c, u = await _call("https://openrouter.ai/api/v1/chat/completions", settings.openrouter_api_key, settings.fallback_model, system, user, min(max_tokens, 500), temperature, False)
            if c.strip(): return c, u, settings.fallback_model
            errors.append("openrouter: empty content")
        except Exception as e:  # noqa: BLE001
            errors.append(f"openrouter: {type(e).__name__}: {e}")
    log.warning("LLM failed: %s", "; ".join(errors))
    raise LLMError("; ".join(errors) or "no LLM key configured")

async def json_call(system: str, user: str, *, max_tokens: int = 900, temperature: float = 0.5) -> tuple[dict, dict, str]:
    c, u, m = await chat(system, user, max_tokens=max_tokens, temperature=temperature)
    return extract_json(c), u, m

async def text_call(system: str, user: str, *, max_tokens: int = 600, temperature: float = 0.7) -> tuple[str, dict, str]:
    return await chat(system, user, max_tokens=max_tokens, temperature=temperature)

async def timed_text(system: str, user: str, **kw) -> tuple[str, dict, str, float]:
    t = time.perf_counter(); c, u, m = await text_call(system, user, **kw); return c, u, m, time.perf_counter() - t
