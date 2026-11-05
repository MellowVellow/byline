"""Meta-authored AI Model Gateway for Byline.
Strictly restricted to Meta models (Meta Model API, OpenRouter Meta models, Baseten Meta models).
"""
from __future__ import annotations
import asyncio
import json, logging, random, re, threading, time
from typing import Any
import httpx
from .config import settings, validate_meta_model, APPROVED_META_MODELS
from . import budget

log = logging.getLogger("byline.llm")

_CLIENTS: dict[int, httpx.AsyncClient] = {}
_CLIENTS_LOCK = threading.Lock()

def _client() -> httpx.AsyncClient:
    key = id(asyncio.get_running_loop())
    with _CLIENTS_LOCK:
        client = _CLIENTS.get(key)
        if client is None or client.is_closed:
            client = httpx.AsyncClient(timeout=settings.request_timeout)
            _CLIENTS[key] = client
        return client

async def aclose_clients() -> None:
    """Close all loop-bound clients. Called on app shutdown."""
    with _CLIENTS_LOCK:
        clients = list(_CLIENTS.values())
        _CLIENTS.clear()
    for client in clients:
        try:
            await client.aclose()
        except Exception:  # noqa: BLE001
            pass

class LLMError(RuntimeError): pass

_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)
_THINK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
_TRAIL_COMMA = re.compile(r",\s*([}\]])")

def _try_load(c: str) -> dict[str, Any] | None:
    try:
        p = json.loads(c)
        if isinstance(p, list): return {"items": p}
        if isinstance(p, dict): return p
        return None
    except json.JSONDecodeError:
        pass
    try:
        p = json.loads(_TRAIL_COMMA.sub(r"\1", c))
        if isinstance(p, list): return {"items": p}
        if isinstance(p, dict): return p
    except json.JSONDecodeError:
        pass
    return None

def extract_json(content: str) -> dict[str, Any]:
    content = (content or "").strip()
    if not content: raise LLMError("empty response")
    # Reasoning models may wrap chain-of-thought in <think> tags before the JSON.
    text = _THINK.sub("", content).strip()
    cands = [text]
    m = _FENCE.search(text)
    if m: cands.append(m.group(1).strip())
    for op, cl in (("{", "}"), ("[", "]")):
        s, e = text.find(op), text.rfind(cl)
        if s != -1 and e > s: cands.append(text[s:e + 1])
    for c in cands:
        hit = _try_load(c)
        if hit is not None: return hit
    raise LLMError(f"unparseable JSON: {text[:200]!r}")

async def _call(url: str, key: str, model: str, system: str, user: str, max_tokens: int, temp: float, is_meta_api: bool = False, custom_headers: dict | None = None) -> tuple[str, dict]:
    valid_model = validate_meta_model(model)
    body: dict[str, Any] = {
        "model": valid_model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "max_tokens": max_tokens,
        "temperature": temp,
    }
    if is_meta_api:
        body["reasoning_effort"] = "minimal"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if not is_meta_api:
        headers["X-Title"] = "Byline"
    if custom_headers:
        headers.update(custom_headers)
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            r = await _client().post(url, json=body, headers=headers)
            r.raise_for_status()
            d = r.json()
            content = (d["choices"][0]["message"].get("content") or "") if d.get("choices") else ""
            return content, d.get("usage") or {}
        except httpx.HTTPStatusError as e:
            last_exc = e
            status = e.response.status_code if e.response is not None else 0
            if status not in (429, 502, 503, 504) or attempt == 2:
                raise
            try:
                delay = min(float(e.response.headers.get("retry-after", "") or 0) or 0, 10)
            except (TypeError, ValueError):
                delay = 0
            await asyncio.sleep(delay or min(2 ** attempt + random.random(), 8))
        except httpx.TransportError as e:
            last_exc = e
            if attempt == 2:
                raise
            await asyncio.sleep(min(2 ** attempt + random.random(), 8))
    raise last_exc or LLMError("llm call failed")

class ProviderUnavailable(LLMError):
    """Raised when an explicitly requested provider cannot serve the call."""


async def _baseten_attempt(system: str, user: str, max_tokens: int, temperature: float,
                           errors: list[str]) -> tuple[str, dict, str, str] | None:
    if not settings.baseten_api_key:
        errors.append("baseten: BASETEN_API_KEY not configured")
        return None
    model = settings.baseten_model or "meta-models/muse-spark-open-1026"
    candidate_urls = [
        f"{settings.baseten_base_url}/chat/completions",
        "https://inference.baseten.co/v1/chat/completions",
    ]
    seen: set[str] = set()
    endpoints = [u for u in candidate_urls if not (u in seen or seen.add(u))]

    for endpoint in endpoints:
        try:
            c, u = await _call(endpoint, settings.baseten_api_key, model, system, user,
                               max_tokens, temperature, is_meta_api=False)
            if c.strip():
                log.info("Baseten inference succeeded via %s with model %s", endpoint, model)
                return c, u, model, "baseten"
            errors.append(f"baseten ({endpoint}): empty content")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                try:
                    c, u = await _call(endpoint, settings.baseten_api_key, model, system, user,
                                       max_tokens, temperature, is_meta_api=False,
                                       custom_headers={"Authorization": f"Api-Key {settings.baseten_api_key}"})
                    if c.strip():
                        log.info("Baseten inference succeeded via Api-Key scheme on %s", endpoint)
                        return c, u, model, "baseten"
                except Exception as retry_err:  # noqa: BLE001
                    errors.append(f"baseten Api-Key retry ({endpoint}): {retry_err}")
            errors.append(f"baseten ({endpoint}): HTTP {e.response.status_code}: {e}")
            if e.response.status_code in (404, 502, 503):
                continue
        except Exception as e:  # noqa: BLE001
            errors.append(f"baseten ({endpoint}): {type(e).__name__}: {e}")
            continue
    return None


async def _meta_attempt(system: str, user: str, max_tokens: int, temperature: float,
                        errors: list[str]) -> tuple[str, dict, str, str] | None:
    if not settings.meta_api_key:
        errors.append("meta_api: META_API_KEY not configured")
        return None
    meta_m = validate_meta_model(settings.meta_model)
    try:
        c, u = await _call(f"{settings.meta_base_url}/chat/completions", settings.meta_api_key,
                           meta_m, system, user, max_tokens, temperature, is_meta_api=True)
        if c.strip():
            return c, u, meta_m, "meta"
        errors.append("meta_api: empty content")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 402:
            errors.append(f"meta_api: 402 Payment Required (Meta credit limit reached): {e}")
        else:
            errors.append(f"meta_api: HTTP {e.response.status_code}: {e}")
    except Exception as e:  # noqa: BLE001
        errors.append(f"meta_api: {type(e).__name__}: {e}")
    return None


async def _openrouter_attempt(system: str, user: str, max_tokens: int, temperature: float,
                              errors: list[str]) -> tuple[str, dict, str, str] | None:
    if not settings.openrouter_api_key:
        return None
    or_m = validate_meta_model(settings.openrouter_model)
    try:
        c, u = await _call(f"{settings.openrouter_base_url}/chat/completions",
                           settings.openrouter_api_key, or_m, system, user, max_tokens,
                           temperature, is_meta_api=False)
        if c.strip():
            log.info("OpenRouter inference succeeded with model %s", or_m)
            return c, u, or_m, "openrouter"
        errors.append("openrouter: empty content")
    except httpx.HTTPStatusError as e:
        errors.append(f"openrouter: HTTP {e.response.status_code}: {e}")
    except Exception as e:  # noqa: BLE001
        errors.append(f"openrouter: {type(e).__name__}: {e}")
    return None


async def chat(system: str, user: str, *, model: str | None = None, max_tokens: int = 800, temperature: float = 0.7) -> tuple[str, dict, str]:
    """Execute a chat completion on approved Meta models, with per-IP accounting.

    Provider routing is selected per request via the ``X-Byline-Provider``
    header (``auto`` | ``baseten`` | ``meta``). ``auto`` keeps the cascade
    Baseten -> Meta -> OpenRouter -> offline mock. Explicit choices never
    fall back to another provider.
    """
    pref = budget.current_provider()
    errors: list[str] = []
    rid = budget.reserve(
        budget.current_ip(),
        budget.estimate_prompt_tokens(system, user, max_tokens),
        budget.current_endpoint(),
        budget.estimate_call_usd(system, user, max_tokens),
    )
    try:
        if pref == "baseten":
            res = await _baseten_attempt(system, user, max_tokens, temperature, errors)
            if res is None:
                raise ProviderUnavailable("baseten unavailable: " + ("; ".join(errors) or "not configured"))
        elif pref == "meta":
            res = await _meta_attempt(system, user, max_tokens, temperature, errors)
            if res is None:
                raise ProviderUnavailable("meta unavailable: " + ("; ".join(errors) or "not configured"))
        else:
            res = (
                await _baseten_attempt(system, user, max_tokens, temperature, errors)
                or await _meta_attempt(system, user, max_tokens, temperature, errors)
                or await _openrouter_attempt(system, user, max_tokens, temperature, errors)
            )

        if res is None:
            budget.release(rid)
            raise ProviderUnavailable(
                "LLM unavailable: " + ("; ".join(errors) or "no keys"))

        c, u, m, provider = res
        budget.settle(rid, u, m, provider)
        return c, u, m
    except Exception:
        budget.release(rid)
        raise


async def json_call(system: str, user: str, *, model: str | None = None, max_tokens: int = 900, temperature: float = 0.5) -> tuple[dict, dict, str]:
    c, u, m = await chat(system, user, model=model, max_tokens=max_tokens, temperature=temperature)
    try:
        return extract_json(c), u, m
    except LLMError:
        log.warning("json parse failed (model=%s): %r", m, (c or "")[:500])
    # One repair attempt: ask for the same payload as bare JSON only.
    c2, u2, m2 = await chat(
        system + "\nReply with ONLY a valid JSON object. No prose, no fences, no commentary.",
        "Your previous reply was not valid JSON. Return ONLY the corrected JSON object for this task:\n" + user,
        model=model, max_tokens=max_tokens, temperature=0.0,
    )
    return extract_json(c2), u2, m2

async def text_call(system: str, user: str, *, model: str | None = None, max_tokens: int = 600, temperature: float = 0.7) -> tuple[str, dict, str]:
    return await chat(system, user, model=model, max_tokens=max_tokens, temperature=temperature)

async def timed_text(system: str, user: str, **kw) -> tuple[str, dict, str, float]:
    t = time.perf_counter()
    c, u, m = await text_call(system, user, **kw)
    return c, u, m, time.perf_counter() - t

async def responses_call(input_data, *, instructions: str = "", tools=None, include=None, text_format=None, max_output_tokens: int = 1400, effort: str = "minimal") -> dict:
    """Meta Model API Responses endpoint (web_search / files / structured).
    Uses Meta API key (required for Responses API web-search capability).
    Baseten handles chat completions; Meta API handles grounded web-search Responses calls.
    """
    pref = budget.current_provider()
    if pref == "baseten":
        raise ProviderUnavailable("baseten does not support web-search Responses calls; choose auto or meta")
    rid = budget.reserve(
        budget.current_ip(),
        budget.estimate_prompt_tokens(instructions or "", str(input_data), max_output_tokens),
        budget.current_endpoint(),
        budget.estimate_call_usd(instructions or "", str(input_data), max_output_tokens),
    )
    if not settings.meta_api_key:
        budget.release(rid)
        raise ProviderUnavailable("meta unavailable: META_API_KEY not configured")
    resp_model = validate_meta_model(settings.meta_model)
    body: dict = {
        "model": resp_model,
        "input": input_data,
        "max_output_tokens": max_output_tokens,
        "reasoning": {"effort": effort}
    }
    if instructions: body["instructions"] = instructions
    if tools: body["tools"] = tools
    if include: body["include"] = include
    if text_format: body["text"] = {"format": text_format}
    try:
        r = await _client().post(
            f"{settings.meta_base_url}/responses",
            json=body,
            headers={"Authorization": f"Bearer {settings.meta_api_key}", "Content-Type": "application/json"}
        )
        r.raise_for_status()
        d = r.json()
    except Exception as e:
        budget.release(rid)
        raise ProviderUnavailable(f"meta responses call failed: {e}") from e
    texts, annotations, results = [], [], []
    for item in d.get("output", []) or []:
        if item.get("type") == "message":
            for c in item.get("content", []) or []:
                if c.get("type") == "output_text":
                    texts.append(c.get("text", ""))
                    annotations.extend(c.get("annotations", []) or [])
        if item.get("type") == "web_search_call":
            results.extend((item.get("action") or {}).get("results", []) or item.get("results", []) or [])
    budget.settle(rid, d.get("usage") or {}, resp_model, "meta")
    return {
        "text": "\n".join(texts),
        "annotations": annotations,
        "search_results": results,
        "usage": d.get("usage") or {},
        "model": resp_model,
        "mock": False,
    }

FACTS_FORMAT = {
    "type": "json_schema",
    "name": "Facts",
    "schema": {
        "type": "object",
        "properties": {
            "facts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "fact": {"type": "string"},
                        "source_title": {"type": "string"},
                        "url": {"type": "string"},
                        "locator": {"type": "string"},
                        "excerpt": {"type": "string"}
                    },
                    "required": ["fact", "source_title", "url", "locator", "excerpt"],
                    "additionalProperties": False
                }
            }
        },
        "required": ["facts"],
        "additionalProperties": False
    }
}

async def local_text(system: str, user: str, *, max_tokens: int = 120) -> str:
    """Local Meta Llama / Muse completion via vLLM if configured."""
    if not settings.local_base_url:
        raise LLMError("LOCAL_BASE_URL not set")
    body = {
        "model": validate_meta_model(settings.local_model or "meta-llama/llama-3.1-8b-instruct"),
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "max_tokens": max_tokens,
        "temperature": 0.7
    }
    async with httpx.AsyncClient(timeout=8) as cl:
        r = await cl.post(f"{settings.local_base_url}/chat/completions", json=body, headers={"Content-Type": "application/json"})
        r.raise_for_status()
        d = r.json()
    return (d["choices"][0]["message"].get("content") or "") if d.get("choices") else ""
