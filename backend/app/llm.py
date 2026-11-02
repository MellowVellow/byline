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

# One client per running event loop: a global client created outside a loop
# breaks under multi-loop servers/tests, and a never-closed client leaks.
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

async def _call(url: str, key: str, model: str, system: str, user: str, max_tokens: int, temp: float, is_meta_api: bool = False, custom_headers: dict | None = None) -> tuple[str, dict]:
    # Validate that model belongs to Meta-authored allowlist
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
    # Retry transient failures only (429/5xx, transport errors): chat calls
    # are billed, so non-retryable errors fail fast instead of double-spending.
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

def _mock_meta_response(system: str, user: str) -> tuple[str, dict, str]:
    """Deterministic development/offline mock engine simulating Meta Llama 3.3 / Muse outputs."""
    low_sys = system.lower()
    low_usr = user.lower()

    # Connect task
    if "connect" in low_sys or "connect" in low_usr or "connective bridge" in low_sys:
        mock_data = {
            "options": [
                {
                    "relation_type": "Dialectical Concession",
                    "bridge_text": "While initial constraints present undeniable friction, addressing them compounds long-term authorial clarity.",
                    "rationale": "Concedes the immediate challenge before reinforcing the core thesis."
                },
                {
                    "relation_type": "Causal Synthesis",
                    "bridge_text": "Consequently, deliberate structural framing enables readers to navigate dense argumentation with minimal cognitive overhead.",
                    "rationale": "Draws an explicit causal link from structural choice to reader reception."
                },
                {
                    "relation_type": "Contrast & Qualification",
                    "bridge_text": "By contrast, unexamined assertions risk obscuring the nuanced relationship between intent and execution.",
                    "rationale": "Sharply distinguishes rigorous claims from superficial prose."
                }
            ]
        }
        return json.dumps(mock_data), {"total_tokens": 120}, "mock:meta-llama-3.3-70b-instruct"

    # Annotate / Reflection task
    if "annotate" in low_sys or "issues" in low_sys:
        mock_data = {
            "issues": [
                {
                    "quote": "plethora",
                    "context": "A plethora of reasons exist",
                    "type": "vocabulary",
                    "reason": "Overly inflated register for general audience.",
                    "replacement": "wide variety"
                }
            ]
        }
        return json.dumps(mock_data), {"total_tokens": 90}, "mock:meta-llama-3.3-70b-instruct"

    # Reactions / Reader persona
    if "reaction" in low_sys or "reader" in low_sys:
        mock_data = {
            "reactions": [
                {
                    "quote": "clearly the better",
                    "context": "so they are clearly the better long-term choice",
                    "kind": "critique",
                    "text": "A skeptical reader may view this conclusion as premature without comparative lifespan data."
                }
            ]
        }
        return json.dumps(mock_data), {"total_tokens": 110}, "mock:meta-llama-3.3-70b-instruct"

    # Paraphrase / synonyms
    if "synonym" in low_sys or "paraphrase" in low_sys or "alternative" in low_sys:
        mock_data = {
            "synonyms": ["markedly superior", "distinctly advantageous", "compellingly preferable"]
        }
        return json.dumps(mock_data), {"total_tokens": 65}, "mock:meta-llama-3.3-70b-instruct"

    # Complete / Draft assistance
    if "complete" in low_sys or "ghost" in low_sys or "suggest" in low_sys:
        content = "demonstrates verifiable improvements across all evaluation benchmarks.\nreveals unexpected nuances upon closer inspection.\nestablishes a firmer foundation for subsequent analysis."
        return content, {"total_tokens": 50}, "mock:meta-llama-3.3-70b-instruct"

    # Setup questions
    if "setup interviewer" in low_sys or "setup_questions" in low_sys:
        mock_data = {
            "questions": [
                {"id": "q1", "question": "What is the primary scope of this piece?", "maps_to": "outline_focus", "options": ["Concise analytical brief", "Comprehensive essay", "Technical report"]},
                {"id": "q2", "question": "What tone best conveys your argument?", "maps_to": "tone", "options": ["Authoritative & Measured", "Direct & Accessible", "Academic & Rigorous"]}
            ]
        }
        return json.dumps(mock_data), {"total_tokens": 85}, "mock:meta-llama-3.3-70b-instruct"

    # Explore: query planner (offline-safe, no URLs)
    if "query planner" in low_sys or "search queries" in low_sys:
        return json.dumps({"queries": ["definition and key terms", "supporting evidence and studies", "counterarguments and limits"]}), {"total_tokens": 40}, "mock:meta-llama-3.3-70b-instruct"

    # Explore: angle planner (offline-safe, no URLs — angles only)
    if "research planner" in low_sys or "exploration angles" in low_sys:
        mock_data = {
            "angles": [
                {"type": "Question", "text": "What is the strongest evidence on either side?", "why": "Frames the core debate."},
                {"type": "Terminology", "text": "Define the key terms before arguing.", "why": "Prevents equivocation."},
                {"type": "Idea", "text": "Consider second-order effects beyond the immediate claim.", "why": "Adds depth."}
            ]
        }
        return json.dumps(mock_data), {"total_tokens": 80}, "mock:meta-llama-3.3-70b-instruct"

    # Default fallback JSON if requested
    if "json" in low_sys:
        return '{"result": "ok"}', {"total_tokens": 20}, "mock:meta-llama-3.3-70b-instruct"

    return "deliberate writing assistance, keeping the writer in control.", {"total_tokens": 30}, "mock:meta-llama-3.3-70b-instruct"

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
        "https://bridge.baseten.co/v1/chat/completions",
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
            # If 401/403 with Bearer, retry with Api-Key auth scheme
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
            if settings.env in ("prod", "production"):
                raise ProviderUnavailable(
                    "LLM unavailable in prod (no mock fallback): "
                    + ("; ".join(errors) or "no keys"))
            log.info("Using offline Meta mock engine (keys unconfigured or remote unreachable): %s",
                     "; ".join(errors) or "no keys")
            c, u, m = _mock_meta_response(system, user)
            budget.settle(rid, u, m, "mock", mock=True)
            return c, u, m

        c, u, m, provider = res
        budget.settle(rid, u, m, provider)
        return c, u, m
    except Exception:
        budget.release(rid)
        raise


async def json_call(system: str, user: str, *, model: str | None = None, max_tokens: int = 900, temperature: float = 0.5) -> tuple[dict, dict, str]:
    c, u, m = await chat(system, user, model=model, max_tokens=max_tokens, temperature=temperature)
    return extract_json(c), u, m

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
    )
    if not settings.meta_api_key:
        if pref == "meta" or settings.env in ("prod", "production"):
            budget.release(rid)
            raise ProviderUnavailable("meta unavailable: META_API_KEY not configured")
        # Offline mock research response — clearly tagged so callers never
        # mistake it for a real citation. Uses mock.local (RFC-2606-style
        # invalid host) instead of a plausible real-world URL.
        budget.settle(rid, {"total_tokens": 150}, "mock:muse-spark-open-1026", "mock", mock=True)
        return {
            "text": "Evidence qualifies the claim: while preliminary analyses indicate positive correlation, long-term confounding variables require structured moderation.",
            "annotations": [{"title": "Mock evidence (offline, unverified)", "url": "https://mock.local/offline-evidence"}],
            "search_results": [{"title": "Mock evidence (offline, unverified)", "url": "https://mock.local/offline-evidence"}],
            "usage": {"total_tokens": 150},
            "model": "mock:muse-spark-open-1026",
            "mock": True,
        }
    # Use the configured meta_model for Responses API (web-search grounding requires Meta API key)
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
        if pref == "meta" or settings.env in ("prod", "production"):
            budget.release(rid)
            raise ProviderUnavailable(f"meta responses call failed: {e}") from e
        log.warning("Meta Responses API call failed (%s), returning grounded mock response", e)
        budget.settle(rid, {"total_tokens": 150}, "mock:muse-spark-open-1026", "mock", mock=True)
        return {
            "text": "Evidence qualifies the claim: while preliminary analyses indicate positive correlation, long-term confounding variables require structured moderation.",
            "annotations": [{"title": "Mock evidence (offline, unverified)", "url": "https://mock.local/offline-evidence"}],
            "search_results": [{"title": "Mock evidence (offline, unverified)", "url": "https://mock.local/offline-evidence"}],
            "usage": {"total_tokens": 150},
            "model": "mock:muse-spark-open-1026",
            "mock": True,
        }
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
