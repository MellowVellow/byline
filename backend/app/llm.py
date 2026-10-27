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

async def responses_call(input_data, *, instructions: str = "", tools=None, include=None, text_format=None, max_output_tokens: int = 1400, effort: str = "minimal") -> dict:
    """Responses API (web_search / files / structured). Returns {text, annotations, search_results, usage}."""
    if not settings.meta_api_key:
        raise LLMError("META_API_KEY not set")
    body: dict = {"model": settings.meta_model, "input": input_data, "max_output_tokens": max_output_tokens, "reasoning": {"effort": effort}}
    if instructions: body["instructions"] = instructions
    if tools: body["tools"] = tools
    if include: body["include"] = include
    if text_format: body["text"] = {"format": text_format}
    async with httpx.AsyncClient(timeout=settings.request_timeout) as cl:
        r = await cl.post(f"{settings.meta_base_url}/responses", json=body, headers={"Authorization": f"Bearer {settings.meta_api_key}", "Content-Type": "application/json"})
        r.raise_for_status(); d = r.json()
    texts, annotations, results = [], [], []
    for item in d.get("output", []) or []:
        if item.get("type") == "message":
            for c in item.get("content", []) or []:
                if c.get("type") == "output_text":
                    texts.append(c.get("text", "")); annotations.extend(c.get("annotations", []) or [])
        if item.get("type") == "web_search_call":
            results.extend((item.get("action") or {}).get("results", []) or item.get("results", []) or [])
    return {"text": "\n".join(texts), "annotations": annotations, "search_results": results, "usage": d.get("usage") or {}, "model": settings.meta_model}

FACTS_FORMAT = {"type": "json_schema", "name": "Facts", "schema": {"type": "object", "properties": {"facts": {"type": "array", "items": {"type": "object", "properties": {"fact": {"type": "string"}, "source_title": {"type": "string"}, "url": {"type": "string"}, "locator": {"type": "string"}, "excerpt": {"type": "string"}}, "required": ["fact", "source_title", "url", "locator", "excerpt"], "additionalProperties": False}}}, "required": ["facts"], "additionalProperties": False}}

async def schema_call(system: str, user: str, schema: dict, name: str, *, max_tokens: int = 1200) -> tuple[dict, dict, str]:
    """Chat completions with json_schema constrained decoding."""
    if not settings.meta_api_key:
        raise LLMError("META_API_KEY not set")
    body = {"model": settings.meta_model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "max_tokens": max_tokens, "temperature": 0.4, "reasoning_effort": "minimal",
            "response_format": {"type": "json_schema", "json_schema": {"name": name, "schema": schema}}}
    async with httpx.AsyncClient(timeout=settings.request_timeout) as cl:
        r = await cl.post(f"{settings.meta_base_url}/chat/completions", json=body, headers={"Authorization": f"Bearer {settings.meta_api_key}", "Content-Type": "application/json"})
        r.raise_for_status(); d = r.json()
    content = (d["choices"][0]["message"].get("content") or "") if d.get("choices") else ""
    return extract_json(content), d.get("usage") or {}, settings.meta_model


async def local_text(system: str, user: str, *, max_tokens: int = 120) -> str:
    """Optional local (LoRA/Glimmer via vLLM) completion. Raises if not configured/down."""
    if not settings.local_base_url:
        raise LLMError("LOCAL_BASE_URL not set")
    body = {"model": settings.local_model or "glimmer-lora", "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "max_tokens": max_tokens, "temperature": 0.7}
    async with httpx.AsyncClient(timeout=8) as cl:
        r = await cl.post(f"{settings.local_base_url}/chat/completions", json=body, headers={"Content-Type": "application/json"})
        r.raise_for_status(); d = r.json()
    return (d["choices"][0]["message"].get("content") or "") if d.get("choices") else ""
